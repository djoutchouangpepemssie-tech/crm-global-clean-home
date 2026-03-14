"""
Global Clean Home CRM - Module Facturation & Paiements Stripe
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import logging


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
    tva = round(amount_ht * 0.20, 2)
    amount_ttc = round(amount_ht + tva, 2)

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
async def list_invoices(request: Request, status: Optional[str] = None):
    """List all invoices."""
    await _require_auth(request)

    query = {}
    if status:
        query["status"] = status

    invoices = await _db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices


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
    """Poll Stripe for payment status and update DB."""
    await _require_auth(request)

    invoice = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    if invoice["status"] == "payée":
        return {"payment_status": "paid", "invoice_status": "payée"}

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"


    if status.payment_status == "paid":
        now = datetime.now(timezone.utc).isoformat()
        await _db.invoices.update_one(
            {"invoice_id": invoice_id, "status": {"$ne": "payée"}},
            {"$set": {"status": "payée", "paid_at": now, "payment_method": "stripe"}},
        await _db.payment_transactions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {"payment_status": "paid", "paid_at": now}},
        # Update lead status to gagné
        if invoice.get("lead_id"):
            await _db.leads.update_one(
                {"lead_id": invoice["lead_id"]},
                {"$set": {"status": "gagné", "updated_at": now}},
    elif status.status == "expired":
        await _db.payment_transactions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {"payment_status": "expired"}},

    return {
        "payment_status": status.payment_status,
        "status": status.status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }


# ============= STRIPE WEBHOOK =============

@invoices_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"

    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        logger.info(f"Stripe webhook: {event.event_type} session={event.session_id}")

        if event.payment_status == "paid" and event.session_id:
            now = datetime.now(timezone.utc).isoformat()
            invoice_id = event.metadata.get("invoice_id") if event.metadata else None

            if invoice_id:
                await _db.invoices.update_one(
                    {"invoice_id": invoice_id, "status": {"$ne": "payée"}},
                    {"$set": {"status": "payée", "paid_at": now, "payment_method": "stripe"}},
            await _db.payment_transactions.update_one(
                {"stripe_session_id": event.session_id},
                {"$set": {"payment_status": "paid", "paid_at": now}},
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error"}


# ============= FINANCIAL STATS =============

@invoices_router.get("/stats/financial")
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
