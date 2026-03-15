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
GOOGLE_SCOPES = os.environ.get("GOOGLE_SCOPES", "https://mail.google.com/")
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


async def _send_gmail_message(access_token: str, to: str, subject: str, html: str, in_reply_to: str = None) -> str:
    """Send a message via Gmail API and return the message ID."""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{GMAIL_FROM_NAME} <{GMAIL_FROM_ADDRESS}>"
    msg["To"] = to
    msg["Subject"] = subject
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to

    msg.attach(MIMEText(html, "html"))

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

async def send_quote_email(user_id: str, lead: dict, quote: dict) -> bool:
    """Send a quote email to a lead with full details."""
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        logger.warning("Gmail not connected, cannot send quote email")
        return False

    amount_ht = quote.get("amount", 0)
    amount_ttc = amount_ht * 1.2
    prenom = lead.get("name", "").split()[0] if lead.get("name") else "Client"

    # Formater les details du devis en HTML
    details_text = quote.get("details", "")
    details_html = ""
    if details_text:
        lines = details_text.split("\n")
        details_html = '<div style="background:#f8fafc;border-radius:8px;padding:20px;margin:16px 0;border:1px solid #e2e8f0;">'
        details_html += '<h3 style="color:#1e293b;margin:0 0 12px;font-size:15px;">Detail des prestations</h3>'
        for line in lines:
            if not line.strip():
                details_html += "<br>"
            elif "===" in line:
                label = line.replace("=", "").strip()
                details_html += f'<p style="font-weight:700;color:#7C3AED;margin:12px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">{label}</p>'
            elif line.startswith("  -") or line.startswith("   -"):
                details_html += f'<p style="color:#475569;margin:2px 0 2px 16px;font-size:13px;">{line.strip()}</p>'
            elif line.startswith("CLIENT") or line.startswith("Email") or line.startswith("Adresse") or line.startswith("Telephone"):
                details_html += f'<p style="color:#1e293b;font-weight:600;margin:4px 0;font-size:13px;">{line}</p>'
            else:
                details_html += f'<p style="color:#475569;margin:2px 0;font-size:13px;">{line}</p>'
        details_html += "</div>"

    dark_css = """<meta name="color-scheme" content="light dark">
<style>
@media (prefers-color-scheme: dark) {
  body { background-color: #1e1e2e !important; }
  .eb { background-color: #2d2d3f !important; color: #e2e8f0 !important; }
  .et { color: #cbd5e1 !important; }
  .eh { color: #f1f5f9 !important; }
  .ec { background-color: #3d3d50 !important; border-color: #4d4d60 !important; }
  .pbox { background: linear-gradient(135deg, #2d1b6b, #1e3a7a) !important; }
  .gbox { background-color: #052e16 !important; }
  .hbox { background-color: #1e3a5f !important; border-left-color: #3b82f6 !important; }
  .ef { background-color: #111827 !important; }
  .step-n { background: #4c1d95 !important; }
  .cbox { background-color: #1e293b !important; }
}
</style>"""
    html = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">{dark_css}</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<div style="max-width:620px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,#7C3AED,#2563eb);padding:36px 32px;text-align:center;">
