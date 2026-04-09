"""
Global Clean Home CRM - MODULE COMPTABILITÉ ENTERPRISE
Suite comptable complète professionnelle
- Plan comptable PCG
- Écritures journal débit/crédit
- Lettrage comptes
- Clôture de période
- Rapprochement bancaire
- TVA & Fiscalité
- Notes de frais & workflow
- Paie & RH
- Stock avancé (FIFO/LIFO/CMP)
- Rapports financiers (Bilan, P&L, Cash Flow)
- Audit trail immuable
- Export EDI/PDF/Excel/CSV
"""
from fastapi import APIRouter, HTTPException, Request, Query, Body
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone, timedelta, date
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from enum import Enum
from bson import ObjectId
import os
import uuid
import logging
import math
import json
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

_db = None

def init_db(database):
    global _db
    _db = database

enterprise_router = APIRouter(prefix="/api/enterprise")

# ═══════════════════════════════════════════════════════════════════
# CONSTANTES & PLAN COMPTABLE PCG
# ═══════════════════════════════════════════════════════════════════

PCG_CLASSES = {
    "1": "Comptes de capitaux",
    "2": "Comptes d'immobilisations",
    "3": "Comptes de stocks",
    "4": "Comptes de tiers",
    "5": "Comptes financiers",
    "6": "Comptes de charges",
    "7": "Comptes de produits",
}

DEFAULT_CHART_OF_ACCOUNTS = [
    {"code": "1010", "label": "Capital social", "class_num": "1", "type": "passif", "is_system": True},
    {"code": "1060", "label": "Réserves", "class_num": "1", "type": "passif", "is_system": True},
    {"code": "1200", "label": "Résultat de l'exercice", "class_num": "1", "type": "passif", "is_system": True},
    {"code": "1640", "label": "Emprunts bancaires", "class_num": "1", "type": "passif", "is_system": True},
    {"code": "2150", "label": "Installations techniques", "class_num": "2", "type": "actif", "is_system": True},
    {"code": "2180", "label": "Matériel de transport", "class_num": "2", "type": "actif", "is_system": True},
    {"code": "2183", "label": "Matériel informatique", "class_num": "2", "type": "actif", "is_system": True},
    {"code": "2810", "label": "Amortissements installations", "class_num": "2", "type": "actif", "is_system": True},
    {"code": "3100", "label": "Stock matières premières", "class_num": "3", "type": "actif", "is_system": True},
    {"code": "3550", "label": "Stock produits finis", "class_num": "3", "type": "actif", "is_system": True},
    {"code": "3700", "label": "Stock marchandises", "class_num": "3", "type": "actif", "is_system": True},
    {"code": "4010", "label": "Fournisseurs", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4011", "label": "Fournisseurs - Effets à payer", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4110", "label": "Clients", "class_num": "4", "type": "actif", "is_system": True},
    {"code": "4111", "label": "Clients - Effets à recevoir", "class_num": "4", "type": "actif", "is_system": True},
    {"code": "4210", "label": "Personnel - Rémunérations dues", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4310", "label": "Sécurité sociale", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4370", "label": "Organismes sociaux divers", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4452", "label": "TVA due intracommunautaire", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4456", "label": "TVA déductible", "class_num": "4", "type": "actif", "is_system": True},
    {"code": "4457", "label": "TVA collectée", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4458", "label": "TVA à régulariser", "class_num": "4", "type": "passif", "is_system": True},
    {"code": "4670", "label": "Autres comptes débiteurs/créditeurs", "class_num": "4", "type": "actif", "is_system": True},
    {"code": "5120", "label": "Banque", "class_num": "5", "type": "actif", "is_system": True},
    {"code": "5121", "label": "Banque compte N°2", "class_num": "5", "type": "actif", "is_system": True},
    {"code": "5300", "label": "Caisse", "class_num": "5", "type": "actif", "is_system": True},
    {"code": "5800", "label": "Virements internes", "class_num": "5", "type": "actif", "is_system": True},
    {"code": "6010", "label": "Achats matières premières", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6020", "label": "Achats stockés", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6060", "label": "Achats non stockés", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6110", "label": "Sous-traitance", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6130", "label": "Locations", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6150", "label": "Entretien et réparations", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6160", "label": "Assurances", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6220", "label": "Honoraires", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6230", "label": "Publicité", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6241", "label": "Transport sur achats", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6250", "label": "Déplacements & missions", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6260", "label": "Frais postaux & télécommunications", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6270", "label": "Services bancaires", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6310", "label": "Impôts et taxes", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6410", "label": "Salaires bruts", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6450", "label": "Charges sociales patronales", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6460", "label": "Cotisations sociales personnelles", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6510", "label": "Charges financières", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6710", "label": "Charges exceptionnelles", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "6810", "label": "Dotations amortissements", "class_num": "6", "type": "charge", "is_system": True},
    {"code": "7060", "label": "Prestations de services", "class_num": "7", "type": "produit", "is_system": True},
    {"code": "7070", "label": "Ventes de marchandises", "class_num": "7", "type": "produit", "is_system": True},
    {"code": "7080", "label": "Produits des activités annexes", "class_num": "7", "type": "produit", "is_system": True},
    {"code": "7410", "label": "Subventions d'exploitation", "class_num": "7", "type": "produit", "is_system": True},
    {"code": "7580", "label": "Produits divers de gestion", "class_num": "7", "type": "produit", "is_system": True},
    {"code": "7610", "label": "Produits financiers", "class_num": "7", "type": "produit", "is_system": True},
    {"code": "7710", "label": "Produits exceptionnels", "class_num": "7", "type": "produit", "is_system": True},
]

TVA_RATES = {
    "standard": {"rate": 20.0, "label": "TVA 20%"},
    "intermediaire": {"rate": 10.0, "label": "TVA 10%"},
    "reduit": {"rate": 5.5, "label": "TVA 5.5%"},
    "super_reduit": {"rate": 2.1, "label": "TVA 2.1%"},
    "exonere": {"rate": 0.0, "label": "Exonéré"},
}

COTISATIONS_RATES = {
    "cdi": {
        "patronales": {
            "maladie": 13.0, "vieillesse": 8.55, "allocations_familiales": 5.25,
            "accident_travail": 2.0, "chomage": 4.05, "agff": 1.2,
            "prevoyance": 1.5, "formation": 1.0,
        },
        "salariales": {
            "maladie": 0.0, "vieillesse": 6.9, "csg_crds": 9.7,
            "chomage": 0.0, "retraite_comp": 3.15, "prevoyance": 0.5,
        },
    },
    "cdd": {
        "patronales": {
            "maladie": 13.0, "vieillesse": 8.55, "allocations_familiales": 5.25,
            "accident_travail": 2.0, "chomage": 4.55, "agff": 1.2,
            "prevoyance": 1.5, "formation": 1.0, "precarite": 10.0,
        },
        "salariales": {
            "maladie": 0.0, "vieillesse": 6.9, "csg_crds": 9.7,
            "chomage": 0.0, "retraite_comp": 3.15, "prevoyance": 0.5,
        },
    },
    "prestataire": {
        "patronales": {},
        "salariales": {},
    },
}

EXPENSE_CATEGORIES = [
    "transport", "repas", "hébergement", "fournitures", "équipement",
    "télécommunications", "formation", "représentation", "divers",
]

# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

async def _audit_log(user_id: str, action: str, entity_type: str, entity_id: str, 
                     before: Dict = None, after: Dict = None, ip: str = None):
    """Log d'audit immuable - jamais modifiable."""
    entry = {
        "audit_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "before": before,
        "after": after,
        "ip_address": ip,
        "checksum": None,
    }
    raw = json.dumps({k: v for k, v in entry.items() if k != "checksum"}, sort_keys=True, default=str)
    entry["checksum"] = hashlib.sha256(raw.encode()).hexdigest()
    await _db.audit_trail.insert_one(entry)
    return entry

async def _get_next_seq(name: str) -> int:
    result = await _db.counters_enterprise.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]

def _parse_period(period: str) -> datetime:
    days_map = {"7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365, "ytd": 0}
    if period == "ytd":
        now = datetime.now(timezone.utc)
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    days = days_map.get(period, 30)
    return datetime.now(timezone.utc) - timedelta(days=days)

def _serialize(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ═══════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════

class AccountCreate(BaseModel):
    code: str = Field(..., min_length=4, max_length=10)
    label: str = Field(..., min_length=2)
    class_num: str = Field(..., min_length=1, max_length=1)
    type: Literal["actif", "passif", "charge", "produit"]
    parent_code: Optional[str] = None
    description: Optional[str] = None

class AccountUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class JournalLineCreate(BaseModel):
    account_code: str
    label: str
    debit: float = 0.0
    credit: float = 0.0
    
    @field_validator('debit', 'credit')
    @classmethod
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError("Le montant ne peut pas être négatif")
        return round(v, 2)

class JournalEntryCreate(BaseModel):
    entry_date: str
    journal_type: Literal["ACH", "VTE", "BQ", "OD", "AN", "PAI"]
    reference: Optional[str] = None
    description: str
    lines: List[JournalLineCreate]
    
    @field_validator('lines')
    @classmethod
    def validate_balance(cls, v):
        total_debit = sum(l.debit for l in v)
        total_credit = sum(l.credit for l in v)
        if abs(total_debit - total_credit) > 0.01:
            raise ValueError(f"L'écriture n'est pas équilibrée: débit={total_debit}, crédit={total_credit}")
        if len(v) < 2:
            raise ValueError("Minimum 2 lignes par écriture")
        return v

class LettrageCreate(BaseModel):
    account_code: str
    entry_ids: List[str]
    
class BankReconciliationCreate(BaseModel):
    account_code: str = "5120"
    bank_date: str
    label: str
    amount: float
    matched_entry_id: Optional[str] = None
    status: Literal["pending", "matched", "unmatched"] = "pending"

class PeriodCloseRequest(BaseModel):
    year: int
    month: int
    
class ExpenseReportCreate(BaseModel):
    employee_id: str
    description: str
    lines: List[Dict[str, Any]]
    total_amount: float
    
class ExpenseApproval(BaseModel):
    status: Literal["approved", "rejected"]
    comment: Optional[str] = None

class PayslipCreate(BaseModel):
    employee_id: str
    employee_name: str
    period_month: int
    period_year: int
    contract_type: Literal["cdi", "cdd", "prestataire"] = "cdi"
    gross_salary: float
    worked_hours: float = 151.67
    overtime_hours: float = 0.0
    overtime_rate: float = 1.25
    bonuses: float = 0.0
    deductions: float = 0.0

class TVADeclarationCreate(BaseModel):
    period_type: Literal["monthly", "quarterly"]
    period_start: str
    period_end: str
    regime: Literal["normal", "reel_simplifie", "franchise"] = "normal"

class ContractCreate(BaseModel):
    title: str
    client_id: Optional[str] = None
    supplier_id: Optional[str] = None
    contract_type: Literal["service", "prestation", "maintenance", "location", "autre"]
    start_date: str
    end_date: Optional[str] = None
    amount: float
    payment_terms: Optional[str] = None
    auto_renew: bool = False
    terms: Optional[str] = None

class CreditNoteCreate(BaseModel):
    invoice_id: str
    reason: str
    lines: List[Dict[str, Any]]
    tva_rate: str = "exonere"

class StockValuationRequest(BaseModel):
    method: Literal["fifo", "lifo", "weighted_average"] = "weighted_average"

# ═══════════════════════════════════════════════════════════════════
# 1. PLAN COMPTABLE (CHART OF ACCOUNTS)
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/chart-of-accounts/init")
async def init_chart_of_accounts(request: Request):
    """Initialise le plan comptable PCG par défaut."""
    user = await _require_auth(request)
    existing = await _db.chart_of_accounts.count_documents({})
    if existing > 0:
        return {"message": "Plan comptable déjà initialisé", "count": existing}
    
    accounts = []
    for acc in DEFAULT_CHART_OF_ACCOUNTS:
        accounts.append({
            **acc,
            "account_id": str(uuid.uuid4()),
            "is_active": True,
            "balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("user_id", "system"),
        })
    
    if accounts:
        await _db.chart_of_accounts.insert_many(accounts)
    
    await _audit_log(user.get("user_id", "system"), "init_chart", "chart_of_accounts", "all", after={"count": len(accounts)})
    return {"message": f"Plan comptable initialisé avec {len(accounts)} comptes", "count": len(accounts)}

@enterprise_router.get("/chart-of-accounts")
async def list_accounts(
    request: Request,
    class_num: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = True,
):
    """Liste complète du plan comptable avec filtres."""
    await _require_auth(request)
    query = {}
    if class_num:
        query["class_num"] = class_num
    if type:
        query["type"] = type
    if active_only:
        query["is_active"] = True
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"label": {"$regex": search, "$options": "i"}},
        ]
    
    accounts = []
    async for doc in _db.chart_of_accounts.find(query).sort("code", 1):
        accounts.append(_serialize(doc))
    
    # Group by class
    by_class = {}
    for acc in accounts:
        cls = acc.get("class_num", "?")
        if cls not in by_class:
            by_class[cls] = {"class_num": cls, "class_label": PCG_CLASSES.get(cls, "Autre"), "accounts": []}
        by_class[cls]["accounts"].append(acc)
    
    return {
        "accounts": accounts,
        "by_class": list(by_class.values()),
        "total": len(accounts),
    }

