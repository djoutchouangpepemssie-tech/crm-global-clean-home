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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

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
    return hashlib.sha256(f"{uuid.uuid4().hex}{datetime.now().isoformat()}".encode()).hexdigest()[:48]

async def _get_portal_session(request: Request):
    """Validate portal session from cookie."""
    token = request.cookies.get("portal_token")
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
            logger.info(f"Magic link email sent to {email}")
        else:
            logger.info(f"Magic link generated for {email} (email not sent - SendGrid not configured): token={token}")
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
        samesite="lax",
    )
    
    return {
        "message": "Authentification réussie",
        "lead_id": link["lead_id"],
        "lead_name": link["lead_name"],
        "email": link["email"],
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
    """Create a Stripe checkout session for client payment."""
    session = await _get_portal_session(request)
    
    invoice = await _db.invoices.find_one(
        {"invoice_id": invoice_id, "lead_id": session["lead_id"]},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    if invoice["status"] == "payée":
        raise HTTPException(status_code=400, detail="Facture déjà payée")
    
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    
    STRIPE_KEY = os.environ.get('STRIPE_API_KEY')
    origin = str(request.base_url).rstrip("/")
    
    success_url = f"{origin}/api/portal/payment-success/{invoice_id}?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/api/portal/payment-cancel/{invoice_id}"
    
    webhook_url = f"{origin}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_KEY, webhook_url=webhook_url)
    
    checkout_req = CheckoutSessionRequest(
        amount=float(invoice["amount_ttc"]),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"invoice_id": invoice_id, "lead_id": session["lead_id"]},
    )
    
    result = await stripe_checkout.create_checkout_session(checkout_req)
    
    return {"url": result.url, "session_id": result.session_id}


@portal_router.get("/interventions")
async def get_client_interventions(request: Request):
    """Get interventions for the authenticated client."""
    session = await _get_portal_session(request)
    
    interventions = await _db.interventions.find(
        {"lead_id": session["lead_id"]},
        {"_id": 0}
    ).sort("scheduled_date", -1).to_list(100)
    
    return interventions


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
