"""
Global Clean Home CRM - Module PREMIUM Comptabilité + Stocks + Devis/Factures
Collections: quotes (enhanced), invoices (enhanced), stock_items, accounting_entries
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from enum import Enum
import os
import uuid
import logging
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

_db = None

def init_db(database):
    global _db
    _db = database

accounting_router = APIRouter(prefix="/api")

# ═══════════════════════════════════════════════════════════════════
# HELPERS & BUSINESS LOGIC
# ═══════════════════════════════════════════════════════════════════

TVA_RATES = {
    "standard": 20.0,
    "intermediaire": 10.0,
    "reduit": 5.5,
    "super_reduit": 2.1,
    "exonere": 0.0,
}

DEFAULT_TVA_RATE = "exonere"  # Micro-entreprise par défaut


def calculate_line_total(quantity: float, unit_price: float, discount_percent: float = 0.0, tva_rate_key: str = "exonere") -> Dict[str, float]:
    """Calcule le total d'une ligne de devis/facture avec TVA et remise."""
    if quantity < 0:
        raise ValueError("La quantité ne peut pas être négative")
    if unit_price < 0:
        raise ValueError("Le prix unitaire ne peut pas être négatif")
    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("La remise doit être entre 0 et 100%")
    
    subtotal = round(quantity * unit_price, 2)
    discount_amount = round(subtotal * discount_percent / 100, 2)
    amount_ht = round(subtotal - discount_amount, 2)
    tva_percent = TVA_RATES.get(tva_rate_key, 0.0)
    tva_amount = round(amount_ht * tva_percent / 100, 2)
    amount_ttc = round(amount_ht + tva_amount, 2)
    
    return {
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "amount_ht": amount_ht,
        "tva_percent": tva_percent,
        "tva_amount": tva_amount,
        "amount_ttc": amount_ttc,
    }


def calculate_document_totals(lines: List[Dict]) -> Dict[str, float]:
    """Calcule les totaux d'un document (devis/facture) à partir de ses lignes."""
    total_ht = 0.0
    total_tva = 0.0
    total_ttc = 0.0
    total_discount = 0.0
    
    for line in lines:
        totals = calculate_line_total(
            quantity=line.get("quantity", 1),
            unit_price=line.get("unit_price", 0),
            discount_percent=line.get("discount_percent", 0),
            tva_rate_key=line.get("tva_rate", DEFAULT_TVA_RATE),
        )
        total_ht += totals["amount_ht"]
        total_tva += totals["tva_amount"]
        total_ttc += totals["amount_ttc"]
        total_discount += totals["discount_amount"]
    
    return {
        "total_ht": round(total_ht, 2),
        "total_tva": round(total_tva, 2),
        "total_ttc": round(total_ttc, 2),
        "total_discount": round(total_discount, 2),
    }


def generate_reference(prefix: str, counter: int) -> str:
    """Génère une référence lisible : GCH-DEV-2026-0001."""
    now = datetime.now(timezone.utc)
    return f"GCH-{prefix}-{now.year}-{str(counter).zfill(4)}"


async def get_next_counter(collection_name: str) -> int:
    """Auto-incrémente un compteur dans la collection counters."""
    result = await _db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]


async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


async def _log_activity(user_id: str, action: str, entity_type: str, entity_id: str, details=None):
    from server import _log_activity as _srv_log
    await _srv_log(user_id, action, entity_type, entity_id, details)


async def _write_audit(entity_type: str, entity_id: str, action: str, user_id: str, data=None):
    from server import write_audit_log
    await write_audit_log(entity_type, entity_id, action, user_id, data)


# ═══════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════

# ── Stock Models ──

class StockItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: str = "produit_nettoyage"
    unit: str = "unité"
    quantity: float = 0.0
    unit_price: float = 0.0
    alert_threshold: float = 5.0
    supplier: Optional[str] = None
    description: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def validate_qty(cls, v):
        if v < 0:
            raise ValueError("La quantité ne peut pas être négative")
        return v

    @field_validator("unit_price")
    @classmethod
    def validate_price(cls, v):
        if v < 0:
            raise ValueError("Le prix ne peut pas être négatif")
        return v


class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    alert_threshold: Optional[float] = None
    supplier: Optional[str] = None
    description: Optional[str] = None


class StockMovement(BaseModel):
    item_id: str
    movement_type: str  # "in" | "out" | "adjustment"
    quantity: float
    reason: Optional[str] = None
    reference: Optional[str] = None  # quote_id, invoice_id, etc.

    @field_validator("quantity")
    @classmethod
    def validate_qty(cls, v):
        if v <= 0:
            raise ValueError("La quantité du mouvement doit être > 0")
        return v


# ── Enhanced Quote Models ──

