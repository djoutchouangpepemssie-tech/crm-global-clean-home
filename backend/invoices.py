"""
Global Clean Home CRM - Module Facturation & Paiements Stripe
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
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

_db = None

def init_invoices_db(database):
    global _db
    _db = database

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

invoices_router = APIRouter(prefix="/api")

# ============= MODELS =============

class InvoiceCreate(BaseModel):
    """Création directe d'une facture (sans devis existant)."""
    lead_id: str
    type: Optional[str] = "finale"          # acompte, situation, finale, avoir
    project: Optional[str] = None
    situation_num: Optional[int] = None
    retenue: Optional[bool] = False
    amount_ht: float
    tva: Optional[float] = 0.0
    tva_label: Optional[str] = "0%"
    tva_multi: Optional[bool] = False
    details: Optional[str] = ""
    due_date: Optional[str] = None
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None           # en_attente, payée, en_retard, annulée, brouillon
    notes: Optional[str] = None
    due_date: Optional[str] = None
    reminders_done: Optional[int] = None
    paid_at: Optional[str] = None
    payment_method: Optional[str] = None
    project: Optional[str] = None
    type: Optional[str] = None

class CheckoutRequest(BaseModel):
    origin_url: str

# ============= HELPERS =============

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

async def _log_activity(user_id: str, action: str, entity_type: str, entity_id: str, details=None):
    from server import log_activity
    await log_activity(user_id, action, entity_type, entity_id, details)

def _extract_city(address: str) -> str:
    """Extrait la ville depuis une adresse (ex: '12 rue X, Paris 11e' → 'Paris 11e')."""
    if not address:
        return ""
    parts = [p.strip() for p in address.split(",")]
    return parts[-1] if len(parts) > 1 else parts[0][:50]

