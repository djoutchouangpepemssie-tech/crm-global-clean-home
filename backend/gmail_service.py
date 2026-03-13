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

    async with httpx.AsyncClient() as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        })
        token_data = resp.json()

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
    """Send a quote email to a lead."""
    access_token = await _get_valid_access_token(user_id)
    if not access_token:
        logger.warning("Gmail not connected, cannot send quote email")
        return False

    amount_ttc = quote.get("amount", 0) * 1.2
    html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7C3AED, #6D28D9); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Global Clean Home</h1>
            <p style="color: #DDD6FE; margin: 8px 0 0; font-size: 14px;">Services de nettoyage professionnel</p>
        </div>
        <div style="padding: 32px; background: white; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e293b;">Bonjour {lead.get('name', '')},</h2>
            <p style="color: #475569; line-height: 1.6;">Nous avons le plaisir de vous transmettre votre devis pour notre service de <strong>{quote.get('service_type', '')}</strong>.</p>
            <div style="background: #f8fafc; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Service :</strong> {quote.get('service_type', '')}</p>
                <p style="margin: 4px 0;"><strong>Montant HT :</strong> {quote.get('amount', 0):,.2f} EUR</p>
                <p style="margin: 4px 0;"><strong>Montant TTC :</strong> {amount_ttc:,.2f} EUR</p>
            </div>
            <p style="color: #475569;">N'hesitez pas a nous contacter pour toute question.</p>
            <p style="color: #475569;">Cordialement,<br><strong>L'equipe Global Clean Home</strong></p>
        </div>
        <div style="padding: 16px; background: #f8fafc; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Global Clean Home - www.globalcleanhome.com</p>
        </div>
    </div>
    """

    try:
        msg_id = await _send_gmail_message(
            access_token,
            lead.get("email", ""),
            f"Votre devis nettoyage - Global Clean Home",
            html,
        )

        await _db.emails.insert_one({
            "email_id": f"email_{os.urandom(6).hex()}",
            "gmail_message_id": msg_id,
            "from_email": GMAIL_FROM_ADDRESS,
            "to_email": lead.get("email", ""),
            "subject": f"Votre devis nettoyage - Global Clean Home",
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
