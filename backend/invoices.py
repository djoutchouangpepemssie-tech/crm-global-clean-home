"""
Global Clean Home CRM - Module Facturation & Paiements Stripe
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import logging
import math


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

invoices_router = APIRouter(prefix="/api")

# ============= MODELS =============

class InvoiceCreate(BaseModel):
    quote_id: str

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class CheckoutRequest(BaseModel):
    origin_url: str

# ============= HELPERS =============

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

async def _log_activity(user_id: str, action: str, entity_type: str, entity_id: str, details=None):
    from server import log_activity
    await log_activity(user_id, action, entity_type, entity_id, details)

# ============= INVOICE ENDPOINTS =============

@invoices_router.post("/invoices/from-quote/{quote_id}")
async def create_invoice_from_quote(quote_id: str, request: Request):
    """Generate an invoice from an accepted/sent quote."""
    user = await _require_auth(request)

    quote = await _db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    existing = await _db.invoices.find_one({"quote_id": quote_id}, {"_id": 0})
    if existing:
        return existing

    lead = await _db.leads.find_one({"lead_id": quote["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")

    now = datetime.now(timezone.utc)
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    amount_ht = float(quote.get("amount", 0))
    tva = 0.0  # Micro-entreprise - TVA non applicable
    amount_ttc = amount_ht  # Montant identique au devis

    invoice = {
        "invoice_id": invoice_id,
        "quote_id": quote_id,
        "lead_id": quote["lead_id"],
        "lead_name": lead.get("name", ""),
        "lead_email": lead.get("email", ""),
        "lead_phone": lead.get("phone", ""),
        "service_type": quote.get("service_type", ""),
        "surface": quote.get("surface"),
        "amount_ht": amount_ht,
        "tva": tva,
        "amount_ttc": amount_ttc,
        "details": quote.get("details", ""),
        "status": "en_attente",  # en_attente, payée, en_retard, annulée
        "payment_method": None,
        "paid_at": None,
        "stripe_session_id": None,
        "due_date": (now + timedelta(days=30)).isoformat(),
        "created_at": now.isoformat(),
        "created_by": user.user_id,
    }

    await _db.invoices.insert_one(invoice)
    await _log_activity(user.user_id, "create_invoice", "invoice", invoice_id)

    doc = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    return doc


@invoices_router.get("/invoices")
async def list_invoices(
    request: Request,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    """List all invoices with pagination."""
    await _require_auth(request)

    query = {}
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}
    if status:
        query["status"] = status

    total = await _db.invoices.count_documents(query)
    skip = (page - 1) * page_size
    invoices = await _db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    return {
        "items": invoices,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }

@invoices_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, request: Request):
    """Soft-delete an invoice."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    result = await _db.invoices.update_one(
        {"invoice_id": invoice_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    return {"message": "Facture supprimée"}

@invoices_router.post("/invoices/{invoice_id}/restore")
async def restore_invoice(invoice_id: str, request: Request):
    """Restore a soft-deleted invoice."""
    await _require_auth(request)
    result = await _db.invoices.update_one(
        {"invoice_id": invoice_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable ou non supprimée")
    return {"message": "Facture restaurée"}


@invoices_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    """Get a single invoice."""
    await _require_auth(request)

    doc = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    return doc


@invoices_router.patch("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, inp: InvoiceUpdate, request: Request):
    """Update invoice status or notes."""
    user = await _require_auth(request)

    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")

    result = await _db.invoices.update_one({"invoice_id": invoice_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    await _log_activity(user.user_id, "update_invoice", "invoice", invoice_id, update)
    return {"message": "Facture mise à jour"}


# ============= STRIPE CHECKOUT =============

@invoices_router.post("/invoices/{invoice_id}/checkout")
async def create_checkout(invoice_id: str, body: CheckoutRequest, request: Request):
    """Stripe non configuré - retourne erreur propre"""
    raise HTTPException(status_code=503, detail="Paiement Stripe non configuré")

async def check_payment_status(invoice_id: str, session_id: str, request: Request):
    """Stripe non configuré"""
    raise HTTPException(status_code=503, detail="Paiement Stripe non configuré")

# ============= STRIPE WEBHOOK =============

@invoices_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe non configuré"""
    return {"status": "ok"}

async def get_financial_stats(request: Request, period: str = "30d"):
    """Get financial dashboard statistics."""
    await _require_auth(request)

    now = datetime.now(timezone.utc)
    if period == "1d":
        start = now - timedelta(days=1)
    elif period == "7d":
        start = now - timedelta(days=7)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:
        start = now - timedelta(days=30)

    invoices = await _db.invoices.find(
        {"created_at": {"$gte": start.isoformat()}}, {"_id": 0}
    ).to_list(10000)

    total_invoices = len(invoices)
    paid = [i for i in invoices if i.get("status") == "payée"]
    pending = [i for i in invoices if i.get("status") == "en_attente"]
    overdue = [i for i in invoices if i.get("status") == "en_retard"]

    total_revenue = sum(i.get("amount_ttc", 0) for i in paid)
    total_pending = sum(i.get("amount_ttc", 0) for i in pending)
    total_overdue = sum(i.get("amount_ttc", 0) for i in overdue)

    # Revenue by service
    revenue_by_service = {}
    for inv in paid:
        svc = inv.get("service_type", "Autre")
        revenue_by_service[svc] = revenue_by_service.get(svc, 0) + inv.get("amount_ttc", 0)

    # Revenue by day
    revenue_by_day = []
    for i in range(30):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_rev = sum(
            inv.get("amount_ttc", 0)
            for inv in paid
            if inv.get("paid_at") and day_start.isoformat() <= inv.get("paid_at") < day_end.isoformat()
        )
        revenue_by_day.append({"date": day_start.strftime("%Y-%m-%d"), "revenue": round(day_rev, 2)})
    revenue_by_day.reverse()

    # Recent transactions
    transactions = await _db.payment_transactions.find(
        {"created_at": {"$gte": start.isoformat()}}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    return {
        "period": period,
        "total_invoices": total_invoices,
        "paid_count": len(paid),
        "pending_count": len(pending),
        "overdue_count": len(overdue),
        "total_revenue": round(total_revenue, 2),
        "total_pending": round(total_pending, 2),
        "total_overdue": round(total_overdue, 2),
        "revenue_by_service": revenue_by_service,
        "revenue_by_day": revenue_by_day,
        "recent_transactions": transactions,
    }

@invoices_router.post("/invoices/{invoice_id}/send-portal")
async def send_invoice_to_portal(invoice_id: str, request: Request):
    """Envoie la facture premium par email avec PDF joint."""
    user = await _require_auth(request)
    inv = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    lead = await _db.leads.find_one({"lead_id": inv["lead_id"]}, {"_id": 0})
    if not lead or not lead.get("email"):
        raise HTTPException(status_code=400, detail="Email client introuvable")
    try:
        # Générer PDF facture premium
        pdf_data = None
        try:
            from exports import generate_invoice_pdf_bytes
            pdf_data = generate_invoice_pdf_bytes(inv, lead)
        except Exception as pdf_err:
            import logging
            logging.getLogger(__name__).warning(f"Invoice PDF generation failed: {pdf_err}")

        # Envoyer email premium avec PDF
        from gmail_service import send_invoice_email
        sent = await send_invoice_email(user.user_id, lead, inv, pdf_data=pdf_data)

        if sent:
            await _db.invoices.update_one(
                {"invoice_id": invoice_id},
                {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            await _db.interactions.insert_one({
                "lead_id": lead["lead_id"],
                "type": "email_sent",
                "content": f"Facture {invoice_id} envoyee par email a {lead.get('email')} avec PDF",
                "user_id": user.user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return {"success": True, "message": "Facture envoyee par email avec PDF"}
        raise HTTPException(status_code=500, detail="Erreur envoi email")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