async def _next_invoice_number() -> str:
    """Génère un numéro de facture séquentiel FAC-YYYY-NNNN."""
    year = datetime.now(timezone.utc).year
    counter = await _db.counters.find_one_and_update(
        {"_id": f"invoice_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    n = counter.get("seq", 1)
    return f"FAC-{year}-{n:04d}"

# ============= INVOICE ENDPOINTS =============

@invoices_router.post("/invoices")
async def create_invoice_direct(inp: InvoiceCreate, request: Request):
    """Créer une facture directement (sans devis associé)."""
    user = await _require_auth(request)

    lead = await _db.leads.find_one({"lead_id": inp.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")

    now = datetime.now(timezone.utc)
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice_number = await _next_invoice_number()

    tva_rate = inp.tva or 0.0
    amount_ttc = round(inp.amount_ht * (1 + tva_rate / 100), 2)

    invoice = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "quote_id": None,
        "lead_id": inp.lead_id,
        "lead_name": lead.get("name", ""),
        "lead_email": lead.get("email", ""),
        "lead_phone": lead.get("phone", ""),
        "lead_city": _extract_city(lead.get("address", "")),
        "service_type": lead.get("service_type", "Autre"),
        "surface": lead.get("surface"),
        "type": inp.type or "finale",
        "project": inp.project or lead.get("service_type", ""),
        "situation_num": inp.situation_num,
        "retenue": inp.retenue or False,
        "amount_ht": inp.amount_ht,
        "tva": tva_rate,
        "tva_label": inp.tva_label or (f"{int(tva_rate)}%" if tva_rate == int(tva_rate) else f"{tva_rate}%"),
        "tva_multi": inp.tva_multi or False,
        "amount_ttc": amount_ttc,
        "details": inp.details or "",
        "notes": inp.notes,
        "status": "en_attente",
        "payment_method": None,
        "paid_at": None,
        "stripe_session_id": None,
        "due_date": inp.due_date or (now + timedelta(days=30)).isoformat(),
        "created_at": now.isoformat(),
        "created_by": user.user_id,
        "reminders_done": 0,
        "email_sent": False,
        "email_sent_at": None,
    }

    await _db.invoices.insert_one(invoice)
    await _log_activity(user.user_id, "create_invoice", "invoice", invoice_id)

    doc = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    return doc


@invoices_router.post("/invoices/from-quote/{quote_id}")
async def create_invoice_from_quote(quote_id: str, request: Request):
    """Génère une facture depuis un devis accepté/envoyé."""
    user = await _require_auth(request)

    quote = await _db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    existing = await _db.invoices.find_one({"quote_id": quote_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if existing:
        return existing

    lead = await _db.leads.find_one({"lead_id": quote.get("lead_id")}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")

    now = datetime.now(timezone.utc)
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice_number = await _next_invoice_number()

    amount_ht = float(quote.get("amount", 0))
    tva_rate = float(quote.get("tva_rate", 0))
    amount_ttc = round(amount_ht * (1 + tva_rate / 100), 2)

    invoice = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "lead_id": quote.get("lead_id"),
        "lead_name": lead.get("name", ""),
        "lead_email": lead.get("email", ""),
        "lead_phone": lead.get("phone", ""),
        "lead_city": _extract_city(lead.get("address", "")),
        "service_type": quote.get("service_type", ""),
        "surface": quote.get("surface"),
        "type": "finale",
        "project": quote.get("title") or quote.get("service_type", ""),
        "situation_num": None,
        "retenue": False,
        "amount_ht": amount_ht,
        "tva": tva_rate,
        "tva_label": f"{int(tva_rate)}%" if tva_rate == int(tva_rate) else f"{tva_rate}%",
        "tva_multi": False,
        "amount_ttc": amount_ttc,
        "details": quote.get("details", ""),
        "notes": quote.get("notes"),
        "status": "en_attente",
        "payment_method": None,
        "paid_at": None,
        "stripe_session_id": None,
        "due_date": (now + timedelta(days=30)).isoformat(),
        "created_at": now.isoformat(),
        "created_by": user.user_id,
        "reminders_done": 0,
        "email_sent": False,
        "email_sent_at": None,
    }

    await _db.invoices.insert_one(invoice)
    await _log_activity(user.user_id, "create_invoice", "invoice", invoice_id)

    doc = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    return doc


@invoices_router.get("/invoices/stats")
async def get_invoices_stats(request: Request):
    """Statistiques financières pour InvoicesList."""
    await _require_auth(request)

    now = datetime.now(timezone.utc)
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = start_month - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    all_inv = await _db.invoices.find(
        {"deleted_at": {"$exists": False}}, {"_id": 0}
    ).to_list(10000)

    def _created(inv):
        return inv.get("created_at", "") or ""

    current_month = [i for i in all_inv if _created(i) >= start_month.isoformat()]
    prev_month = [
        i for i in all_inv
        if prev_month_start.isoformat() <= _created(i) < start_month.isoformat()
    ]

    paid_all   = [i for i in all_inv if i.get("status") == "payée"]
    pending    = [i for i in all_inv if i.get("status") == "en_attente"]
    overdue    = [i for i in all_inv if i.get("status") == "en_retard"]

    ca_billed_month = sum(i.get("amount_ttc", 0) for i in current_month)
    ca_billed_prev  = sum(i.get("amount_ttc", 0) for i in prev_month)
    ca_delta = round(
        (ca_billed_month - ca_billed_prev) / ca_billed_prev * 100, 1
    ) if ca_billed_prev > 0 else 0

    ca_paid    = sum(i.get("amount_ttc", 0) for i in paid_all)
    ca_pending = sum(i.get("amount_ttc", 0) for i in pending)
    ca_overdue = sum(i.get("amount_ttc", 0) for i in overdue)

    total_collectible = ca_paid + ca_pending + ca_overdue
    paid_ratio     = round(ca_paid / total_collectible * 100, 1) if total_collectible > 0 else 0
    recovery_rate  = round(ca_paid / (ca_paid + ca_overdue) * 100, 1) if (ca_paid + ca_overdue) > 0 else 100

    # DSO (Days Sales Outstanding)
    total_invoiced = sum(i.get("amount_ttc", 0) for i in all_inv)
    daily_sales = total_invoiced / 365 if total_invoiced > 0 else 1
    dso = min(round(ca_pending / daily_sales), 365) if daily_sales > 0 else 0

    # Relances envoyées ce mois
    reminders_sent = sum(i.get("reminders_done", 0) for i in current_month)

    # Prochaine échéance (parmi les en_attente)
    upcoming = sorted(
        [i for i in pending if i.get("due_date")],
        key=lambda x: x["due_date"]
    )
    next_due_str = "—"
    if upcoming:
        try:
            d_str = upcoming[0]["due_date"]
            d = datetime.fromisoformat(d_str.replace("Z", "+00:00"))
            day_names = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
            month_names = ["jan.", "fév.", "mar.", "avr.", "mai", "juin", "juil.", "août", "sep.", "oct.", "nov.", "déc."]
            next_due_str = f"{day_names[d.weekday()]} {d.day} {month_names[d.month - 1]}"
        except Exception:
            pass

    # Trésorerie encaissée ce mois
    paid_month = [
        i for i in paid_all
        if (i.get("paid_at") or "") >= start_month.isoformat()
    ]
    cash_flow = round(sum(i.get("amount_ttc", 0) for i in paid_month) / 1000, 1)

    # Delta tréso vs mois précédent
    paid_prev = [
        i for i in paid_all
        if prev_month_start.isoformat() <= (i.get("paid_at") or "") < start_month.isoformat()
    ]
    ca_paid_prev = sum(i.get("amount_ttc", 0) for i in paid_prev)
    paid_delta = round(
        (ca_paid - ca_paid_prev) / ca_paid_prev * 100, 1
    ) if ca_paid_prev > 0 else 0

    return {
        "caBilled":      round(ca_billed_month, 2),
        "caPrev":        round(ca_billed_prev, 2),
        "caDelta":       ca_delta,
        "caPaid":        round(ca_paid, 2),
        "paidDelta":     paid_delta,
        "paidRatio":     paid_ratio,
        "caPending":     round(ca_pending, 2),
        "pendingCount":  len(pending),
        "caOverdue":     round(ca_overdue, 2),
        "recoveryRate":  recovery_rate,
        "dso":           dso,
        "remindersSent": reminders_sent,
        "nextDue":       next_due_str,
        "cashFlow":      cash_flow,
    }


@invoices_router.get("/invoices")
async def list_invoices(
    request: Request,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    """Liste paginée des factures avec tous les champs enrichis."""
    await _require_auth(request)

    query = {}
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}
    if status:
        query["status"] = status

    total = await _db.invoices.count_documents(query)
    skip = (page - 1) * page_size
    invoices = await _db.invoices.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)

    # Enrichir les factures sans lead_city ou invoice_number (anciennes entrées)
    lead_ids = list({i.get("lead_id") for i in invoices if i.get("lead_id") and not i.get("lead_city")})
    leads_map: Dict[str, Any] = {}
    if lead_ids:
        leads_docs = await _db.leads.find(
            {"lead_id": {"$in": lead_ids}}, {"_id": 0, "lead_id": 1, "address": 1}
        ).to_list(len(lead_ids))
        for l in leads_docs:
            leads_map[l["lead_id"]] = l

    for inv in invoices:
        # Ajouter lead_city si manquant
        if not inv.get("lead_city") and inv.get("lead_id") in leads_map:
            inv["lead_city"] = _extract_city(leads_map[inv["lead_id"]].get("address", ""))
        # Rétrocompatibilité : champs manquants pour anciennes factures
        inv.setdefault("invoice_number", None)
        inv.setdefault("type", "finale")
        inv.setdefault("project", inv.get("service_type", ""))
        inv.setdefault("situation_num", None)
        inv.setdefault("retenue", False)
        inv.setdefault("tva_label", f"{int(inv.get('tva', 0))}%" if inv.get("tva", 0) == int(inv.get("tva", 0)) else f"{inv.get('tva', 0)}%")
        inv.setdefault("tva_multi", False)
        inv.setdefault("reminders_done", 0)
        inv.setdefault("lead_city", "")

    return {
        "items": invoices,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }


@invoices_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    """Récupère une facture par son ID."""
    await _require_auth(request)

    doc = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    # Rétrocompatibilité
    doc.setdefault("invoice_number", None)
    doc.setdefault("type", "finale")
    doc.setdefault("project", doc.get("service_type", ""))
    doc.setdefault("reminders_done", 0)
    doc.setdefault("lead_city", _extract_city(doc.get("lead_phone", "")))

    return doc


@invoices_router.patch("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, inp: InvoiceUpdate, request: Request):
    """Met à jour une facture (statut, notes, relances, paiement)."""
    user = await _require_auth(request)

    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")

    # Si marquée payée, enregistrer la date
    if inp.status == "payée" and not inp.paid_at:
        update["paid_at"] = datetime.now(timezone.utc).isoformat()

    result = await _db.invoices.update_one({"invoice_id": invoice_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    await _log_activity(user.user_id, "update_invoice", "invoice", invoice_id, update)
    doc = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    return doc


@invoices_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, request: Request):
    """Soft-delete d'une facture."""
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
    """Restaure une facture supprimée."""
    await _require_auth(request)
    result = await _db.invoices.update_one(
        {"invoice_id": invoice_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable ou non supprimée")
    return {"message": "Facture restaurée"}


@invoices_router.post("/invoices/{invoice_id}/remind")
async def add_reminder(invoice_id: str, request: Request):
    """Incrémente le compteur de relances et log l'action."""
    user = await _require_auth(request)
    inv = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    current = inv.get("reminders_done", 0)
    if current >= 3:
        raise HTTPException(status_code=400, detail="Maximum de relances atteint (3)")

    await _db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"reminders_done": current + 1}}
    )
    await _log_activity(user.user_id, "reminder_sent", "invoice", invoice_id)
    return {"reminders_done": current + 1}


# ============= STRIPE CHECKOUT =============

@invoices_router.post("/invoices/{invoice_id}/checkout")
async def create_checkout(invoice_id: str, body: CheckoutRequest, request: Request):
    """Stripe non configuré - retourne erreur propre."""
    raise HTTPException(status_code=503, detail="Paiement Stripe non configuré")


@invoices_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe non configuré."""
    return {"status": "ok"}


@invoices_router.post("/invoices/{invoice_id}/send-portal")
async def send_invoice_to_portal(invoice_id: str, request: Request):
    """Envoie la facture par email avec PDF joint."""
    user = await _require_auth(request)
    inv = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    lead = await _db.leads.find_one({"lead_id": inv["lead_id"]}, {"_id": 0})
    if not lead or not lead.get("email"):
        raise HTTPException(status_code=400, detail="Email client introuvable")
    try:
        pdf_data = None
        try:
            from exports import generate_invoice_pdf_bytes
            pdf_data = generate_invoice_pdf_bytes(inv, lead)
        except Exception as pdf_err:
            logger.warning(f"Invoice PDF generation failed: {pdf_err}")

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
                "content": f"Facture {inv.get('invoice_number', invoice_id)} envoyée par email à {lead.get('email')} avec PDF",
                "user_id": user.user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return {"success": True, "message": "Facture envoyée par email avec PDF"}
        raise HTTPException(status_code=500, detail="Erreur envoi email")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_financial_stats(request: Request, period: str = "30d"):
    """Statistiques financières pour le dashboard (compatibilité)."""
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
        {"created_at": {"$gte": start.isoformat()}, "deleted_at": {"$exists": False}},
        {"_id": 0}
    ).to_list(10000)

    total_invoices = len(invoices)
    paid    = [i for i in invoices if i.get("status") == "payée"]
    pending = [i for i in invoices if i.get("status") == "en_attente"]
    overdue = [i for i in invoices if i.get("status") == "en_retard"]

    total_revenue = sum(i.get("amount_ttc", 0) for i in paid)
    total_pending = sum(i.get("amount_ttc", 0) for i in pending)
    total_overdue = sum(i.get("amount_ttc", 0) for i in overdue)

    revenue_by_service: Dict[str, float] = {}
    for inv in paid:
        svc = inv.get("service_type", "Autre")
        revenue_by_service[svc] = revenue_by_service.get(svc, 0) + inv.get("amount_ttc", 0)

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
