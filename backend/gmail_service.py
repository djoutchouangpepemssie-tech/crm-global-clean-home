"""
Global Clean Home CRM - Gmail Integration
OAuth2 flow, send/receive emails via Gmail API, auto follow-ups.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from cryptography.fernet import Fernet
from typing import Optional
import base64
import hashlib
import os
import logging
import json
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
GOOGLE_SCOPES = os.environ.get("GOOGLE_SCOPES", " ".join([
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]))
GMAIL_FROM_ADDRESS = os.environ.get("GMAIL_FROM_ADDRESS", "contact@globalcleanhome.com")
GMAIL_FROM_NAME = os.environ.get("GMAIL_FROM_NAME", "Global Clean Home")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

# Encryption for refresh tokens
_enc_key = os.environ.get("ENCRYPTION_KEY", "")


def _get_fernet() -> Fernet:
    key = hashlib.sha256(_enc_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def _encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    return _get_fernet().decrypt(value.encode()).decode()


gmail_router = APIRouter()


async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


# =============================================
# ROUTE 1 — Start Google OAuth for Gmail
# =============================================

@gmail_router.get("/api/auth/google")
async def google_auth_start(request: Request):
    """Redirect to Google OAuth consent screen for Gmail access."""
    user = await _require_auth(request)

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth non configure")

    import uuid
    state = f"{user.user_id}:{uuid.uuid4().hex}"

    await _db.oauth_states.insert_one({
        "state": state,
        "user_id": user.user_id,
        "type": "gmail",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": GOOGLE_SCOPES,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    query = "&".join(f"{k}={httpx.URL('', params={k: v}).params[k]}" for k, v in params.items())
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    return {"authorization_url": auth_url}


# =============================================
# ROUTE 2 — Google OAuth Callback
# =============================================

@gmail_router.get("/api/auth/google/callback")
async def google_auth_callback(request: Request, code: str, state: str):
    """Handle Google OAuth callback, exchange code for tokens."""
    state_doc = await _db.oauth_states.find_one({"state": state, "type": "gmail"})
    if not state_doc:
        raise HTTPException(status_code=400, detail="State invalide ou expire")

    user_id = state_doc["user_id"]
    await _db.oauth_states.delete_one({"state": state})

    logger.info(f"Gmail callback - client_id: {GOOGLE_CLIENT_ID[:20]}... redirect_uri: {GOOGLE_REDIRECT_URI}")
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        })
        token_data = resp.json()
        logger.info(f"Token response: {token_data}")

    if "error" in token_data:
        logger.error(f"Google token exchange error: {token_data}")
        raise HTTPException(status_code=400, detail=f"Erreur Google: {token_data.get('error_description', token_data['error'])}")

    access_token = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 3600)

    if not refresh_token:
        raise HTTPException(status_code=400, detail="Google n'a pas fourni de refresh_token. Reessayez la connexion.")

    encrypted_refresh = _encrypt(refresh_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    await _db.email_accounts.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "email": GMAIL_FROM_ADDRESS,
            "refresh_token": encrypted_refresh,
            "access_token": access_token,
            "token_expires_at": expires_at,
            "is_active": True,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    logger.info(f"Gmail connected for user {user_id}: {GMAIL_FROM_ADDRESS}")

    return RedirectResponse(f"{FRONTEND_URL}/integrations?gmail=connected")


# =============================================
# ROUTE 3 — Gmail connection status
# =============================================

@gmail_router.get("/api/gmail/status")
async def gmail_status(request: Request):
    """Check if Gmail is connected."""
    user = await _require_auth(request)

    account = await _db.email_accounts.find_one(
        {"user_id": user.user_id, "is_active": True},
        {"_id": 0, "refresh_token": 0, "access_token": 0},
    )

    if account:
        return {
            "connected": True,
            "email": account.get("email", ""),
            "since": account.get("connected_at", ""),
        }
    return {"connected": False}


@gmail_router.post("/api/gmail/disconnect")
async def gmail_disconnect(request: Request):
    """Disconnect Gmail account."""
    user = await _require_auth(request)
    await _db.email_accounts.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Gmail deconnecte"}


# =============================================
# TOKEN REFRESH HELPER
# =============================================

async def _get_valid_access_token(user_id: str) -> Optional[str]:
    """Get a valid access token, refreshing if needed."""
    account = await _db.email_accounts.find_one({"user_id": user_id, "is_active": True})
    if not account:
        return None

    expires_at = account.get("token_expires_at", "")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) < exp - timedelta(minutes=5):
                return account["access_token"]
        except Exception:
            pass

    refresh_token = _decrypt(account["refresh_token"])

    async with httpx.AsyncClient() as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        })
        data = resp.json()

    if "error" in data:
        logger.error(f"Token refresh failed for {user_id}: {data}")
        return None

    new_access = data["access_token"]
    new_expires = (datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))).isoformat()

    await _db.email_accounts.update_one(
        {"user_id": user_id},
        {"$set": {
            "access_token": new_access,
            "token_expires_at": new_expires,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return new_access


async def _get_any_active_token() -> tuple:
    """Get any active account's token (for cron jobs)."""
    account = await _db.email_accounts.find_one({"is_active": True})
    if not account:
        return None, None
    token = await _get_valid_access_token(account["user_id"])
    return token, account["user_id"]


# =============================================
# SEND EMAIL via Gmail API
# =============================================

