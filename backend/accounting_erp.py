"""
Global Clean Home CRM - MODULE ERP COMPTABILITÉ INTÉGRÉ
========================================================
Système comptable professionnel interconnecté :
- Dashboard financier temps réel (KPIs + graphiques)
- Facturation intelligente connectée CRM
- Dépenses avec impact auto sur comptabilité
- Trésorerie synchronisée
- Comptabilité automatique (journaux ventes/achats/banque)
- TVA & Fiscalité automatique
- Reporting avancé (P&L, clients rentables, services)
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import logging
import math
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

_db = None

def init_erp_db(database):
    global _db
    _db = database

erp_router = APIRouter(prefix="/api/accounting")


# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


async def _log_activity(user_id, action, entity_type, entity_id, details=None):
    try:
        from server import _log_activity as server_log
        await server_log(user_id, action, entity_type, entity_id, details)
    except Exception:
        pass


# Plan comptable simplifié
PLAN_COMPTABLE = {
    "411": {"label": "Créances clients", "class": "actif"},
    "401": {"label": "Dettes fournisseurs", "class": "passif"},
    "512": {"label": "Banque", "class": "actif"},
    "530": {"label": "Caisse", "class": "actif"},
    "701": {"label": "Ventes de services", "class": "revenu"},
    "601": {"label": "Achats matériel", "class": "charge"},
    "602": {"label": "Achats fournitures", "class": "charge"},
    "613": {"label": "Loyer", "class": "charge"},
    "616": {"label": "Assurances", "class": "charge"},
    "621": {"label": "Salaires", "class": "charge"},
    "625": {"label": "Déplacements & transport", "class": "charge"},
    "626": {"label": "Énergie & télécommunications", "class": "charge"},
    "628": {"label": "Charges diverses", "class": "charge"},
    "615": {"label": "Entretien & maintenance", "class": "charge"},
    "441": {"label": "TVA collectée", "class": "passif"},
    "445": {"label": "TVA déductible", "class": "actif"},
}

# Mapping catégorie dépense → compte comptable
CATEGORY_TO_ACCOUNT = {
    "materiel": "601",
    "fournitures": "602",
    "transport": "625",
    "salaires": "621",
    "energie": "626",
    "loyer": "613",
    "assurances": "616",
    "maintenance": "615",
    "autres": "628",
}

# TVA par catégorie
CATEGORY_TVA_RATE = {
    "materiel": 20.0,
    "fournitures": 20.0,
    "transport": 20.0,
    "salaires": 0.0,
    "energie": 20.0,
    "loyer": 20.0,
    "assurances": 0.0,
    "maintenance": 20.0,
    "autres": 20.0,
}

TVA_RATES_MAP = {0: 0.0, 5.5: 5.5, 10: 10.0, 20: 20.0}


# ═══════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════

class InvoiceItemModel(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price_ht: float = 0.0
    tva_rate: float = 20.0  # 0, 5.5, 10, 20

    @field_validator("quantity")
    @classmethod
    def val_qty(cls, v):
        if v <= 0: raise ValueError("Quantité > 0")
        return v

    @field_validator("unit_price_ht")
    @classmethod
    def val_price(cls, v):
        if v < 0: raise ValueError("Prix >= 0")
        return v


class InvoiceCreate(BaseModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    prestation_id: Optional[str] = None
    prestation_type: Optional[str] = None  # menage, bureau, canape, tapis, matelas
    items: List[InvoiceItemModel] = []
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Paiement à 30 jours"
    work_date: Optional[str] = None
    due_days: int = 30


class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    items: Optional[List[InvoiceItemModel]] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    work_date: Optional[str] = None


class PaymentRecord(BaseModel):
    amount: Optional[float] = None
    method: str = "virement"  # virement, especes, cheque, carte
    reference: Optional[str] = None
    notes: Optional[str] = None
    payment_date: Optional[str] = None


class ExpenseCreate(BaseModel):
    date: Optional[str] = None
    category: str = "autres"
    description: str
    amount_ht: float
    tva_rate: Optional[float] = None  # auto if None
    supplier_name: Optional[str] = None
    supplier_id: Optional[str] = None
    status: str = "payée"  # payee | en_attente
    attachment_url: Optional[str] = None

    @field_validator("amount_ht")
    @classmethod
    def val_amt(cls, v):
        if v <= 0: raise ValueError("Montant > 0")
        return v


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount_ht: Optional[float] = None
    tva_rate: Optional[float] = None
    supplier_name: Optional[str] = None
    status: Optional[str] = None
    attachment_url: Optional[str] = None


class TreasuryConfig(BaseModel):
    initial_balance: float = 0.0
    alert_threshold: float = 500.0


# ═══════════════════════════════════════════════════════════════════
# INVOICE HELPERS
# ═══════════════════════════════════════════════════════════════════

def calc_item(item: dict) -> dict:
    """Calculate item totals."""
    qty = item.get("quantity", 1)
    pu = item.get("unit_price_ht", 0)
    rate = item.get("tva_rate", 20)
    ht = round(qty * pu, 2)
    tva = round(ht * rate / 100, 2)
    ttc = round(ht + tva, 2)
    return {**item, "amount_ht": ht, "amount_tva": tva, "amount_ttc": ttc}


def calc_totals(items: list) -> dict:
    amount_ht = sum(i.get("amount_ht", 0) for i in items)
    total_tva = sum(i.get("amount_tva", 0) for i in items)
    amount_ttc = sum(i.get("amount_ttc", 0) for i in items)
    return {
        "amount_ht": round(amount_ht, 2),
        "total_tva": round(total_tva, 2),
        "amount_ttc": round(amount_ttc, 2),
    }


async def get_next_invoice_number() -> str:
    result = await _db.erp_counters.find_one_and_update(
        {"_id": "invoice"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = result["seq"]
    year = datetime.now(timezone.utc).year
    return f"FAC-{year}-{str(seq).zfill(4)}"


# ═══════════════════════════════════════════════════════════════════
# JOURNAL ENTRY ENGINE (CŒUR ERP)
# ═══════════════════════════════════════════════════════════════════

async def create_journal_entry(
    journal_type: str,  # ventes | achats | banque
    reference_type: str,  # invoice | expense | payment
    reference_id: str,
    entries: List[Dict],
    description: str,
    entry_date: str = None,
    user_id: str = None,
):
    """Create a balanced double-entry journal record."""
    now = entry_date or datetime.now(timezone.utc).isoformat()
    
    total_debit = sum(e.get("debit", 0) for e in entries)
    total_credit = sum(e.get("credit", 0) for e in entries)
    is_balanced = abs(total_debit - total_credit) < 0.01

    entry_id = f"jrn_{uuid.uuid4().hex[:12]}"
    doc = {
        "entry_id": entry_id,
        "entry_date": now,
        "journal_type": journal_type,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "entries": entries,
        "description": description,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": is_balanced,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await _db.accounting_entries.insert_one(doc)
    return entry_id


async def create_sale_journal_entry(invoice: dict, user_id: str = None):
    """EVENT 2: Facture envoyée → Journal Ventes (411 D / 701 C + 441 C)."""
    entries = [
        {
            "account_number": "411",
            "account_label": "Créances clients",
            "debit": invoice["amount_ttc"],
            "credit": 0,
        },
        {
            "account_number": "701",
            "account_label": "Ventes de services",
            "debit": 0,
            "credit": invoice["amount_ht"],
        },
        {
            "account_number": "441",
            "account_label": "TVA collectée",
            "debit": 0,
            "credit": invoice["total_tva"],
        },
    ]
    return await create_journal_entry(
        journal_type="ventes",
        reference_type="invoice",
        reference_id=invoice["invoice_id"],
        entries=entries,
        description=f"Facture {invoice.get('invoice_number', invoice.get('invoice_id',''))} - {invoice.get('lead_name', 'N/A')}",
        entry_date=invoice.get("created_at"),
        user_id=user_id,
    )


async def create_payment_journal_entry(invoice: dict, amount: float, payment_date: str = None, user_id: str = None):
    """EVENT 3: Paiement reçu → Journal Banque (512 D / 411 C)."""
    entries = [
        {
            "account_number": "512",
            "account_label": "Banque",
            "debit": amount,
            "credit": 0,
        },
        {
            "account_number": "411",
            "account_label": "Créances clients",
            "debit": 0,
            "credit": amount,
        },
    ]
    return await create_journal_entry(
        journal_type="banque",
        reference_type="payment",
        reference_id=invoice["invoice_id"],
        entries=entries,
        description=f"Paiement {invoice.get('invoice_number', invoice.get('invoice_id',''))} - {invoice.get('lead_name', 'N/A')}",
        entry_date=payment_date,
        user_id=user_id,
    )


async def create_expense_journal_entry(expense: dict, user_id: str = None):
    """EVENT 4: Dépense → Journal Achats (6xx D + 445 D / 401 ou 512 C)."""
    account = CATEGORY_TO_ACCOUNT.get(expense.get("category", "autres"), "628")
    account_label = PLAN_COMPTABLE.get(account, {}).get("label", "Charges diverses")
    
    entries = [
        {
            "account_number": account,
            "account_label": account_label,
            "debit": expense["amount_ht"],
            "credit": 0,
        },
    ]
    
    if expense.get("amount_tva", 0) > 0:
        entries.append({
            "account_number": "445",
            "account_label": "TVA déductible",
            "debit": expense["amount_tva"],
            "credit": 0,
        })
    
    # If paid immediately → credit Banque, else → credit Dettes fournisseurs
    credit_account = "512" if expense.get("status") == "payée" else "401"
    credit_label = "Banque" if credit_account == "512" else "Dettes fournisseurs"
    entries.append({
        "account_number": credit_account,
        "account_label": credit_label,
        "debit": 0,
        "credit": expense["amount_ttc"],
    })
    
    return await create_journal_entry(
        journal_type="achats",
        reference_type="expense",
        reference_id=expense["expense_id"],
        entries=entries,
        description=f"Dépense: {expense.get('description', '')} ({expense.get('category', '')})",
        entry_date=expense.get("date"),
        user_id=user_id,
    )


async def create_expense_payment_journal_entry(expense: dict, payment_date: str = None, user_id: str = None):
    """EVENT 5: Paiement dépense → Journal Banque (401 D / 512 C)."""
    entries = [
        {
            "account_number": "401",
            "account_label": "Dettes fournisseurs",
            "debit": expense["amount_ttc"],
            "credit": 0,
        },
        {
            "account_number": "512",
            "account_label": "Banque",
            "debit": 0,
            "credit": expense["amount_ttc"],
        },
    ]
    return await create_journal_entry(
        journal_type="banque",
        reference_type="expense_payment",
        reference_id=expense["expense_id"],
        entries=entries,
        description=f"Paiement dépense: {expense.get('description', '')}",
        entry_date=payment_date,
        user_id=user_id,
    )


# ═══════════════════════════════════════════════════════════════════
# A. DASHBOARD FINANCIER
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/dashboard/kpis")
async def get_dashboard_kpis(request: Request):
    """KPIs temps réel : CA, bénéfice, dépenses, trésorerie, impayés."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    # Dates
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # CA TTC (factures envoyées ou payées)
    pipeline_ca = [
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]
    ca_all = await _db.invoices.aggregate(pipeline_ca).to_list(1)
    ca_total = ca_all[0]["total"] if ca_all else 0
    
    # CA jour
    ca_day_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    ca_day = ca_day_agg[0]["total"] if ca_day_agg else 0
    
    # CA mois
    ca_month_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    ca_month = ca_month_agg[0]["total"] if ca_month_agg else 0
    
    # CA année
    ca_year_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": year_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    ca_year = ca_year_agg[0]["total"] if ca_year_agg else 0
    
    # CA mois dernier (pour variation %)
    ca_last_month_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": last_month_start, "$lt": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    ca_last_month = ca_last_month_agg[0]["total"] if ca_last_month_agg else 0
    
    # Dépenses mois
    dep_month_agg = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": month_start}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(20)
    expenses_month = sum(d["total"] for d in dep_month_agg)
    expenses_breakdown = {d["_id"]: round(d["total"], 2) for d in dep_month_agg}
    
    # Dépenses mois dernier
    dep_last_agg = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": last_month_start, "$lt": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    expenses_last_month = dep_last_agg[0]["total"] if dep_last_agg else 0
    
    # Bénéfice brut mois = CA HT mois - Dépenses HT mois
    ca_ht_month_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ht"}}},
    ]).to_list(1)
    ca_ht_month = ca_ht_month_agg[0]["total"] if ca_ht_month_agg else 0
    
    dep_ht_month_agg = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ht"}}},
    ]).to_list(1)
    dep_ht_month = dep_ht_month_agg[0]["total"] if dep_ht_month_agg else 0
    
    benefice_month = round(ca_ht_month - dep_ht_month, 2)
    
    # Variation % bénéfice
    ca_ht_last_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": last_month_start, "$lt": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ht"}}},
    ]).to_list(1)
    ca_ht_last = ca_ht_last_agg[0]["total"] if ca_ht_last_agg else 0
    dep_ht_last_agg = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": last_month_start, "$lt": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ht"}}},
    ]).to_list(1)
    dep_ht_last = dep_ht_last_agg[0]["total"] if dep_ht_last_agg else 0
    benefice_last = ca_ht_last - dep_ht_last
    
    benefice_variation = 0
    if benefice_last != 0:
        benefice_variation = round(((benefice_month - benefice_last) / abs(benefice_last)) * 100, 1)
    
    # Trésorerie (solde banque)
    config = await _db.treasury_config.find_one({"_id": "config"})
    initial_balance = config["initial_balance"] if config else 0
    alert_threshold = config["alert_threshold"] if config else 500
    
    # Entrées = paiements factures reçus
    entries_in = await _db.invoices.aggregate([
        {"$match": {"status": "payée"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    total_in = entries_in[0]["total"] if entries_in else 0
    
    # Sorties = dépenses payées
    entries_out = await _db.expenses.aggregate([
        {"$match": {"status": "payée"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    total_out = entries_out[0]["total"] if entries_out else 0
    
    solde_banque = round(initial_balance + total_in - total_out, 2)
    
    # Prévision 30j (factures en attente de paiement)
    pending_invoices = await _db.invoices.aggregate([
        {"$match": {"status": "en_attente"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    pending_in = pending_invoices[0]["total"] if pending_invoices else 0
    
    pending_expenses = await _db.expenses.aggregate([
        {"$match": {"status": "en_attente"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    pending_out = pending_expenses[0]["total"] if pending_expenses else 0
    
    prevision_30j = round(solde_banque + pending_in - pending_out, 2)
    
    # Factures impayées
    unpaid = await _db.invoices.count_documents({"status": "en_attente"})
    unpaid_amount_agg = await _db.invoices.aggregate([
        {"$match": {"status": "en_attente"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    unpaid_amount = unpaid_amount_agg[0]["total"] if unpaid_amount_agg else 0
    
    # Factures en retard (> 30j)
    overdue_date = (now - timedelta(days=30)).isoformat()
    overdue = await _db.invoices.count_documents({"status": "en_attente", "created_at": {"$lt": overdue_date}})
    
    # Dépenses en attente
    pending_exp_count = await _db.expenses.count_documents({"status": "en_attente"})
    
    return {
        "ca": {"day": round(ca_day, 2), "month": round(ca_month, 2), "year": round(ca_year, 2), "total": round(ca_total, 2)},
        "benefice": {"month": benefice_month, "variation_pct": benefice_variation},
        "expenses": {"month": round(expenses_month, 2), "breakdown": expenses_breakdown, "last_month": round(expenses_last_month, 2)},
        "treasury": {"solde": solde_banque, "prevision_30j": prevision_30j, "alert_threshold": alert_threshold},
        "unpaid_invoices": {"count": unpaid, "amount": round(unpaid_amount, 2), "overdue": overdue},
        "pending_expenses": {"count": pending_exp_count, "amount": round(pending_out, 2)},
    }


@erp_router.get("/erp/dashboard/charts")
async def get_dashboard_charts(request: Request):
    """Données pour graphiques: CA 12 mois, répartition prestations, waterfall, solde."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    # CA 12 derniers mois
    ca_monthly = []
    for i in range(11, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        if m == 12:
            m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            m_end = datetime(y, m + 1, 1, tzinfo=timezone.utc).isoformat()
        
        agg = await _db.invoices.aggregate([
            {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": m_start, "$lt": m_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
        ]).to_list(1)
        ca_monthly.append({
            "month": f"{y}-{str(m).zfill(2)}",
            "label": f"{['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][m-1]} {y}",
            "ca": round(agg[0]["total"], 2) if agg else 0,
        })
    
    # Répartition CA par type prestation
    prestation_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}}},
        {"$group": {"_id": {"$ifNull": ["$prestation_type", "autre"]}, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(20)
    prestation_breakdown = [{"type": p["_id"], "ca": round(p["total"], 2)} for p in prestation_agg]
    
    # Waterfall: CA HT - Charges HT = Résultat
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    ca_ht = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ht"}}},
    ]).to_list(1)
    charges_ht = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ht"}}},
    ]).to_list(1)
    
    ca_val = ca_ht[0]["total"] if ca_ht else 0
    charges_val = charges_ht[0]["total"] if charges_ht else 0
    waterfall = [
        {"name": "CA HT", "value": round(ca_val, 2)},
        {"name": "Charges HT", "value": -round(charges_val, 2)},
        {"name": "Résultat", "value": round(ca_val - charges_val, 2)},
    ]
    
    # Solde bancaire mensuel (6 derniers mois)
    config = await _db.treasury_config.find_one({"_id": "config"})
    initial = config["initial_balance"] if config else 0
    
    solde_monthly = []
    running = initial
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        if m == 12:
            m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            m_end = datetime(y, m + 1, 1, tzinfo=timezone.utc).isoformat()
        
        in_agg = await _db.invoices.aggregate([
            {"$match": {"status": "payée", "payment_date": {"$gte": m_start, "$lt": m_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
        ]).to_list(1)
        out_agg = await _db.expenses.aggregate([
            {"$match": {"status": "payée", "date": {"$gte": m_start, "$lt": m_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
        ]).to_list(1)
        
        in_val = in_agg[0]["total"] if in_agg else 0
        out_val = out_agg[0]["total"] if out_agg else 0
        running += in_val - out_val
        
        solde_monthly.append({
            "month": f"{y}-{str(m).zfill(2)}",
            "label": f"{['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][m-1]}",
            "solde": round(running, 2),
        })
    
    return {
        "ca_monthly": ca_monthly,
        "prestation_breakdown": prestation_breakdown,
        "waterfall": waterfall,
        "solde_monthly": solde_monthly,
    }


# ═══════════════════════════════════════════════════════════════════
# B. FACTURATION INTELLIGENTE
# ═══════════════════════════════════════════════════════════════════

def _normalize_invoice_for_erp(inv: dict) -> dict:
    """Normalise les factures créées par le CRM standard pour qu'elles
    s'affichent correctement dans l'ERP (aliases de champs)."""
    if not inv:
        return inv

    # Montants : le CRM utilise amount_ht/amount_ttc, l'ERP utilise total_ht/total_ttc
    if "total_ht" not in inv and "amount_ht" in inv:
        inv["total_ht"] = float(inv.get("amount_ht") or 0)
    if "total_ttc" not in inv and "amount_ttc" in inv:
        inv["total_ttc"] = float(inv.get("amount_ttc") or 0)
    if "total_tva" not in inv:
        ht = float(inv.get("total_ht") or inv.get("amount_ht") or 0)
        ttc = float(inv.get("total_ttc") or inv.get("amount_ttc") or 0)
        inv["total_tva"] = round(ttc - ht, 2)

    # Prestation : le CRM utilise service_type ou project
    if not inv.get("prestation_type"):
        inv["prestation_type"] = inv.get("service_type") or inv.get("project") or ""

    # Nom client : alias pour les vues qui attendent client_name
    if not inv.get("client_name"):
        inv["client_name"] = inv.get("lead_name") or ""

    # Items : si le CRM n'a pas créé de line_items, synthétise une ligne unique
    if not inv.get("items") and not inv.get("line_items"):
        inv["items"] = [{
            "description": inv.get("details") or inv.get("project") or inv.get("service_type") or "Prestation",
            "quantity": 1,
            "unit_price_ht": float(inv.get("amount_ht") or inv.get("total_ht") or 0),
            "tva_rate": float(inv.get("tva") or inv.get("tva_rate") or 0),
            "amount_ht": float(inv.get("amount_ht") or inv.get("total_ht") or 0),
            "amount_ttc": float(inv.get("amount_ttc") or inv.get("total_ttc") or 0),
        }]
    elif inv.get("line_items") and not inv.get("items"):
        # Convertit line_items (CRM) vers items (ERP)
        inv["items"] = [{
            "description": li.get("description") or li.get("label") or "",
            "quantity": li.get("quantity") or li.get("qty") or 1,
            "unit_price_ht": float(li.get("unit_price") or li.get("price") or 0),
            "tva_rate": float(li.get("tva_rate") or inv.get("tva") or 0),
            "amount_ht": (li.get("quantity") or li.get("qty") or 1) * float(li.get("unit_price") or li.get("price") or 0),
        } for li in inv["line_items"]]

    # Source : marque si c'est un devis CRM converti ou une facture native ERP
    if not inv.get("source"):
        inv["source"] = "crm" if "amount_ht" in inv and "total_ht" not in (inv.get("_original_keys") or []) else "erp"

    return inv


@erp_router.get("/erp/invoices")
async def list_invoices(
    request: Request,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Liste des factures avec filtres."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    overdue_date = (now - timedelta(days=30)).isoformat()
    
    query = {"deleted_at": {"$exists": False}}
    if status:
        query["status"] = status
    if client_id:
        query["client_id"] = client_id
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"lead_name": {"$regex": search, "$options": "i"}},
        ]
    
    total = await _db.invoices.count_documents(query)
    skip = (page - 1) * page_size
    items = await _db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)

    # Normalise + auto-flag overdue
    for inv in items:
        _normalize_invoice_for_erp(inv)
        if inv.get("status") == "en_attente" and inv.get("created_at", "") < overdue_date:
            inv["status_display"] = "en_retard"
        else:
            inv["status_display"] = inv.get("status", "brouillon")

    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": math.ceil(total / page_size)}


@erp_router.post("/erp/invoices")
async def create_invoice(inp: InvoiceCreate, request: Request):
    """Créer facture (smart depuis CRM ou manuelle). Statut initial = brouillon."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    # Auto-fill from CRM client if client_id provided
    if inp.client_id and not inp.client_name:
        from server import db
        lead = await db.leads.find_one({"lead_id": inp.client_id}, {"_id": 0})
        if lead:
            inp.client_name = inp.client_name or lead.get("name", "")
            inp.client_email = inp.client_email or lead.get("email", "")
            inp.client_phone = inp.client_phone or lead.get("phone", "")
            inp.client_address = inp.client_address or lead.get("address", "")
    
    # Auto-fill from prestation/quote
    if inp.prestation_id and not inp.items:
        from server import db
        quote = await db.quotes.find_one({"quote_id": inp.prestation_id}, {"_id": 0})
        if not quote:
            quote = await db.quotes_premium.find_one({"quote_id": inp.prestation_id}, {"_id": 0})
        if quote:
            inp.prestation_type = inp.prestation_type or quote.get("service_type", "")
            for line in quote.get("lines", []):
                inp.items.append(InvoiceItemModel(
                    description=line.get("description", ""),
                    quantity=line.get("quantity", 1),
                    unit_price_ht=line.get("unit_price", 0),
                    tva_rate=20.0,
                ))
    
    # Calculate items
    computed_items = [calc_item(i.model_dump()) for i in inp.items]
    totals = calc_totals(computed_items)
    
    invoice_number = await get_next_invoice_number()
    due_date = (datetime.now(timezone.utc) + timedelta(days=inp.due_days)).isoformat()
    
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "invoice_number": invoice_number,
        "client_id": inp.client_id,
        "lead_name": inp.client_name or "",
        "client_email": inp.client_email or "",
        "client_phone": inp.client_phone or "",
        "client_address": inp.client_address or "",
        "prestation_id": inp.prestation_id,
        "prestation_type": inp.prestation_type or "",
        "items": computed_items,
        **totals,
        "status": "brouillon",
        "created_at": now,
        "work_date": inp.work_date or now,
        "due_date": due_date,
        "payment_date": None,
        "payment_method": None,
        "notes": inp.notes or "",
        "payment_terms": inp.payment_terms or "Paiement à 30 jours",
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
    }
    
    await _db.invoices.insert_one(invoice)
    await _log_activity(user.user_id, "create_erp_invoice", "erp_invoice", invoice["invoice_id"], {"number": invoice_number})
    
    return {k: v for k, v in invoice.items() if k != "_id"}


@erp_router.get("/erp/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    """Détails facture."""
    await _require_auth(request)
    inv = await _db.invoices.find_one({"invoice_id": invoice_id, "deleted_at": {"$exists": False}}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Facture introuvable")

    _normalize_invoice_for_erp(inv)

    # Get related journal entries
    journals = await _db.accounting_entries.find({"reference_id": invoice_id}, {"_id": 0}).to_list(20)
    inv["journal_entries"] = journals
    return inv


@erp_router.put("/erp/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, inp: InvoiceUpdate, request: Request):
    """Éditer facture (seulement si brouillon)."""
    user = await _require_auth(request)
    
    inv = await _db.invoices.find_one({"invoice_id": invoice_id, "deleted_at": {"$exists": False}})
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.get("status") != "brouillon":
        raise HTTPException(400, "Seules les factures en brouillon sont modifiables")
    
    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    
    # Recalculate if items changed
    if "items" in update and update["items"] is not None:
        computed = [calc_item(i.model_dump()) for i in inp.items]
        totals = calc_totals(computed)
        update["items"] = computed
        update.update(totals)
    
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.invoices.update_one({"invoice_id": invoice_id}, {"$set": update})
    
    return await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})


@erp_router.post("/erp/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str, request: Request):
    """EVENT 2: Envoyer facture → Brouillon → Envoyée + écriture comptable ventes."""
    user = await _require_auth(request)
    
    inv = await _db.invoices.find_one({"invoice_id": invoice_id, "deleted_at": {"$exists": False}})
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.get("status") != "brouillon":
        raise HTTPException(400, f"Facture déjà envoyée (statut: {inv.get('status')})")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # 1. Change status
    await _db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "en_attente", "sent_at": now, "updated_at": now}}
    )
    
    # 2. TRIGGER: Create journal entry (ventes)
    inv["status"] = "en_attente"
    journal_id = await create_sale_journal_entry(inv, user.user_id)
    
    # 3. Log
    await _log_activity(user.user_id, "send_erp_invoice", "erp_invoice", invoice_id, {"journal_id": journal_id})
    
    return {"status": "en_attente", "journal_entry_id": journal_id, "message": "Facture envoyée, écriture comptable générée"}


@erp_router.post("/erp/invoices/{invoice_id}/record-payment")
async def record_payment(invoice_id: str, inp: PaymentRecord, request: Request):
    """EVENT 3: Enregistrer paiement → Envoyée → Payée + écriture banque."""
    user = await _require_auth(request)
    
    inv = await _db.invoices.find_one({"invoice_id": invoice_id, "deleted_at": {"$exists": False}})
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.get("status") not in ("en_attente", "en_retard"):
        raise HTTPException(400, f"Facture non payable (statut: {inv.get('status')})")
    
    now = datetime.now(timezone.utc).isoformat()
    payment_date = inp.payment_date or now
    amount = inp.amount or inv["amount_ttc"]
    
    # 1. Update invoice
    await _db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {
            "status": "payée",
            "payment_date": payment_date,
            "payment_method": inp.method,
            "payment_reference": inp.reference,
            "payment_notes": inp.notes,
            "paid_amount": amount,
            "updated_at": now,
        }}
    )
    
    # 2. TRIGGER: Create journal entry (banque)
    journal_id = await create_payment_journal_entry(inv, amount, payment_date, user.user_id)
    
    # 3. Log
    await _log_activity(user.user_id, "record_payment_erp", "erp_invoice", invoice_id, {"amount": amount, "journal_id": journal_id})
    
    return {"status": "payée", "journal_entry_id": journal_id, "amount": amount, "message": "Paiement enregistré, trésorerie mise à jour"}


@erp_router.delete("/erp/invoices/{invoice_id}")
async def archive_invoice(invoice_id: str, request: Request):
    """Archive facture (soft delete)."""
    user = await _require_auth(request)
    inv = await _db.invoices.find_one({"invoice_id": invoice_id})
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    
    await _db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    await _log_activity(user.user_id, "archive_erp_invoice", "erp_invoice", invoice_id)
    return {"status": "archived"}


# ═══════════════════════════════════════════════════════════════════
# C. DÉPENSES INTELLIGENTES
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/expenses")
async def list_expenses(
    request: Request,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    await _require_auth(request)
    query = {"deleted_at": {"$exists": False}}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
        ]
    
    total = await _db.expenses.count_documents(query)
    skip = (page - 1) * page_size
    items = await _db.expenses.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": math.ceil(total / page_size)}


@erp_router.post("/erp/expenses")
async def create_expense(inp: ExpenseCreate, request: Request):
    """EVENT 4: Créer dépense → écriture comptable achats auto."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    # Auto TVA rate
    tva_rate = inp.tva_rate if inp.tva_rate is not None else CATEGORY_TVA_RATE.get(inp.category, 20.0)
    amount_tva = round(inp.amount_ht * tva_rate / 100, 2)
    amount_ttc = round(inp.amount_ht + amount_tva, 2)
    
    expense = {
        "expense_id": f"exp_{uuid.uuid4().hex[:12]}",
        "date": inp.date or now,
        "category": inp.category,
        "description": inp.description,
        "amount_ht": round(inp.amount_ht, 2),
        "tva_rate": tva_rate,
        "amount_tva": amount_tva,
        "amount_ttc": amount_ttc,
        "supplier_name": inp.supplier_name or "",
        "supplier_id": inp.supplier_id,
        "status": inp.status,
        "payment_date": now if inp.status == "payée" else None,
        "attachment_url": inp.attachment_url,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
    }
    
    await _db.expenses.insert_one(expense)
    
    # TRIGGER: Create journal entry
    journal_id = await create_expense_journal_entry(expense, user.user_id)
    
    await _log_activity(user.user_id, "create_erp_expense", "erp_expense", expense["expense_id"], {"category": inp.category, "amount": amount_ttc})
    
    return {**{k: v for k, v in expense.items() if k != "_id"}, "journal_entry_id": journal_id}


@erp_router.put("/erp/expenses/{expense_id}")
async def update_expense(expense_id: str, inp: ExpenseUpdate, request: Request):
    user = await _require_auth(request)
    exp = await _db.expenses.find_one({"expense_id": expense_id, "deleted_at": {"$exists": False}})
    if not exp:
        raise HTTPException(404, "Dépense introuvable")
    
    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    
    # Recalculate if amount or tva changed
    if "amount_ht" in update or "tva_rate" in update:
        ht = update.get("amount_ht", exp["amount_ht"])
        rate = update.get("tva_rate", exp["tva_rate"])
        update["amount_tva"] = round(ht * rate / 100, 2)
        update["amount_ttc"] = round(ht + update["amount_tva"], 2)
    
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.expenses.update_one({"expense_id": expense_id}, {"$set": update})
    
    return await _db.expenses.find_one({"expense_id": expense_id}, {"_id": 0})


@erp_router.post("/erp/expenses/{expense_id}/pay")
async def pay_expense(expense_id: str, request: Request):
    """EVENT 5: Payer dépense → Journal Banque (401 D / 512 C)."""
    user = await _require_auth(request)
    exp = await _db.expenses.find_one({"expense_id": expense_id, "deleted_at": {"$exists": False}})
    if not exp:
        raise HTTPException(404, "Dépense introuvable")
    if exp.get("status") == "payée":
        raise HTTPException(400, "Dépense déjà payée")
    
    now = datetime.now(timezone.utc).isoformat()
    await _db.expenses.update_one(
        {"expense_id": expense_id},
        {"$set": {"status": "payée", "payment_date": now, "updated_at": now}}
    )
    
    journal_id = await create_expense_payment_journal_entry(exp, now, user.user_id)
    await _log_activity(user.user_id, "pay_erp_expense", "erp_expense", expense_id, {"journal_id": journal_id})
    
    return {"status": "payée", "journal_entry_id": journal_id}


@erp_router.delete("/erp/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request):
    user = await _require_auth(request)
    exp = await _db.expenses.find_one({"expense_id": expense_id})
    if not exp:
        raise HTTPException(404, "Dépense introuvable")
    
    await _db.expenses.update_one({"expense_id": expense_id}, {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════
# D. TRÉSORERIE
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/treasury")
async def get_treasury(request: Request, month: Optional[str] = None):
    """Trésorerie: entrées, sorties, solde, prévision."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    if month:
        parts = month.split("-")
        y, m = int(parts[0]), int(parts[1])
    else:
        y, m = now.year, now.month
    
    m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
    if m == 12:
        m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        m_end = datetime(y, m + 1, 1, tzinfo=timezone.utc).isoformat()
    
    config = await _db.treasury_config.find_one({"_id": "config"})
    initial_balance = config["initial_balance"] if config else 0
    
    # Calculate running balance up to month start
    in_before = await _db.invoices.aggregate([
        {"$match": {"status": "payée", "payment_date": {"$lt": m_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    out_before = await _db.expenses.aggregate([
        {"$match": {"status": "payée", "date": {"$lt": m_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    
    balance_before = initial_balance + (in_before[0]["total"] if in_before else 0) - (out_before[0]["total"] if out_before else 0)
    
    # Entries for this month
    entries_in = await _db.invoices.find(
        {"status": "payée", "payment_date": {"$gte": m_start, "$lt": m_end}},
        {"_id": 0, "invoice_id": 1, "invoice_number": 1, "lead_name": 1, "amount_ttc": 1, "payment_date": 1}
    ).sort("payment_date", 1).to_list(500)
    
    entries_out = await _db.expenses.find(
        {"status": "payée", "date": {"$gte": m_start, "$lt": m_end}, "deleted_at": {"$exists": False}},
        {"_id": 0, "expense_id": 1, "description": 1, "category": 1, "amount_ttc": 1, "date": 1}
    ).sort("date", 1).to_list(500)
    
    total_in = sum(e["amount_ttc"] for e in entries_in)
    total_out = sum(e["amount_ttc"] for e in entries_out)
    solde_courant = round(balance_before + total_in - total_out, 2)
    
    # Prévision 30j
    pending_in_agg = await _db.invoices.aggregate([
        {"$match": {"status": "en_attente"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    pending_out_agg = await _db.expenses.aggregate([
        {"$match": {"status": "en_attente"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    
    prevision = round(solde_courant + (pending_in_agg[0]["total"] if pending_in_agg else 0) - (pending_out_agg[0]["total"] if pending_out_agg else 0), 2)
    
    return {
        "month": f"{y}-{str(m).zfill(2)}",
        "solde_initial": round(balance_before, 2),
        "entries_in": entries_in,
        "entries_out": entries_out,
        "total_in": round(total_in, 2),
        "total_out": round(total_out, 2),
        "solde_courant": solde_courant,
        "prevision_30j": prevision,
    }


@erp_router.post("/erp/treasury/config")
async def update_treasury_config(inp: TreasuryConfig, request: Request):
    await _require_auth(request)
    await _db.treasury_config.update_one(
        {"_id": "config"},
        {"$set": {"initial_balance": inp.initial_balance, "alert_threshold": inp.alert_threshold}},
        upsert=True,
    )
    return {"status": "ok", "initial_balance": inp.initial_balance, "alert_threshold": inp.alert_threshold}


# ═══════════════════════════════════════════════════════════════════
# E. JOURNAUX COMPTABLES
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/journals/{journal_type}")
async def get_journal(
    journal_type: str,
    request: Request,
    month: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
):
    """Journaux: ventes, achats, banque, general."""
    await _require_auth(request)
    
    if journal_type not in ("ventes", "achats", "banque", "general"):
        raise HTTPException(400, "Type journal invalide")
    
    query = {}
    if journal_type != "general":
        query["journal_type"] = journal_type
    
    if month:
        parts = month.split("-")
        y, m_num = int(parts[0]), int(parts[1])
        m_start = datetime(y, m_num, 1, tzinfo=timezone.utc).isoformat()
        if m_num == 12:
            m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            m_end = datetime(y, m_num + 1, 1, tzinfo=timezone.utc).isoformat()
        query["entry_date"] = {"$gte": m_start, "$lt": m_end}
    
    total = await _db.accounting_entries.count_documents(query)
    skip = (page - 1) * page_size
    items = await _db.accounting_entries.find(query, {"_id": 0}).sort("entry_date", -1).skip(skip).limit(page_size).to_list(page_size)
    
    # Calculate balance
    total_debit = sum(e.get("total_debit", 0) for e in items)
    total_credit = sum(e.get("total_credit", 0) for e in items)
    
    return {
        "journal_type": journal_type,
        "items": items,
        "total": total,
        "page": page,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": abs(total_debit - total_credit) < 0.01,
    }


@erp_router.get("/erp/journals/entry/{entry_id}")
async def get_journal_entry(entry_id: str, request: Request):
    await _require_auth(request)
    entry = await _db.accounting_entries.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(404, "Écriture introuvable")
    return entry


# ═══════════════════════════════════════════════════════════════════
# F. TVA & FISCALITÉ
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/tva/{month}")
async def get_tva_summary(month: str, request: Request):
    """Résumé TVA mensuel: collectée, déductible, à verser."""
    await _require_auth(request)
    
    parts = month.split("-")
    y, m = int(parts[0]), int(parts[1])
    m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
    if m == 12:
        m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        m_end = datetime(y, m + 1, 1, tzinfo=timezone.utc).isoformat()
    
    # TVA collectée = TVA des factures envoyées/payées ce mois
    tva_collectee_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": m_start, "$lt": m_end}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_tva"}}},
    ]).to_list(1)
    tva_collectee = tva_collectee_agg[0]["total"] if tva_collectee_agg else 0
    
    # TVA déductible = TVA des dépenses ce mois
    tva_deductible_agg = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": m_start, "$lt": m_end}, "deleted_at": {"$exists": False}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_tva"}}},
    ]).to_list(1)
    tva_deductible = tva_deductible_agg[0]["total"] if tva_deductible_agg else 0
    
    tva_a_verser = round(tva_collectee - tva_deductible, 2)
    
    # Detail by rate
    tva_by_rate_sell = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": m_start, "$lt": m_end}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.tva_rate", "base_ht": {"$sum": "$items.amount_ht"}, "tva": {"$sum": "$items.amount_tva"}}},
    ]).to_list(10)
    
    tva_by_rate_buy = await _db.expenses.aggregate([
        {"$match": {"date": {"$gte": m_start, "$lt": m_end}, "deleted_at": {"$exists": False}}},
        {"$group": {"_id": "$tva_rate", "base_ht": {"$sum": "$amount_ht"}, "tva": {"$sum": "$amount_tva"}}},
    ]).to_list(10)
    
    return {
        "month": month,
        "tva_collectee": round(tva_collectee, 2),
        "tva_deductible": round(tva_deductible, 2),
        "tva_a_verser": tva_a_verser,
        "detail_collectee": [{"rate": d["_id"], "base_ht": round(d["base_ht"], 2), "tva": round(d["tva"], 2)} for d in tva_by_rate_sell],
        "detail_deductible": [{"rate": d["_id"], "base_ht": round(d["base_ht"], 2), "tva": round(d["tva"], 2)} for d in tva_by_rate_buy],
    }


@erp_router.get("/erp/tva/{month}/export")
async def export_tva(month: str, request: Request):
    """Export TVA en CSV."""
    await _require_auth(request)
    summary = await get_tva_summary(month, request)
    
    from fastapi.responses import StreamingResponse
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Déclaration TVA", month])
    writer.writerow([])
    writer.writerow(["Type", "Base HT (€)", "TVA (€)"])
    writer.writerow(["TVA Collectée", "", f"{summary['tva_collectee']:.2f}"])
    for d in summary.get("detail_collectee", []):
        writer.writerow([f"  Taux {d['rate']}%", f"{d['base_ht']:.2f}", f"{d['tva']:.2f}"])
    writer.writerow(["TVA Déductible", "", f"{summary['tva_deductible']:.2f}"])
    for d in summary.get("detail_deductible", []):
        writer.writerow([f"  Taux {d['rate']}%", f"{d['base_ht']:.2f}", f"{d['tva']:.2f}"])
    writer.writerow([])
    writer.writerow(["TVA à verser", "", f"{summary['tva_a_verser']:.2f}"])
    
    content = output.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=declaration_tva_{month}.csv"},
    )


# ═══════════════════════════════════════════════════════════════════
# G. REPORTING AVANCÉ
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/reports/income-statement")
async def income_statement(request: Request, month: Optional[str] = None):
    """Compte de résultat (P&L)."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    if month:
        parts = month.split("-")
        y, m = int(parts[0]), int(parts[1])
        m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        if m == 12:
            m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            m_end = datetime(y, m + 1, 1, tzinfo=timezone.utc).isoformat()
        date_filter_inv = {"created_at": {"$gte": m_start, "$lt": m_end}}
        date_filter_exp = {"date": {"$gte": m_start, "$lt": m_end}}
    else:
        date_filter_inv = {}
        date_filter_exp = {}
    
    # CA HT
    ca_agg = await _db.invoices.aggregate([
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, **date_filter_inv}},
        {"$group": {"_id": None, "ht": {"$sum": "$amount_ht"}, "tva": {"$sum": "$total_tva"}, "ttc": {"$sum": "$amount_ttc"}}},
    ]).to_list(1)
    ca_ht = ca_agg[0]["ht"] if ca_agg else 0
    ca_tva = ca_agg[0]["tva"] if ca_agg else 0
    
    # Charges by category
    charges_agg = await _db.expenses.aggregate([
        {"$match": {"deleted_at": {"$exists": False}, **date_filter_exp}},
        {"$group": {"_id": "$category", "ht": {"$sum": "$amount_ht"}, "tva": {"$sum": "$amount_tva"}, "ttc": {"$sum": "$amount_ttc"}}},
    ]).to_list(20)
    charges_amount_ht = sum(c["ht"] for c in charges_agg)
    charges_total_tva = sum(c["tva"] for c in charges_agg)
    
    resultat_brut = round(ca_ht - charges_amount_ht, 2)
    tva_nette = round(ca_tva - charges_total_tva, 2)
    resultat_net = round(resultat_brut - max(tva_nette, 0), 2)
    
    return {
        "period": month or "all",
        "ca_ht": round(ca_ht, 2),
        "ca_tva": round(ca_tva, 2),
        "charges_ht": round(charges_amount_ht, 2),
        "charges_detail": [{"category": c["_id"], "ht": round(c["ht"], 2), "tva": round(c["tva"], 2)} for c in charges_agg],
        "resultat_brut": resultat_brut,
        "tva_a_verser": max(round(tva_nette, 2), 0),
        "resultat_net": resultat_net,
    }


@erp_router.get("/erp/reports/top-clients")
async def top_clients(request: Request, limit: int = Query(default=10, ge=1, le=50)):
    """Top clients par CA."""
    await _require_auth(request)
    
    pipeline = [
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "deleted_at": {"$exists": False}}},
        {"$group": {
            "_id": {"$ifNull": ["$client_name", "Inconnu"]},
            "client_id": {"$first": "$client_id"},
            "ca_ttc": {"$sum": "$amount_ttc"},
            "ca_ht": {"$sum": "$amount_ht"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"ca_ttc": -1}},
        {"$limit": limit},
    ]
    
    clients = await _db.invoices.aggregate(pipeline).to_list(limit)
    
    total_ca = sum(c["ca_ttc"] for c in clients)
    result = []
    for c in clients:
        pct = round((c["ca_ttc"] / total_ca * 100) if total_ca else 0, 1)
        result.append({
            "lead_name": c["_id"],
            "client_id": c.get("client_id"),
            "ca_ttc": round(c["ca_ttc"], 2),
            "ca_ht": round(c["ca_ht"], 2),
            "invoices_count": c["count"],
            "pct_ca": pct,
        })
    
    return {"clients": result, "total_ca": round(total_ca, 2)}


@erp_router.get("/erp/reports/services-analysis")
async def services_analysis(request: Request):
    """Analyse rentabilité par type de prestation."""
    await _require_auth(request)
    
    pipeline = [
        {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "deleted_at": {"$exists": False}}},
        {"$group": {
            "_id": {"$ifNull": ["$prestation_type", "autre"]},
            "ca_ttc": {"$sum": "$amount_ttc"},
            "ca_ht": {"$sum": "$amount_ht"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"ca_ttc": -1}},
    ]
    
    services = await _db.invoices.aggregate(pipeline).to_list(20)
    
    # Estimate margins based on service type
    MARGIN_ESTIMATES = {
        "menage": 60, "ménage": 60, "Ménage domicile": 60,
        "bureau": 50, "Bureau": 50, "Nettoyage bureaux": 50,
        "canape": 40, "canapé": 40, "Nettoyage canapé": 40,
        "tapis": 35, "Nettoyage tapis": 35,
        "matelas": 30, "Nettoyage matelas": 30,
    }
    
    result = []
    for s in services:
        avg = round(s["ca_ttc"] / s["count"], 2) if s["count"] else 0
        margin_pct = MARGIN_ESTIMATES.get(s["_id"], 45)
        result.append({
            "type": s["_id"],
            "ca_ttc": round(s["ca_ttc"], 2),
            "ca_ht": round(s["ca_ht"], 2),
            "count": s["count"],
            "avg_per_intervention": avg,
            "margin_pct": margin_pct,
            "margin_estimated": round(s["ca_ht"] * margin_pct / 100, 2),
        })
    
    return {"services": result}


@erp_router.get("/erp/reports/period-comparison")
async def period_comparison(request: Request, month1: str = None, month2: str = None):
    """Comparaison mois/mois."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    
    if not month1:
        month1 = f"{now.year}-{str(now.month).zfill(2)}"
    if not month2:
        prev = now.replace(day=1) - timedelta(days=1)
        month2 = f"{prev.year}-{str(prev.month).zfill(2)}"
    
    async def get_period_data(month_str):
        parts = month_str.split("-")
        y, m = int(parts[0]), int(parts[1])
        m_start = datetime(y, m, 1, tzinfo=timezone.utc).isoformat()
        if m == 12:
            m_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            m_end = datetime(y, m + 1, 1, tzinfo=timezone.utc).isoformat()
        
        ca = await _db.invoices.aggregate([
            {"$match": {"status": {"$in": ["en_attente", "payée", "envoyee", "payee"]}, "created_at": {"$gte": m_start, "$lt": m_end}}},
            {"$group": {"_id": None, "ht": {"$sum": "$amount_ht"}, "ttc": {"$sum": "$amount_ttc"}}},
        ]).to_list(1)
        dep = await _db.expenses.aggregate([
            {"$match": {"date": {"$gte": m_start, "$lt": m_end}, "deleted_at": {"$exists": False}}},
            {"$group": {"_id": None, "ht": {"$sum": "$amount_ht"}, "ttc": {"$sum": "$amount_ttc"}}},
        ]).to_list(1)
        
        ca_ht = ca[0]["ht"] if ca else 0
        dep_ht = dep[0]["ht"] if dep else 0
        return {
            "month": month_str,
            "ca_ht": round(ca_ht, 2),
            "ca_ttc": round(ca[0]["ttc"], 2) if ca else 0,
            "expenses_ht": round(dep_ht, 2),
            "expenses_ttc": round(dep[0]["ttc"], 2) if dep else 0,
            "benefice": round(ca_ht - dep_ht, 2),
        }
    
    p1 = await get_period_data(month1)
    p2 = await get_period_data(month2)
    
    return {"period1": p1, "period2": p2}


# ═══════════════════════════════════════════════════════════════════
# PLAN COMPTABLE
# ═══════════════════════════════════════════════════════════════════

@erp_router.get("/erp/chart-of-accounts")
async def get_chart_of_accounts(request: Request):
    await _require_auth(request)
    return {"accounts": PLAN_COMPTABLE}


# ═══════════════════════════════════════════════════════════════════
# INIT INDEXES
# ═══════════════════════════════════════════════════════════════════

async def init_erp_indexes():
    """Create MongoDB indexes for ERP collections."""
    await _db.invoices.create_index("invoice_id", unique=True)
    await _db.invoices.create_index("invoice_number", unique=True)
    await _db.invoices.create_index("status")
    await _db.invoices.create_index("created_at")
    await _db.invoices.create_index("client_id")
    await _db.invoices.create_index("lead_name")
    
    await _db.expenses.create_index("expense_id", unique=True)
    await _db.expenses.create_index("category")
    await _db.expenses.create_index("date")
    await _db.expenses.create_index("status")
    
    await _db.accounting_entries.create_index("entry_id", unique=True)
    await _db.accounting_entries.create_index("journal_type")
    await _db.accounting_entries.create_index("entry_date")
    await _db.accounting_entries.create_index("reference_id")
    
    logger.info("✅ ERP Accounting indexes created")
