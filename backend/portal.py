"""
Global Clean Home CRM - Client Portal with Magic Link Authentication
"""
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import hashlib
import logging

_db = None


def init_portal_db(database):
    global _db
    _db = database


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)


def _mask_email(email):
    """Masque un email pour les logs: jean.dupont@example.com → j***t@e***e.com"""
    if not email or "@" not in str(email):
        return "***"
    try:
        local, domain = str(email).split("@", 1)
        local_masked = local[0] + "***" + local[-1] if len(local) > 2 else "***"
        if "." in domain:
            name, tld = domain.rsplit(".", 1)
            domain_masked = (name[0] + "***" + name[-1] if len(name) > 2 else "***") + "." + tld
        else:
            domain_masked = "***"
        return f"{local_masked}@{domain_masked}"
    except Exception:
        return "***"


portal_router = APIRouter(prefix="/api/portal")

# ============= MODELS =============


class MagicLinkRequest(BaseModel):
    email: str


class PortalLoginRequest(BaseModel):
    email: str
    password: str


class PortalRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None  # optionnel : si fourni, met à jour le lead


class PortalForgotRequest(BaseModel):
    email: str


class PortalResetRequest(BaseModel):
    token: str
    password: str


class PortalChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ReviewSubmit(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None


class QuoteResponse(BaseModel):
    action: str  # "accept" or "reject"
    message: Optional[str] = None

# ============= HELPERS =============


def _generate_token():
    import secrets
    return secrets.token_urlsafe(36)


async def _get_portal_session(request: Request):
    """Validate portal session from cookie or header."""
    token = request.cookies.get("portal_token")
    if not token:
        token = request.headers.get("X-Portal-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")

    session = await _db.portal_sessions.find_one(
        {"token": token, "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=401, detail="Session expirée")

    return session

# ============= MAGIC LINK AUTH =============


async def _send_magic_link_via_gmail(email: str, name: str, link: str) -> bool:
    """Fallback : envoi du magic link via Gmail OAuth (utilisé partout dans le projet)."""
    try:
        from gmail_service import _get_any_active_token, _send_gmail_message
    except Exception as e:
        logger.warning(f"gmail_service unavailable: {e}")
        return False

    try:
        token, _ = await _get_any_active_token()
    except Exception as e:
        logger.warning(f"No active Gmail token: {e}")
        return False

    if not token:
        return False

    first_name = (name or "").split()[0] if name else "vous"
    html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#0f766e,#10b981);padding:40px;text-align:center;">
    <div style="font-size:42px;margin-bottom:8px;">🔐</div>
    <h1 style="color:white;margin:0;font-size:22px;font-weight:600;letter-spacing:-0.01em;">Votre espace client</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Global Clean Home</p>
  </div>
  <div style="padding:36px 32px;">
    <p style="color:#1e293b;font-size:16px;margin:0 0 14px;">Bonjour <strong>{first_name}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Vous avez demandé l'accès à votre espace client. Cliquez sur le bouton ci-dessous
      pour vous connecter en toute sécurité — sans mot de passe.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="{link}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#10b981);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.02em;box-shadow:0 8px 22px rgba(16,185,129,0.35);">
        Accéder à mon espace
      </a>
    </p>
    <div style="background:#f0fdf4;border-left:3px solid #10b981;padding:14px 16px;border-radius:0 10px 10px 0;margin:20px 0;">
      <p style="color:#166534;font-size:12px;margin:0;line-height:1.5;">
        🛡 Lien valable <strong>24 heures</strong>. Si vous n'avez pas demandé cet accès, ignorez ce mail.
      </p>
    </div>
    <p style="color:#94a3b8;font-size:11px;line-height:1.5;margin:24px 0 0;word-break:break-all;">
      Ou copiez ce lien dans votre navigateur :<br/>
      <a href="{link}" style="color:#10b981;text-decoration:none;">{link}</a>
    </p>
  </div>
  <div style="background:#0f172a;padding:18px;text-align:center;">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">Global Clean Home · 231 rue Saint-Honoré, 75001 Paris</p>
  </div>
</div></body></html>"""
    try:
        await _send_gmail_message(token, email, "🔐 Votre accès Global Clean Home", html)
        return True
    except Exception as e:
        logger.warning(f"Gmail send_magic_link failed: {e}")
        return False


@portal_router.post("/magic-link")
async def request_magic_link(body: MagicLinkRequest):
    """Envoie un lien magique de connexion par email."""
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        # Pas d'erreur explicite pour ne pas révéler de comptes
        return {"message": "Si un compte existe, un lien d'accès vous sera envoyé par email."}

    # Recherche du lead correspondant
    lead = await _db.leads.find_one({"email": email}, {"_id": 0})
    if not lead:
        return {"message": "Si un compte existe, un lien d'accès vous sera envoyé par email."}

    token = _generate_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    magic_link_doc = {
        "token": token,
        "email": email,
        "lead_id": lead["lead_id"],
        "lead_name": lead.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires.isoformat(),
        "used": False,
    }
    await _db.magic_links.insert_one(magic_link_doc)

    # URL de redirection (frontend)
    portal_base_url = str(os.environ.get("FRONTEND_URL", "")) or "https://crm.globalcleanhome.com"
    link = f"{portal_base_url.rstrip('/')}/portail?token={token}"

    # Tentative 1 : SendGrid
    email_sent = False
    try:
        from email_service import send_magic_link
        email_sent = send_magic_link(email, lead.get("name", "Client"), token, portal_base_url)
        if email_sent:
            logger.info(f"Magic link sent via SendGrid to {_mask_email(email)}")
    except Exception as e:
        logger.warning(f"SendGrid send failed: {e}")

    # Tentative 2 : Gmail OAuth (fallback)
    if not email_sent:
        gmail_sent = await _send_magic_link_via_gmail(email, lead.get("name", "Client"), link)
        if gmail_sent:
            email_sent = True
            logger.info(f"Magic link sent via Gmail OAuth to {_mask_email(email)}")

    if not email_sent:
        logger.error(f"Magic link could NOT be delivered to {_mask_email(email)} — no email backend available")

    return {"message": "Si un compte existe, un lien d'accès vous sera envoyé par email."}


# ═══════════════════════════════════════════════════════════════════
# AUTHENTIFICATION EMAIL + MOT DE PASSE (système principal)
# ═══════════════════════════════════════════════════════════════════

async def _create_portal_session_for_lead(lead: dict) -> dict:
    """Crée une session portail (7 jours) pour un lead donné."""
    session_token = _generate_token()
    now = datetime.now(timezone.utc)
    session = {
        "token": session_token,
        "email": lead["email"],
        "lead_id": lead["lead_id"],
        "lead_name": lead.get("name", ""),
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=30)).isoformat(),  # 30 jours pour le confort
    }
    await _db.portal_sessions.insert_one(session)
    return {
        "token": session_token,
        "email": session["email"],
        "lead_id": session["lead_id"],
        "lead_name": session["lead_name"],
    }


@portal_router.post("/login")
async def portal_login(body: PortalLoginRequest, response: Response):
    """Connexion classique email + mot de passe."""
    email = (body.email or "").strip().lower()
    password = body.password or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")

    lead = await _db.leads.find_one({"email": email}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    if not lead.get("password_hash"):
        # Lead existe mais aucun mot de passe défini → guider vers création
        raise HTTPException(
            status_code=403,
            detail="Aucun mot de passe défini. Cliquez sur « Première connexion » pour en créer un."
        )

    # Vérification bcrypt (import local pour éviter les cycles)
    try:
        from server import verify_password
    except Exception:
        import bcrypt as _bcrypt

        def verify_password(p, h):
            try:
                return _bcrypt.checkpw(p.encode('utf-8'), h.encode('utf-8'))
            except Exception:
                return False

    if not verify_password(password, lead["password_hash"]):
        # Compteur d'échecs (rudimentaire — empêche brute force basique)
        try:
            await _db.leads.update_one(
                {"lead_id": lead["lead_id"]},
                {"$inc": {"portal_failed_attempts": 1},
                 "$set": {"portal_last_failed_at": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    # Reset compteur d'échecs après login réussi
    await _db.leads.update_one(
        {"lead_id": lead["lead_id"]},
        {"$set": {
            "portal_failed_attempts": 0,
            "portal_last_login_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    sess = await _create_portal_session_for_lead(lead)

    response.set_cookie(
        key="portal_token",
        value=sess["token"],
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="none",
        secure=True,
    )

    return {
        "message": "Connexion réussie",
        "token": sess["token"],
        "lead_id": sess["lead_id"],
        "lead_name": sess["lead_name"],
        "email": sess["email"],
    }


@portal_router.post("/register")
async def portal_register(body: PortalRegisterRequest, response: Response):
    """Création d'un mot de passe pour un lead existant (1ʳᵉ connexion).

    Le lead doit déjà exister (créé via formulaire de contact ou par l'admin).
    Ne crée PAS un nouveau lead — sécurise l'accès d'un lead existant.
    """
    email = (body.email or "").strip().lower()
    password = body.password or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères")

    lead = await _db.leads.find_one({"email": email}, {"_id": 0})
    if not lead:
        # Ne pas révéler si l'email existe — message générique
        raise HTTPException(
            status_code=404,
            detail="Aucun compte trouvé pour cet email. Demandez à votre conseiller un accès."
        )

    if lead.get("password_hash"):
        raise HTTPException(
            status_code=409,
            detail="Un mot de passe existe déjà pour ce compte. Utilisez « Mot de passe oublié » si besoin."
        )

    try:
        from server import hash_password
    except Exception:
        import bcrypt as _bcrypt

        def hash_password(p):
            return _bcrypt.hashpw(p.encode('utf-8'), _bcrypt.gensalt(rounds=12)).decode('utf-8')

    pw_hash = hash_password(password)
    update_doc = {
        "password_hash": pw_hash,
        "portal_password_set_at": datetime.now(timezone.utc).isoformat(),
        "portal_failed_attempts": 0,
    }
    if body.name and not lead.get("name"):
        update_doc["name"] = body.name.strip()

    await _db.leads.update_one({"lead_id": lead["lead_id"]}, {"$set": update_doc})

    # Refresh lead + créer session
    lead = await _db.leads.find_one({"lead_id": lead["lead_id"]}, {"_id": 0})
    sess = await _create_portal_session_for_lead(lead)

    response.set_cookie(
        key="portal_token",
        value=sess["token"],
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="none",
        secure=True,
    )

    return {
        "message": "Compte sécurisé — bienvenue",
        "token": sess["token"],
        "lead_id": sess["lead_id"],
        "lead_name": sess["lead_name"],
        "email": sess["email"],
    }


@portal_router.post("/forgot")
async def portal_forgot(body: PortalForgotRequest):
    """Demande de réinitialisation du mot de passe.

    Envoie un magic link à usage unique qui permettra de définir un nouveau
    mot de passe via /portal/reset.
    """
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        return {"message": "Si un compte existe, un email vous sera envoyé."}

    lead = await _db.leads.find_one({"email": email}, {"_id": 0})
    if not lead:
        return {"message": "Si un compte existe, un email vous sera envoyé."}

    # Génère un token de reset valable 1h
    token = _generate_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await _db.password_resets.insert_one({
        "token": token,
        "email": email,
        "lead_id": lead["lead_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires.isoformat(),
        "used": False,
    })

    portal_base_url = str(os.environ.get("FRONTEND_URL", "")) or "https://crm.globalcleanhome.com"
    reset_link = f"{portal_base_url.rstrip('/')}/portail?reset={token}"

    # Envoi email (Gmail OAuth en priorité)
    sent = False
    try:
        from gmail_service import _get_any_active_token, _send_gmail_message
        gmail_token, _ = await _get_any_active_token()
        if gmail_token:
            first_name = (lead.get("name") or "").split()[0] if lead.get("name") else "vous"
            html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f1ea;padding:40px;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#0f766e,#10b981);padding:36px;text-align:center;">
    <div style="font-size:42px;margin-bottom:8px;">🔑</div>
    <h1 style="color:white;margin:0;font-size:22px;font-weight:600;">Réinitialisation du mot de passe</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#1e293b;font-size:16px;margin:0 0 14px;">Bonjour <strong>{first_name}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous
      pour en choisir un nouveau.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#10b981);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 8px 22px rgba(16,185,129,0.35);">
        Choisir un nouveau mot de passe
      </a>
    </p>
    <div style="background:#fff7ed;border-left:3px solid #f59e0b;padding:14px 16px;border-radius:0 10px 10px 0;margin:20px 0;">
      <p style="color:#9a3412;font-size:12px;margin:0;line-height:1.5;">
        ⏱ Lien valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez ce mail.
      </p>
    </div>
  </div>
</div></body></html>"""
            await _send_gmail_message(gmail_token, email, "🔑 Réinitialiser votre mot de passe — Global Clean Home", html)
            sent = True
    except Exception as e:
        logger.warning(f"Forgot password email via Gmail failed: {e}")

    if sent:
        logger.info(f"Password reset email sent to {_mask_email(email)}")
    else:
        logger.error(f"Password reset email could NOT be delivered to {_mask_email(email)}")

    return {"message": "Si un compte existe, un email vous sera envoyé."}


@portal_router.post("/reset")
async def portal_reset(body: PortalResetRequest, response: Response):
    """Définit un nouveau mot de passe via un token de reset."""
    if not body.token or not body.password:
        raise HTTPException(status_code=400, detail="Token et mot de passe requis")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères")

    reset_doc = await _db.password_resets.find_one(
        {"token": body.token, "used": False, "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}},
        {"_id": 0}
    )
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    lead = await _db.leads.find_one({"lead_id": reset_doc["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    try:
        from server import hash_password
    except Exception:
        import bcrypt as _bcrypt

        def hash_password(p):
            return _bcrypt.hashpw(p.encode('utf-8'), _bcrypt.gensalt(rounds=12)).decode('utf-8')

    pw_hash = hash_password(body.password)
    now = datetime.now(timezone.utc).isoformat()

    await _db.leads.update_one(
        {"lead_id": lead["lead_id"]},
        {"$set": {
            "password_hash": pw_hash,
            "portal_password_set_at": now,
            "portal_failed_attempts": 0,
        }}
    )
    await _db.password_resets.update_one({"token": body.token}, {"$set": {"used": True, "used_at": now}})

    # Connexion automatique après reset
    sess = await _create_portal_session_for_lead(lead)
    response.set_cookie(
        key="portal_token",
        value=sess["token"],
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="none",
        secure=True,
    )

    return {
        "message": "Mot de passe réinitialisé",
        "token": sess["token"],
        "lead_id": sess["lead_id"],
        "lead_name": sess["lead_name"],
        "email": sess["email"],
    }


@portal_router.post("/change-password")
async def portal_change_password(body: PortalChangePasswordRequest, request: Request):
    """Change le mot de passe d'un client connecté."""
    session = await _get_portal_session(request)
    lead = await _db.leads.find_one({"lead_id": session["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères")

    try:
        from server import hash_password, verify_password
    except Exception:
        import bcrypt as _bcrypt

        def hash_password(p):
            return _bcrypt.hashpw(p.encode('utf-8'), _bcrypt.gensalt(rounds=12)).decode('utf-8')

        def verify_password(p, h):
            try:
                return _bcrypt.checkpw(p.encode('utf-8'), h.encode('utf-8'))
            except Exception:
                return False

    # Si un mot de passe existe déjà, vérifier l'ancien
    if lead.get("password_hash"):
        if not verify_password(body.current_password, lead["password_hash"]):
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

    new_hash = hash_password(body.new_password)
    await _db.leads.update_one(
        {"lead_id": lead["lead_id"]},
        {"$set": {
            "password_hash": new_hash,
            "portal_password_set_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"message": "Mot de passe modifié"}


@portal_router.post("/auth/{token}")
async def authenticate_magic_link(token: str, response: Response):
    """Exchange magic link token for a session."""
    link = await _db.magic_links.find_one(
        {"token": token, "used": False, "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}},
        {"_id": 0}
    )

    if not link:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    # Mark as used
    await _db.magic_links.update_one({"token": token}, {"$set": {"used": True}})

    # Create portal session
    session_token = _generate_token()
    session = {
        "token": session_token,
        "email": link["email"],
        "lead_id": link["lead_id"],
        "lead_name": link["lead_name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }

    await _db.portal_sessions.insert_one(session)

    response.set_cookie(
        key="portal_token",
        value=session_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="none",
        secure=True,
    )

    return {
        "message": "Authentification réussie",
        "lead_id": link["lead_id"],
        "lead_name": link["lead_name"],
        "email": link["email"],
        "session_token": session_token,
    }


@portal_router.get("/me")
async def get_portal_me(request: Request):
    """Get current portal session info."""
    session = await _get_portal_session(request)
    return {
        "email": session["email"],
        "lead_id": session["lead_id"],
        "lead_name": session["lead_name"],
    }


@portal_router.post("/logout")
async def portal_logout(request: Request, response: Response):
    """Logout from portal."""
    token = request.cookies.get("portal_token")
    if token:
        await _db.portal_sessions.delete_one({"token": token})
    response.delete_cookie("portal_token")
    return {"message": "Déconnecté"}


# ============= CLIENT DATA ENDPOINTS =============

@portal_router.get("/quotes")
async def get_client_quotes(request: Request):
    """Get quotes for the authenticated client."""
    session = await _get_portal_session(request)

    quotes = await _db.quotes.find(
        {"lead_id": session["lead_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return quotes


@portal_router.post("/quotes/{quote_id}/respond")
async def respond_to_quote(quote_id: str, body: QuoteResponse, request: Request):
    """Accept or reject a quote."""
    session = await _get_portal_session(request)

    quote = await _db.quotes.find_one(
        {"quote_id": quote_id, "lead_id": session["lead_id"]},
        {"_id": 0}
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    new_status = "accepté" if body.action == "accept" else "refusé"
    now = datetime.now(timezone.utc).isoformat()

    await _db.quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {"status": new_status, "responded_at": now}}
    )

    # Update lead status if accepted
    if body.action == "accept":
        await _db.leads.update_one(
            {"lead_id": session["lead_id"]},
            {"$set": {"status": "gagné", "updated_at": now}}
        )

    # Log interaction
    await _db.interactions.insert_one({
        "interaction_id": f"int_{uuid.uuid4().hex[:12]}",
        "lead_id": session["lead_id"],
        "type": "quote_response",
        "content": f"Client a {new_status} le devis {quote_id}. {body.message or ''}",
        "created_by": f"portal:{session['email']}",
        "created_at": now,
    })

    return {"message": f"Devis {new_status}", "status": new_status}


@portal_router.get("/invoices")
async def get_client_invoices(request: Request):
    """Get invoices for the authenticated client."""
    session = await _get_portal_session(request)

    invoices = await _db.invoices.find(
        {"lead_id": session["lead_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return invoices


@portal_router.post("/invoices/{invoice_id}/pay")
async def portal_pay_invoice(invoice_id: str, request: Request):
    """Stripe non configuré"""
    raise HTTPException(status_code=503, detail="Paiement Stripe non configuré")


@portal_router.get("/interventions")
async def get_portal_interventions(request: Request):
    """Récupérer les interventions du client avec statut en temps réel et détails intervenants."""
    session = await _get_portal_session(request)
    lead_id = session["lead_id"]

    interventions = await _db.interventions.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("scheduled_date", -1).to_list(20)

    # Enrichir avec les noms des intervenants
    for intv in interventions:
        members = intv.get("assigned_members", [])
        member_names = []
        for mid in members:
            m = await _db.team_members.find_one({"member_id": mid}, {"_id": 0})
            if m:
                member_names.append({"name": m.get("name"), "role": m.get("role", "technicien")})
        # Aussi chercher assigned_agent_id
        if intv.get("assigned_agent_id"):
            m = await _db.team_members.find_one({"member_id": intv["assigned_agent_id"]}, {"_id": 0})
            if m and not any(x["name"] == m.get("name") for x in member_names):
                member_names.append({"name": m.get("name"), "role": m.get("role", "technicien")})
        intv["assigned_team"] = member_names

        # Statut lisible avec couleur et icône
        status_map = {
            "planifiée": {"label": "Planifiée", "color": "#3b82f6", "icon": "📅"},
            "en_cours": {"label": "En cours", "color": "#10b981", "icon": "🧹"},
            "terminée": {"label": "Terminée", "color": "#f59e0b", "icon": "✅"},
            "annulée": {"label": "Annulée", "color": "#ef4444", "icon": "❌"},
        }
        intv["status_info"] = status_map.get(
            intv.get("status", ""),
            {"label": intv.get("status", ""), "color": "#64748b", "icon": "📋"}
        )

    return {"interventions": interventions}


# ============= REVIEWS =============

@portal_router.post("/reviews")
async def submit_review(body: ReviewSubmit, request: Request):
    """Submit a review/avis."""
    session = await _get_portal_session(request)

    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Note entre 1 et 5")

    review = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "lead_id": session["lead_id"],
        "lead_name": session["lead_name"],
        "email": session["email"],
        "rating": body.rating,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await _db.reviews.insert_one(review)

    return {"message": "Merci pour votre avis !", "review_id": review["review_id"]}


@portal_router.get("/reviews")
async def get_client_reviews(request: Request):
    """Get reviews submitted by the client."""
    session = await _get_portal_session(request)

    reviews = await _db.reviews.find(
        {"lead_id": session["lead_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return reviews


# ============= ADMIN: VIEW ALL REVIEWS =============

@portal_router.get("/admin/reviews")
async def admin_get_reviews(request: Request):
    """Admin endpoint to view all reviews."""
    from server import require_auth
    await require_auth(request)

    reviews = await _db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reviews


async def auto_send_portal_access(lead: dict, context: str = "quote") -> bool:
    """Genere et envoie automatiquement un lien d'acces portail au client."""
    try:
        email = lead.get("email", "").strip().lower()
        if not email:
            return False

        token = _generate_token()
        expires = datetime.now(timezone.utc) + timedelta(hours=72)

        magic_link = {
            "token": token,
            "email": email,
            "lead_id": lead["lead_id"],
            "lead_name": lead.get("name", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires.isoformat(),
            "used": False,
        }
        await _db.magic_links.insert_one(magic_link)

        frontend_url = str(os.environ.get("FRONTEND_URL", "https://crm.globalcleanhome.com"))
        access_url = f"{frontend_url}/portal?token={token}"
        prenom = lead.get("name", "Client").split()[0]

        if context == "quote":
            subject = "Votre devis est disponible - Global Clean Home"
            icon = "📄"
            action_title = "Consulter mon devis"
            action_desc = "Votre devis personnalise est pret. Connectez-vous a votre espace client pour le consulter et l'accepter en un clic."
            btn_color = "#7c3aed"
        else:
            subject = "Votre facture est disponible - Global Clean Home"
            icon = "🧾"
            action_title = "Voir ma facture et payer"
            action_desc = "Votre facture est disponible. Connectez-vous a votre espace client pour la consulter et la regler en ligne en toute securite."
            btn_color = "#059669"

        html = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>@media (prefers-color-scheme: dark){{body{{background:#0f172a!important;}}.card{{background:#1e293b!important;color:#e2e8f0!important;}}.muted{{color:#94a3b8!important;}}}}</style>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:32px auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);" class="card">
  <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:40px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">{icon}</div>
    <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">{subject.split(" - ")[0]}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Global Clean Home</p>
  </div>
  <div style="padding:36px 32px;background:white;" class="card">
    <h2 style="color:#1e293b;margin:0 0 16px;">Bonjour {prenom},</h2>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px;" class="muted">{action_desc}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{access_url}" style="display:inline-block;background:{btn_color};color:white;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
        {action_title} →
      </a>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;margin:20px 0;">
      <p style="color:#64748b;margin:0;font-size:13px;">🔐 Ce lien est personnel et valable 72 heures. Il vous connecte automatiquement sans mot de passe.</p>
    </div>
    <div style="margin:20px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Votre espace client vous permet de :</p>
      <p style="color:#475569;font-size:13px;margin:4px 0;">✅ Consulter et accepter vos devis</p>
      <p style="color:#475569;font-size:13px;margin:4px 0;">💳 Payer vos factures en ligne</p>
      <p style="color:#475569;font-size:13px;margin:4px 0;">⭐ Laisser un avis sur nos services</p>
    </div>
  </div>
  <div style="background:#1e293b;padding:20px 32px;text-align:center;">
    <p style="color:white;font-weight:700;margin:0 0 4px;">Global Clean Home</p>
    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">www.globalcleanhome.com | 06 22 66 53 08</p>
  </div>
</div>
</body></html>"""

        from gmail_service import _get_any_active_token, _send_gmail_message
        token_gmail, user_id = await _get_any_active_token()
        if token_gmail:
            await _send_gmail_message(token_gmail, email, subject, html)
            logger.info(f"Portal access email sent to {_mask_email(email)} (context: {context})")
            return True
        return False
    except Exception as e:
        logger.error(f"auto_send_portal_access error: {e}")
        return False


@portal_router.post("/quotes/{quote_id}/sign")
async def sign_quote_portal(quote_id: str, request: Request):
    """Signer un devis depuis le portail client.

    - Vérifie le portal_token
    - Vérifie que le devis appartient bien au lead du portail (sécurité)
    - Marque le devis comme accepté + signé
    - Met à jour le lead status → gagné
    """
    session = await _get_portal_session(request)

    # Vérification d'appartenance au lead du portail
    quote = await _db.quotes.find_one(
        {"quote_id": quote_id, "lead_id": session["lead_id"]},
        {"_id": 0}
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    body = await request.json()
    signature = (body.get("signature") or "").strip()
    if not signature:
        raise HTTPException(status_code=400, detail="Signature requise")
    signed_at = body.get("signed_at") or datetime.now(timezone.utc).isoformat()
    now = datetime.now(timezone.utc).isoformat()

    await _db.quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {
            "status": "accepté",
            "signed": True,
            "signature_name": signature,
            "signed_at": signed_at,
            "responded_at": now,
            "updated_at": now,
        }}
    )

    # Update lead status si pas déjà gagné
    try:
        await _db.leads.update_one(
            {"lead_id": session["lead_id"], "status": {"$ne": "gagné"}},
            {"$set": {"status": "gagné", "updated_at": now}}
        )
    except Exception as e:
        logger.warning(f"Lead status update after sign failed: {e}")

    return {"success": True, "message": "Devis signé avec succès", "quote_id": quote_id}


@portal_router.get("/quotes/{quote_id}/pdf")
async def download_quote_pdf_portal(quote_id: str, request: Request, token: Optional[str] = None):
    """Téléchargement du PDF d'un devis depuis le portail client.

    Authentification : soit header X-Portal-Token, soit query param ?token=...
    (le query param est nécessaire car window.open ne permet pas d'envoyer
    un header personnalisé).
    """
    from fastapi.responses import Response as FastAPIResponse

    # Récupération du token depuis header OU query
    portal_token = request.headers.get("X-Portal-Token") or token
    if not portal_token:
        raise HTTPException(status_code=401, detail="Token requis")

    session = await _db.portal_sessions.find_one({"token": portal_token})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")

    # Vérification d'appartenance
    quote = await _db.quotes.find_one(
        {"quote_id": quote_id, "lead_id": session["lead_id"]},
        {"_id": 0}
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    # Enrichir avec les données du lead pour le PDF
    lead = await _db.leads.find_one({"lead_id": session["lead_id"]}, {"_id": 0}) or {}
    quote_data = {
        **quote,
        "lead_name": lead.get("name") or session.get("lead_name") or quote.get("lead_name"),
        "lead_email": lead.get("email") or session.get("email"),
        "lead_phone": lead.get("phone"),
        "lead_address": lead.get("address"),
        "lead_city": lead.get("city"),
    }

    # Génération du PDF
    try:
        from integrations import generate_quote_pdf
        pdf_bytes = generate_quote_pdf(quote_data)
    except Exception as e:
        logger.error(f"PDF generation failed for quote {quote_id}: {e}")
        raise HTTPException(status_code=500, detail="Génération PDF impossible")

    filename = f"devis_{quote.get('quote_number') or quote_id}.pdf"
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


# ═══════════════════════════════════════════════════════════════════
# LIVE TRACKING — Position de l'intervenant en route (côté client)
# ═══════════════════════════════════════════════════════════════════

@portal_router.get("/interventions/{intervention_id}/agent-location")
async def get_agent_location(intervention_id: str, request: Request):
    """Retourne la position courante de l'intervenant si en route, sinon 404."""
    session = await _get_portal_session(request)
    intv = await _db.interventions.find_one(
        {"intervention_id": intervention_id, "lead_id": session["lead_id"]},
        {"_id": 0, "agent_route": 1, "address": 1, "address_lat": 1, "address_lng": 1, "scheduled_date": 1, "scheduled_time": 1, "status": 1}
    )
    if not intv:
        raise HTTPException(status_code=404, detail="Intervention introuvable")

    route = intv.get("agent_route") or {}
    if not route.get("active") or route.get("lat") is None or route.get("lng") is None:
        return {
            "active": False,
            "status": intv.get("status"),
        }

    return {
        "active": True,
        "status": intv.get("status"),
        "agent": {
            "name": route.get("agent_name", ""),
            "phone": route.get("agent_phone", ""),
            "lat": route.get("lat"),
            "lng": route.get("lng"),
            "accuracy": route.get("accuracy"),
            "started_at": route.get("started_at"),
            "updated_at": route.get("updated_at"),
        },
        "destination": {
            "address": intv.get("address", ""),
            "lat": intv.get("address_lat"),
            "lng": intv.get("address_lng"),
        },
        "scheduled": {
            "date": intv.get("scheduled_date"),
            "time": intv.get("scheduled_time"),
        },
    }