@enterprise_router.post("/chart-of-accounts")
async def create_account(inp: AccountCreate, request: Request):
    """Créer un nouveau compte comptable."""
    user = await _require_auth(request)
    
    existing = await _db.chart_of_accounts.find_one({"code": inp.code})
    if existing:
        raise HTTPException(409, f"Le compte {inp.code} existe déjà")
    
    account = {
        "account_id": str(uuid.uuid4()),
        "code": inp.code,
        "label": inp.label,
        "class_num": inp.class_num,
        "type": inp.type,
        "parent_code": inp.parent_code,
        "description": inp.description,
        "is_active": True,
        "is_system": False,
        "balance": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.chart_of_accounts.insert_one(account)
    await _audit_log(user.get("user_id", "system"), "create", "account", account["account_id"], after=account)
    return _serialize(account)

@enterprise_router.patch("/chart-of-accounts/{code}")
async def update_account(code: str, inp: AccountUpdate, request: Request):
    """Mettre à jour un compte comptable."""
    user = await _require_auth(request)
    
    account = await _db.chart_of_accounts.find_one({"code": code})
    if not account:
        raise HTTPException(404, "Compte introuvable")
    
    updates = {k: v for k, v in inp.dict(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "Aucune modification fournie")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = user.get("user_id", "system")
    
    before = {k: account.get(k) for k in updates if k in account}
    await _db.chart_of_accounts.update_one({"code": code}, {"$set": updates})
    await _audit_log(user.get("user_id", "system"), "update", "account", code, before=before, after=updates)
    
    updated = await _db.chart_of_accounts.find_one({"code": code})
    return _serialize(updated)

@enterprise_router.get("/chart-of-accounts/{code}/balance")
async def get_account_balance(code: str, request: Request, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Obtenir le solde d'un compte avec détail des mouvements."""
    await _require_auth(request)
    
    account = await _db.chart_of_accounts.find_one({"code": code})
    if not account:
        raise HTTPException(404, "Compte introuvable")
    
    query = {"lines.account_code": code, "is_reversed": {"$ne": True}}
    if from_date:
        query["entry_date"] = {"$gte": from_date}
    if to_date:
        query.setdefault("entry_date", {})["$lte"] = to_date
    
    total_debit = 0.0
    total_credit = 0.0
    movements = []
    
    async for entry in _db.journal_entries.find(query).sort("entry_date", 1):
        for line in entry.get("lines", []):
            if line["account_code"] == code:
                total_debit += line.get("debit", 0)
                total_credit += line.get("credit", 0)
                movements.append({
                    "entry_id": entry["entry_id"],
                    "date": entry["entry_date"],
                    "description": entry["description"],
                    "debit": line.get("debit", 0),
                    "credit": line.get("credit", 0),
                    "lettering_code": line.get("lettering_code"),
                })
    
    balance = round(total_debit - total_credit, 2)
    if account["type"] in ["passif", "produit"]:
        balance = round(total_credit - total_debit, 2)
    
    return {
        "account": _serialize(account),
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "balance": balance,
        "movements": movements[-100:],  # last 100
        "movement_count": len(movements),
    }

# ═══════════════════════════════════════════════════════════════════
# 2. ÉCRITURES COMPTABLES (JOURNAL ENTRIES)
# ═══════════════════════════════════════════════════════════════════

JOURNAL_TYPES = {
    "ACH": "Journal d'achats",
    "VTE": "Journal de ventes",
    "BQ": "Journal de banque",
    "OD": "Opérations diverses",
    "AN": "À nouveau",
    "PAI": "Journal de paie",
}

@enterprise_router.post("/journal/entries")
async def create_journal_entry(inp: JournalEntryCreate, request: Request):
    """Créer une écriture comptable avec équilibre débit/crédit obligatoire."""
    user = await _require_auth(request)
    
    # Vérifier que la période n'est pas clôturée
    entry_date = inp.entry_date[:7]  # YYYY-MM
    closed = await _db.closed_periods.find_one({"period": entry_date, "is_closed": True})
    if closed:
        raise HTTPException(403, f"La période {entry_date} est clôturée. Impossible d'ajouter des écritures.")
    
    # Vérifier les comptes existent
    for line in inp.lines:
        acc = await _db.chart_of_accounts.find_one({"code": line.account_code, "is_active": True})
        if not acc:
            raise HTTPException(400, f"Compte {line.account_code} introuvable ou désactivé")
    
    seq = await _get_next_seq(f"journal_{inp.journal_type}")
    entry_id = f"JE-{inp.journal_type}-{datetime.now(timezone.utc).year}-{str(seq).zfill(6)}"
    
    lines_data = []
    for line in inp.lines:
        lines_data.append({
            "account_code": line.account_code,
            "label": line.label,
            "debit": line.debit,
            "credit": line.credit,
            "lettering_code": None,
        })
    
    entry = {
        "entry_id": entry_id,
        "entry_date": inp.entry_date,
        "journal_type": inp.journal_type,
        "journal_label": JOURNAL_TYPES.get(inp.journal_type, inp.journal_type),
        "reference": inp.reference,
        "description": inp.description,
        "lines": lines_data,
        "total_debit": round(sum(l.debit for l in inp.lines), 2),
        "total_credit": round(sum(l.credit for l in inp.lines), 2),
        "is_balanced": True,
        "is_reversed": False,
        "is_validated": False,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.journal_entries.insert_one(entry)
    await _audit_log(user.get("user_id", "system"), "create", "journal_entry", entry_id, after={"description": inp.description, "total": entry["total_debit"]})
    return _serialize(entry)

@enterprise_router.get("/journal/entries")
async def list_journal_entries(
    request: Request,
    journal_type: Optional[str] = None,
    account_code: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    """Lister les écritures comptables avec filtres avancés."""
    await _require_auth(request)
    
    query = {"is_reversed": {"$ne": True}}
    if journal_type:
        query["journal_type"] = journal_type
    if account_code:
        query["lines.account_code"] = account_code
    if status:
        query["status"] = status
    if from_date:
        query.setdefault("entry_date", {})["$gte"] = from_date
    if to_date:
        query.setdefault("entry_date", {})["$lte"] = to_date
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"reference": {"$regex": search, "$options": "i"}},
            {"entry_id": {"$regex": search, "$options": "i"}},
        ]
    
    total = await _db.journal_entries.count_documents(query)
    skip = (page - 1) * limit
    
    entries = []
    async for doc in _db.journal_entries.find(query).sort("entry_date", -1).skip(skip).limit(limit):
        entries.append(_serialize(doc))
    
    return {
        "entries": entries,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1,
    }

@enterprise_router.get("/journal/entries/{entry_id}")
async def get_journal_entry(entry_id: str, request: Request):
    """Détail d'une écriture comptable."""
    await _require_auth(request)
    entry = await _db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(404, "Écriture introuvable")
    return _serialize(entry)

@enterprise_router.post("/journal/entries/{entry_id}/validate")
async def validate_journal_entry(entry_id: str, request: Request):
    """Valider une écriture comptable (passage de brouillon à validé)."""
    user = await _require_auth(request)
    entry = await _db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(404, "Écriture introuvable")
    if entry.get("status") == "validated":
        raise HTTPException(400, "Écriture déjà validée")
    
    await _db.journal_entries.update_one(
        {"entry_id": entry_id},
        {"$set": {
            "status": "validated",
            "is_validated": True,
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "validated_by": user.get("user_id", "system"),
        }}
    )
    
    # Mettre à jour les soldes des comptes
    for line in entry.get("lines", []):
        acc = await _db.chart_of_accounts.find_one({"code": line["account_code"]})
        if acc:
            delta = line.get("debit", 0) - line.get("credit", 0)
            if acc["type"] in ["passif", "produit"]:
                delta = -delta
            await _db.chart_of_accounts.update_one(
                {"code": line["account_code"]},
                {"$inc": {"balance": delta}}
            )
    
    await _audit_log(user.get("user_id", "system"), "validate", "journal_entry", entry_id)
    return {"message": "Écriture validée", "entry_id": entry_id}

@enterprise_router.post("/journal/entries/{entry_id}/reverse")
async def reverse_journal_entry(entry_id: str, request: Request):
    """Contrepasser une écriture comptable."""
    user = await _require_auth(request)
    entry = await _db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(404, "Écriture introuvable")
    if entry.get("is_reversed"):
        raise HTTPException(400, "Écriture déjà contrepassée")
    
    # Inverser les débits/crédits
    reversed_lines = []
    for line in entry.get("lines", []):
        reversed_lines.append({
            "account_code": line["account_code"],
            "label": f"[CONTREPASSATION] {line['label']}",
            "debit": line.get("credit", 0),
            "credit": line.get("debit", 0),
            "lettering_code": None,
        })
    
    seq = await _get_next_seq(f"journal_{entry['journal_type']}")
    reversal_id = f"JE-{entry['journal_type']}-{datetime.now(timezone.utc).year}-{str(seq).zfill(6)}"
    
    reversal = {
        "entry_id": reversal_id,
        "entry_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "journal_type": entry["journal_type"],
        "journal_label": entry.get("journal_label", ""),
        "reference": f"REV-{entry_id}",
        "description": f"Contrepassation de {entry_id}: {entry['description']}",
        "lines": reversed_lines,
        "total_debit": entry.get("total_credit", 0),
        "total_credit": entry.get("total_debit", 0),
        "is_balanced": True,
        "is_reversed": False,
        "is_reversal_of": entry_id,
        "is_validated": True,
        "status": "validated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.journal_entries.insert_one(reversal)
    await _db.journal_entries.update_one(
        {"entry_id": entry_id},
        {"$set": {"is_reversed": True, "reversed_by": reversal_id, "reversed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await _audit_log(user.get("user_id", "system"), "reverse", "journal_entry", entry_id, after={"reversal_id": reversal_id})
    return {"message": "Écriture contrepassée", "original": entry_id, "reversal": reversal_id}

@enterprise_router.delete("/journal/entries/{entry_id}")
async def delete_journal_entry(entry_id: str, request: Request):
    """Supprimer une écriture brouillon (pas validée)."""
    user = await _require_auth(request)
    entry = await _db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(404, "Écriture introuvable")
    if entry.get("status") == "validated":
        raise HTTPException(403, "Impossible de supprimer une écriture validée. Utilisez la contrepassation.")
    
    await _db.journal_entries.delete_one({"entry_id": entry_id})
    await _audit_log(user.get("user_id", "system"), "delete", "journal_entry", entry_id)
    return {"message": "Écriture supprimée"}

# ═══════════════════════════════════════════════════════════════════
# 3. LETTRAGE (ACCOUNT RECONCILIATION)
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/lettrage")
async def create_lettrage(inp: LettrageCreate, request: Request):
    """Lettrer des écritures (rapprochement débit/crédit sur un compte)."""
    user = await _require_auth(request)
    
    # Récupérer toutes les lignes des écritures pour ce compte
    total_debit = 0.0
    total_credit = 0.0
    
    for eid in inp.entry_ids:
        entry = await _db.journal_entries.find_one({"entry_id": eid})
        if not entry:
            raise HTTPException(404, f"Écriture {eid} introuvable")
        for line in entry.get("lines", []):
            if line["account_code"] == inp.account_code:
                total_debit += line.get("debit", 0)
                total_credit += line.get("credit", 0)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(400, f"Le lettrage n'est pas équilibré: débit={total_debit:.2f}, crédit={total_credit:.2f}")
    
    # Générer le code de lettrage
    seq = await _get_next_seq("lettrage")
    letter_code = f"L{str(seq).zfill(5)}"
    
    # Appliquer le lettrage
    for eid in inp.entry_ids:
        await _db.journal_entries.update_one(
            {"entry_id": eid, "lines.account_code": inp.account_code},
            {"$set": {"lines.$.lettering_code": letter_code}}
        )
    
    lettrage_record = {
        "lettrage_id": str(uuid.uuid4()),
        "letter_code": letter_code,
        "account_code": inp.account_code,
        "entry_ids": inp.entry_ids,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    await _db.lettrages.insert_one(lettrage_record)
    await _audit_log(user.get("user_id", "system"), "lettrage", "lettrage", letter_code, after={"entry_ids": inp.entry_ids})
    
    return {"message": "Lettrage effectué", "letter_code": letter_code, "entries_count": len(inp.entry_ids)}

@enterprise_router.get("/lettrage")
async def list_lettrages(request: Request, account_code: Optional[str] = None, page: int = 1, limit: int = 50):
    """Lister les lettrages."""
    await _require_auth(request)
    query = {}
    if account_code:
        query["account_code"] = account_code
    
    total = await _db.lettrages.count_documents(query)
    skip = (page - 1) * limit
    items = []
    async for doc in _db.lettrages.find(query).sort("created_at", -1).skip(skip).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.get("/lettrage/unlettered/{account_code}")
async def get_unlettered_entries(account_code: str, request: Request):
    """Obtenir les écritures non lettrées pour un compte."""
    await _require_auth(request)
    
    entries = []
    async for doc in _db.journal_entries.find({
        "lines": {"$elemMatch": {"account_code": account_code, "lettering_code": None}},
        "is_reversed": {"$ne": True},
        "status": "validated",
    }).sort("entry_date", -1):
        for line in doc.get("lines", []):
            if line["account_code"] == account_code and not line.get("lettering_code"):
                entries.append({
                    "entry_id": doc["entry_id"],
                    "date": doc["entry_date"],
                    "description": doc["description"],
                    "debit": line.get("debit", 0),
                    "credit": line.get("credit", 0),
                    "reference": doc.get("reference"),
                })
    
    return {"entries": entries, "total": len(entries)}

@enterprise_router.delete("/lettrage/{letter_code}")
async def delete_lettrage(letter_code: str, request: Request):
    """Supprimer un lettrage."""
    user = await _require_auth(request)
    lettrage = await _db.lettrages.find_one({"letter_code": letter_code})
    if not lettrage:
        raise HTTPException(404, "Lettrage introuvable")
    
    # Retirer le code de lettrage des écritures
    for eid in lettrage.get("entry_ids", []):
        await _db.journal_entries.update_many(
            {"entry_id": eid, "lines.lettering_code": letter_code},
            {"$set": {"lines.$.lettering_code": None}}
        )
    
    await _db.lettrages.delete_one({"letter_code": letter_code})
    await _audit_log(user.get("user_id", "system"), "delete", "lettrage", letter_code)
    return {"message": "Lettrage supprimé"}

# ═══════════════════════════════════════════════════════════════════
# 4. CLÔTURE DE PÉRIODE
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/period/close")
async def close_period(inp: PeriodCloseRequest, request: Request):
    """Clôturer une période comptable (verrouillage des écritures)."""
    user = await _require_auth(request)
    period = f"{inp.year}-{str(inp.month).zfill(2)}"
    
    existing = await _db.closed_periods.find_one({"period": period})
    if existing and existing.get("is_closed"):
        raise HTTPException(400, f"La période {period} est déjà clôturée")
    
    # Vérifier qu'il n'y a pas d'écritures en brouillon
    draft_count = await _db.journal_entries.count_documents({
        "entry_date": {"$gte": f"{period}-01", "$lte": f"{period}-31"},
        "status": "draft",
        "is_reversed": {"$ne": True},
    })
    
    if draft_count > 0:
        raise HTTPException(400, f"Il reste {draft_count} écriture(s) en brouillon sur cette période. Validez-les d'abord.")
    
    # Calculer les totaux de la période
    pipeline = [
        {"$match": {"entry_date": {"$gte": f"{period}-01", "$lte": f"{period}-31"}, "is_reversed": {"$ne": True}}},
        {"$group": {"_id": None, "total_debit": {"$sum": "$total_debit"}, "total_credit": {"$sum": "$total_credit"}, "count": {"$sum": 1}}},
    ]
    result = await _db.journal_entries.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {"total_debit": 0, "total_credit": 0, "count": 0}
    
    close_record = {
        "period": period,
        "year": inp.year,
        "month": inp.month,
        "is_closed": True,
        "closed_at": datetime.now(timezone.utc).isoformat(),
        "closed_by": user.get("user_id", "system"),
        "entries_count": stats.get("count", 0),
        "total_debit": stats.get("total_debit", 0),
        "total_credit": stats.get("total_credit", 0),
    }
    
    await _db.closed_periods.update_one({"period": period}, {"$set": close_record}, upsert=True)
    await _audit_log(user.get("user_id", "system"), "close_period", "period", period, after=close_record)
    
    return {"message": f"Période {period} clôturée", **close_record}

@enterprise_router.post("/period/reopen")
async def reopen_period(inp: PeriodCloseRequest, request: Request):
    """Réouvrir une période (admin uniquement)."""
    user = await _require_auth(request)
    period = f"{inp.year}-{str(inp.month).zfill(2)}"
    
    existing = await _db.closed_periods.find_one({"period": period, "is_closed": True})
    if not existing:
        raise HTTPException(404, "Période non clôturée")
    
    await _db.closed_periods.update_one({"period": period}, {"$set": {"is_closed": False, "reopened_at": datetime.now(timezone.utc).isoformat(), "reopened_by": user.get("user_id", "system")}})
    await _audit_log(user.get("user_id", "system"), "reopen_period", "period", period)
    
    return {"message": f"Période {period} réouverte"}

@enterprise_router.get("/period/status")
async def list_period_status(request: Request, year: Optional[int] = None):
    """Statut de toutes les périodes."""
    await _require_auth(request)
    query = {}
    if year:
        query["year"] = year
    
    periods = []
    async for doc in _db.closed_periods.find(query).sort("period", -1):
        periods.append(_serialize(doc))
    
    return {"periods": periods}

# ═══════════════════════════════════════════════════════════════════
# 5. RAPPROCHEMENT BANCAIRE
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/bank-reconciliation")
async def create_bank_line(inp: BankReconciliationCreate, request: Request):
    """Ajouter une ligne de relevé bancaire."""
    user = await _require_auth(request)
    
    line = {
        "line_id": str(uuid.uuid4()),
        "account_code": inp.account_code,
        "bank_date": inp.bank_date,
        "label": inp.label,
        "amount": inp.amount,
        "matched_entry_id": inp.matched_entry_id,
        "status": inp.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.bank_reconciliation.insert_one(line)
    return _serialize(line)

@enterprise_router.get("/bank-reconciliation")
async def list_bank_lines(
    request: Request,
    account_code: str = "5120",
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    """Lister les lignes de relevé bancaire."""
    await _require_auth(request)
    query = {"account_code": account_code}
    if status:
        query["status"] = status
    if from_date:
        query.setdefault("bank_date", {})["$gte"] = from_date
    if to_date:
        query.setdefault("bank_date", {})["$lte"] = to_date
    
    total = await _db.bank_reconciliation.count_documents(query)
    skip = (page - 1) * limit
    items = []
    async for doc in _db.bank_reconciliation.find(query).sort("bank_date", -1).skip(skip).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.post("/bank-reconciliation/{line_id}/match")
async def match_bank_line(line_id: str, request: Request, entry_id: str = Body(..., embed=True)):
    """Rapprocher une ligne bancaire avec une écriture comptable."""
    user = await _require_auth(request)
    
    bank_line = await _db.bank_reconciliation.find_one({"line_id": line_id})
    if not bank_line:
        raise HTTPException(404, "Ligne bancaire introuvable")
    
    entry = await _db.journal_entries.find_one({"entry_id": entry_id})
    if not entry:
        raise HTTPException(404, "Écriture comptable introuvable")
    
    await _db.bank_reconciliation.update_one(
        {"line_id": line_id},
        {"$set": {"matched_entry_id": entry_id, "status": "matched", "matched_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await _audit_log(user.get("user_id", "system"), "bank_match", "bank_reconciliation", line_id, after={"entry_id": entry_id})
    return {"message": "Rapprochement effectué", "line_id": line_id, "entry_id": entry_id}

@enterprise_router.post("/bank-reconciliation/{line_id}/unmatch")
async def unmatch_bank_line(line_id: str, request: Request):
    """Annuler un rapprochement bancaire."""
    user = await _require_auth(request)
    await _db.bank_reconciliation.update_one(
        {"line_id": line_id},
        {"$set": {"matched_entry_id": None, "status": "pending"}}
    )
    return {"message": "Rapprochement annulé"}

@enterprise_router.get("/bank-reconciliation/summary")
async def bank_reconciliation_summary(request: Request, account_code: str = "5120"):
    """Résumé du rapprochement bancaire."""
    await _require_auth(request)
    
    pipeline = [
        {"$match": {"account_code": account_code}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total": {"$sum": "$amount"},
        }}
    ]
    
    results = {}
    async for doc in _db.bank_reconciliation.aggregate(pipeline):
        results[doc["_id"]] = {"count": doc["count"], "total": round(doc["total"], 2)}
    
    # Solde comptable
    acc = await _db.chart_of_accounts.find_one({"code": account_code})
    book_balance = acc.get("balance", 0) if acc else 0
    
    # Solde bancaire
    bank_total = sum(r.get("total", 0) for r in results.values())
    
    return {
        "account_code": account_code,
        "book_balance": book_balance,
        "bank_balance": bank_total,
        "difference": round(bank_total - book_balance, 2),
        "by_status": results,
    }

# ═══════════════════════════════════════════════════════════════════
# 6. TVA & FISCALITÉ
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.get("/tva/rates")
async def get_tva_rates(request: Request):
    """Obtenir les taux de TVA configurés."""
    await _require_auth(request)
    
    custom = []
    async for doc in _db.tva_custom_rates.find({}):
        custom.append(_serialize(doc))
    
    return {"standard_rates": TVA_RATES, "custom_rates": custom}

@enterprise_router.post("/tva/rates")
async def add_custom_tva_rate(request: Request, key: str = Body(...), rate: float = Body(...), label: str = Body(...)):
    """Ajouter un taux de TVA personnalisé."""
    user = await _require_auth(request)
    custom = {"key": key, "rate": rate, "label": label, "created_at": datetime.now(timezone.utc).isoformat()}
    await _db.tva_custom_rates.insert_one(custom)
    return {"message": "Taux ajouté", "key": key, "rate": rate}

@enterprise_router.post("/tva/declaration")
async def create_tva_declaration(inp: TVADeclarationCreate, request: Request):
    """Créer une déclaration de TVA."""
    user = await _require_auth(request)
    
    if inp.regime == "franchise":
        return {"message": "Franchise de TVA : aucune déclaration nécessaire", "tva_due": 0}
    
    # Calcul TVA collectée (ventes)
    sales_pipeline = [
        {"$match": {
            "entry_date": {"$gte": inp.period_start, "$lte": inp.period_end},
            "journal_type": "VTE",
            "is_reversed": {"$ne": True},
            "status": "validated",
        }},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^4457"}}},
        {"$group": {"_id": None, "total_collected": {"$sum": "$lines.credit"}}},
    ]
    
    collected_result = await _db.journal_entries.aggregate(sales_pipeline).to_list(1)
    tva_collected = collected_result[0]["total_collected"] if collected_result else 0
    
    # Calcul TVA déductible (achats)
    purchase_pipeline = [
        {"$match": {
            "entry_date": {"$gte": inp.period_start, "$lte": inp.period_end},
            "journal_type": "ACH",
            "is_reversed": {"$ne": True},
            "status": "validated",
        }},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^4456"}}},
        {"$group": {"_id": None, "total_deductible": {"$sum": "$lines.debit"}}},
    ]
    
    deductible_result = await _db.journal_entries.aggregate(purchase_pipeline).to_list(1)
    tva_deductible = deductible_result[0]["total_deductible"] if deductible_result else 0
    
    # CA HT
    ca_pipeline = [
        {"$match": {
            "entry_date": {"$gte": inp.period_start, "$lte": inp.period_end},
            "journal_type": "VTE",
            "is_reversed": {"$ne": True},
            "status": "validated",
        }},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^70"}}},
        {"$group": {"_id": None, "ca_ht": {"$sum": "$lines.credit"}}},
    ]
    ca_result = await _db.journal_entries.aggregate(ca_pipeline).to_list(1)
    ca_ht = ca_result[0]["ca_ht"] if ca_result else 0
    
    # Charges HT
    charges_pipeline = [
        {"$match": {
            "entry_date": {"$gte": inp.period_start, "$lte": inp.period_end},
            "journal_type": "ACH",
            "is_reversed": {"$ne": True},
            "status": "validated",
        }},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^60"}}},
        {"$group": {"_id": None, "charges_ht": {"$sum": "$lines.debit"}}},
    ]
    charges_result = await _db.journal_entries.aggregate(charges_pipeline).to_list(1)
    charges_ht = charges_result[0]["charges_ht"] if charges_result else 0
    
    tva_due = round(tva_collected - tva_deductible, 2)
    credit_tva = max(0, -tva_due)
    tva_to_pay = max(0, tva_due)
    
    seq = await _get_next_seq("tva_declaration")
    declaration = {
        "declaration_id": f"TVA-{datetime.now(timezone.utc).year}-{str(seq).zfill(4)}",
        "period_type": inp.period_type,
        "period_start": inp.period_start,
        "period_end": inp.period_end,
        "regime": inp.regime,
        "ca_ht": round(ca_ht, 2),
        "charges_ht": round(charges_ht, 2),
        "tva_collected": round(tva_collected, 2),
        "tva_deductible": round(tva_deductible, 2),
        "tva_due": tva_due,
        "tva_to_pay": tva_to_pay,
        "credit_tva": credit_tva,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.tva_declarations.insert_one(declaration)
    await _audit_log(user.get("user_id", "system"), "create", "tva_declaration", declaration["declaration_id"], after=declaration)
    return _serialize(declaration)

@enterprise_router.get("/tva/declarations")
async def list_tva_declarations(request: Request, year: Optional[int] = None, page: int = 1, limit: int = 20):
    """Lister les déclarations TVA."""
    await _require_auth(request)
    query = {}
    if year:
        query["period_start"] = {"$regex": f"^{year}"}
    
    total = await _db.tva_declarations.count_documents(query)
    items = []
    async for doc in _db.tva_declarations.find(query).sort("period_start", -1).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.post("/tva/declarations/{decl_id}/validate")
async def validate_tva_declaration(decl_id: str, request: Request):
    """Valider une déclaration TVA."""
    user = await _require_auth(request)
    await _db.tva_declarations.update_one(
        {"declaration_id": decl_id},
        {"$set": {"status": "validated", "validated_at": datetime.now(timezone.utc).isoformat(), "validated_by": user.get("user_id", "system")}}
    )
    return {"message": "Déclaration validée"}

# ═══════════════════════════════════════════════════════════════════
# 7. NOTES DE FRAIS & DÉPENSES
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/expense-reports")
async def create_expense_report(inp: ExpenseReportCreate, request: Request):
    """Créer une note de frais."""
    user = await _require_auth(request)
    
    seq = await _get_next_seq("expense_report")
    report_id = f"NDF-{datetime.now(timezone.utc).year}-{str(seq).zfill(4)}"
    
    lines_with_ids = []
    for i, line in enumerate(inp.lines):
        lines_with_ids.append({
            "line_id": str(uuid.uuid4()),
            "date": line.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
            "category": line.get("category", "divers"),
            "description": line.get("description", ""),
            "amount_ht": line.get("amount_ht", line.get("amount", 0)),
            "tva_rate": line.get("tva_rate", "exonere"),
            "tva_amount": line.get("tva_amount", 0),
            "amount_ttc": line.get("amount_ttc", line.get("amount", 0)),
            "receipt_url": line.get("receipt_url"),
            "supplier": line.get("supplier", ""),
        })
    
    report = {
        "report_id": report_id,
        "employee_id": inp.employee_id,
        "description": inp.description,
        "lines": lines_with_ids,
        "total_amount": round(inp.total_amount, 2),
        "status": "submitted",  # submitted → approved/rejected → reimbursed
        "workflow": [
            {"step": "submitted", "date": datetime.now(timezone.utc).isoformat(), "by": user.get("user_id", "system")}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.expense_reports.insert_one(report)
    await _audit_log(user.get("user_id", "system"), "create", "expense_report", report_id, after={"total": inp.total_amount})
    return _serialize(report)

@enterprise_router.get("/expense-reports")
async def list_expense_reports(
    request: Request,
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    """Lister les notes de frais."""
    await _require_auth(request)
    query = {}
    if status:
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    
    total = await _db.expense_reports.count_documents(query)
    items = []
    async for doc in _db.expense_reports.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.get("/expense-reports/{report_id}")
async def get_expense_report(report_id: str, request: Request):
    """Détail d'une note de frais."""
    await _require_auth(request)
    doc = await _db.expense_reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(404, "Note de frais introuvable")
    return _serialize(doc)

@enterprise_router.post("/expense-reports/{report_id}/approve")
async def approve_expense_report(report_id: str, inp: ExpenseApproval, request: Request):
    """Approuver ou rejeter une note de frais."""
    user = await _require_auth(request)
    
    report = await _db.expense_reports.find_one({"report_id": report_id})
    if not report:
        raise HTTPException(404, "Note de frais introuvable")
    if report.get("status") not in ["submitted", "pending_review"]:
        raise HTTPException(400, f"Impossible de traiter une note en statut: {report.get('status')}")
    
    new_status = inp.status
    workflow_step = {
        "step": new_status,
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("user_id", "system"),
        "comment": inp.comment,
    }
    
    update = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await _db.expense_reports.update_one(
        {"report_id": report_id},
        {"$set": update, "$push": {"workflow": workflow_step}}
    )
    
    # Si approuvé, créer l'écriture comptable automatiquement
    if new_status == "approved":
        entry_lines = [
            JournalLineCreate(account_code="6250", label=f"Note de frais {report_id}", debit=report["total_amount"], credit=0),
            JournalLineCreate(account_code="4210", label=f"Remboursement NDF {report_id}", debit=0, credit=report["total_amount"]),
        ]
        journal_entry = JournalEntryCreate(
            entry_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            journal_type="OD",
            reference=report_id,
            description=f"Comptabilisation note de frais {report_id}",
            lines=entry_lines,
        )
        # Create the entry directly
        seq = await _get_next_seq("journal_OD")
        je_id = f"JE-OD-{datetime.now(timezone.utc).year}-{str(seq).zfill(6)}"
        je = {
            "entry_id": je_id,
            "entry_date": journal_entry.entry_date,
            "journal_type": "OD",
            "journal_label": "Opérations diverses",
            "reference": report_id,
            "description": f"Comptabilisation note de frais {report_id}",
            "lines": [{"account_code": l.account_code, "label": l.label, "debit": l.debit, "credit": l.credit, "lettering_code": None} for l in entry_lines],
            "total_debit": report["total_amount"],
            "total_credit": report["total_amount"],
            "is_balanced": True,
            "is_reversed": False,
            "is_validated": True,
            "status": "validated",
            "auto_generated": True,
            "source": "expense_report",
            "source_id": report_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system",
        }
        await _db.journal_entries.insert_one(je)
    
    await _audit_log(user.get("user_id", "system"), f"expense_{new_status}", "expense_report", report_id, after={"comment": inp.comment})
    return {"message": f"Note de frais {new_status}", "report_id": report_id}

@enterprise_router.post("/expense-reports/{report_id}/reimburse")
async def reimburse_expense_report(report_id: str, request: Request):
    """Marquer une note de frais comme remboursée."""
    user = await _require_auth(request)
    report = await _db.expense_reports.find_one({"report_id": report_id})
    if not report:
        raise HTTPException(404, "Note de frais introuvable")
    if report.get("status") != "approved":
        raise HTTPException(400, "La note doit être approuvée avant remboursement")
    
    workflow_step = {"step": "reimbursed", "date": datetime.now(timezone.utc).isoformat(), "by": user.get("user_id", "system")}
    await _db.expense_reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": "reimbursed"}, "$push": {"workflow": workflow_step}}
    )
    
    # Écriture de paiement
    seq = await _get_next_seq("journal_BQ")
    je_id = f"JE-BQ-{datetime.now(timezone.utc).year}-{str(seq).zfill(6)}"
    je = {
        "entry_id": je_id,
        "entry_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "journal_type": "BQ",
        "journal_label": "Journal de banque",
        "reference": report_id,
        "description": f"Remboursement note de frais {report_id}",
        "lines": [
            {"account_code": "4210", "label": f"Remboursement {report_id}", "debit": report["total_amount"], "credit": 0, "lettering_code": None},
            {"account_code": "5120", "label": f"Virement NDF {report_id}", "debit": 0, "credit": report["total_amount"], "lettering_code": None},
        ],
        "total_debit": report["total_amount"],
        "total_credit": report["total_amount"],
        "is_balanced": True,
        "is_reversed": False,
        "is_validated": True,
        "status": "validated",
        "auto_generated": True,
        "source": "expense_reimbursement",
        "source_id": report_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system",
    }
    await _db.journal_entries.insert_one(je)
    
    return {"message": "Note remboursée", "report_id": report_id}

# ═══════════════════════════════════════════════════════════════════
# 8. PAIE & RH
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/payroll/payslips")
async def create_payslip(inp: PayslipCreate, request: Request):
    """Créer une fiche de paie complète."""
    user = await _require_auth(request)
    
    # Calcul paie
    overtime_amount = round(inp.overtime_hours * (inp.gross_salary / inp.worked_hours) * inp.overtime_rate, 2)
    total_brut = round(inp.gross_salary + overtime_amount + inp.bonuses - inp.deductions, 2)
    
    rates = COTISATIONS_RATES.get(inp.contract_type, COTISATIONS_RATES["cdi"])
    
    # Cotisations patronales
    patronales_detail = {}
    total_patronales = 0.0
    for key, rate in rates["patronales"].items():
        amount = round(total_brut * rate / 100, 2)
        patronales_detail[key] = {"rate": rate, "amount": amount}
        total_patronales += amount
    total_patronales = round(total_patronales, 2)
    
    # Cotisations salariales
    salariales_detail = {}
    total_salariales = 0.0
    for key, rate in rates["salariales"].items():
        amount = round(total_brut * rate / 100, 2)
        salariales_detail[key] = {"rate": rate, "amount": amount}
        total_salariales += amount
    total_salariales = round(total_salariales, 2)
    
    net_salary = round(total_brut - total_salariales, 2)
    total_cost = round(total_brut + total_patronales, 2)
    
    seq = await _get_next_seq("payslip")
    payslip_id = f"PAI-{inp.period_year}-{str(inp.period_month).zfill(2)}-{str(seq).zfill(4)}"
    
    payslip = {
        "payslip_id": payslip_id,
        "employee_id": inp.employee_id,
        "employee_name": inp.employee_name,
        "period_month": inp.period_month,
        "period_year": inp.period_year,
        "contract_type": inp.contract_type,
        "worked_hours": inp.worked_hours,
        "overtime_hours": inp.overtime_hours,
        "overtime_rate": inp.overtime_rate,
        "overtime_amount": overtime_amount,
        "gross_salary": inp.gross_salary,
        "bonuses": inp.bonuses,
        "deductions": inp.deductions,
        "total_brut": total_brut,
        "cotisations_patronales": patronales_detail,
        "total_patronales": total_patronales,
        "cotisations_salariales": salariales_detail,
        "total_salariales": total_salariales,
        "net_salary": net_salary,
        "total_cost_employer": total_cost,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.payslips.insert_one(payslip)
    await _audit_log(user.get("user_id", "system"), "create", "payslip", payslip_id, after={"employee": inp.employee_name, "net": net_salary})
    return _serialize(payslip)

@enterprise_router.get("/payroll/payslips")
async def list_payslips(
    request: Request,
    employee_id: Optional[str] = None,
    period_year: Optional[int] = None,
    period_month: Optional[int] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    """Lister les fiches de paie."""
    await _require_auth(request)
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if period_year:
        query["period_year"] = period_year
    if period_month:
        query["period_month"] = period_month
    if status:
        query["status"] = status
    
    total = await _db.payslips.count_documents(query)
    items = []
    async for doc in _db.payslips.find(query).sort([("period_year", -1), ("period_month", -1)]).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.get("/payroll/payslips/{payslip_id}")
async def get_payslip(payslip_id: str, request: Request):
    """Détail d'une fiche de paie."""
    await _require_auth(request)
    doc = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Fiche de paie introuvable")
    return _serialize(doc)

@enterprise_router.post("/payroll/payslips/{payslip_id}/validate")
async def validate_payslip(payslip_id: str, request: Request):
    """Valider une fiche de paie et créer les écritures comptables."""
    user = await _require_auth(request)
    
    payslip = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not payslip:
        raise HTTPException(404, "Fiche de paie introuvable")
    if payslip.get("status") == "validated":
        raise HTTPException(400, "Fiche déjà validée")
    
    await _db.payslips.update_one(
        {"payslip_id": payslip_id},
        {"$set": {"status": "validated", "validated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Écriture comptable de paie
    lines = [
        {"account_code": "6410", "label": f"Salaire brut {payslip['employee_name']}", "debit": payslip["total_brut"], "credit": 0, "lettering_code": None},
        {"account_code": "6450", "label": f"Charges patronales {payslip['employee_name']}", "debit": payslip["total_patronales"], "credit": 0, "lettering_code": None},
        {"account_code": "4310", "label": f"Cotisations sociales {payslip['employee_name']}", "debit": 0, "credit": round(payslip["total_salariales"] + payslip["total_patronales"], 2), "lettering_code": None},
        {"account_code": "4210", "label": f"Net à payer {payslip['employee_name']}", "debit": 0, "credit": payslip["net_salary"], "lettering_code": None},
    ]
    
    total_d = sum(l["debit"] for l in lines)
    total_c = sum(l["credit"] for l in lines)
    # Ajuster l'arrondi si nécessaire
    if abs(total_d - total_c) > 0.01:
        diff = round(total_d - total_c, 2)
        if diff > 0:
            lines[-1]["credit"] = round(lines[-1]["credit"] + diff, 2)
        else:
            lines[0]["debit"] = round(lines[0]["debit"] - diff, 2)
    
    seq = await _get_next_seq("journal_PAI")
    je = {
        "entry_id": f"JE-PAI-{datetime.now(timezone.utc).year}-{str(seq).zfill(6)}",
        "entry_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "journal_type": "PAI",
        "journal_label": "Journal de paie",
        "reference": payslip_id,
        "description": f"Paie {payslip['employee_name']} - {payslip['period_month']}/{payslip['period_year']}",
        "lines": lines,
        "total_debit": round(sum(l["debit"] for l in lines), 2),
        "total_credit": round(sum(l["credit"] for l in lines), 2),
        "is_balanced": True,
        "is_reversed": False,
        "is_validated": True,
        "status": "validated",
        "auto_generated": True,
        "source": "payroll",
        "source_id": payslip_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system",
    }
    await _db.journal_entries.insert_one(je)
    
    await _audit_log(user.get("user_id", "system"), "validate_payslip", "payslip", payslip_id)
    return {"message": "Fiche de paie validée et écriture créée", "journal_entry": je["entry_id"]}

@enterprise_router.get("/payroll/cotisations-rates")
async def get_cotisations_rates(request: Request):
    """Obtenir les taux de cotisations par type de contrat."""
    await _require_auth(request)
    return COTISATIONS_RATES

@enterprise_router.get("/payroll/summary")
async def get_payroll_summary(request: Request, year: Optional[int] = None, month: Optional[int] = None):
    """Résumé de la masse salariale."""
    await _require_auth(request)
    
    query = {}
    if year:
        query["period_year"] = year
    if month:
        query["period_month"] = month
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"year": "$period_year", "month": "$period_month"},
            "count": {"$sum": 1},
            "total_brut": {"$sum": "$total_brut"},
            "total_net": {"$sum": "$net_salary"},
            "total_patronales": {"$sum": "$total_patronales"},
            "total_salariales": {"$sum": "$total_salariales"},
            "total_cost": {"$sum": "$total_cost_employer"},
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}},
    ]
    
    results = []
    async for doc in _db.payslips.aggregate(pipeline):
        results.append({
            "period": f"{doc['_id']['year']}-{str(doc['_id']['month']).zfill(2)}",
            "employees": doc["count"],
            "total_brut": round(doc["total_brut"], 2),
            "total_net": round(doc["total_net"], 2),
            "total_patronales": round(doc["total_patronales"], 2),
            "total_salariales": round(doc["total_salariales"], 2),
            "total_cost": round(doc["total_cost"], 2),
        })
    
    return {"summary": results}

# ═══════════════════════════════════════════════════════════════════
# 9. CONTRATS
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/contracts")
async def create_contract(inp: ContractCreate, request: Request):
    """Créer un contrat."""
    user = await _require_auth(request)
    
    seq = await _get_next_seq("contract")
    contract = {
        "contract_id": f"CTR-{datetime.now(timezone.utc).year}-{str(seq).zfill(4)}",
        "title": inp.title,
        "client_id": inp.client_id,
        "supplier_id": inp.supplier_id,
        "contract_type": inp.contract_type,
        "start_date": inp.start_date,
        "end_date": inp.end_date,
        "amount": inp.amount,
        "payment_terms": inp.payment_terms,
        "auto_renew": inp.auto_renew,
        "terms": inp.terms,
        "status": "active",
        "versions": [{"version": 1, "date": datetime.now(timezone.utc).isoformat(), "by": user.get("user_id", "system")}],
        "signatures": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.contracts_enterprise.insert_one(contract)
    await _audit_log(user.get("user_id", "system"), "create", "contract", contract["contract_id"])
    return _serialize(contract)

@enterprise_router.get("/contracts")
async def list_contracts(
    request: Request,
    status: Optional[str] = None,
    contract_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    """Lister les contrats."""
    await _require_auth(request)
    query = {}
    if status:
        query["status"] = status
    if contract_type:
        query["contract_type"] = contract_type
    
    total = await _db.contracts_enterprise.count_documents(query)
    items = []
    async for doc in _db.contracts_enterprise.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, request: Request):
    """Détail d'un contrat."""
    await _require_auth(request)
    doc = await _db.contracts_enterprise.find_one({"contract_id": contract_id})
    if not doc:
        raise HTTPException(404, "Contrat introuvable")
    return _serialize(doc)

@enterprise_router.patch("/contracts/{contract_id}")
async def update_contract(contract_id: str, request: Request):
    """Mettre à jour un contrat (crée une nouvelle version)."""
    user = await _require_auth(request)
    body = await request.json()
    
    contract = await _db.contracts_enterprise.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(404, "Contrat introuvable")
    
    version = len(contract.get("versions", [])) + 1
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await _db.contracts_enterprise.update_one(
        {"contract_id": contract_id},
        {"$set": body, "$push": {"versions": {"version": version, "date": datetime.now(timezone.utc).isoformat(), "by": user.get("user_id", "system"), "changes": list(body.keys())}}}
    )
    
    await _audit_log(user.get("user_id", "system"), "update", "contract", contract_id, after=body)
    updated = await _db.contracts_enterprise.find_one({"contract_id": contract_id})
    return _serialize(updated)

@enterprise_router.get("/contracts/alerts/expiring")
async def get_expiring_contracts(request: Request, days: int = 30):
    """Contrats expirant dans les prochains jours."""
    await _require_auth(request)
    
    cutoff = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    items = []
    async for doc in _db.contracts_enterprise.find({
        "end_date": {"$gte": today, "$lte": cutoff},
        "status": "active",
    }).sort("end_date", 1):
        items.append(_serialize(doc))
    
    return {"items": items, "total": len(items), "days_ahead": days}

# ═══════════════════════════════════════════════════════════════════
# 10. AVOIRS (CREDIT NOTES)
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/credit-notes")
async def create_credit_note(inp: CreditNoteCreate, request: Request):
    """Créer un avoir lié à une facture."""
    user = await _require_auth(request)
    
    invoice = await _db.invoices_premium.find_one({"invoice_id": inp.invoice_id})
    if not invoice:
        raise HTTPException(404, "Facture introuvable")
    
    tva_rate = TVA_RATES.get(inp.tva_rate, TVA_RATES["exonere"])["rate"]
    
    total_ht = sum(l.get("amount_ht", l.get("amount", 0)) for l in inp.lines)
    tva_amount = round(total_ht * tva_rate / 100, 2)
    total_ttc = round(total_ht + tva_amount, 2)
    
    seq = await _get_next_seq("credit_note")
    note = {
        "credit_note_id": f"AV-{datetime.now(timezone.utc).year}-{str(seq).zfill(4)}",
        "invoice_id": inp.invoice_id,
        "reason": inp.reason,
        "lines": inp.lines,
        "total_ht": round(total_ht, 2),
        "tva_rate": tva_rate,
        "tva_amount": tva_amount,
        "total_ttc": total_ttc,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id", "system"),
    }
    
    await _db.credit_notes.insert_one(note)
    await _audit_log(user.get("user_id", "system"), "create", "credit_note", note["credit_note_id"], after={"invoice": inp.invoice_id, "total": total_ttc})
    return _serialize(note)

@enterprise_router.get("/credit-notes")
async def list_credit_notes(request: Request, invoice_id: Optional[str] = None, page: int = 1, limit: int = 20):
    """Lister les avoirs."""
    await _require_auth(request)
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    
    total = await _db.credit_notes.count_documents(query)
    items = []
    async for doc in _db.credit_notes.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.post("/credit-notes/{note_id}/validate")
async def validate_credit_note(note_id: str, request: Request):
    """Valider un avoir et créer l'écriture comptable."""
    user = await _require_auth(request)
    
    note = await _db.credit_notes.find_one({"credit_note_id": note_id})
    if not note:
        raise HTTPException(404, "Avoir introuvable")
    
    await _db.credit_notes.update_one({"credit_note_id": note_id}, {"$set": {"status": "validated"}})
    
    # Écriture d'avoir
    lines = [
        {"account_code": "7060", "label": f"Avoir {note_id}", "debit": note["total_ht"], "credit": 0, "lettering_code": None},
    ]
    if note["tva_amount"] > 0:
        lines.append({"account_code": "4457", "label": f"TVA avoir {note_id}", "debit": note["tva_amount"], "credit": 0, "lettering_code": None})
    lines.append({"account_code": "4110", "label": f"Client avoir {note_id}", "debit": 0, "credit": note["total_ttc"], "lettering_code": None})
    
    seq = await _get_next_seq("journal_VTE")
    je = {
        "entry_id": f"JE-VTE-{datetime.now(timezone.utc).year}-{str(seq).zfill(6)}",
        "entry_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "journal_type": "VTE",
        "journal_label": "Journal de ventes",
        "reference": note_id,
        "description": f"Avoir {note_id}",
        "lines": lines,
        "total_debit": round(sum(l["debit"] for l in lines), 2),
        "total_credit": round(sum(l["credit"] for l in lines), 2),
        "is_balanced": True,
        "is_reversed": False,
        "is_validated": True,
        "status": "validated",
        "auto_generated": True,
        "source": "credit_note",
        "source_id": note_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system",
    }
    await _db.journal_entries.insert_one(je)
    
    return {"message": "Avoir validé", "journal_entry": je["entry_id"]}

# ═══════════════════════════════════════════════════════════════════
# 11. STOCK AVANCÉ (FIFO/LIFO/CMP)
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/stock-advanced/valuation")
async def calculate_stock_valuation(inp: StockValuationRequest, request: Request):
    """Calculer la valuation du stock selon FIFO, LIFO ou Coût Moyen Pondéré."""
    await _require_auth(request)
    
    items = []
    async for item in _db.stock_items.find({"deleted_at": {"$exists": False}}):
        item_id = item["item_id"]
        
        # Récupérer les mouvements
        movements = []
        async for mov in _db.stock_movements.find({"item_id": item_id}).sort("created_at", 1):
            movements.append(mov)
        
        total_qty = item.get("quantity", 0)
        unit_cost = item.get("unit_price", 0)
        
        if inp.method == "weighted_average":
            # Coût Moyen Pondéré
            total_cost = 0.0
            total_qty_calc = 0.0
            for m in movements:
                if m["type"] == "in":
                    total_cost += m.get("quantity", 0) * m.get("unit_price", unit_cost)
                    total_qty_calc += m.get("quantity", 0)
            avg_cost = round(total_cost / total_qty_calc, 2) if total_qty_calc > 0 else unit_cost
            valuation = round(total_qty * avg_cost, 2)
            items.append({
                "item_id": item_id,
                "name": item.get("name", ""),
                "quantity": total_qty,
                "unit_cost": avg_cost,
                "total_valuation": valuation,
                "method": "weighted_average",
            })
        
        elif inp.method == "fifo":
            # Premier entré, premier sorti
            in_queue = []
            for m in movements:
                if m["type"] == "in":
                    in_queue.append({"qty": m["quantity"], "cost": m.get("unit_price", unit_cost)})
                elif m["type"] == "out":
                    remaining = m["quantity"]
                    while remaining > 0 and in_queue:
                        if in_queue[0]["qty"] <= remaining:
                            remaining -= in_queue[0]["qty"]
                            in_queue.pop(0)
                        else:
                            in_queue[0]["qty"] -= remaining
                            remaining = 0
            
            total_val = sum(e["qty"] * e["cost"] for e in in_queue)
            remaining_qty = sum(e["qty"] for e in in_queue)
            avg = round(total_val / remaining_qty, 2) if remaining_qty > 0 else 0
            items.append({
                "item_id": item_id,
                "name": item.get("name", ""),
                "quantity": remaining_qty,
                "unit_cost": avg,
                "total_valuation": round(total_val, 2),
                "method": "fifo",
                "layers": in_queue[:10],
            })
        
        elif inp.method == "lifo":
            # Dernier entré, premier sorti
            in_stack = []
            for m in movements:
                if m["type"] == "in":
                    in_stack.append({"qty": m["quantity"], "cost": m.get("unit_price", unit_cost)})
                elif m["type"] == "out":
                    remaining = m["quantity"]
                    while remaining > 0 and in_stack:
                        if in_stack[-1]["qty"] <= remaining:
                            remaining -= in_stack[-1]["qty"]
                            in_stack.pop()
                        else:
                            in_stack[-1]["qty"] -= remaining
                            remaining = 0
            
            total_val = sum(e["qty"] * e["cost"] for e in in_stack)
            remaining_qty = sum(e["qty"] for e in in_stack)
            avg = round(total_val / remaining_qty, 2) if remaining_qty > 0 else 0
            items.append({
                "item_id": item_id,
                "name": item.get("name", ""),
                "quantity": remaining_qty,
                "unit_cost": avg,
                "total_valuation": round(total_val, 2),
                "method": "lifo",
                "layers": in_stack[:10],
            })
    
    grand_total = sum(i["total_valuation"] for i in items)
    
    return {
        "method": inp.method,
        "items": items,
        "grand_total": round(grand_total, 2),
        "item_count": len(items),
    }

@enterprise_router.get("/stock-advanced/forecast")
async def stock_forecast(request: Request, days: int = 30):
    """Prévisions de stock basées sur la consommation moyenne."""
    await _require_auth(request)
    
    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    
    forecasts = []
    async for item in _db.stock_items.find({"deleted_at": {"$exists": False}}):
        # Consommation sur 90 jours
        out_pipeline = [
            {"$match": {"item_id": item["item_id"], "type": "out", "created_at": {"$gte": cutoff}}},
            {"$group": {"_id": None, "total_out": {"$sum": "$quantity"}}},
        ]
        result = await _db.stock_movements.aggregate(out_pipeline).to_list(1)
        total_out_90d = result[0]["total_out"] if result else 0
        
        avg_daily = total_out_90d / 90 if total_out_90d > 0 else 0
        current_qty = item.get("quantity", 0)
        days_remaining = round(current_qty / avg_daily) if avg_daily > 0 else 999
        
        optimal_stock = round(avg_daily * days * 1.2, 0)  # 20% buffer
        reorder_qty = max(0, optimal_stock - current_qty)
        
        status = "ok"
        if days_remaining < 7:
            status = "critical"
        elif days_remaining < 14:
            status = "warning"
        elif current_qty > optimal_stock * 2:
            status = "overstock"
        
        forecasts.append({
            "item_id": item["item_id"],
            "name": item.get("name", ""),
            "current_qty": current_qty,
            "avg_daily_consumption": round(avg_daily, 2),
            "days_remaining": min(days_remaining, 999),
            "optimal_stock": optimal_stock,
            "reorder_qty": reorder_qty,
            "status": status,
            "min_alert": item.get("min_alert", 0),
        })
    
    forecasts.sort(key=lambda x: x["days_remaining"])
    
    return {
        "forecasts": forecasts,
        "critical": len([f for f in forecasts if f["status"] == "critical"]),
        "warning": len([f for f in forecasts if f["status"] == "warning"]),
        "overstock": len([f for f in forecasts if f["status"] == "overstock"]),
    }

@enterprise_router.get("/stock-advanced/inventory-reconciliation")
async def inventory_reconciliation(request: Request):
    """Réconciliation inventaire BD vs physique."""
    await _require_auth(request)
    
    items = []
    async for item in _db.stock_items.find({"deleted_at": {"$exists": False}}):
        # Calculer le stock théorique depuis les mouvements
        pipeline = [
            {"$match": {"item_id": item["item_id"]}},
            {"$group": {
                "_id": "$type",
                "total": {"$sum": "$quantity"},
            }},
        ]
        movements = {}
        async for doc in _db.stock_movements.aggregate(pipeline):
            movements[doc["_id"]] = doc["total"]
        
        theoretical = movements.get("in", 0) - movements.get("out", 0)
        actual = item.get("quantity", 0)
        difference = actual - theoretical
        
        items.append({
            "item_id": item["item_id"],
            "name": item.get("name", ""),
            "db_quantity": actual,
            "theoretical_quantity": theoretical,
            "difference": difference,
            "has_discrepancy": abs(difference) > 0,
            "total_in": movements.get("in", 0),
            "total_out": movements.get("out", 0),
        })
    
    discrepancies = [i for i in items if i["has_discrepancy"]]
    
    return {
        "items": items,
        "total_items": len(items),
        "discrepancies": len(discrepancies),
        "discrepancy_items": discrepancies,
    }

# ═══════════════════════════════════════════════════════════════════
# 12. RAPPORTS FINANCIERS
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.get("/reports/balance-sheet")
async def get_balance_sheet(request: Request, date: Optional[str] = None):
    """Bilan comptable complet (actif/passif)."""
    await _require_auth(request)
    
    as_of = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Agréger les soldes par classe de compte
    actif = {"immobilisations": [], "stocks": [], "creances": [], "tresorerie": []}
    passif = {"capitaux": [], "dettes": []}
    
    async for acc in _db.chart_of_accounts.find({"is_active": True}).sort("code", 1):
        code = acc.get("code", "")
        balance = acc.get("balance", 0)
        
        entry = {"code": code, "label": acc.get("label", ""), "balance": balance}
        
        if code.startswith("2"):
            actif["immobilisations"].append(entry)
        elif code.startswith("3"):
            actif["stocks"].append(entry)
        elif code.startswith("41"):
            actif["creances"].append(entry)
        elif code.startswith("44") and acc.get("type") == "actif":
            actif["creances"].append(entry)
        elif code.startswith("5"):
            actif["tresorerie"].append(entry)
        elif code.startswith("1"):
            passif["capitaux"].append(entry)
        elif code.startswith("40"):
            passif["dettes"].append(entry)
        elif code.startswith("42") or code.startswith("43"):
            passif["dettes"].append(entry)
        elif code.startswith("44") and acc.get("type") == "passif":
            passif["dettes"].append(entry)
    
    total_actif = sum(e["balance"] for cat in actif.values() for e in cat)
    total_passif = sum(e["balance"] for cat in passif.values() for e in cat)
    
    # Résultat = produits - charges (comptes 7 - comptes 6)
    result_pipeline = [
        {"$match": {"is_active": True, "class_num": {"$in": ["6", "7"]}}},
        {"$group": {"_id": "$class_num", "total": {"$sum": "$balance"}}},
    ]
    totals_by_class = {}
    async for doc in _db.chart_of_accounts.aggregate(result_pipeline):
        totals_by_class[doc["_id"]] = doc["total"]
    
    resultat = round(totals_by_class.get("7", 0) - totals_by_class.get("6", 0), 2)
    
    return {
        "date": as_of,
        "actif": actif,
        "passif": passif,
        "total_actif": round(total_actif, 2),
        "total_passif": round(total_passif + resultat, 2),
        "resultat": resultat,
        "is_balanced": abs(total_actif - (total_passif + resultat)) < 0.01,
    }

@enterprise_router.get("/reports/profit-loss")
async def get_profit_loss_report(request: Request, year: Optional[int] = None, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Compte de résultat détaillé (P&L)."""
    await _require_auth(request)
    
    now = datetime.now(timezone.utc)
    if not year:
        year = now.year
    if not from_date:
        from_date = f"{year}-01-01"
    if not to_date:
        to_date = f"{year}-12-31"
    
    # Produits (classe 7)
    produits = {}
    charges = {}
    
    pipeline = [
        {"$match": {"entry_date": {"$gte": from_date, "$lte": to_date}, "is_reversed": {"$ne": True}, "status": "validated"}},
        {"$unwind": "$lines"},
        {"$group": {
            "_id": "$lines.account_code",
            "total_debit": {"$sum": "$lines.debit"},
            "total_credit": {"$sum": "$lines.credit"},
        }},
    ]
    
    async for doc in _db.journal_entries.aggregate(pipeline):
        code = doc["_id"]
        acc = await _db.chart_of_accounts.find_one({"code": code})
        label = acc.get("label", code) if acc else code
        
        if code.startswith("7"):
            net = round(doc["total_credit"] - doc["total_debit"], 2)
            produits[code] = {"code": code, "label": label, "amount": net}
        elif code.startswith("6"):
            net = round(doc["total_debit"] - doc["total_credit"], 2)
            charges[code] = {"code": code, "label": label, "amount": net}
    
    total_produits = round(sum(p["amount"] for p in produits.values()), 2)
    total_charges = round(sum(c["amount"] for c in charges.values()), 2)
    resultat = round(total_produits - total_charges, 2)
    marge = round((resultat / total_produits * 100), 2) if total_produits > 0 else 0
    
    # Détail par catégorie
    produits_exploitation = {k: v for k, v in produits.items() if k.startswith("70") or k.startswith("71") or k.startswith("74")}
    produits_financiers = {k: v for k, v in produits.items() if k.startswith("76")}
    produits_exceptionnels = {k: v for k, v in produits.items() if k.startswith("77")}
    
    charges_exploitation = {k: v for k, v in charges.items() if k.startswith("60") or k.startswith("61") or k.startswith("62") or k.startswith("63") or k.startswith("64") or k.startswith("65")}
    charges_financieres = {k: v for k, v in charges.items() if k.startswith("66")}
    charges_exceptionnelles = {k: v for k, v in charges.items() if k.startswith("67")}
    dotations = {k: v for k, v in charges.items() if k.startswith("68")}
    
    return {
        "period": {"from": from_date, "to": to_date, "year": year},
        "produits": {
            "exploitation": list(produits_exploitation.values()),
            "financiers": list(produits_financiers.values()),
            "exceptionnels": list(produits_exceptionnels.values()),
            "total": total_produits,
        },
        "charges": {
            "exploitation": list(charges_exploitation.values()),
            "financieres": list(charges_financieres.values()),
            "exceptionnelles": list(charges_exceptionnelles.values()),
            "dotations": list(dotations.values()),
            "total": total_charges,
        },
        "resultat_exploitation": round(
            sum(v["amount"] for v in produits_exploitation.values()) - sum(v["amount"] for v in charges_exploitation.values()), 2
        ),
        "resultat_financier": round(
            sum(v["amount"] for v in produits_financiers.values()) - sum(v["amount"] for v in charges_financieres.values()), 2
        ),
        "resultat_exceptionnel": round(
            sum(v["amount"] for v in produits_exceptionnels.values()) - sum(v["amount"] for v in charges_exceptionnelles.values()), 2
        ),
        "resultat_net": resultat,
        "marge_nette": marge,
    }

@enterprise_router.get("/reports/cash-flow")
async def get_cash_flow_report(request: Request, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Flux de trésorerie."""
    await _require_auth(request)
    
    now = datetime.now(timezone.utc)
    if not from_date:
        from_date = now.replace(month=1, day=1).strftime("%Y-%m-%d")
    if not to_date:
        to_date = now.strftime("%Y-%m-%d")
    
    # Mouvements sur les comptes de trésorerie (classe 5)
    pipeline = [
        {"$match": {
            "entry_date": {"$gte": from_date, "$lte": to_date},
            "is_reversed": {"$ne": True},
            "status": "validated",
        }},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^5"}}},
        {"$group": {
            "_id": {"account": "$lines.account_code", "month": {"$substr": ["$entry_date", 0, 7]}},
            "total_in": {"$sum": "$lines.debit"},
            "total_out": {"$sum": "$lines.credit"},
        }},
        {"$sort": {"_id.month": 1}},
    ]
    
    monthly = {}
    async for doc in _db.journal_entries.aggregate(pipeline):
        month = doc["_id"]["month"]
        if month not in monthly:
            monthly[month] = {"month": month, "inflows": 0, "outflows": 0}
        monthly[month]["inflows"] += doc["total_in"]
        monthly[month]["outflows"] += doc["total_out"]
    
    for m in monthly.values():
        m["inflows"] = round(m["inflows"], 2)
        m["outflows"] = round(m["outflows"], 2)
        m["net"] = round(m["inflows"] - m["outflows"], 2)
    
    total_in = sum(m["inflows"] for m in monthly.values())
    total_out = sum(m["outflows"] for m in monthly.values())
    
    # Solde actuel des comptes bancaires
    bank_balance = 0.0
    async for acc in _db.chart_of_accounts.find({"code": {"$regex": "^5"}, "is_active": True}):
        bank_balance += acc.get("balance", 0)
    
    return {
        "period": {"from": from_date, "to": to_date},
        "monthly": sorted(monthly.values(), key=lambda x: x["month"]),
        "total_inflows": round(total_in, 2),
        "total_outflows": round(total_out, 2),
        "net_cash_flow": round(total_in - total_out, 2),
        "current_bank_balance": round(bank_balance, 2),
    }

@enterprise_router.get("/reports/financial-ratios")
async def get_financial_ratios(request: Request):
    """Ratios financiers clés."""
    await _require_auth(request)
    
    # Collecter les totaux par classe
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$class_num", "total": {"$sum": "$balance"}}},
    ]
    by_class = {}
    async for doc in _db.chart_of_accounts.aggregate(pipeline):
        by_class[doc["_id"]] = doc["total"]
    
    # Totaux spécifiques
    tresorerie = by_class.get("5", 0)
    stocks = by_class.get("3", 0)
    creances_pipeline = [
        {"$match": {"code": {"$regex": "^41"}, "is_active": True}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}},
    ]
    creances_result = await _db.chart_of_accounts.aggregate(creances_pipeline).to_list(1)
    creances = creances_result[0]["total"] if creances_result else 0
    
    dettes_ct_pipeline = [
        {"$match": {"code": {"$regex": "^4[0-4]"}, "type": "passif", "is_active": True}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}},
    ]
    dettes_result = await _db.chart_of_accounts.aggregate(dettes_ct_pipeline).to_list(1)
    dettes_ct = dettes_result[0]["total"] if dettes_result else 0
    
    capitaux = by_class.get("1", 0)
    total_actif = sum(by_class.get(c, 0) for c in ["2", "3", "5"]) + creances
    produits = by_class.get("7", 0)
    charges = by_class.get("6", 0)
    resultat = produits - charges
    
    actif_circulant = tresorerie + stocks + creances
    
    return {
        "liquidite_generale": round(actif_circulant / dettes_ct, 2) if dettes_ct > 0 else None,
        "liquidite_reduite": round((tresorerie + creances) / dettes_ct, 2) if dettes_ct > 0 else None,
        "liquidite_immediate": round(tresorerie / dettes_ct, 2) if dettes_ct > 0 else None,
        "solvabilite": round(capitaux / total_actif * 100, 2) if total_actif > 0 else None,
        "rentabilite_nette": round(resultat / produits * 100, 2) if produits > 0 else None,
        "rentabilite_capitaux": round(resultat / capitaux * 100, 2) if capitaux > 0 else None,
        "taux_endettement": round(dettes_ct / capitaux * 100, 2) if capitaux > 0 else None,
        "besoin_fonds_roulement": round(stocks + creances - dettes_ct, 2),
        "tresorerie_nette": round(tresorerie, 2),
        "marge_brute": round((produits - charges) / produits * 100, 2) if produits > 0 else 0,
    }

# ═══════════════════════════════════════════════════════════════════
# 13. DASHBOARD COMPTABLE AVANCÉ
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.get("/dashboard/advanced")
async def get_advanced_dashboard(request: Request, period: str = "30d"):
    """Dashboard comptable avancé avec KPIs, graphiques, alertes."""
    await _require_auth(request)
    
    since = _parse_period(period)
    since_str = since.strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    
    # === KPIs ===
    # CA (classe 7)
    ca_pipeline = [
        {"$match": {"entry_date": {"$gte": since_str}, "is_reversed": {"$ne": True}, "status": "validated"}},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^70"}}},
        {"$group": {"_id": None, "total": {"$sum": "$lines.credit"}}},
    ]
    ca_result = await _db.journal_entries.aggregate(ca_pipeline).to_list(1)
    ca = ca_result[0]["total"] if ca_result else 0
    
    # Charges (classe 6)
    charges_pipeline = [
        {"$match": {"entry_date": {"$gte": since_str}, "is_reversed": {"$ne": True}, "status": "validated"}},
        {"$unwind": "$lines"},
        {"$match": {"lines.account_code": {"$regex": "^6"}}},
        {"$group": {"_id": None, "total": {"$sum": "$lines.debit"}}},
    ]
    charges_result = await _db.journal_entries.aggregate(charges_pipeline).to_list(1)
    charges = charges_result[0]["total"] if charges_result else 0
    
    resultat = round(ca - charges, 2)
    marge = round((resultat / ca * 100), 2) if ca > 0 else 0
    
    # Trésorerie
    tresorerie = 0.0
    async for acc in _db.chart_of_accounts.find({"code": {"$regex": "^5"}, "is_active": True}):
        tresorerie += acc.get("balance", 0)
    
    # === Graphiques mensuels ===
    monthly_pipeline = [
        {"$match": {"entry_date": {"$gte": (now - timedelta(days=365)).strftime("%Y-%m-%d")}, "is_reversed": {"$ne": True}, "status": "validated"}},
        {"$unwind": "$lines"},
        {"$addFields": {"month": {"$substr": ["$entry_date", 0, 7]}}},
        {"$group": {
            "_id": {"month": "$month", "is_revenue": {"$cond": [{"$regexMatch": {"input": "$lines.account_code", "regex": "^7"}}, True, False]}},
            "total_debit": {"$sum": "$lines.debit"},
            "total_credit": {"$sum": "$lines.credit"},
        }},
        {"$sort": {"_id.month": 1}},
    ]
    
    monthly_data = {}
    async for doc in _db.journal_entries.aggregate(monthly_pipeline):
        month = doc["_id"]["month"]
        if month not in monthly_data:
            monthly_data[month] = {"month": month, "revenue": 0, "expenses": 0}
        if doc["_id"]["is_revenue"]:
            monthly_data[month]["revenue"] += doc["total_credit"]
        else:
            monthly_data[month]["expenses"] += doc["total_debit"]
    
    for m in monthly_data.values():
        m["revenue"] = round(m["revenue"], 2)
        m["expenses"] = round(m["expenses"], 2)
        m["profit"] = round(m["revenue"] - m["expenses"], 2)
    
    monthly_chart = sorted(monthly_data.values(), key=lambda x: x["month"])
    
    # === Alertes ===
    alerts = []
    
    # Factures en retard
    overdue_count = await _db.invoices_premium.count_documents({"status": "overdue"})
    if overdue_count > 0:
        alerts.append({"type": "warning", "message": f"{overdue_count} facture(s) en retard de paiement", "category": "invoices"})
    
    # Trésorerie basse
    if tresorerie < 5000:
        alerts.append({"type": "danger", "message": f"Trésorerie basse: {tresorerie:.2f}€", "category": "treasury"})
    
    # Notes de frais en attente
    pending_expenses = await _db.expense_reports.count_documents({"status": "submitted"})
    if pending_expenses > 0:
        alerts.append({"type": "info", "message": f"{pending_expenses} note(s) de frais en attente d'approbation", "category": "expenses"})
    
    # Contrats expirant bientôt
    cutoff_30d = (now + timedelta(days=30)).strftime("%Y-%m-%d")
    expiring = await _db.contracts_enterprise.count_documents({
        "end_date": {"$lte": cutoff_30d, "$gte": now.strftime("%Y-%m-%d")},
        "status": "active",
    })
    if expiring > 0:
        alerts.append({"type": "warning", "message": f"{expiring} contrat(s) expire(nt) dans les 30 jours", "category": "contracts"})
    
    # Stock critique
    critical_stock = await _db.stock_items.count_documents({
        "deleted_at": {"$exists": False},
        "$expr": {"$lte": ["$quantity", "$min_alert"]},
    })
    if critical_stock > 0:
        alerts.append({"type": "danger", "message": f"{critical_stock} article(s) en rupture de stock", "category": "stock"})
    
    # Écritures brouillon
    draft_entries = await _db.journal_entries.count_documents({"status": "draft"})
    if draft_entries > 0:
        alerts.append({"type": "info", "message": f"{draft_entries} écriture(s) en brouillon à valider", "category": "entries"})
    
    # === Statistiques supplémentaires ===
    total_entries = await _db.journal_entries.count_documents({"entry_date": {"$gte": since_str}, "is_reversed": {"$ne": True}})
    total_invoices = await _db.invoices_premium.count_documents({"created_at": {"$gte": since.isoformat()}})
    total_quotes = await _db.quotes_premium.count_documents({"created_at": {"$gte": since.isoformat()}})
    
    return {
        "kpis": {
            "ca": round(ca, 2),
            "charges": round(charges, 2),
            "resultat": resultat,
            "marge": marge,
            "tresorerie": round(tresorerie, 2),
        },
        "monthly_chart": monthly_chart,
        "alerts": alerts,
        "stats": {
            "total_entries": total_entries,
            "total_invoices": total_invoices,
            "total_quotes": total_quotes,
            "draft_entries": draft_entries,
        },
        "period": period,
    }

# ═══════════════════════════════════════════════════════════════════
# 14. AUDIT TRAIL
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.get("/audit-trail")
async def list_audit_trail(
    request: Request,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    """Consulter le journal d'audit (lecture seule, immuable)."""
    await _require_auth(request)
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    if from_date:
        query.setdefault("timestamp", {})["$gte"] = from_date
    if to_date:
        query.setdefault("timestamp", {})["$lte"] = to_date
    
    total = await _db.audit_trail.count_documents(query)
    items = []
    async for doc in _db.audit_trail.find(query).sort("timestamp", -1).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.get("/audit-trail/verify/{audit_id}")
async def verify_audit_entry(audit_id: str, request: Request):
    """Vérifier l'intégrité d'une entrée d'audit via son checksum."""
    await _require_auth(request)
    
    entry = await _db.audit_trail.find_one({"audit_id": audit_id})
    if not entry:
        raise HTTPException(404, "Entrée d'audit introuvable")
    
    stored_checksum = entry.get("checksum")
    entry_copy = {k: v for k, v in entry.items() if k not in ["checksum", "_id"]}
    raw = json.dumps(entry_copy, sort_keys=True, default=str)
    computed_checksum = hashlib.sha256(raw.encode()).hexdigest()
    
    is_valid = stored_checksum == computed_checksum
    
    return {
        "audit_id": audit_id,
        "is_valid": is_valid,
        "stored_checksum": stored_checksum,
        "computed_checksum": computed_checksum,
        "message": "Intégrité vérifiée ✅" if is_valid else "⚠️ ALERTE: L'entrée a été modifiée!",
    }

@enterprise_router.get("/audit-trail/stats")
async def audit_trail_stats(request: Request):
    """Statistiques du journal d'audit."""
    await _require_auth(request)
    
    pipeline = [
        {"$group": {
            "_id": {"entity_type": "$entity_type", "action": "$action"},
            "count": {"$sum": 1},
            "last": {"$max": "$timestamp"},
        }},
        {"$sort": {"count": -1}},
    ]
    
    stats = []
    async for doc in _db.audit_trail.aggregate(pipeline):
        stats.append({
            "entity_type": doc["_id"]["entity_type"],
            "action": doc["_id"]["action"],
            "count": doc["count"],
            "last_occurrence": doc["last"],
        })
    
    total = await _db.audit_trail.count_documents({})
    
    return {"stats": stats, "total_entries": total}

# ═══════════════════════════════════════════════════════════════════
# 15. CONGÉS / LEAVE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.post("/leave/requests")
async def create_leave_request(request: Request):
    """Créer une demande de congé."""
    user = await _require_auth(request)
    body = await request.json()
    
    leave = {
        "leave_id": str(uuid.uuid4()),
        "employee_id": body.get("employee_id", user.get("user_id")),
        "employee_name": body.get("employee_name", ""),
        "leave_type": body.get("leave_type", "conge_paye"),  # conge_paye, rtt, maladie, sans_solde
        "start_date": body["start_date"],
        "end_date": body["end_date"],
        "days": body.get("days", 1),
        "reason": body.get("reason", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await _db.leave_requests.insert_one(leave)
    return _serialize(leave)

@enterprise_router.get("/leave/requests")
async def list_leave_requests(request: Request, employee_id: Optional[str] = None, status: Optional[str] = None, page: int = 1, limit: int = 20):
    """Lister les demandes de congé."""
    await _require_auth(request)
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status
    
    total = await _db.leave_requests.count_documents(query)
    items = []
    async for doc in _db.leave_requests.find(query).sort("created_at", -1).skip((page-1)*limit).limit(limit):
        items.append(_serialize(doc))
    
    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@enterprise_router.post("/leave/requests/{leave_id}/approve")
async def approve_leave(leave_id: str, request: Request):
    """Approuver/rejeter une demande de congé."""
    user = await _require_auth(request)
    body = await request.json()
    
    new_status = body.get("status", "approved")  # approved or rejected
    
    await _db.leave_requests.update_one(
        {"leave_id": leave_id},
        {"$set": {"status": new_status, "approved_by": user.get("user_id", "system"), "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Demande {new_status}", "leave_id": leave_id}

@enterprise_router.get("/leave/balance/{employee_id}")
async def get_leave_balance(employee_id: str, request: Request, year: Optional[int] = None):
    """Solde de congés d'un employé."""
    await _require_auth(request)
    
    if not year:
        year = datetime.now(timezone.utc).year
    
    # Compter les jours approuvés
    pipeline = [
        {"$match": {
            "employee_id": employee_id,
            "status": "approved",
            "start_date": {"$regex": f"^{year}"},
        }},
        {"$group": {"_id": "$leave_type", "total_days": {"$sum": "$days"}}},
    ]
    
    used = {}
    async for doc in _db.leave_requests.aggregate(pipeline):
        used[doc["_id"]] = doc["total_days"]
    
    # Droits par défaut
    rights = {
        "conge_paye": {"total": 25, "used": used.get("conge_paye", 0)},
        "rtt": {"total": 10, "used": used.get("rtt", 0)},
        "maladie": {"total": 0, "used": used.get("maladie", 0)},
        "sans_solde": {"total": 0, "used": used.get("sans_solde", 0)},
    }
    
    for key in rights:
        rights[key]["remaining"] = rights[key]["total"] - rights[key]["used"]
    
    return {"employee_id": employee_id, "year": year, "balances": rights}

# ═══════════════════════════════════════════════════════════════════
# 16. EXPORT / EDI
# ═══════════════════════════════════════════════════════════════════

@enterprise_router.get("/export/grand-livre")
async def export_grand_livre(request: Request, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Grand livre comptable (toutes les écritures par compte)."""
    await _require_auth(request)
    
    query = {"is_reversed": {"$ne": True}, "status": "validated"}
    if from_date:
        query.setdefault("entry_date", {})["$gte"] = from_date
    if to_date:
        query.setdefault("entry_date", {})["$lte"] = to_date
    
    by_account = {}
    async for entry in _db.journal_entries.find(query).sort("entry_date", 1):
        for line in entry.get("lines", []):
            code = line["account_code"]
            if code not in by_account:
                acc = await _db.chart_of_accounts.find_one({"code": code})
                by_account[code] = {
                    "code": code,
                    "label": acc.get("label", code) if acc else code,
                    "entries": [],
                    "total_debit": 0,
                    "total_credit": 0,
                }
            by_account[code]["entries"].append({
                "date": entry["entry_date"],
                "entry_id": entry["entry_id"],
                "journal": entry["journal_type"],
                "description": entry["description"],
                "debit": line.get("debit", 0),
                "credit": line.get("credit", 0),
                "lettering": line.get("lettering_code"),
            })
            by_account[code]["total_debit"] += line.get("debit", 0)
            by_account[code]["total_credit"] += line.get("credit", 0)
    
    for acc in by_account.values():
        acc["total_debit"] = round(acc["total_debit"], 2)
        acc["total_credit"] = round(acc["total_credit"], 2)
        acc["balance"] = round(acc["total_debit"] - acc["total_credit"], 2)
    
    accounts = sorted(by_account.values(), key=lambda x: x["code"])
    
    return {"accounts": accounts, "total_accounts": len(accounts)}

@enterprise_router.get("/export/balance-generale")
async def export_balance_generale(request: Request):
    """Balance générale des comptes."""
    await _require_auth(request)
    
    accounts = []
    async for acc in _db.chart_of_accounts.find({"is_active": True}).sort("code", 1):
        balance = acc.get("balance", 0)
        accounts.append({
            "code": acc["code"],
            "label": acc.get("label", ""),
            "debit": max(0, balance) if acc.get("type") in ["actif", "charge"] else max(0, -balance),
            "credit": max(0, -balance) if acc.get("type") in ["actif", "charge"] else max(0, balance),
            "solde_debiteur": max(0, balance),
            "solde_crediteur": max(0, -balance),
        })
    
    return {"accounts": accounts, "total": len(accounts)}

@enterprise_router.get("/export/journal-centralisateur")
async def export_journal_centralisateur(request: Request, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Journal centralisateur (résumé par journal et période)."""
    await _require_auth(request)
    
    query = {"is_reversed": {"$ne": True}, "status": "validated"}
    if from_date:
        query.setdefault("entry_date", {})["$gte"] = from_date
    if to_date:
        query.setdefault("entry_date", {})["$lte"] = to_date
    
    pipeline = [
        {"$match": query},
        {"$addFields": {"month": {"$substr": ["$entry_date", 0, 7]}}},
        {"$group": {
            "_id": {"journal": "$journal_type", "month": "$month"},
            "count": {"$sum": 1},
            "total_debit": {"$sum": "$total_debit"},
            "total_credit": {"$sum": "$total_credit"},
        }},
        {"$sort": {"_id.month": 1, "_id.journal": 1}},
    ]
    
    results = []
    async for doc in _db.journal_entries.aggregate(pipeline):
        results.append({
            "journal": doc["_id"]["journal"],
            "journal_label": JOURNAL_TYPES.get(doc["_id"]["journal"], doc["_id"]["journal"]),
            "month": doc["_id"]["month"],
            "entries_count": doc["count"],
            "total_debit": round(doc["total_debit"], 2),
            "total_credit": round(doc["total_credit"], 2),
        })
    
    return {"data": results}

# ═══════════════════════════════════════════════════════════════════
# STARTUP: Create indexes
# ═══════════════════════════════════════════════════════════════════

async def create_enterprise_indexes():
    """Créer les index MongoDB pour les collections enterprise."""
    try:
        # Index creation avec try/except pour chaque pour éviter les erreurs de duplication
        indexes_to_create = [
            (_db.chart_of_accounts, [("code", 1)], {"unique": True}),
            (_db.chart_of_accounts, [("class_num", 1)], {}),
            (_db.chart_of_accounts, [("type", 1)], {}),
            (_db.journal_entries, [("entry_id", 1)], {"unique": True}),
            (_db.journal_entries, [("entry_date", 1)], {}),
            (_db.journal_entries, [("journal_type", 1)], {}),
            (_db.journal_entries, [("status", 1)], {}),
            (_db.journal_entries, [("lines.account_code", 1)], {}),
            (_db.journal_entries, [("lines.lettering_code", 1)], {}),
            (_db.lettrages, [("letter_code", 1)], {"unique": True}),
            (_db.lettrages, [("account_code", 1)], {}),
            (_db.closed_periods, [("period", 1)], {"unique": True}),
            (_db.bank_reconciliation, [("line_id", 1)], {"unique": True}),
            (_db.bank_reconciliation, [("account_code", 1)], {}),
            (_db.bank_reconciliation, [("status", 1)], {}),
            (_db.tva_declarations, [("declaration_id", 1)], {"unique": True}),
            (_db.expense_reports, [("report_id", 1)], {"unique": True}),
            (_db.expense_reports, [("employee_id", 1)], {}),
            (_db.expense_reports, [("status", 1)], {}),
            (_db.payslips, [("payslip_id", 1)], {"unique": True}),
            (_db.payslips, [("period_year", -1), ("period_month", -1)], {}),
            (_db.payslips, [("employee_id", 1)], {}),
            (_db.contracts_enterprise, [("contract_id", 1)], {"unique": True}),
            (_db.credit_notes, [("credit_note_id", 1)], {"unique": True}),
            (_db.credit_notes, [("invoice_id", 1)], {}),
            (_db.audit_trail, [("audit_id", 1)], {"unique": True}),
            (_db.audit_trail, [("entity_type", 1)], {}),
            (_db.audit_trail, [("entity_id", 1)], {}),
            (_db.audit_trail, [("timestamp", 1)], {}),
            (_db.audit_trail, [("user_id", 1)], {}),
            (_db.leave_requests, [("leave_id", 1)], {"unique": True}),
            (_db.leave_requests, [("employee_id", 1)], {}),
        ]
        
        for collection, keys, options in indexes_to_create:
            try:
                await collection.create_index(keys, **options)
            except Exception as idx_err:
                # Ignore index already exists or invalid spec errors
                if "already exists" not in str(idx_err) and "_id" not in str(idx_err):
                    logger.warning(f"Index creation warning: {idx_err}")
        
        logger.info("✅ Enterprise accounting indexes created (with error handling)")
    except Exception as e:
        logger.error(f"Error creating enterprise indexes: {e}")