@gmail_router.post("/api/emails/send")
async def send_email(request: Request):
    """Send an email via Gmail API."""
    user = await _require_auth(request)
    body = await request.json()

    to = body.get("to", "")
    subject = body.get("subject", "")
    html = body.get("html", "")
    email_type = body.get("type", "general")
    lead_id = body.get("lead_id")
    quote_id = body.get("quote_id")
    invoice_id = body.get("invoice_id")

    if not to or not subject:
        raise HTTPException(status_code=400, detail="'to' et 'subject' sont obligatoires")

    access_token = await _get_valid_access_token(user.user_id)
    if not access_token:
        raise HTTPException(status_code=400, detail="Gmail non connecte. Connectez votre compte Gmail d'abord.")

    message_id = await _send_gmail_message(access_token, to, subject, html)

    email_record = {
        "email_id": f"email_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}",
        "gmail_message_id": message_id,
        "from_email": GMAIL_FROM_ADDRESS,
        "to_email": to,
        "subject": subject,
        "type": email_type,
        "lead_id": lead_id,
        "quote_id": quote_id,
        "invoice_id": invoice_id,
        "direction": "sent",
        "sent_by": user.user_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.emails.insert_one(email_record)

    if lead_id:
        await _db.interactions.insert_one({
            "lead_id": lead_id,
            "type": "email_sent",
            "content": f"Email envoye: {subject}",
            "user_id": user.user_id,
            "metadata": {"gmail_message_id": message_id, "to": to, "email_type": email_type},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await _db.activity_logs.insert_one({
            "action": "email_sent",
            "entity_type": "lead",
            "entity_id": lead_id,
            "user_id": user.user_id,
            "details": f"Email envoye a {to}: {subject}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "message": "Email envoye avec succes",
        "gmail_message_id": message_id,
        "email_id": email_record["email_id"],
    }


async def _send_gmail_message(access_token: str, to: str, subject: str, html: str, in_reply_to: str = None, pdf_data: bytes = None, pdf_filename: str = None) -> str:
    """Send a message via Gmail API with optional PDF attachment."""
    from email.mime.base import MIMEBase
    from email import encoders as email_encoders
    if pdf_data:
        msg = MIMEMultipart("mixed")
        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(html, "html"))
        msg.attach(alt)
        pdf_part = MIMEBase("application", "pdf")
        pdf_part.set_payload(pdf_data)
        email_encoders.encode_base64(pdf_part)
        pdf_part.add_header("Content-Disposition", "attachment", filename=pdf_filename or "devis.pdf")
        msg.attach(pdf_part)
    else:
        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(html, "html"))
    msg["From"] = f"{GMAIL_FROM_NAME} <{GMAIL_FROM_ADDRESS}>"
    msg["To"] = to
    msg["Subject"] = subject
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={"raw": raw},
        )

    if resp.status_code != 200:
        logger.error(f"Gmail send failed: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=500, detail=f"Erreur envoi Gmail: {resp.text}")

    result = resp.json()
    return result.get("id", "")


# =============================================
# SEND SPECIFIC EMAIL TYPES (used by CRM)
# =============================================

async def send_quote_email(user_id: str, lead: dict, quote: dict, pdf_data: bytes = None) -> bool:
    """Send a premium quote email with PDF attachment."""
    # Essayer avec user_id d'abord, puis fallback sur n'importe quel compte actif
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        logger.warning(f"No token for user {user_id}, trying any active account")
        access_token, _ = await _get_any_active_token()
    if not access_token:
        logger.error("No Gmail token available at all")
        return False
    logger.info(f"Gmail token obtained for quote email to {lead.get('email')}")

    # Auto-générer PDF si non fourni
    if pdf_data is None:
        try:
            from integrations import generate_quote_pdf
            pdf_buffer = generate_quote_pdf(quote, lead)
            pdf_data = pdf_buffer.read()
            logger.info(f"PDF auto-generated: {len(pdf_data)} bytes")
        except Exception as e:
            logger.warning(f"PDF auto-generation failed: {e}")

    amount_ht = quote.get("amount", 0)
    prenom = lead.get("name", "").split()[0] if lead.get("name") else "Client"
    nom_complet = lead.get("name", "Client")
    service_type = quote.get("service_type", lead.get("service_type", "Nettoyage"))
    quote_id = quote.get("quote_id", "—")
    adresse = lead.get("address", lead.get("adresse", "—"))
    telephone = lead.get("phone", lead.get("telephone", "—"))
    date_devis = datetime.now().strftime("%d/%m/%Y")
    validite = "30 jours"

    # Emoji service
    service_icons = {"Ménage":"🏠","menage":"🏠","Canapé":"🛋️","canape":"🛋️","Matelas":"🛏️","matelas":"🛏️","Tapis":"🪣","tapis":"🪣","Bureaux":"🏢","bureaux":"🏢"}
    svc_icon = next((v for k,v in service_icons.items() if k.lower() in service_type.lower()), "🧹")

    # Détails prestations
    details_text = quote.get("details", "")
    # Parser détails — ignorer infos client et conditions (déjà affichées ailleurs)
    SKIP = ('CLIENT','Email :','Telephone :','Adresse :','Date souhaitee',
            'CONDITIONS','- Devis valable','- Paiement','- Intervention sous','- Produits')
    details_rows = ""
    in_prestations = False
    if details_text:
        for line in details_text.split("\n"):
            line = line.strip()
            if not line: continue
            if any(line.startswith(s) for s in SKIP): continue
            if "===" in line:
                section = line.replace("=","").strip()
                in_prestations = any(k in section.upper() for k in ["PRESTATION","MENAGE","NETTOYAGE","SERVICE"])
                if in_prestations:
                    details_rows += f'<tr><td colspan="2" style="padding:10px 16px 4px;font-weight:800;color:#f97316;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #fed7aa;background:#fff7ed;">{section}</td></tr>'
                continue
            if not in_prestations: continue
            line_c = line.lstrip("•- ").strip()
            if ":" in line_c:
                parts = line_c.split(":",1)
                lbl = parts[0].strip().replace("-","").strip().title()
                val = parts[1].strip()
                if lbl and val:
                    details_rows += f'<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;width:35%;font-weight:600;">{lbl}</td><td style="padding:8px 16px;color:#1e293b;font-size:13px;font-weight:700;">{val}</td></tr>'
            elif line_c:
                details_rows += f'<tr><td colspan="2" style="padding:6px 16px;color:#475569;font-size:13px;">• {line_c}</td></tr>'

    steps_html = ''.join([
        f'<div style="flex:1;text-align:center;"><div style="width:36px;height:36px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 8px;color:white;font-weight:900;font-size:14px;">' + str(n) + '</div><p style="color:#64748b;font-size:11px;margin:0;font-weight:600;">' + s + '</p></div>'
        for n, s in [("1","Vous acceptez"),("2","On planifie"),("3","On intervient"),("4","Satisfait")]
    ])
    now_dt_email = datetime.now()
    short_ref = quote_id.replace('quote_','').upper()[:6]
    gch_ref = f"GCH-{now_dt_email.strftime('%m%Y')}-{short_ref}"
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Votre Devis — Global Clean Home</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

<!-- Wrapper -->
<div style="max-width:640px;margin:40px auto;padding:0 16px 40px;">

  <!-- HEADER LOGO -->
  <div style="text-align:center;padding:32px 0 24px;">
    <div style="display:inline-flex;align-items:center;gap:12px;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;">🏠</div>
      <div style="text-align:left;">
        <p style="margin:0;font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">Global Clean Home</p>
        <p style="margin:0;font-size:12px;color:#64748b;font-weight:500;">Nettoyage Professionnel Paris & IDF</p>
      </div>
    </div>
  </div>

  <!-- CARD PRINCIPALE -->
  <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

    <!-- BANNIÈRE HERO -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#1e3a5f 100%);padding:40px 36px;text-align:center;position:relative;">
      <div style="font-size:52px;margin-bottom:12px;">{svc_icon}</div>
      <div style="display:inline-block;background:rgba(249,115,22,0.2);border:1px solid rgba(249,115,22,0.4);color:#fb923c;font-size:11px;font-weight:700;padding:4px 14px;border-radius:100px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">DEVIS PERSONNALISÉ N° {gch_ref}</div>
      <h1 style="color:white;margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-0.5px;">Votre devis gratuit</h1>
      <p style="color:rgba(255,255,255,0.6);margin:0;font-size:14px;">Établi le {date_devis} · Valable {validite}</p>
    </div>

    <!-- CORPS -->
    <div style="padding:36px;">

      <!-- SALUTATION -->
      <p style="color:#1e293b;font-size:17px;font-weight:700;margin:0 0 8px;">Bonjour {prenom} 👋</p>
      <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0 0 28px;">
        Suite à votre demande de devis pour un service de <strong style="color:#f97316;">{service_type}</strong>, 
        nous avons le plaisir de vous adresser notre proposition personnalisée. 
        Notre équipe a étudié vos besoins avec attention pour vous offrir la meilleure prestation au juste prix.
      </p>

      <!-- MONTANT PRINCIPAL -->
      <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b);border-radius:16px;padding:28px;text-align:center;margin:0 0 24px;">
        <p style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">Montant de la prestation</p>
        <p style="color:white;font-size:48px;font-weight:900;margin:0;letter-spacing:-2px;line-height:1.1;">
          {amount_ht:,.0f}<span style="font-size:24px;font-weight:500;"> €</span>
        </p>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:10px 0 0;">
          Micro-entreprise — TVA non applicable (art. 293B CGI)
        </p>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">
          <span style="background:rgba(249,115,22,0.2);color:#fb923c;font-size:12px;font-weight:700;padding:6px 16px;border-radius:100px;border:1px solid rgba(249,115,22,0.3);">
            ✅ Devis valable 30 jours · Sans engagement
          </span>
        </div>
      </div>

      <!-- INFOS CLIENT -->
      <div style="background:#f8fafc;border-radius:14px;padding:20px;margin:0 0 24px;border:1px solid #e2e8f0;">
        <p style="color:#0f172a;font-size:13px;font-weight:700;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">📋 Informations du devis</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;width:40%;">Client</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:13px;">{nom_complet}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Service</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:13px;">{svc_icon} {service_type}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Adresse</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:13px;">{adresse}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Référence</td>
            <td style="padding:6px 0;color:#f97316;font-weight:700;font-size:13px;">{quote_id}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Date</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:13px;">{date_devis}</td>
          </tr>
        </table>
      </div>

      <!-- DÉTAIL PRESTATIONS -->
      {'<div style="margin:0 0 24px;"><p style="color:#0f172a;font-size:13px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">🔍 Détail des prestations</p><table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">' + details_rows + '</table></div>' if details_rows else ''}

      <!-- GARANTIES -->
      <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-radius:14px;padding:20px;margin:0 0 24px;border:1px solid #bbf7d0;">
        <p style="color:#15803d;font-size:13px;font-weight:700;margin:0 0 12px;">🛡️ Nos engagements qualité</p>
        <div style="display:grid;gap:8px;">
          {''.join(f'<div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:white;font-weight:900;">✓</div><p style="margin:0;color:#166534;font-size:13px;">{g}</p></div>' for g in [
            "Matériel et produits professionnels fournis",
            "Personnel formé, expérimenté et assuré (RC Pro)",
            "Résultat garanti ou intervention reprise gratuitement",
            "Devis valable 30 jours, sans engagement",
            "Attestation fiscale fournie (crédit d'impôt 50% éligible)"
          ])}
        </div>
      </div>

      <!-- ÉTAPES SUIVANTES -->
      <div style="margin:0 0 28px;">
        <p style="color:#0f172a;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">📌 Prochaines étapes</p>
        <div style="display:flex;gap:0;position:relative;">
          {steps_html}
        </div>
      </div>

      <!-- CTA BOUTONS -->
      <div style="text-align:center;margin:28px 0 8px;">
        <p style="color:#64748b;font-size:13px;margin:0 0 16px;">Des questions ? Contactez-nous directement :</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <a href="tel:+33622665308"
            style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f97316,#ea580c);color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 16px rgba(249,115,22,0.35);">
            📞 06 22 66 53 08
          </a>
          <a href="https://wa.me/33622665308?text=Bonjour%2C%20j%27ai%20re%C3%A7u%20mon%20devis%20{gch_ref}"
            style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 16px rgba(37,211,102,0.35);">
            💬 WhatsApp
          </a>
          <a href="mailto:info@globalcleanhome.com"
            style="display:inline-flex;align-items:center;gap:8px;background:#0f172a;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
            ✉️ Email
          </a>
        </div>
      </div>

    </div><!-- /corps -->

    <!-- FOOTER CARD -->
    <div style="background:#0f172a;padding:24px 36px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <p style="color:white;font-weight:800;margin:0 0 3px;font-size:14px;">Global Clean Home</p>
          <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">231 rue Saint-Honoré, 75001 Paris</p>
        </div>
        <div style="text-align:right;">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 2px;">www.globalcleanhome.com</p>
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">info@globalcleanhome.com</p>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:16px;padding-top:16px;text-align:center;">
        <p style="color:rgba(255,255,255,0.25);font-size:10px;margin:0;">
          Ce devis a été établi suite à votre demande. Il est confidentiel et valable 30 jours.
          Global Clean Home — SIRET disponible sur demande.
        </p>
      </div>
    </div>

  </div><!-- /card -->

  <!-- BADGE CONFIANCE -->
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">
      🔒 Vos données sont protégées · 🌿 Produits écologiques · ⭐ 4.9/5 sur Google
    </p>
  </div>

</div><!-- /wrapper -->
</body></html>"""

    try:
        # Nom fichier PDF professionnel
        client_name_clean = "".join(c if c.isalnum() or c in "_ -" else "_" for c in lead.get("name","Client")).strip()
        now_dt = datetime.now()
        pdf_filename = f"Devis_GCH_{now_dt.strftime('%m%Y')}_{client_name_clean}.pdf"

        msg_id = await _send_gmail_message(
            access_token,
            lead.get("email", ""),
            f"✅ Votre devis Global Clean Home — {lead.get('name', 'Client')}",
            html,
            pdf_data=pdf_data,
            pdf_filename=pdf_filename,
        )
        await _db.emails.insert_one({
            "email_id": f"email_{os.urandom(6).hex()}",
            "gmail_message_id": msg_id,
            "from_email": GMAIL_FROM_ADDRESS,
            "to_email": lead.get("email", ""),
            "subject": f"Votre devis personnalise - Global Clean Home",
            "type": "quote",
            "lead_id": lead.get("lead_id"),
            "quote_id": quote.get("quote_id"),
            "direction": "sent",
            "sent_by": user_id,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await _db.interactions.insert_one({
            "lead_id": lead.get("lead_id"),
            "type": "email_sent",
            "content": f"Devis envoye par email a {lead.get('email', '')}",
            "user_id": user_id,
            "metadata": {"gmail_message_id": msg_id, "type": "quote"},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send quote email: {e}")
        return False


async def send_invoice_email(user_id: str, lead: dict, invoice: dict, pdf_data: bytes = None) -> bool:
    """Send a premium invoice email with PDF attachment."""
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        access_token, _ = await _get_any_active_token()
    if not access_token:
        logger.error("No Gmail token for invoice email")
        return False

    # Auto-générer PDF facture si non fourni
    if pdf_data is None:
        try:
            from exports import generate_invoice_pdf_bytes
            pdf_data = generate_invoice_pdf_bytes(invoice, lead)
            logger.info(f"Invoice PDF generated: {len(pdf_data)} bytes")
        except Exception as e:
            logger.warning(f"Invoice PDF generation failed: {e}")

    prenom_inv = lead.get("name", "Client").split()[0]
    nom_complet_inv = lead.get("name", "Client")
    invoice_id = invoice.get("invoice_id", "—")
    amount_ttc = invoice.get("amount_ttc", 0)
    amount_ht = invoice.get("amount_ht", amount_ttc)
    service_inv = invoice.get("service_type", lead.get("service_type", "Nettoyage"))
    date_facture = datetime.now().strftime("%d/%m/%Y")
    date_echeance = invoice.get("due_date", "")
    statut_paiement = invoice.get("status", "en_attente")
    adresse_inv = lead.get("address", lead.get("adresse", "—"))

    statut_badge = {
        "payée": ("✅ PAYÉE", "#15803d", "#f0fdf4", "#bbf7d0"),
        "en_attente": ("⏳ EN ATTENTE", "#92400e", "#fffbeb", "#fde68a"),
        "en_retard": ("⚠️ EN RETARD", "#991b1b", "#fef2f2", "#fecaca"),
    }.get(statut_paiement, ("⏳ EN ATTENTE", "#92400e", "#fffbeb", "#fde68a"))

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Facture {invoice_id} — Global Clean Home</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

<div style="max-width:640px;margin:40px auto;padding:0 16px 40px;">

  <!-- HEADER -->
  <div style="text-align:center;padding:32px 0 24px;">
    <div style="display:inline-flex;align-items:center;gap:12px;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;">🏠</div>
      <div style="text-align:left;">
        <p style="margin:0;font-size:20px;font-weight:900;color:#0f172a;">Global Clean Home</p>
        <p style="margin:0;font-size:12px;color:#64748b;">Nettoyage Professionnel Paris & IDF</p>
      </div>
    </div>
  </div>

  <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

    <!-- BANNIÈRE -->
    <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:36px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🧾</div>
      <div style="display:inline-block;background:{statut_badge[2]};border:1px solid {statut_badge[3]};color:{statut_badge[1]};font-size:11px;font-weight:700;padding:5px 16px;border-radius:100px;letter-spacing:1px;margin-bottom:14px;">{statut_badge[0]}</div>
      <h1 style="color:white;margin:0 0 6px;font-size:26px;font-weight:900;">FACTURE</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;">N° {invoice_id} · Émise le {date_facture}</p>
    </div>

    <div style="padding:36px;">

      <!-- MONTANT -->
      <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b);border-radius:16px;padding:28px;text-align:center;margin:0 0 24px;">
        <p style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">Montant Total</p>
        <p style="color:white;font-size:52px;font-weight:900;margin:0;letter-spacing:-2px;line-height:1;">
          {amount_ttc:,.2f}<span style="font-size:24px;font-weight:500;"> €</span>
        </p>
        <p style="color:rgba(255,255,255,0.35);font-size:11px;margin:10px 0 0;">Micro-entreprise — TVA non applicable (art. 293B CGI)</p>
        {f'<p style="color:rgba(255,255,255,0.5);font-size:12px;margin:8px 0 0;">⏰ Échéance : {date_echeance}</p>' if date_echeance else ''}
      </div>

      <!-- RÉCAPITULATIF -->
      <div style="background:#f8fafc;border-radius:14px;padding:20px;margin:0 0 24px;border:1px solid #e2e8f0;">
        <p style="color:#0f172a;font-size:13px;font-weight:700;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">📋 Récapitulatif</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-size:13px;">Client</td>
            <td style="padding:10px 0;color:#1e293b;font-weight:600;font-size:13px;text-align:right;">{nom_complet_inv}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-size:13px;">Service</td>
            <td style="padding:10px 0;color:#1e293b;font-weight:600;font-size:13px;text-align:right;">{service_inv}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-size:13px;">Adresse</td>
            <td style="padding:10px 0;color:#1e293b;font-weight:600;font-size:13px;text-align:right;">{adresse_inv}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-size:13px;">Référence</td>
            <td style="padding:10px 0;color:#f97316;font-weight:700;font-size:13px;text-align:right;">{invoice_id}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b;font-size:13px;">Montant HT</td>
            <td style="padding:10px 0;color:#1e293b;font-weight:700;font-size:14px;text-align:right;">{amount_ht:,.2f} €</td>
          </tr>
        </table>
      </div>

      <!-- PAIEMENT SI EN ATTENTE -->
      {'<div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:14px;padding:20px;margin:0 0 24px;border:1px solid #fde68a;"><p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 8px;">💳 Paiement sécurisé</p><p style="color:#78350f;font-size:13px;margin:0 0 16px;line-height:1.6;">Votre facture est en attente de règlement. Vous pouvez payer par virement, carte bancaire ou chèque.</p><div style="text-align:center;"><a href="mailto:info@globalcleanhome.com?subject=Paiement facture ' + invoice_id + '" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Régler ma facture</a></div></div>' if statut_paiement == "en_attente" else ""}

      <!-- MERCI -->
      <div style="background:#f0fdf4;border-radius:14px;padding:20px;margin:0 0 24px;border:1px solid #bbf7d0;text-align:center;">
        <p style="font-size:28px;margin:0 0 8px;">🙏</p>
        <p style="color:#15803d;font-weight:700;font-size:15px;margin:0 0 6px;">Merci pour votre confiance, {prenom_inv} !</p>
        <p style="color:#166534;font-size:13px;margin:0;line-height:1.6;">Nous espérons que notre intervention a répondu à vos attentes. N'hésitez pas à nous laisser un avis ou à nous recontacter pour tout futur besoin.</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <a href="tel:+33622665308"
            style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f97316,#ea580c);color:white;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px;">
            📞 Nous appeler
          </a>
          <a href="https://wa.me/33622665308"
            style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:white;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px;">
            💬 WhatsApp
          </a>
          <a href="https://g.page/r/globalcleanhome/review"
            style="display:inline-flex;align-items:center;gap:8px;background:#4285F4;color:white;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px;">
            ⭐ Laisser un avis
          </a>
        </div>
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background:#0f172a;padding:24px 36px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <p style="color:white;font-weight:800;margin:0 0 3px;font-size:14px;">Global Clean Home</p>
          <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">231 rue Saint-Honoré, 75001 Paris</p>
        </div>
        <div style="text-align:right;">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 2px;">www.globalcleanhome.com</p>
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">info@globalcleanhome.com</p>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:16px;padding-top:16px;text-align:center;">
        <p style="color:rgba(255,255,255,0.25);font-size:10px;margin:0;">
          Document officiel — Global Clean Home · SIRET disponible sur demande · Paris & IDF
        </p>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">🔒 Document confidentiel · ⭐ 4.9/5 sur Google · 🌿 Entreprise éco-responsable</p>
  </div>

</div>
</body></html>"""

    try:
        client_name = "".join(c if c.isalnum() or c in "_ -" else "_" for c in lead.get("name","Client")).strip()
        invoice_filename = f"Facture_GCH_{datetime.now().strftime('%m%Y')}_{client_name}.pdf"
        msg_id = await _send_gmail_message(
            access_token,
            lead.get("email", ""),
            f"🧾 Votre facture Global Clean Home — {lead.get('name', 'Client')}",
            html,
            pdf_data=pdf_data,
            pdf_filename=invoice_filename,
        )
        await _db.emails.insert_one({
            "email_id": f"email_{os.urandom(6).hex()}",
            "gmail_message_id": msg_id,
            "from_email": GMAIL_FROM_ADDRESS,
            "to_email": lead.get("email", ""),
            "subject": f"Facture Global Clean Home",
            "type": "invoice",
            "lead_id": lead.get("lead_id"),
            "invoice_id": invoice.get("invoice_id"),
            "direction": "sent",
            "sent_by": user_id,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send invoice email: {e}")
        return False


async def send_followup_email(user_id: str, lead: dict, quote: dict) -> bool:
    """Send an automatic follow-up email J+2."""
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        return False

    prenom_fu = lead.get("name", "Client").split()[0]
    svc_fu = quote.get("service_type", lead.get("service_type", "nettoyage"))
    montant_fu = quote.get("amount", 0)
    quote_id_fu = quote.get("quote_id", "—")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:640px;margin:40px auto;padding:0 16px 40px;">
  <div style="text-align:center;padding:24px 0;">
    <p style="margin:0;font-size:18px;font-weight:900;color:#0f172a;">🏠 Global Clean Home</p>
  </div>
  <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">🔔</div>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">Votre devis vous attend !</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Un petit rappel de notre part</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 8px;">Bonjour {prenom_fu} 👋</p>
      <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0 0 20px;">
        Nous espérons que vous avez eu l'occasion de consulter notre devis pour votre <strong style="color:#f97316;">{svc_fu}</strong>. 
        Nous sommes prêts à intervenir selon vos disponibilités !
      </p>
      <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:14px;padding:20px;margin:0 0 20px;border:1px solid #fed7aa;text-align:center;">
        <p style="color:#c2410c;font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Votre devis N° {quote_id_fu}</p>
        <p style="color:#9a3412;font-size:36px;font-weight:900;margin:0;">{montant_fu:,.0f} €</p>
        <p style="color:#c2410c;font-size:12px;margin:6px 0 0;">TVA non applicable · Valable encore quelques jours</p>
      </div>
      <div style="background:#fef9c3;border-radius:12px;padding:16px;margin:0 0 24px;border:1px solid #fde047;">
        <p style="color:#713f12;font-size:13px;font-weight:600;margin:0;">⏰ N'attendez pas trop longtemps !</p>
        <p style="color:#854d0e;font-size:12px;margin:4px 0 0;line-height:1.6;">Notre agenda se remplit vite. Confirmez dès maintenant pour obtenir le créneau de votre choix.</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <a href="tel:+33622665308"
            style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f97316,#ea580c);color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
            📞 Confirmer par téléphone
          </a>
          <a href="https://wa.me/33622665308?text=Bonjour%2C%20je%20confirme%20mon%20devis%20{quote_id_fu}"
            style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
            💬 Confirmer WhatsApp
          </a>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;line-height:1.6;">
        Vous souhaitez modifier quelque chose ? Aucun problème !<br>
        Contactez-nous et nous adapterons le devis à vos besoins.
      </p>
    </div>
    <div style="background:#0f172a;padding:20px 32px;text-align:center;">
      <p style="color:white;font-weight:700;margin:0 0 3px;font-size:13px;">Global Clean Home</p>
      <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">www.globalcleanhome.com · 06 22 66 53 08</p>
    </div>
  </div>
</div>
</body></html>"""

    try:
        msg_id = await _send_gmail_message(access_token, lead.get("email", ""), f"Relance devis - Global Clean Home", html)
        await _db.emails.insert_one({
            "email_id": f"email_{os.urandom(6).hex()}",
            "gmail_message_id": msg_id,
            "from_email": GMAIL_FROM_ADDRESS,
            "to_email": lead.get("email", ""),
            "subject": "Relance devis - Global Clean Home",
            "type": "followup",
            "lead_id": lead.get("lead_id"),
            "quote_id": quote.get("quote_id"),
            "direction": "sent",
            "sent_by": "system",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        await _db.interactions.insert_one({
            "lead_id": lead.get("lead_id"),
            "type": "auto_followup",
            "content": f"Relance automatique J+2 envoyee a {lead.get('email', '')}",
            "user_id": "system",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return True
    except Exception as e:
        logger.error(f"Failed to send followup email: {e}")
        return False


# =============================================
# GMAIL SYNC — Read incoming emails
# =============================================


@gmail_router.get("/api/gmail/test-send")
async def test_send_email_get(request: Request):
    """Test sending email - no auth needed for diagnostics"""
    to_email = request.query_params.get("to", "pepemssie7@gmail.com")
    
    access_token, uid = await _get_any_active_token()
    if not access_token:
        return {"error": "No Gmail token available", "connected": False}
    
    html = f"""<!DOCTYPE html><html><body>
    <h2 style="color:#f97316;">✅ Test Global Clean Home</h2>
    <p>Gmail fonctionne correctement.</p>
    <p><b>Envoyé à:</b> {to_email}</p>
    <p><b>Token user:</b> {uid}</p>
    <p><b>Heure:</b> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
    </body></html>"""
    
    try:
        msg_id = await _send_gmail_message(access_token, to_email, "✅ Test Gmail Global Clean Home", html)
        return {{"success": True, "message_id": msg_id, "to": to_email, "token_user": uid}}
    except Exception as e:
        logger.error(f"Test send failed: {{e}}")
        return {{"error": str(e), "to": to_email}}

@gmail_router.get("/api/gmail/sync")
async def gmail_sync(request: Request):
    """Sync incoming emails from Gmail inbox."""
    user = await _require_auth(request)
    access_token = await _get_valid_access_token(user.user_id)
    if not access_token:
        raise HTTPException(status_code=400, detail="Gmail non connecte")

    synced, errors = await _sync_inbox(access_token, user.user_id)

    return {"message": f"{synced} emails synchronises", "synced": synced, "errors": errors}


async def _sync_inbox(access_token: str, user_id: str) -> tuple:
    """Sync unread inbox emails and match to leads."""
    last_sync = await _db.email_sync_state.find_one({"user_id": user_id}, {"_id": 0})
    after_ts = ""
    if last_sync and last_sync.get("last_sync_at"):
        try:
            dt = datetime.fromisoformat(last_sync["last_sync_at"].replace("Z", "+00:00"))
            after_ts = str(int(dt.timestamp()))
        except Exception:
            pass

    query = "in:inbox is:unread"
    if after_ts:
        query += f" after:{after_ts}"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"q": query, "maxResults": 50},
        )

    if resp.status_code != 200:
        logger.error(f"Gmail list failed: {resp.text}")
        return 0, 1

    messages = resp.json().get("messages", [])
    synced = 0
    errors = 0

    for msg_ref in messages:
        try:
            async with httpx.AsyncClient() as client:
                detail_resp = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_ref['id']}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"format": "full"},
                )
            if detail_resp.status_code != 200:
                errors += 1
                continue

            msg_data = detail_resp.json()
            headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
            # Format full inclut le corps complet

            from_email = headers.get("From", "")
            # Extract email from "Name <email>" format
            if "<" in from_email and ">" in from_email:
                from_email = from_email.split("<")[1].split(">")[0]

            subject = headers.get("Subject", "")
            in_reply_to = headers.get("In-Reply-To", "")
            msg_date = headers.get("Date", "")

            # Check if already synced
            existing = await _db.emails.find_one({"gmail_message_id": msg_ref["id"]})
            if existing:
                continue

            # Find matching lead by email
            lead = await _db.leads.find_one({"email": from_email}, {"_id": 0})

            # Also try matching via In-Reply-To header
            if not lead and in_reply_to:
                sent_email = await _db.emails.find_one({"gmail_message_id": in_reply_to})
                if sent_email and sent_email.get("lead_id"):
                    lead = await _db.leads.find_one({"lead_id": sent_email["lead_id"]}, {"_id": 0})

            # Extraire le corps du message
            body_text = ""
            snippet = msg_data.get("snippet", "")
            payload = msg_data.get("payload", {})
            
            def extract_body(payload):
                if payload.get("mimeType") == "text/plain":
                    data = payload.get("body", {}).get("data", "")
                    if data:
                        import base64
                        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
                for part in payload.get("parts", []):
                    result = extract_body(part)
                    if result:
                        return result
                return ""
            
            body_text = extract_body(payload) or snippet
            # Nettoyer le corps
            body_text = body_text[:2000] if body_text else ""
            
            await _db.emails.insert_one({
                "email_id": f"email_{os.urandom(6).hex()}",
                "gmail_message_id": msg_ref["id"],
                "from_email": from_email,
                "to_email": GMAIL_FROM_ADDRESS,
                "subject": subject,
                "type": "inbound",
                "lead_id": lead.get("lead_id") if lead else None,
                "direction": "received",
                "body": body_text,
                "snippet": snippet,
                "received_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            if lead:
                await _db.interactions.insert_one({
                    "lead_id": lead["lead_id"],
                    "type": "email_received",
                    "content": f"Email recu de {from_email}: {subject}",
                    "user_id": "system",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

                await _db.leads.update_one(
                    {"lead_id": lead["lead_id"]},
                    {"$set": {"status": "contacte", "updated_at": datetime.now(timezone.utc).isoformat()}},
                )

                await _db.notifications.insert_one({
                    "notification_id": f"notif_{os.urandom(6).hex()}",
                    "user_id": user_id,
                    "type": "email_received",
                    "title": f"Email recu de {lead.get('name', from_email)}",
                    "message": subject,
                    "entity_type": "lead",
                    "entity_id": lead["lead_id"],
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

            synced += 1

        except Exception as e:
            logger.error(f"Error syncing message {msg_ref.get('id')}: {e}")
            errors += 1

    await _db.email_sync_state.update_one(
        {"user_id": user_id},
        {"$set": {"last_sync_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    return synced, errors


# =============================================
# AUTO FOLLOW-UP — Check and send J+2 follow-ups
# =============================================

@gmail_router.get("/api/automations/check-followups")
async def check_followups(request: Request):
    """Check for quotes that need a J+2 follow-up."""
    user = await _require_auth(request)

    access_token = await _get_valid_access_token(user.user_id)
    if not access_token:
        raise HTTPException(status_code=400, detail="Gmail non connecte")

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    quotes = await _db.quotes.find({
        "status": "envoyé",
        "created_at": {"$lt": cutoff},
        "followup_sent_at": {"$exists": False},
    }, {"_id": 0}).to_list(100)

    sent = 0
    skipped = 0

    for quote in quotes:
        lead_id = quote.get("lead_id")
        if not lead_id:
            skipped += 1
            continue

        has_reply = await _db.interactions.find_one({
            "lead_id": lead_id,
            "type": "email_received",
            "created_at": {"$gt": quote.get("created_at", "")},
        })
        if has_reply:
            skipped += 1
            continue

        lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        if not lead or not lead.get("email"):
            skipped += 1
            continue

        success = await send_followup_email(user.user_id, lead, quote)
        if success:
            await _db.quotes.update_one(
                {"quote_id": quote["quote_id"]},
                {"$set": {"followup_sent_at": datetime.now(timezone.utc).isoformat()}},
            )
            sent += 1
        else:
            skipped += 1

    return {"message": f"{sent} relance(s) envoyee(s)", "sent": sent, "skipped": skipped}


# =============================================
# EMAIL HISTORY for a lead
# =============================================

@gmail_router.get("/api/emails/lead/{lead_id}")
async def get_lead_emails(lead_id: str, request: Request):
    """Get all emails for a specific lead."""
    await _require_auth(request)

    emails = await _db.emails.find(
        {"lead_id": lead_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)

    return {"emails": emails, "count": len(emails)}


@gmail_router.get("/api/emails/stats")
async def get_email_stats(request: Request):
    """Get email statistics."""
    await _require_auth(request)

    total_sent = await _db.emails.count_documents({"direction": "sent"})
    total_received = await _db.emails.count_documents({"direction": "received"})
    total_followups = await _db.emails.count_documents({"type": "followup"})

    return {
        "total_sent": total_sent,
        "total_received": total_received,
        "total_followups": total_followups,
    }

async def send_confirmation_email(to_email: str, client_name: str, service_type: str, services: list = None):
    """Envoie un email de confirmation automatique au prospect."""
    
    # Mapping des types de services
    services_map = {
        'menage': 'ménage à domicile',
        'menage-domicile': 'ménage à domicile',
        'nettoyage-canape': 'nettoyage de canapé',
        'canape': 'nettoyage de canapé',
        'nettoyage-matelas': 'nettoyage de matelas',
        'matelas': 'nettoyage de matelas',
        'nettoyage-tapis': 'nettoyage de tapis',
        'tapis': 'nettoyage de tapis',
        'nettoyage-bureaux': 'nettoyage de bureaux',
        'bureaux': 'nettoyage de bureaux',
    }
    service_label = services_map.get(service_type, service_type)
    prenom = client_name.split()[0] if client_name else 'cher(e) client(e)'
    
    subject = "Votre demande de devis a bien ete recue - Global Clean Home"
    
    dark_css_conf = """<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){body{background-color:#0f172a!important;color:#f1f5f9!important;}.container{background:#1e293b!important;border:1px solid #334155!important;}.header{background:linear-gradient(135deg,#1d4ed8,#6d28d9)!important;}.body div{background:#1e293b!important;color:#f1f5f9!important;}.greeting{color:#f8fafc!important;}.message,.message *{color:#cbd5e1!important;}.highlight-box{background:#1e3a5f!important;border-left:4px solid #3b82f6!important;}.highlight-box p,.highlight-box strong{color:#e2e8f0!important;}.step-number{background:#4c1d95!important;color:white!important;}.step-text{color:#cbd5e1!important;}.step-text strong{color:#f1f5f9!important;}.contact{background:#0f172a!important;border:1px solid #334155!important;}.contact p,.contact a{color:#94a3b8!important;}.footer{background:#020617!important;}.footer p{color:#64748b!important;}.cta a{background:linear-gradient(135deg,#1d4ed8,#6d28d9)!important;}p{color:#cbd5e1!important;}strong{color:#f1f5f9!important;}}</style>"""
    
    html_body = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">{dark_css_conf}
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 40px 30px; text-align: center; }}
    .header img {{ width: 60px; height: 60px; margin-bottom: 12px; }}
    .header h1 {{ color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; }}
    .header p {{ color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0; }}
    .body {{ padding: 36px 32px; }}
    .greeting {{ font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }}
    .message {{ font-size: 15px; color: #475569; line-height: 1.7; margin-bottom: 20px; }}
    .highlight-box {{ background: linear-gradient(135deg, #eff6ff, #f5f3ff); border-left: 4px solid #2563eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0; }}
    .highlight-box p {{ margin: 6px 0; font-size: 14px; color: #334155; }}
    .highlight-box strong {{ color: #1e40af; }}
    .steps {{ margin: 24px 0; }}
    .step {{ display: flex; align-items: flex-start; margin-bottom: 16px; }}
    .step-number {{ background: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; margin-right: 14px; margin-top: 2px; }}
    .step-text {{ font-size: 14px; color: #475569; line-height: 1.6; }}
    .step-text strong {{ color: #1e293b; }}
    .cta {{ text-align: center; margin: 28px 0; }}
    .cta a {{ background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; }}
    .contact {{ background: #f8fafc; border-radius: 8px; padding: 18px 20px; margin: 20px 0; text-align: center; }}
    .contact p {{ margin: 4px 0; font-size: 14px; color: #64748b; }}
    .contact a {{ color: #2563eb; text-decoration: none; font-weight: 600; }}
    .footer {{ background: #1e293b; padding: 24px 32px; text-align: center; }}
    .footer p {{ color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0; }}
    .footer a {{ color: rgba(255,255,255,0.8); text-decoration: none; }}
    .checkmark {{ color: #10b981; font-size: 48px; text-align: center; margin-bottom: 8px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:48px; margin-bottom:12px;">✨</div>
      <h1>Global Clean Home</h1>
      <p>Nettoyage Professionnel à Paris & Île-de-France</p>
    </div>
    
    <div class="body">
      <div class="checkmark">✅</div>
      <div class="greeting">Bonjour {prenom},</div>
      
      <p class="message">
        Nous avons bien reçu votre demande de devis pour un <strong>{service_label}</strong> 
        et nous vous en remercions chaleureusement.
      </p>
      
      <p class="message">
        Notre équipe prend votre demande très au sérieux et s'engage à vous fournir 
        un devis personnalisé dans les <strong>meilleurs délais</strong>.
      </p>

      <div class="highlight-box">
        <p>📋 <strong>Service demandé :</strong> {service_label.capitalize()}</p>
        <p>⏱️ <strong>Délai de réponse :</strong> Sous 24h ouvrées</p>
        <p>💼 <strong>Un conseiller dédié</strong> vous contactera personnellement</p>
      </div>

      <p class="message" style="font-weight: 600; color: #1e293b;">Voici comment va se dérouler la suite :</p>
      
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-text">
            <strong>Analyse de votre demande</strong><br>
            Notre équipe étudie attentivement vos besoins pour vous préparer une offre sur mesure.
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-text">
            <strong>Envoi de votre devis personnalisé</strong><br>
            Vous recevrez un devis détaillé et transparent, sans frais cachés.
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-text">
            <strong>Prise de contact par votre conseiller</strong><br>
            Un conseiller vous appellera pour répondre à toutes vos questions et planifier l'intervention.
          </div>
        </div>
      </div>

      <p class="message">
        En attendant, n'hésitez pas à nous contacter directement si vous avez 
        des questions ou si vous souhaitez accélérer le traitement de votre dossier.
      </p>

      <div class="contact">
        <p>📞 <a href="tel:+33622665308">06 22 66 53 08</a></p>
        <p>📧 <a href="mailto:contact@globalcleanhome.com">contact@globalcleanhome.com</a></p>
        <p>💬 <a href="https://wa.me/33622665308">WhatsApp</a></p>
      </div>

      <div class="cta">
        <a href="https://www.globalcleanhome.com">Visiter notre site</a>
      </div>

      <p class="message" style="font-style: italic; color: #94a3b8; font-size: 13px; text-align: center;">
        Merci de votre confiance. Nous mettons tout en œuvre pour vous offrir 
        un service d'excellence. 🌟
      </p>
    </div>
    
    <div class="footer">
      <p><strong style="color:white;">Global Clean Home</strong></p>
      <p>Nettoyage professionnel à Paris & Île-de-France</p>
      <p style="margin-top:8px;">
        <a href="https://www.globalcleanhome.com">www.globalcleanhome.com</a> | 
        <a href="tel:+33622665308">06 22 66 53 08</a>
      </p>
    </div>
  </div>
</body>
</html>
"""

    # Envoyer via Gmail API
    try:
        token, user_id = await _get_any_active_token()
        if not token:
            logger.warning("Gmail non connecté - email de confirmation non envoyé")
            return
            
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{GMAIL_FROM_NAME} <{GMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))
        
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"raw": raw}
            )
        logger.info(f"Email de confirmation envoyé à {to_email}")
    except Exception as e:
        logger.error(f"Erreur envoi email confirmation: {e}")


async def send_invitation_email(to_email: str, member_name: str, role: str, company_name: str = "Global Clean Home", invite_link: str = None):
    """Envoie un email d'invitation à un nouveau collaborateur."""
    
    if not invite_link:
        invite_link = "https://crm.globalcleanhome.com/auth/register"
    
    subject = f"Invitation à rejoindre {company_name} - CRM"
    
    dark_css = """<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){body{background-color:#0f172a!important;color:#f1f5f9!important;}.container{background:#1e293b!important;}.header{background:linear-gradient(135deg,#1d4ed8,#6d28d9)!important;}.highlight-box{background:#1e3a5f!important;border-left:4px solid #3b82f6!important;color:#e2e8f0!important;}}</style>"""
    
    html_body = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">{dark_css}
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 40px 30px; text-align: center; }}
    .header h1 {{ color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; }}
    .body {{ padding: 36px 32px; }}
    .greeting {{ font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }}
    .message {{ font-size: 15px; color: #475569; line-height: 1.7; margin-bottom: 20px; }}
    .highlight-box {{ background: linear-gradient(135deg, #eff6ff, #f5f3ff); border-left: 4px solid #2563eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0; }}
    .highlight-box p {{ margin: 6px 0; font-size: 14px; color: #334155; }}
    .role-badge {{ background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block; }}
    .cta {{ text-align: center; margin: 28px 0; }}
    .cta a {{ background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; }}
    .cta a:hover {{ opacity: 0.95; }}
    .details {{ background: #f8fafc; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }}
    .detail-row {{ display: flex; margin-bottom: 12px; }}
    .detail-label {{ font-weight: 600; color: #1e293b; width: 120px; }}
    .detail-value {{ color: #475569; }}
    .footer {{ background: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; }}
    .footer p {{ margin: 4px 0; font-size: 13px; color: #64748b; }}
    .footer a {{ color: #2563eb; text-decoration: none; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue à bord !</h1>
      <p>Invitation à rejoindre {company_name}</p>
    </div>
    
    <div class="body">
      <p class="greeting">Bonjour {member_name},</p>
      
      <p class="message">
        Vous avez été invité à rejoindre l'équipe <strong>{company_name}</strong> en tant que <span class="role-badge">{role}</span>.
      </p>
      
      <div class="highlight-box">
        <p><strong>🔐 Vos accès :</strong></p>
        <p>En tant que <strong>{role}</strong>, vous avez accès à :</p>
        <ul style="margin: 8px 0; padding-left: 20px; color: #334155;">
          <li>Dashboard et analytics</li>
          <li>Gestion des leads et devis</li>
          <li>Planification des interventions</li>
          <li>Communications avec les clients</li>
          <li>Et bien plus selon votre rôle...</li>
        </ul>
      </div>
      
      <div class="details">
        <div class="detail-row">
          <div class="detail-label">Entreprise :</div>
          <div class="detail-value">{company_name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Rôle :</div>
          <div class="detail-value"><strong>{role}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Email :</div>
          <div class="detail-value">{to_email}</div>
        </div>
      </div>
      
      <p class="message">
        Cliquez sur le bouton ci-dessous pour activer votre compte et commencer à utiliser le CRM :
      </p>
      
      <div class="cta">
        <a href="{invite_link}">Activer mon compte</a>
      </div>
      
      <p class="message" style="font-size: 13px; color: #64748b;">
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
        <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; word-break: break-all;">{invite_link}</code>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>{company_name}</strong></p>
      <p>Vous avez des questions ? Contactez l'administrateur de votre équipe.</p>
      <p style="margin-top: 12px;">
        <a href="https://crm.globalcleanhome.com">Accéder au CRM</a>
      </p>
    </div>
  </div>
</body>
</html>
"""

    # Envoyer via Gmail API
    try:
        token, user_id = await _get_any_active_token()
        if not token:
            logger.warning(f"Gmail non connecté - email d'invitation à {to_email} non envoyé")
            return False
            
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{GMAIL_FROM_NAME} <{GMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))
        
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"raw": raw},
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Email d'invitation envoyé à {to_email} (Rôle: {role})")
                return True
            else:
                logger.error(f"Erreur Gmail: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Erreur envoi email invitation à {to_email}: {str(e)}")
        return False