<div style="font-size:40px;margin-bottom:8px;">📄</div>
<h1 style="color:white;margin:0;font-size:22px;">Votre Devis Personnalise</h1>
<p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Global Clean Home - Nettoyage Professionnel</p>
</div>
<div style="padding:36px 32px;">
<h2 style="color:#1e293b;margin:0 0 16px;">Bonjour {prenom},</h2>
<p style="color:#475569;line-height:1.7;">Suite a votre demande, nous avons le plaisir de vous adresser votre devis personnalise. Notre equipe a analyse vos besoins avec soin pour vous proposer une prestation adaptee au meilleur rapport qualite-prix.</p>
<div style="background:linear-gradient(135deg,#f5f3ff,#eff6ff);border-radius:12px;padding:24px;margin:20px 0;text-align:center;border:1px solid #ddd6fe;">
<p style="color:#6d28d9;font-size:13px;font-weight:600;margin:0 0 8px;text-transform:uppercase;">Montant du devis</p>
<p style="color:#1e293b;font-size:36px;font-weight:800;margin:0;">{amount_ht:,.0f} EUR</p>
<p style="color:#64748b;font-size:12px;margin:4px 0 0;">HT - soit {amount_ttc:,.0f} EUR TTC (TVA 20%)</p>
</div>
{details_html}
<div style="background:#f0fdf4;border-radius:8px;padding:16px 20px;margin:20px 0;border:1px solid #bbf7d0;">
<p style="color:#166534;font-weight:700;margin:0 0 8px;">Nos engagements</p>
<p style="color:#15803d;margin:3px 0;font-size:13px;">Produits professionnels et materiel fourni</p>
<p style="color:#15803d;margin:3px 0;font-size:13px;">Personnel forme et experimente</p>
<p style="color:#15803d;margin:3px 0;font-size:13px;">Resultats garantis ou intervention reprise</p>
<p style="color:#15803d;margin:3px 0;font-size:13px;">Devis valable 30 jours</p>
</div>
<div style="text-align:center;margin:28px 0;">
<a href="tel:+33622665308" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#2563eb);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:0 6px;">Nous appeler</a>
<a href="https://wa.me/33622665308" style="display:inline-block;background:#25D366;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:0 6px;">WhatsApp</a>
</div>
</div>
<div style="background:#1e293b;padding:20px 32px;text-align:center;">
<p style="color:white;font-weight:700;margin:0 0 4px;">Global Clean Home</p>
<p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">www.globalcleanhome.com | 06 22 66 53 08 | contact@globalcleanhome.com</p>
</div>
</div></body></html>"""

    try:
        msg_id = await _send_gmail_message(
            access_token,
            lead.get("email", ""),
            f"Votre devis personnalise - Global Clean Home",
            html,
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


async def send_invoice_email(user_id: str, lead: dict, invoice: dict) -> bool:
    """Send an invoice email to a lead."""
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        return False

    html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7C3AED, #6D28D9); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Global Clean Home</h1>
        </div>
        <div style="padding: 32px; background: white; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e293b;">Bonjour {lead.get('name', '')},</h2>
            <p style="color: #475569;">Veuillez trouver ci-joint votre facture.</p>
            <div style="background: #f8fafc; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Facture :</strong> {invoice.get('invoice_id', '')}</p>
                <p style="margin: 4px 0;"><strong>Montant TTC :</strong> {invoice.get('amount_ttc', 0):,.2f} EUR</p>
            </div>
            <p style="color: #475569;">Merci pour votre confiance.</p>
        </div>
    </div>
    """

    try:
        msg_id = await _send_gmail_message(access_token, lead.get("email", ""), f"Facture Global Clean Home - {invoice.get('invoice_id', '')}", html)
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

    html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7C3AED, #6D28D9); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Global Clean Home</h1>
        </div>
        <div style="padding: 32px; background: white; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e293b;">Bonjour {lead.get('name', '')},</h2>
            <p style="color: #475569; line-height: 1.6;">Nous souhaitons donner suite a notre devis pour le service <strong>{quote.get('service_type', '')}</strong>.</p>
            <p style="color: #475569; line-height: 1.6;">Avez-vous eu l'occasion de l'examiner ? Nous restons a votre disposition pour toute question ou modification.</p>
            <div style="background: #f8fafc; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Service :</strong> {quote.get('service_type', '')}</p>
                <p style="margin: 4px 0;"><strong>Montant TTC :</strong> {quote.get('amount', 0) * 1.2:,.2f} EUR</p>
            </div>
            <p style="color: #475569;">Cordialement,<br><strong>L'equipe Global Clean Home</strong></p>
        </div>
    </div>
    """

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
                    params={"format": "metadata", "metadataHeaders": ["From", "Subject", "In-Reply-To", "Date"]},
                )
            if detail_resp.status_code != 200:
                errors += 1
                continue

            msg_data = detail_resp.json()
            headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}

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

            await _db.emails.insert_one({
                "email_id": f"email_{os.urandom(6).hex()}",
                "gmail_message_id": msg_ref["id"],
                "from_email": from_email,
                "to_email": GMAIL_FROM_ADDRESS,
                "subject": subject,
                "type": "inbound",
                "lead_id": lead.get("lead_id") if lead else None,
                "direction": "received",
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

async def send_confirmation_email(to_email: str, client_name: str, service_type: str):
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
    
    dark_css_conf = """<meta name="color-scheme" content="light dark"><style>@media (prefers-color-scheme: dark){body{background-color:#1e1e2e!important;}.container{background:#2d2d3f!important;}.body{background:#2d2d3f!important;color:#e2e8f0!important;}.greeting{color:#f1f5f9!important;}.message{color:#cbd5e1!important;}.highlight-box{background:#1e3a5f!important;border-left-color:#3b82f6!important;}.highlight-box p{color:#cbd5e1!important;}.step-number{background:#4c1d95!important;}.step-text{color:#cbd5e1!important;}.contact{background:#1e293b!important;}.footer{background:#0f172a!important;}}</style>"""
    
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