class QuoteLine(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    unit: str = "unité"
    discount_percent: float = 0.0
    tva_rate: str = "exonere"
    stock_item_id: Optional[str] = None  # Liaison stock


class QuoteCreatePremium(BaseModel):
    lead_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    service_type: str = "Ménage domicile"
    surface: Optional[float] = None
    lines: List[QuoteLine] = []
    global_discount_percent: float = 0.0
    tva_rate: str = "exonere"
    notes: Optional[str] = None
    validity_days: int = 30
    payment_terms: Optional[str] = None

    @field_validator("global_discount_percent")
    @classmethod
    def validate_discount(cls, v):
        if v < 0 or v > 100:
            raise ValueError("La remise doit être entre 0% et 100%")
        return v


class QuoteUpdatePremium(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    service_type: Optional[str] = None
    surface: Optional[float] = None
    lines: Optional[List[QuoteLine]] = None
    global_discount_percent: Optional[float] = None
    tva_rate: Optional[str] = None
    notes: Optional[str] = None
    validity_days: Optional[int] = None
    payment_terms: Optional[str] = None
    status: Optional[str] = None


# ── Enhanced Invoice Models ──

class InvoiceLine(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    unit: str = "unité"
    discount_percent: float = 0.0
    tva_rate: str = "exonere"
    stock_item_id: Optional[str] = None


class InvoiceCreatePremium(BaseModel):
    quote_id: Optional[str] = None
    lead_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    service_type: str = "Ménage domicile"
    lines: List[InvoiceLine] = []
    global_discount_percent: float = 0.0
    tva_rate: str = "exonere"
    notes: Optional[str] = None
    due_days: int = 30
    payment_terms: Optional[str] = None


class InvoiceUpdatePremium(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None
    paid_amount: Optional[float] = None
    paid_at: Optional[str] = None


class PaymentRecord(BaseModel):
    amount: float
    method: str = "virement"  # virement, especes, cheque, carte, stripe
    reference: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Le montant du paiement doit être > 0")
        return v


# ── Accounting Entry Models ──

class AccountingEntryCreate(BaseModel):
    entry_type: str  # "revenue" | "expense" | "payment_in" | "payment_out"
    amount: float
    description: str
    category: str = "services"
    reference_type: Optional[str] = None  # "invoice", "quote", "stock", "manual"
    reference_id: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    entry_date: Optional[str] = None  # ISO date, defaults to now

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Le montant doit être > 0")
        return v


class AccountingEntryUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
# STOCK ENDPOINTS (10 endpoints)
# ═══════════════════════════════════════════════════════════════════

@accounting_router.get("/stock")
async def list_stock_items(
    request: Request,
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Liste tous les articles du stock avec filtres et pagination."""
    user = await _require_auth(request)
    
    query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"supplier": {"$regex": search, "$options": "i"}},
        ]
    if low_stock:
        query["$expr"] = {"$lte": ["$quantity", "$alert_threshold"]}
    
    total = await _db.stock_items.count_documents(query)
    skip = (page - 1) * page_size
    items = await _db.stock_items.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(page_size).to_list(page_size)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }


@accounting_router.post("/stock")
async def create_stock_item(inp: StockItemCreate, request: Request):
    """Créer un nouvel article dans le stock."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    item_id = f"stk_{uuid.uuid4().hex[:12]}"
    sku = inp.sku or f"SKU-{uuid.uuid4().hex[:8].upper()}"
    
    item = {
        "item_id": item_id,
        "sku": sku,
        **inp.model_dump(exclude={"sku"}),
        "total_value": round(inp.quantity * inp.unit_price, 2),
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
    }
    
    await _db.stock_items.insert_one(item)
    await _log_activity(user.user_id, "create_stock_item", "stock", item_id, {"name": inp.name})
    await _write_audit("stock", item_id, "create", user.user_id, inp.model_dump())
    
    return await _db.stock_items.find_one({"item_id": item_id}, {"_id": 0})


@accounting_router.get("/stock/{item_id}")
async def get_stock_item(item_id: str, request: Request):
    """Détail d'un article du stock."""
    await _require_auth(request)
    item = await _db.stock_items.find_one({"item_id": item_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return item


@accounting_router.patch("/stock/{item_id}")
async def update_stock_item(item_id: str, inp: StockItemUpdate, request: Request):
    """Mettre à jour un article du stock."""
    user = await _require_auth(request)
    
    update_data = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculer la valeur totale si le prix unitaire change
    if "unit_price" in update_data:
        item = await _db.stock_items.find_one({"item_id": item_id}, {"_id": 0})
        if item:
            update_data["total_value"] = round(item["quantity"] * update_data["unit_price"], 2)
    
    result = await _db.stock_items.update_one(
        {"item_id": item_id, "deleted_at": {"$exists": False}},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article introuvable")
    
    await _write_audit("stock", item_id, "update", user.user_id, update_data)
    return await _db.stock_items.find_one({"item_id": item_id}, {"_id": 0})


@accounting_router.delete("/stock/{item_id}")
async def delete_stock_item(item_id: str, request: Request):
    """Soft-delete d'un article du stock."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    result = await _db.stock_items.update_one(
        {"item_id": item_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article introuvable")
    
    await _write_audit("stock", item_id, "delete", user.user_id)
    return {"message": "Article supprimé"}


@accounting_router.post("/stock/{item_id}/restore")
async def restore_stock_item(item_id: str, request: Request):
    """Restaurer un article supprimé."""
    user = await _require_auth(request)
    result = await _db.stock_items.update_one(
        {"item_id": item_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article introuvable ou non supprimé")
    await _write_audit("stock", item_id, "restore", user.user_id)
    return {"message": "Article restauré"}


@accounting_router.post("/stock/movement")
async def create_stock_movement(inp: StockMovement, request: Request):
    """Enregistrer un mouvement de stock (entrée, sortie, ajustement)."""
    user = await _require_auth(request)
    
    item = await _db.stock_items.find_one({"item_id": inp.item_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Article introuvable")
    
    old_qty = item["quantity"]
    
    if inp.movement_type == "in":
        new_qty = old_qty + inp.quantity
    elif inp.movement_type == "out":
        if old_qty < inp.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuffisant ({old_qty} disponible, {inp.quantity} demandé)")
        new_qty = old_qty - inp.quantity
    elif inp.movement_type == "adjustment":
        new_qty = inp.quantity  # Ajustement = nouveau solde
    else:
        raise HTTPException(status_code=400, detail="Type de mouvement invalide (in/out/adjustment)")
    
    now = datetime.now(timezone.utc).isoformat()
    movement_id = f"mvt_{uuid.uuid4().hex[:12]}"
    
    movement = {
        "movement_id": movement_id,
        "item_id": inp.item_id,
        "item_name": item["name"],
        "movement_type": inp.movement_type,
        "quantity": inp.quantity,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
        "reason": inp.reason,
        "reference": inp.reference,
        "created_at": now,
        "created_by": user.user_id,
    }
    
    await _db.stock_movements.insert_one(movement)
    
    # Mettre à jour le stock
    new_value = round(new_qty * item.get("unit_price", 0), 2)
    await _db.stock_items.update_one(
        {"item_id": inp.item_id},
        {"$set": {"quantity": new_qty, "total_value": new_value, "updated_at": now}}
    )
    
    await _log_activity(user.user_id, f"stock_{inp.movement_type}", "stock", inp.item_id, {
        "quantity": inp.quantity, "old": old_qty, "new": new_qty
    })
    await _write_audit("stock", inp.item_id, f"movement_{inp.movement_type}", user.user_id, movement)
    
    return {
        "movement_id": movement_id,
        "item_id": inp.item_id,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
        "total_value": new_value,
    }


@accounting_router.get("/stock/{item_id}/movements")
async def get_stock_movements(
    item_id: str,
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Historique des mouvements d'un article."""
    await _require_auth(request)
    
    query = {"item_id": item_id}
    total = await _db.stock_movements.count_documents(query)
    skip = (page - 1) * page_size
    movements = await _db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return {
        "items": movements,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@accounting_router.get("/stock/alerts/low")
async def get_low_stock_alerts(request: Request):
    """Articles en dessous du seuil d'alerte."""
    await _require_auth(request)
    
    pipeline = [
        {"$match": {"deleted_at": {"$exists": False}}},
        {"$match": {"$expr": {"$lte": ["$quantity", "$alert_threshold"]}}},
        {"$sort": {"quantity": 1}},
    ]
    items = await _db.stock_items.aggregate(pipeline).to_list(100)
    for item in items:
        item.pop("_id", None)
    
    return {"items": items, "total": len(items)}


@accounting_router.get("/stock/stats/summary")
async def get_stock_summary(request: Request):
    """Résumé global du stock."""
    await _require_auth(request)
    
    pipeline = [
        {"$match": {"deleted_at": {"$exists": False}}},
        {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": "$total_value"},
            "total_quantity": {"$sum": "$quantity"},
            "categories": {"$addToSet": "$category"},
        }}
    ]
    result = await _db.stock_items.aggregate(pipeline).to_list(1)
    
    # Low stock count
    low_pipeline = [
        {"$match": {"deleted_at": {"$exists": False}}},
        {"$match": {"$expr": {"$lte": ["$quantity", "$alert_threshold"]}}},
        {"$count": "count"},
    ]
    low_result = await _db.stock_items.aggregate(low_pipeline).to_list(1)
    low_count = low_result[0]["count"] if low_result else 0
    
    if result:
        return {
            "total_items": result[0]["total_items"],
            "total_value": round(result[0]["total_value"], 2),
            "total_quantity": result[0]["total_quantity"],
            "categories": result[0]["categories"],
            "low_stock_count": low_count,
        }
    return {"total_items": 0, "total_value": 0, "total_quantity": 0, "categories": [], "low_stock_count": 0}


# ═══════════════════════════════════════════════════════════════════
# ENHANCED QUOTES ENDPOINTS (8 endpoints)
# ═══════════════════════════════════════════════════════════════════

@accounting_router.post("/quotes/premium")
async def create_quote_premium(inp: QuoteCreatePremium, request: Request):
    """Créer un devis premium avec lignes détaillées, remises et TVA."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    counter = await get_next_counter("quotes")
    quote_id = f"quote_{uuid.uuid4().hex[:12]}"
    reference = generate_reference("DEV", counter)
    
    # Calculer les lignes
    computed_lines = []
    for line in inp.lines:
        line_totals = calculate_line_total(
            line.quantity, line.unit_price, line.discount_percent, line.tva_rate
        )
        computed_lines.append({
            **line.model_dump(),
            **line_totals,
        })
    
    # Totaux du document
    totals = calculate_document_totals([l.model_dump() for l in inp.lines])
    
    # Appliquer remise globale
    if inp.global_discount_percent > 0:
        global_discount = round(totals["total_ht"] * inp.global_discount_percent / 100, 2)
        totals["total_ht"] = round(totals["total_ht"] - global_discount, 2)
        totals["total_discount"] = round(totals["total_discount"] + global_discount, 2)
        # Recalculer TVA sur le nouveau HT
        tva_pct = TVA_RATES.get(inp.tva_rate, 0.0)
        totals["total_tva"] = round(totals["total_ht"] * tva_pct / 100, 2)
        totals["total_ttc"] = round(totals["total_ht"] + totals["total_tva"], 2)
    
    # Fallback si pas de lignes : utiliser le montant du service_type
    if not inp.lines:
        totals = {"total_ht": 0, "total_tva": 0, "total_ttc": 0, "total_discount": 0}
    
    # Client info from lead if available
    client_name = inp.client_name
    client_email = inp.client_email
    client_phone = inp.client_phone
    client_address = inp.client_address
    
    if inp.lead_id and not client_name:
        lead = await _db.leads.find_one({"lead_id": inp.lead_id}, {"_id": 0})
        if lead:
            client_name = client_name or lead.get("name")
            client_email = client_email or lead.get("email")
            client_phone = client_phone or lead.get("phone")
            client_address = client_address or lead.get("address")
    
    quote = {
        "quote_id": quote_id,
        "reference": reference,
        "lead_id": inp.lead_id,
        "client_name": client_name,
        "client_email": client_email,
        "client_phone": client_phone,
        "client_address": client_address,
        "service_type": inp.service_type,
        "surface": inp.surface,
        "lines": computed_lines,
        "global_discount_percent": inp.global_discount_percent,
        "tva_rate": inp.tva_rate,
        **totals,
        "amount": totals["total_ttc"],  # Compat with existing quotes
        "details": inp.notes or "",
        "notes": inp.notes,
        "validity_days": inp.validity_days,
        "valid_until": (now + timedelta(days=inp.validity_days)).isoformat(),
        "payment_terms": inp.payment_terms,
        "status": "brouillon",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": user.user_id,
    }
    
    await _db.quotes.insert_one(quote)
    await _log_activity(user.user_id, "create_quote_premium", "quote", quote_id, {"reference": reference})
    await _write_audit("quote", quote_id, "create_premium", user.user_id, {
        "reference": reference, "total_ttc": totals["total_ttc"]
    })
    
    return await _db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})


@accounting_router.get("/quotes/premium/{quote_id}")
async def get_quote_premium(quote_id: str, request: Request):
    """Détail complet d'un devis premium."""
    await _require_auth(request)
    quote = await _db.quotes.find_one({"quote_id": quote_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")
    return quote


@accounting_router.patch("/quotes/premium/{quote_id}")
async def update_quote_premium(quote_id: str, inp: QuoteUpdatePremium, request: Request):
    """Mettre à jour un devis premium."""
    user = await _require_auth(request)
    
    quote = await _db.quotes.find_one({"quote_id": quote_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")
    
    update_data = {k: v for k, v in inp.model_dump().items() if v is not None}
    
    # Recalculer si les lignes changent
    if "lines" in update_data:
        lines_data = update_data["lines"]
        computed_lines = []
        for line in lines_data:
            line_dict = line.model_dump() if hasattr(line, 'model_dump') else line
            line_totals = calculate_line_total(
                line_dict.get("quantity", 1),
                line_dict.get("unit_price", 0),
                line_dict.get("discount_percent", 0),
                line_dict.get("tva_rate", "exonere"),
            )
            computed_lines.append({**line_dict, **line_totals})
        
        update_data["lines"] = computed_lines
        totals = calculate_document_totals([l.model_dump() if hasattr(l, 'model_dump') else l for l in lines_data])
        
        discount_pct = update_data.get("global_discount_percent", quote.get("global_discount_percent", 0))
        if discount_pct > 0:
            global_discount = round(totals["total_ht"] * discount_pct / 100, 2)
            totals["total_ht"] = round(totals["total_ht"] - global_discount, 2)
            totals["total_discount"] = round(totals["total_discount"] + global_discount, 2)
            tva_key = update_data.get("tva_rate", quote.get("tva_rate", "exonere"))
            tva_pct = TVA_RATES.get(tva_key, 0.0)
            totals["total_tva"] = round(totals["total_ht"] * tva_pct / 100, 2)
            totals["total_ttc"] = round(totals["total_ht"] + totals["total_tva"], 2)
        
        update_data.update(totals)
        update_data["amount"] = totals["total_ttc"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await _db.quotes.update_one({"quote_id": quote_id}, {"$set": update_data})
    await _write_audit("quote", quote_id, "update_premium", user.user_id, update_data)
    
    return await _db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})


@accounting_router.post("/quotes/premium/{quote_id}/duplicate")
async def duplicate_quote(quote_id: str, request: Request):
    """Dupliquer un devis existant."""
    user = await _require_auth(request)
    
    original = await _db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Devis introuvable")
    
    now = datetime.now(timezone.utc)
    counter = await get_next_counter("quotes")
    new_id = f"quote_{uuid.uuid4().hex[:12]}"
    new_ref = generate_reference("DEV", counter)
    
    duplicate = {**original}
    duplicate["quote_id"] = new_id
    duplicate["reference"] = new_ref
    duplicate["status"] = "brouillon"
    duplicate["created_at"] = now.isoformat()
    duplicate["updated_at"] = now.isoformat()
    duplicate["created_by"] = user.user_id
    duplicate["valid_until"] = (now + timedelta(days=original.get("validity_days", 30))).isoformat()
    duplicate.pop("sent_at", None)
    duplicate.pop("opened_at", None)
    duplicate.pop("responded_at", None)
    duplicate.pop("deleted_at", None)
    
    await _db.quotes.insert_one(duplicate)
    await _write_audit("quote", new_id, "duplicate", user.user_id, {"from": quote_id})
    
    return await _db.quotes.find_one({"quote_id": new_id}, {"_id": 0})


@accounting_router.post("/quotes/premium/{quote_id}/accept")
async def accept_quote(quote_id: str, request: Request):
    """Marquer un devis comme accepté."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    result = await _db.quotes.update_one(
        {"quote_id": quote_id, "status": {"$in": ["brouillon", "envoyé"]}},
        {"$set": {"status": "accepté", "responded_at": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis introuvable ou déjà traité")
    
    await _log_activity(user.user_id, "accept_quote", "quote", quote_id)
    await _write_audit("quote", quote_id, "accept", user.user_id)
    return {"message": "Devis accepté", "quote_id": quote_id}


@accounting_router.post("/quotes/premium/{quote_id}/refuse")
async def refuse_quote(quote_id: str, request: Request):
    """Marquer un devis comme refusé."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    result = await _db.quotes.update_one(
        {"quote_id": quote_id, "status": {"$in": ["brouillon", "envoyé"]}},
        {"$set": {"status": "refusé", "responded_at": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis introuvable ou déjà traité")
    
    await _write_audit("quote", quote_id, "refuse", user.user_id)
    return {"message": "Devis refusé", "quote_id": quote_id}


@accounting_router.post("/quotes/premium/{quote_id}/convert-to-invoice")
async def convert_quote_to_invoice(quote_id: str, request: Request):
    """Convertir un devis accepté en facture."""
    user = await _require_auth(request)
    
    quote = await _db.quotes.find_one({"quote_id": quote_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")
    
    # Vérifier qu'il n'y a pas déjà une facture pour ce devis
    existing = await _db.invoices.find_one({"quote_id": quote_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if existing:
        return existing
    
    now = datetime.now(timezone.utc)
    counter = await get_next_counter("invoices")
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    reference = generate_reference("FAC", counter)
    
    invoice = {
        "invoice_id": invoice_id,
        "reference": reference,
        "quote_id": quote_id,
        "quote_reference": quote.get("reference", ""),
        "lead_id": quote.get("lead_id"),
        "client_name": quote.get("client_name", ""),
        "client_email": quote.get("client_email", ""),
        "client_phone": quote.get("client_phone", ""),
        "client_address": quote.get("client_address", ""),
        "service_type": quote.get("service_type", ""),
        "surface": quote.get("surface"),
        "lines": quote.get("lines", []),
        "global_discount_percent": quote.get("global_discount_percent", 0),
        "tva_rate": quote.get("tva_rate", "exonere"),
        "total_ht": quote.get("total_ht", 0),
        "total_tva": quote.get("total_tva", 0),
        "total_ttc": quote.get("total_ttc", quote.get("amount", 0)),
        "total_discount": quote.get("total_discount", 0),
        "amount_ht": quote.get("total_ht", quote.get("amount", 0)),
        "amount_ttc": quote.get("total_ttc", quote.get("amount", 0)),
        "tva": quote.get("total_tva", 0),
        "notes": quote.get("notes", ""),
        "payment_terms": quote.get("payment_terms"),
        "status": "en_attente",
        "paid_amount": 0,
        "payments": [],
        "due_date": (now + timedelta(days=30)).isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": user.user_id,
    }
    
    await _db.invoices.insert_one(invoice)
    
    # Mettre à jour le statut du devis
    await _db.quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {"status": "converti", "converted_invoice_id": invoice_id, "updated_at": now.isoformat()}}
    )
    
    # Créer une écriture comptable
    if invoice["total_ttc"] > 0:
        await _create_accounting_entry(
            entry_type="revenue",
            amount=invoice["total_ttc"],
            description=f"Facture {reference} - {quote.get('service_type', '')}",
            category="services",
            reference_type="invoice",
            reference_id=invoice_id,
            user_id=user.user_id,
        )
    
    await _log_activity(user.user_id, "convert_quote_to_invoice", "invoice", invoice_id, {
        "quote_id": quote_id, "reference": reference
    })
    await _write_audit("invoice", invoice_id, "create_from_quote", user.user_id, {
        "quote_id": quote_id, "total_ttc": invoice["total_ttc"]
    })
    
    return await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})


@accounting_router.get("/quotes/premium/stats")
async def get_quotes_stats(request: Request, period: str = "30d"):
    """Statistiques des devis."""
    await _require_auth(request)
    
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "deleted_at": {"$exists": False}}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": {"$ifNull": ["$total_ttc", {"$ifNull": ["$amount", 0]}]}},
        }}
    ]
    results = await _db.quotes.aggregate(pipeline).to_list(20)
    
    stats = {r["_id"]: {"count": r["count"], "total": round(r["total_amount"], 2)} for r in results}
    total_count = sum(r["count"] for r in results)
    total_amount = sum(r["total_amount"] for r in results)
    accepted = stats.get("accepté", {}).get("count", 0) + stats.get("converti", {}).get("count", 0)
    conversion_rate = round(accepted / total_count * 100, 1) if total_count > 0 else 0
    
    return {
        "period": period,
        "total_quotes": total_count,
        "total_amount": round(total_amount, 2),
        "conversion_rate": conversion_rate,
        "by_status": stats,
    }


# ═══════════════════════════════════════════════════════════════════
# ENHANCED INVOICES ENDPOINTS (10 endpoints)
# ═══════════════════════════════════════════════════════════════════

@accounting_router.post("/invoices/premium")
async def create_invoice_premium(inp: InvoiceCreatePremium, request: Request):
    """Créer une facture premium directe (sans devis)."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    counter = await get_next_counter("invoices")
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    reference = generate_reference("FAC", counter)
    
    # Calculer les lignes
    computed_lines = []
    for line in inp.lines:
        line_totals = calculate_line_total(
            line.quantity, line.unit_price, line.discount_percent, line.tva_rate
        )
        computed_lines.append({**line.model_dump(), **line_totals})
    
    totals = calculate_document_totals([l.model_dump() for l in inp.lines])
    
    # Appliquer remise globale
    if inp.global_discount_percent > 0:
        global_discount = round(totals["total_ht"] * inp.global_discount_percent / 100, 2)
        totals["total_ht"] = round(totals["total_ht"] - global_discount, 2)
        totals["total_discount"] = round(totals["total_discount"] + global_discount, 2)
        tva_pct = TVA_RATES.get(inp.tva_rate, 0.0)
        totals["total_tva"] = round(totals["total_ht"] * tva_pct / 100, 2)
        totals["total_ttc"] = round(totals["total_ht"] + totals["total_tva"], 2)
    
    # Client info
    client_name = inp.client_name
    client_email = inp.client_email
    client_phone = inp.client_phone
    client_address = inp.client_address
    
    if inp.lead_id and not client_name:
        lead = await _db.leads.find_one({"lead_id": inp.lead_id}, {"_id": 0})
        if lead:
            client_name = client_name or lead.get("name")
            client_email = client_email or lead.get("email")
            client_phone = client_phone or lead.get("phone")
            client_address = client_address or lead.get("address")
    
    invoice = {
        "invoice_id": invoice_id,
        "reference": reference,
        "quote_id": inp.quote_id,
        "lead_id": inp.lead_id,
        "client_name": client_name or "",
        "client_email": client_email or "",
        "client_phone": client_phone or "",
        "client_address": client_address or "",
        "service_type": inp.service_type,
        "lines": computed_lines,
        "global_discount_percent": inp.global_discount_percent,
        "tva_rate": inp.tva_rate,
        **totals,
        "amount_ht": totals["total_ht"],
        "amount_ttc": totals["total_ttc"],
        "tva": totals["total_tva"],
        "notes": inp.notes or "",
        "payment_terms": inp.payment_terms,
        "status": "en_attente",
        "paid_amount": 0,
        "payments": [],
        "due_date": (now + timedelta(days=inp.due_days)).isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": user.user_id,
    }
    
    await _db.invoices.insert_one(invoice)
    
    # Écriture comptable
    if totals["total_ttc"] > 0:
        await _create_accounting_entry(
            entry_type="revenue",
            amount=totals["total_ttc"],
            description=f"Facture {reference} - {inp.service_type}",
            category="services",
            reference_type="invoice",
            reference_id=invoice_id,
            user_id=user.user_id,
        )
    
    await _log_activity(user.user_id, "create_invoice_premium", "invoice", invoice_id, {"reference": reference})
    await _write_audit("invoice", invoice_id, "create_premium", user.user_id, {"total_ttc": totals["total_ttc"]})
    
    return await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})


@accounting_router.get("/invoices/premium/{invoice_id}")
async def get_invoice_premium(invoice_id: str, request: Request):
    """Détail complet d'une facture premium."""
    await _require_auth(request)
    invoice = await _db.invoices.find_one({"invoice_id": invoice_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    return invoice


@accounting_router.patch("/invoices/premium/{invoice_id}")
async def update_invoice_premium(invoice_id: str, inp: InvoiceUpdatePremium, request: Request):
    """Mettre à jour une facture premium."""
    user = await _require_auth(request)
    
    update_data = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await _db.invoices.update_one(
        {"invoice_id": invoice_id, "deleted_at": {"$exists": False}},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    await _write_audit("invoice", invoice_id, "update_premium", user.user_id, update_data)
    return await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})


@accounting_router.post("/invoices/premium/{invoice_id}/payment")
async def record_payment(invoice_id: str, payment: PaymentRecord, request: Request):
    """Enregistrer un paiement sur une facture."""
    user = await _require_auth(request)
    
    invoice = await _db.invoices.find_one({"invoice_id": invoice_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    now = datetime.now(timezone.utc).isoformat()
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    
    total_due = invoice.get("total_ttc", invoice.get("amount_ttc", 0))
    current_paid = invoice.get("paid_amount", 0)
    remaining = round(total_due - current_paid, 2)
    
    if payment.amount > remaining + 0.01:  # petite marge flottant
        raise HTTPException(status_code=400, detail=f"Montant trop élevé. Reste à payer: {remaining}€")
    
    new_paid = round(current_paid + payment.amount, 2)
    new_status = "payée" if new_paid >= total_due - 0.01 else "partiellement_payée"
    
    payment_entry = {
        "payment_id": payment_id,
        "amount": payment.amount,
        "method": payment.method,
        "reference": payment.reference,
        "notes": payment.notes,
        "recorded_at": now,
        "recorded_by": user.user_id,
    }
    
    await _db.invoices.update_one(
        {"invoice_id": invoice_id},
        {
            "$set": {
                "paid_amount": new_paid,
                "status": new_status,
                "payment_method": payment.method,
                "paid_at": now if new_status == "payée" else invoice.get("paid_at"),
                "updated_at": now,
            },
            "$push": {"payments": payment_entry},
        }
    )
    
    # Écriture comptable pour le paiement
    await _create_accounting_entry(
        entry_type="payment_in",
        amount=payment.amount,
        description=f"Paiement facture {invoice.get('reference', invoice_id)} - {payment.method}",
        category="paiements",
        reference_type="invoice",
        reference_id=invoice_id,
        payment_method=payment.method,
        user_id=user.user_id,
    )
    
    await _log_activity(user.user_id, "record_payment", "invoice", invoice_id, {
        "amount": payment.amount, "method": payment.method, "new_status": new_status
    })
    await _write_audit("invoice", invoice_id, "payment", user.user_id, payment_entry)
    
    return {
        "payment_id": payment_id,
        "invoice_id": invoice_id,
        "paid_amount": new_paid,
        "remaining": round(total_due - new_paid, 2),
        "status": new_status,
    }


@accounting_router.post("/invoices/premium/{invoice_id}/mark-overdue")
async def mark_invoice_overdue(invoice_id: str, request: Request):
    """Marquer une facture comme en retard."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    result = await _db.invoices.update_one(
        {"invoice_id": invoice_id, "status": {"$in": ["en_attente", "partiellement_payée"]}},
        {"$set": {"status": "en_retard", "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable ou statut incompatible")
    
    await _write_audit("invoice", invoice_id, "mark_overdue", user.user_id)
    return {"message": "Facture marquée en retard"}


@accounting_router.post("/invoices/premium/{invoice_id}/cancel")
async def cancel_invoice(invoice_id: str, request: Request):
    """Annuler une facture."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    result = await _db.invoices.update_one(
        {"invoice_id": invoice_id, "status": {"$ne": "payée"}},
        {"$set": {"status": "annulée", "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture introuvable ou déjà payée")
    
    await _write_audit("invoice", invoice_id, "cancel", user.user_id)
    return {"message": "Facture annulée"}


@accounting_router.get("/invoices/premium/stats")
async def get_invoices_stats(request: Request, period: str = "30d"):
    """Statistiques des factures."""
    await _require_auth(request)
    
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "deleted_at": {"$exists": False}}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": {"$ifNull": ["$total_ttc", {"$ifNull": ["$amount_ttc", 0]}]}},
            "total_paid": {"$sum": {"$ifNull": ["$paid_amount", 0]}},
        }}
    ]
    results = await _db.invoices.aggregate(pipeline).to_list(20)
    
    stats = {}
    total_invoiced = 0
    total_paid = 0
    total_count = 0
    
    for r in results:
        stats[r["_id"]] = {
            "count": r["count"],
            "total": round(r["total_amount"], 2),
            "paid": round(r["total_paid"], 2),
        }
        total_invoiced += r["total_amount"]
        total_paid += r["total_paid"]
        total_count += r["count"]
    
    return {
        "period": period,
        "total_invoices": total_count,
        "total_invoiced": round(total_invoiced, 2),
        "total_paid": round(total_paid, 2),
        "outstanding": round(total_invoiced - total_paid, 2),
        "payment_rate": round(total_paid / total_invoiced * 100, 1) if total_invoiced > 0 else 0,
        "by_status": stats,
    }


@accounting_router.get("/invoices/premium/overdue")
async def get_overdue_invoices(request: Request):
    """Liste des factures en retard ou échues."""
    await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "deleted_at": {"$exists": False},
        "status": {"$in": ["en_attente", "partiellement_payée", "en_retard"]},
        "due_date": {"$lt": now},
    }
    
    invoices = await _db.invoices.find(query, {"_id": 0}).sort("due_date", 1).to_list(200)
    return {"items": invoices, "total": len(invoices)}


@accounting_router.post("/invoices/premium/{invoice_id}/duplicate")
async def duplicate_invoice(invoice_id: str, request: Request):
    """Dupliquer une facture."""
    user = await _require_auth(request)
    
    original = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    now = datetime.now(timezone.utc)
    counter = await get_next_counter("invoices")
    new_id = f"inv_{uuid.uuid4().hex[:12]}"
    new_ref = generate_reference("FAC", counter)
    
    duplicate = {**original}
    duplicate["invoice_id"] = new_id
    duplicate["reference"] = new_ref
    duplicate["status"] = "en_attente"
    duplicate["paid_amount"] = 0
    duplicate["payments"] = []
    duplicate["paid_at"] = None
    duplicate["created_at"] = now.isoformat()
    duplicate["updated_at"] = now.isoformat()
    duplicate["created_by"] = user.user_id
    duplicate["due_date"] = (now + timedelta(days=30)).isoformat()
    duplicate.pop("quote_id", None)
    duplicate.pop("stripe_session_id", None)
    duplicate.pop("deleted_at", None)
    
    await _db.invoices.insert_one(duplicate)
    await _write_audit("invoice", new_id, "duplicate", user.user_id, {"from": invoice_id})
    
    return await _db.invoices.find_one({"invoice_id": new_id}, {"_id": 0})


# ═══════════════════════════════════════════════════════════════════
# ACCOUNTING ENTRIES ENDPOINTS (8 endpoints)
# ═══════════════════════════════════════════════════════════════════

async def _create_accounting_entry(
    entry_type: str, amount: float, description: str,
    category: str = "services", reference_type: str = None,
    reference_id: str = None, payment_method: str = None,
    user_id: str = "system",
):
    """Helper interne pour créer une écriture comptable."""
    now = datetime.now(timezone.utc).isoformat()
    entry_id = f"acc_{uuid.uuid4().hex[:12]}"
    
    entry = {
        "entry_id": entry_id,
        "entry_type": entry_type,
        "amount": round(amount, 2),
        "description": description,
        "category": category,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "payment_method": payment_method,
        "entry_date": now,
        "created_at": now,
        "created_by": user_id,
    }
    
    await _db.accounting_entries.insert_one(entry)
    return entry_id


@accounting_router.post("/accounting/entries")
async def create_accounting_entry(inp: AccountingEntryCreate, request: Request):
    """Créer une écriture comptable manuelle."""
    user = await _require_auth(request)
    
    valid_types = ["revenue", "expense", "payment_in", "payment_out"]
    if inp.entry_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type invalide. Valeurs: {valid_types}")
    
    entry_date = inp.entry_date or datetime.now(timezone.utc).isoformat()
    now = datetime.now(timezone.utc).isoformat()
    entry_id = f"acc_{uuid.uuid4().hex[:12]}"
    
    entry = {
        "entry_id": entry_id,
        "entry_type": inp.entry_type,
        "amount": round(inp.amount, 2),
        "description": inp.description,
        "category": inp.category,
        "reference_type": inp.reference_type,
        "reference_id": inp.reference_id,
        "payment_method": inp.payment_method,
        "notes": inp.notes,
        "entry_date": entry_date,
        "created_at": now,
        "created_by": user.user_id,
    }
    
    await _db.accounting_entries.insert_one(entry)
    await _log_activity(user.user_id, "create_accounting_entry", "accounting", entry_id, {
        "type": inp.entry_type, "amount": inp.amount
    })
    await _write_audit("accounting", entry_id, "create", user.user_id, {"type": inp.entry_type, "amount": inp.amount})
    
    return await _db.accounting_entries.find_one({"entry_id": entry_id}, {"_id": 0})


@accounting_router.get("/accounting/entries")
async def list_accounting_entries(
    request: Request,
    entry_type: Optional[str] = None,
    category: Optional[str] = None,
    reference_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Liste des écritures comptables avec filtres."""
    await _require_auth(request)
    
    query: Dict[str, Any] = {}
    if entry_type:
        query["entry_type"] = entry_type
    if category:
        query["category"] = category
    if reference_type:
        query["reference_type"] = reference_type
    if date_from:
        query.setdefault("entry_date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("entry_date", {})["$lte"] = date_to
    
    total = await _db.accounting_entries.count_documents(query)
    skip = (page - 1) * page_size
    entries = await _db.accounting_entries.find(query, {"_id": 0}).sort("entry_date", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return {
        "items": entries,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }


@accounting_router.get("/accounting/entries/{entry_id}")
async def get_accounting_entry(entry_id: str, request: Request):
    """Détail d'une écriture comptable."""
    await _require_auth(request)
    entry = await _db.accounting_entries.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Écriture introuvable")
    return entry


@accounting_router.patch("/accounting/entries/{entry_id}")
async def update_accounting_entry(entry_id: str, inp: AccountingEntryUpdate, request: Request):
    """Modifier une écriture comptable."""
    user = await _require_auth(request)
    
    update_data = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Rien à modifier")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await _db.accounting_entries.update_one({"entry_id": entry_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Écriture introuvable")
    
    await _write_audit("accounting", entry_id, "update", user.user_id, update_data)
    return await _db.accounting_entries.find_one({"entry_id": entry_id}, {"_id": 0})


@accounting_router.delete("/accounting/entries/{entry_id}")
async def delete_accounting_entry(entry_id: str, request: Request):
    """Supprimer une écriture comptable."""
    user = await _require_auth(request)
    
    result = await _db.accounting_entries.delete_one({"entry_id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Écriture introuvable")
    
    await _write_audit("accounting", entry_id, "delete", user.user_id)
    return {"message": "Écriture supprimée"}


@accounting_router.get("/accounting/dashboard")
async def get_accounting_dashboard(request: Request, period: str = "30d"):
    """Dashboard comptable complet : CA, dépenses, bénéfice, KPIs."""
    await _require_auth(request)
    
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Revenus et dépenses
    pipeline = [
        {"$match": {"entry_date": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$entry_type",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }}
    ]
    entries = await _db.accounting_entries.aggregate(pipeline).to_list(20)
    
    by_type = {e["_id"]: {"total": round(e["total"], 2), "count": e["count"]} for e in entries}
    
    revenue = by_type.get("revenue", {}).get("total", 0)
    expenses = by_type.get("expense", {}).get("total", 0)
    payments_in = by_type.get("payment_in", {}).get("total", 0)
    payments_out = by_type.get("payment_out", {}).get("total", 0)
    
    # CA par catégorie
    cat_pipeline = [
        {"$match": {"entry_date": {"$gte": cutoff}, "entry_type": "revenue"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
    ]
    by_category = await _db.accounting_entries.aggregate(cat_pipeline).to_list(20)
    
    # CA par mois (12 derniers mois)
    monthly_pipeline = [
        {"$match": {"entry_type": {"$in": ["revenue", "payment_in"]}}},
        {"$addFields": {"month": {"$substr": ["$entry_date", 0, 7]}}},
        {"$group": {"_id": "$month", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": -1}},
        {"$limit": 12},
    ]
    monthly = await _db.accounting_entries.aggregate(monthly_pipeline).to_list(12)
    
    # Paiements par méthode
    method_pipeline = [
        {"$match": {"entry_date": {"$gte": cutoff}, "entry_type": "payment_in", "payment_method": {"$ne": None}}},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    by_method = await _db.accounting_entries.aggregate(method_pipeline).to_list(20)
    
    # Factures stats
    inv_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "deleted_at": {"$exists": False}}},
        {"$group": {
            "_id": None,
            "total_invoices": {"$sum": 1},
            "total_invoiced": {"$sum": {"$ifNull": ["$total_ttc", {"$ifNull": ["$amount_ttc", 0]}]}},
            "total_paid": {"$sum": {"$ifNull": ["$paid_amount", 0]}},
        }}
    ]
    inv_result = await _db.invoices.aggregate(inv_pipeline).to_list(1)
    inv_stats = inv_result[0] if inv_result else {"total_invoices": 0, "total_invoiced": 0, "total_paid": 0}
    
    return {
        "period": period,
        "kpis": {
            "chiffre_affaires": round(revenue, 2),
            "depenses": round(expenses, 2),
            "benefice_net": round(revenue - expenses, 2),
            "paiements_recus": round(payments_in, 2),
            "paiements_sortants": round(payments_out, 2),
            "tresorerie": round(payments_in - payments_out, 2),
            "marge_brute": round((revenue - expenses) / revenue * 100, 1) if revenue > 0 else 0,
        },
        "invoices": {
            "total": inv_stats.get("total_invoices", 0),
            "total_invoiced": round(inv_stats.get("total_invoiced", 0), 2),
            "total_paid": round(inv_stats.get("total_paid", 0), 2),
            "outstanding": round(inv_stats.get("total_invoiced", 0) - inv_stats.get("total_paid", 0), 2),
        },
        "by_category": [{"category": c["_id"], "total": round(c["total"], 2)} for c in by_category],
        "monthly_revenue": [{"month": m["_id"], "total": round(m["total"], 2)} for m in monthly],
        "by_payment_method": [{"method": m["_id"], "total": round(m["total"], 2), "count": m["count"]} for m in by_method],
    }


@accounting_router.get("/accounting/profit-loss")
async def get_profit_loss(request: Request, year: Optional[int] = None):
    """Compte de résultat simplifié par mois."""
    await _require_auth(request)
    
    current_year = year or datetime.now(timezone.utc).year
    year_start = f"{current_year}-01-01T00:00:00"
    year_end = f"{current_year}-12-31T23:59:59"
    
    pipeline = [
        {"$match": {"entry_date": {"$gte": year_start, "$lte": year_end}}},
        {"$addFields": {"month": {"$substr": ["$entry_date", 0, 7]}}},
        {"$group": {
            "_id": {"month": "$month", "type": "$entry_type"},
            "total": {"$sum": "$amount"},
        }},
        {"$sort": {"_id.month": 1}},
    ]
    results = await _db.accounting_entries.aggregate(pipeline).to_list(100)
    
    months = {}
    for r in results:
        month = r["_id"]["month"]
        entry_type = r["_id"]["type"]
        if month not in months:
            months[month] = {"month": month, "revenue": 0, "expenses": 0, "payments_in": 0, "payments_out": 0}
        if entry_type == "revenue":
            months[month]["revenue"] = round(r["total"], 2)
        elif entry_type == "expense":
            months[month]["expenses"] = round(r["total"], 2)
        elif entry_type == "payment_in":
            months[month]["payments_in"] = round(r["total"], 2)
        elif entry_type == "payment_out":
            months[month]["payments_out"] = round(r["total"], 2)
    
    for m in months.values():
        m["profit"] = round(m["revenue"] - m["expenses"], 2)
    
    return {
        "year": current_year,
        "months": list(months.values()),
        "totals": {
            "revenue": round(sum(m["revenue"] for m in months.values()), 2),
            "expenses": round(sum(m["expenses"] for m in months.values()), 2),
            "profit": round(sum(m["profit"] for m in months.values()), 2),
        }
    }


@accounting_router.get("/accounting/tva-rates")
async def get_tva_rates(request: Request):
    """Liste des taux de TVA disponibles."""
    await _require_auth(request)
    return {"rates": TVA_RATES, "default": DEFAULT_TVA_RATE}


# ═══════════════════════════════════════════════════════════════════
# CALCULATION ENDPOINT (pour le frontend)
# ═══════════════════════════════════════════════════════════════════

@accounting_router.post("/accounting/calculate")
async def calculate_totals(request: Request):
    """Calculer les totaux d'un document (devis/facture) côté serveur."""
    await _require_auth(request)
    body = await request.json()
    
    lines = body.get("lines", [])
    global_discount = body.get("global_discount_percent", 0)
    tva_rate = body.get("tva_rate", "exonere")
    
    totals = calculate_document_totals(lines)
    
    if global_discount > 0:
        gd = round(totals["total_ht"] * global_discount / 100, 2)
        totals["total_ht"] = round(totals["total_ht"] - gd, 2)
        totals["total_discount"] = round(totals["total_discount"] + gd, 2)
        tva_pct = TVA_RATES.get(tva_rate, 0.0)
        totals["total_tva"] = round(totals["total_ht"] * tva_pct / 100, 2)
        totals["total_ttc"] = round(totals["total_ht"] + totals["total_tva"], 2)
    
    computed_lines = []
    for line in lines:
        lt = calculate_line_total(
            line.get("quantity", 1),
            line.get("unit_price", 0),
            line.get("discount_percent", 0),
            line.get("tva_rate", "exonere"),
        )
        computed_lines.append({**line, **lt})
    
    return {"lines": computed_lines, **totals}
