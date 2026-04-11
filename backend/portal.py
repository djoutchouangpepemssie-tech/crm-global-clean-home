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

@portal_router.post("/magic-link")
async def request_magic_link(body: MagicLinkRequest):
    """Send a magic link to client email. For now, returns the link directly."""
    email = body.email.strip().lower()
    
    # Find lead with this email
    lead = await _db.leads.find_one({"email": email}, {"_id": 0})
    if not lead:
        # Don't reveal if email exists
        return {"message": "Si un compte existe, un lien d'accès vous sera envoyé par email."}
    
    token = _generate_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
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
    
    # Send magic link via email
    try:
        from email_service import send_magic_link
        portal_base_url = str(os.environ.get("FRONTEND_URL", ""))
        if not portal_base_url:
            portal_base_url = "https://www.globalcleanhome.com"
        email_sent = send_magic_link(email, lead.get("name", "Client"), token, portal_base_url)
        if email_sent:
            logger.info(f"Magic link email sent to {_mask_email(email)}")
        else:
            logger.info(f"Magic link generated for {_mask_email(email)} (email not sent - SendGrid not configured)")
    except Exception as e:
        logger.warning(f"Failed to send magic link email: {e}")
    
    return {
        "message": "Si un compte existe, un lien d'acces vous sera envoye par email.",
        "magic_token": token,
    }


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
    """Signer un devis depuis le portail client."""
    portal_token = request.headers.get("X-Portal-Token")
    if not portal_token:
        raise HTTPException(status_code=401, detail="Token requis")
    
    session = await _db.portal_sessions.find_one({"token": portal_token})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    
    body = await request.json()
    signature = body.get("signature", "")
    signed_at = body.get("signed_at", datetime.now(timezone.utc).isoformat())
    
    await _db.quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {
            "status": "accepte",
            "signed": True,
            "signature_name": signature,
            "signed_at": signed_at,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Devis signe avec succes"}
