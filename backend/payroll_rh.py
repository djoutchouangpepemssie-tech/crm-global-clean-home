"""
Global Clean Home CRM — Module Paie & RH ERP
=============================================
Gestion intégrée dans l'onglet Comptabilité :
- Intervenants RH (employees)
- Contrats RH
- Fiches de Paie (simplifiées, connectées ERP)
- Notes de Frais (avec validation + remboursement)

Toutes les actions génèrent des écritures comptables automatiques.
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from io import BytesIO
import os
import uuid
import logging
import math

# ReportLab for PDF
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

payroll_rh_router = APIRouter(prefix="/api/payroll-rh", tags=["payroll-rh"])

# ── Auth ──
async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


async def _log_activity(user_id, action, entity_type, entity_id, details=None):
    try:
        from server import log_activity
        await log_activity(user_id, action, entity_type, entity_id, details)
    except Exception:
        pass


async def _create_erp_journal_entry(journal_type, reference_type, reference_id, entries, description, user_id=None):
    """Create ERP journal entry for accounting integration."""
    try:
        from accounting_erp import create_journal_entry
        return await create_journal_entry(journal_type, reference_type, reference_id, entries, description, user_id=user_id)
    except Exception as e:
        logger.warning(f"Could not create journal entry: {e}")
        return None


# ═══════════════════════════════════════════════════════
# INDEXES
# ═══════════════════════════════════════════════════════

async def init_payroll_rh_indexes():
    """Create MongoDB indexes for payroll-rh collections."""
    try:
        await _db.rh_employees.create_index("employee_id", unique=True)
        await _db.rh_employees.create_index("email")
        await _db.rh_employees.create_index("status")
        await _db.rh_contracts.create_index("contract_id", unique=True)
        await _db.rh_contracts.create_index("employee_id")
        await _db.rh_contracts.create_index("status")
        await _db.rh_payslips.create_index("payslip_id", unique=True)
        await _db.rh_payslips.create_index([("employee_id", 1), ("period_year", -1), ("period_month", -1)])
        await _db.rh_expense_reports.create_index("report_id", unique=True)
        await _db.rh_expense_reports.create_index("employee_id")
        await _db.rh_expense_reports.create_index("status")
        logger.info("✅ Payroll RH indexes created")
    except Exception as e:
        logger.warning(f"Payroll RH indexes: {e}")


# ═══════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════

class EmployeeCreate(BaseModel):
    full_name: str
    email: str = ""
    phone: str = ""
    address: str = ""
    numero_secu: str = ""
    function: str = ""
    base_salary: float = 0
    hire_date: str = ""
    leave_date: str = ""
    notes: str = ""
    status: str = "active"  # active | suspended | left


class ContractCreate(BaseModel):
    employee_id: str
    contract_type: str = "CDI"  # CDI | CDD | Prestataire | Stage
    function: str = ""
    salary_brut: float = 0
    start_date: str = ""
    end_date: str = ""
    hours_per_week: float = 35
    special_clauses: str = ""


class PayslipCreate(BaseModel):
    employee_id: str
    period_month: int
    period_year: int
    salary_brut_override: Optional[float] = None  # Override from contract
    notes: str = ""


class ExpenseReportCreate(BaseModel):
    employee_id: str
    period_start: str = ""
    period_end: str = ""
    items: List[Dict[str, Any]] = []
    notes: str = ""


class ExpenseItemModel(BaseModel):
    date: str = ""
    category: str = "other"  # transport | lodging | meals | other
    description: str = ""
    amount_ht: float = 0
    tva_rate: float = 20
    amount_tva: float = 0
    amount_ttc: float = 0


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════

def compute_payslip_amounts(salary_brut: float) -> dict:
    """
    Calcul bulletin de paie conforme droit français 2024.
    Source : URSSAF, taux en vigueur au 01/01/2024.
    """
    # ── Cotisations salariales ──
    # Sécurité sociale maladie : 0% (pris en charge par patronal)
    css_maladie_sal = 0.0

    # Retraite complémentaire AGIRC-ARRCO T1 (jusqu'à 1 PASS = 3864€/mois)
    pass_mensuel = 3864.0
    t1 = min(salary_brut, pass_mensuel)
    t2 = max(0, salary_brut - pass_mensuel)
    retraite_comp_sal = round(t1 * 0.0315 + t2 * 0.0864, 2)

    # Assurance vieillesse plafonnée (T1)
    vieillesse_plafonnee = round(t1 * 0.0690, 2)
    # Assurance vieillesse déplafonnée
    vieillesse_deplafonnee = round(salary_brut * 0.0040, 2)

    # Chômage (salarié exonéré depuis 2019 en France métropolitaine)
    chomage_sal = 0.0

    # CSG déductible 6.80%
    base_csg = round(salary_brut * 0.9825, 2)  # assiette CSG = 98.25% du brut
    csg_deductible = round(base_csg * 0.0680, 2)

    # CSG non déductible 2.40%
    csg_non_deductible = round(base_csg * 0.0240, 2)

    # CRDS 0.50%
    crds = round(base_csg * 0.0050, 2)

    # Prévoyance (estimation 0.70% selon convention collective)
    prevoyance_sal = round(salary_brut * 0.0070, 2)

    # Total cotisations salariales
    total_cotisations_sal = round(
        retraite_comp_sal + vieillesse_plafonnee + vieillesse_deplafonnee +
        csg_deductible + csg_non_deductible + crds + prevoyance_sal, 2
    )

    # ── Salaire net avant impôt ──
    net_avant_impot = round(salary_brut - total_cotisations_sal, 2)

    # ── Prélèvement à la source (estimation taux moyen 11%) ──
    pas = round(net_avant_impot * 0.11, 2)

    # ── Salaire net à payer ──
    salary_net = round(net_avant_impot - pas, 2)

    # ── Cotisations patronales (informatives) ──
    patronal_maladie = round(salary_brut * 0.1300, 2)
    patronal_vieillesse = round(salary_brut * 0.0845, 2)
    patronal_retraite_comp = round(t1 * 0.0486 + t2 * 0.1288, 2)
    patronal_chomage = round(salary_brut * 0.0405, 2)
    patronal_accidents = round(salary_brut * 0.0230, 2)
    patronal_famille = round(salary_brut * 0.0525, 2)
    patronal_fnal = round(salary_brut * 0.0010, 2)
    total_patronal = round(
        patronal_maladie + patronal_vieillesse + patronal_retraite_comp +
        patronal_chomage + patronal_accidents + patronal_famille + patronal_fnal, 2
    )

    cout_total_employeur = round(salary_brut + total_patronal, 2)

    return {
        "salary_brut": salary_brut,
        # Cotisations salariales détaillées
        "retraite_comp_sal": retraite_comp_sal,
        "vieillesse_plafonnee": vieillesse_plafonnee,
        "vieillesse_deplafonnee": vieillesse_deplafonnee,
        "csg_deductible": csg_deductible,
        "csg_non_deductible": csg_non_deductible,
        "crds": crds,
        "prevoyance_sal": prevoyance_sal,
        "total_cotisations_sal": total_cotisations_sal,
        # Net
        "net_avant_impot": net_avant_impot,
        "pas": pas,
        "salary_net": salary_net,
        # Patronal
        "total_patronal": total_patronal,
        "cout_total_employeur": cout_total_employeur,
        # Legacy compat
        "social_charges": total_cotisations_sal,
        "tax_estimation": pas,
    }


def compute_expense_totals(items: list) -> dict:
    """Compute expense report totals from line items."""
    total_ht = 0
    total_tva = 0
    total_ttc = 0
    computed_items = []
    for item in items:
        amt_ht = float(item.get("amount_ht", 0))
        tva_rate = float(item.get("tva_rate", 20))
        amt_tva = round(amt_ht * tva_rate / 100, 2)
        amt_ttc = round(amt_ht + amt_tva, 2)
        total_ht += amt_ht
        total_tva += amt_tva
        total_ttc += amt_ttc
        computed_items.append({
            **item,
            "amount_ht": amt_ht,
            "tva_rate": tva_rate,
            "amount_tva": amt_tva,
            "amount_ttc": amt_ttc,
        })
    return {
        "items": computed_items,
        "total_ht": round(total_ht, 2),
        "total_tva": round(total_tva, 2),
        "total_ttc": round(total_ttc, 2),
    }


MONTHS_FR = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
}


# ═══════════════════════════════════════════════════════
# 1. INTERVENANTS RH (Employees)
# ═══════════════════════════════════════════════════════

@payroll_rh_router.post("/employees")
async def create_employee(inp: EmployeeCreate, request: Request):
    user = await _require_auth(request)
    emp_id = f"emp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "employee_id": emp_id,
        "full_name": inp.full_name,
        "email": inp.email,
        "phone": inp.phone,
        "address": inp.address,
        "numero_secu": inp.numero_secu,
        "function": inp.function,
        "base_salary": inp.base_salary,
        "hire_date": inp.hire_date,
        "leave_date": inp.leave_date,
        "active_contract_id": None,
        "notes": inp.notes,
        "status": inp.status,
        "created_at": now,
        "updated_at": now,
    }
    await _db.rh_employees.insert_one(doc)
    await _log_activity(user.get("user_id", "system"), "create", "rh_employee", emp_id, {"name": inp.full_name})
    return {"employee_id": emp_id, "message": "Intervenant créé"}


@payroll_rh_router.get("/employees")
async def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    await _require_auth(request)
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"function": {"$regex": search, "$options": "i"}},
        ]
    total = await _db.rh_employees.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    docs = await _db.rh_employees.find(query, {"_id": 0}).sort("full_name", 1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"employees": docs, "total": total, "page": page, "pages": pages}


@payroll_rh_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_employees.find_one({"employee_id": employee_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Intervenant introuvable")
    
    # Get active contract
    contract = await _db.rh_contracts.find_one(
        {"employee_id": employee_id, "status": "active"}, {"_id": 0}
    )
    
    # Get recent payslips (last 3)
    payslips = await _db.rh_payslips.find(
        {"employee_id": employee_id}, {"_id": 0}
    ).sort([("period_year", -1), ("period_month", -1)]).limit(3).to_list(3)
    
    # Get recent expense reports (last 3)
    expenses = await _db.rh_expense_reports.find(
        {"employee_id": employee_id}, {"_id": 0}
    ).sort("created_at", -1).limit(3).to_list(3)
    
    return {
        **doc,
        "active_contract": contract,
        "recent_payslips": payslips,
        "recent_expenses": expenses,
    }


@payroll_rh_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, inp: EmployeeCreate, request: Request):
    user = await _require_auth(request)
    existing = await _db.rh_employees.find_one({"employee_id": employee_id})
    if not existing:
        raise HTTPException(404, "Intervenant introuvable")
    
    updates = {
        "full_name": inp.full_name,
        "email": inp.email,
        "phone": inp.phone,
        "address": inp.address,
        "numero_secu": inp.numero_secu,
        "function": inp.function,
        "base_salary": inp.base_salary,
        "hire_date": inp.hire_date,
        "leave_date": inp.leave_date,
        "notes": inp.notes,
        "status": inp.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.rh_employees.update_one({"employee_id": employee_id}, {"$set": updates})
    await _log_activity(user.get("user_id", "system"), "update", "rh_employee", employee_id)
    return {"message": "Intervenant mis à jour"}


@payroll_rh_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, request: Request):
    """Soft delete — set status to 'left'."""
    user = await _require_auth(request)
    existing = await _db.rh_employees.find_one({"employee_id": employee_id})
    if not existing:
        raise HTTPException(404, "Intervenant introuvable")
    await _db.rh_employees.update_one(
        {"employee_id": employee_id},
        {"$set": {"status": "left", "leave_date": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Intervenant désactivé"}


# ═══════════════════════════════════════════════════════
# 2. CONTRATS RH
# ═══════════════════════════════════════════════════════

@payroll_rh_router.post("/contracts")
async def create_contract(inp: ContractCreate, request: Request):
    user = await _require_auth(request)
    
    # Verify employee exists
    emp = await _db.rh_employees.find_one({"employee_id": inp.employee_id})
    if not emp:
        raise HTTPException(404, "Intervenant introuvable")
    
    contract_id = f"ctr_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "contract_id": contract_id,
        "employee_id": inp.employee_id,
        "employee_name": emp.get("full_name", ""),
        "contract_type": inp.contract_type,
        "function": inp.function,
        "salary_brut": inp.salary_brut,
        "start_date": inp.start_date,
        "end_date": inp.end_date,
        "hours_per_week": inp.hours_per_week,
        "special_clauses": inp.special_clauses,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await _db.rh_contracts.insert_one(doc)
    
    # Update employee with active contract and salary
    await _db.rh_employees.update_one(
        {"employee_id": inp.employee_id},
        {"$set": {
            "active_contract_id": contract_id,
            "base_salary": inp.salary_brut,
            "function": inp.function or emp.get("function", ""),
            "updated_at": now,
        }}
    )
    
    await _log_activity(user.get("user_id", "system"), "create", "rh_contract", contract_id)
    return {"contract_id": contract_id, "message": "Contrat créé"}


@payroll_rh_router.get("/contracts")
async def list_contracts(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
):
    await _require_auth(request)
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    total = await _db.rh_contracts.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    docs = await _db.rh_contracts.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"contracts": docs, "total": total, "page": page, "pages": pages}


@payroll_rh_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Contrat introuvable")
    return doc


@payroll_rh_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, inp: ContractCreate, request: Request):
    user = await _require_auth(request)
    existing = await _db.rh_contracts.find_one({"contract_id": contract_id})
    if not existing:
        raise HTTPException(404, "Contrat introuvable")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "contract_type": inp.contract_type,
        "function": inp.function,
        "salary_brut": inp.salary_brut,
        "start_date": inp.start_date,
        "end_date": inp.end_date,
        "hours_per_week": inp.hours_per_week,
        "special_clauses": inp.special_clauses,
        "updated_at": now,
    }
    await _db.rh_contracts.update_one({"contract_id": contract_id}, {"$set": updates})
    
    # Update employee salary if this is active contract
    emp = await _db.rh_employees.find_one({"employee_id": existing["employee_id"]})
    if emp and emp.get("active_contract_id") == contract_id:
        await _db.rh_employees.update_one(
            {"employee_id": existing["employee_id"]},
            {"$set": {"base_salary": inp.salary_brut, "updated_at": now}}
        )
    
    await _log_activity(user.get("user_id", "system"), "update", "rh_contract", contract_id)
    return {"message": "Contrat mis à jour"}


@payroll_rh_router.post("/contracts/{contract_id}/terminate")
async def terminate_contract(contract_id: str, request: Request):
    user = await _require_auth(request)
    existing = await _db.rh_contracts.find_one({"contract_id": contract_id})
    if not existing:
        raise HTTPException(404, "Contrat introuvable")
    
    now = datetime.now(timezone.utc).isoformat()
    await _db.rh_contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {"status": "terminated", "end_date": now, "updated_at": now}}
    )
    return {"message": "Contrat terminé"}


@payroll_rh_router.post("/contracts/{contract_id}/extend")
async def extend_contract(contract_id: str, request: Request):
    """Extend CDD contract by body.end_date."""
    user = await _require_auth(request)
    body = await request.json()
    existing = await _db.rh_contracts.find_one({"contract_id": contract_id})
    if not existing:
        raise HTTPException(404, "Contrat introuvable")
    
    new_end = body.get("end_date", "")
    if not new_end:
        raise HTTPException(400, "Date de fin requise")
    
    now = datetime.now(timezone.utc).isoformat()
    await _db.rh_contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {"end_date": new_end, "status": "active", "updated_at": now}}
    )
    return {"message": "Contrat prolongé"}


# ═══════════════════════════════════════════════════════
# 3. FICHES DE PAIE
# ═══════════════════════════════════════════════════════

@payroll_rh_router.post("/payslips")
async def create_payslip(inp: PayslipCreate, request: Request):
    user = await _require_auth(request)
    user_id = user.get("user_id", "system")
    
    # Get employee
    emp = await _db.rh_employees.find_one({"employee_id": inp.employee_id})
    if not emp:
        raise HTTPException(404, "Intervenant introuvable")
    
    # Check for duplicate
    existing = await _db.rh_payslips.find_one({
        "employee_id": inp.employee_id,
        "period_month": inp.period_month,
        "period_year": inp.period_year,
    })
    if existing:
        raise HTTPException(400, f"Fiche de paie déjà existante pour {MONTHS_FR.get(inp.period_month)} {inp.period_year}")
    
    # Get salary from contract or override
    salary_brut = inp.salary_brut_override
    contract = None
    if emp.get("active_contract_id"):
        contract = await _db.rh_contracts.find_one({"contract_id": emp["active_contract_id"]}, {"_id": 0})
    
    if not salary_brut or salary_brut <= 0:
        if contract:
            salary_brut = contract.get("salary_brut", 0)
        else:
            salary_brut = emp.get("base_salary", 0)
    
    if salary_brut <= 0:
        raise HTTPException(400, "Salaire brut non défini — créez d'abord un contrat")
    
    # Compute
    amounts = compute_payslip_amounts(salary_brut)
    
    payslip_id = f"pay_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "payslip_id": payslip_id,
        "employee_id": inp.employee_id,
        "employee_name": emp.get("full_name", ""),
        "contract_id": emp.get("active_contract_id", ""),
        "contract_type": contract.get("contract_type", "") if contract else "",
        "function": emp.get("function", ""),
        "period_month": inp.period_month,
        "period_year": inp.period_year,
        **amounts,
        "status": "pending",
        "payment_date": None,
        "notes": inp.notes,
        "journal_entry_id": None,
        "payment_journal_entry_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await _db.rh_payslips.insert_one(doc)
    
    # AUTO: Create journal entry 621 Salaires (D) / 421 Dettes salaires (C)
    journal_id = await _create_erp_journal_entry(
        journal_type="achats",
        reference_type="payslip_rh",
        reference_id=payslip_id,
        entries=[
            {"account_number": "621", "account_label": f"Salaires - {emp['full_name']}", "debit": salary_brut, "credit": 0},
            {"account_number": "421", "account_label": f"Dettes salaires - {emp['full_name']}", "debit": 0, "credit": salary_brut},
        ],
        description=f"Fiche de paie {emp['full_name']} - {MONTHS_FR.get(inp.period_month)} {inp.period_year}",
        user_id=user_id,
    )
    if journal_id:
        await _db.rh_payslips.update_one({"payslip_id": payslip_id}, {"$set": {"journal_entry_id": journal_id}})
    
    await _log_activity(user_id, "create", "rh_payslip", payslip_id, {
        "employee": emp["full_name"], "brut": salary_brut, "net": amounts["salary_net"]
    })
    
    return {"payslip_id": payslip_id, **amounts, "journal_entry_id": journal_id}


@payroll_rh_router.get("/payslips")
async def list_payslips(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
):
    await _require_auth(request)
    query: dict = {}
    if employee_id:
        query["employee_id"] = employee_id
    if status and status != "all":
        query["status"] = status
    if year:
        query["period_year"] = year
    if month:
        query["period_month"] = month
    
    total = await _db.rh_payslips.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    docs = await _db.rh_payslips.find(query, {"_id": 0}).sort(
        [("period_year", -1), ("period_month", -1)]
    ).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    # Stats
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_brut": {"$sum": "$salary_brut"},
            "total_net": {"$sum": "$salary_net"},
            "total_charges": {"$sum": "$social_charges"},
            "count": {"$sum": 1},
        }}
    ]
    stats_result = await _db.rh_payslips.aggregate(pipeline).to_list(1)
    stats = stats_result[0] if stats_result else {"total_brut": 0, "total_net": 0, "total_charges": 0, "count": 0}
    stats.pop("_id", None)
    
    return {"payslips": docs, "total": total, "page": page, "pages": pages, "stats": stats}


@payroll_rh_router.get("/payslips/{payslip_id}")
async def get_payslip(payslip_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_payslips.find_one({"payslip_id": payslip_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fiche de paie introuvable")
    return doc


@payroll_rh_router.post("/payslips/{payslip_id}/record-payment")
async def record_payslip_payment(payslip_id: str, request: Request):
    """Mark payslip as paid + create bank journal entry."""
    user = await _require_auth(request)
    user_id = user.get("user_id", "system")
    
    doc = await _db.rh_payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Fiche de paie introuvable")
    if doc.get("status") == "paid":
        raise HTTPException(400, "Déjà payée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Journal entry: 421 Dettes salaires (D) / 512 Banque (C) = net amount
    journal_id = await _create_erp_journal_entry(
        journal_type="banque",
        reference_type="payslip_payment_rh",
        reference_id=payslip_id,
        entries=[
            {"account_number": "421", "account_label": f"Dettes salaires - {doc['employee_name']}", "debit": doc["salary_net"], "credit": 0},
            {"account_number": "512", "account_label": "Banque", "debit": 0, "credit": doc["salary_net"]},
        ],
        description=f"Paiement salaire {doc['employee_name']} - {MONTHS_FR.get(doc['period_month'])} {doc['period_year']}",
        user_id=user_id,
    )
    
    await _db.rh_payslips.update_one(
        {"payslip_id": payslip_id},
        {"$set": {"status": "paid", "payment_date": now, "payment_journal_entry_id": journal_id, "updated_at": now}}
    )
    
    await _log_activity(user_id, "payment", "rh_payslip", payslip_id, {"net": doc["salary_net"]})
    return {"message": "Paiement enregistré", "journal_entry_id": journal_id}


@payroll_rh_router.delete("/payslips/{payslip_id}")
async def delete_payslip(payslip_id: str, request: Request):
    user = await _require_auth(request)
    doc = await _db.rh_payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Fiche de paie introuvable")
    if doc.get("status") == "paid":
        raise HTTPException(400, "Impossible de supprimer une fiche payée")
    await _db.rh_payslips.delete_one({"payslip_id": payslip_id})
    return {"message": "Fiche de paie supprimée"}


# ── PDF Fiche de Paie ──

@payroll_rh_router.get("/payslips/{payslip_id}/pdf")
async def get_payslip_pdf(payslip_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_payslips.find_one({"payslip_id": payslip_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fiche de paie introuvable")
    
    # Get employee details
    emp = await _db.rh_employees.find_one({"employee_id": doc["employee_id"]}, {"_id": 0})
    
    buf = BytesIO()
    pdf = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('PayTitle', parent=styles['Heading1'], fontSize=16, textColor=HexColor('#1a1a2e'), spaceAfter=6*mm)
    subtitle_style = ParagraphStyle('PaySub', parent=styles['Normal'], fontSize=10, textColor=HexColor('#555555'), spaceAfter=3*mm)
    
    elements = []
    
    # Header
    elements.append(Paragraph("BULLETIN DE PAIE", title_style))
    elements.append(Paragraph("Global Clean Home", subtitle_style))
    elements.append(Spacer(1, 5*mm))
    
    # Employee info
    period_label = f"{MONTHS_FR.get(doc['period_month'], '?')} {doc['period_year']}"
    info_data = [
        ["Intervenant :", doc.get("employee_name", "—")],
        ["Fonction :", doc.get("function", "—")],
        ["Contrat :", doc.get("contract_type", "—")],
        ["Période :", period_label],
        ["N° Fiche :", payslip_id],
    ]
    if emp and emp.get("numero_secu"):
        info_data.append(["N° Sécu :", emp["numero_secu"][:3] + "****"])
    
    info_table = Table(info_data, colWidths=[120, 350])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#333333')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8*mm))
    
    fmt = lambda v: f"{v:,.2f} €".replace(",", " ").replace(".", ",")
    
    # ── Section cotisations salariales ──
    elements.append(Paragraph("<b>COTISATIONS ET CONTRIBUTIONS SOCIALES</b>", 
        ParagraphStyle('SectionTitle', parent=styles['Normal'], fontSize=9, 
        textColor=HexColor('#1e3a5f'), spaceBefore=4*mm, spaceAfter=2*mm)))
    
    cotis_data = [
        ["Désignation", "Base", "Taux salarié", "Montant salarié", "Taux patronal", "Montant patronal"],
        ["Retraite complémentaire (AGIRC-ARRCO)", fmt(doc["salary_brut"]), "3,15%", fmt(doc.get("retraite_comp_sal", 0)), "4,86%", fmt(doc.get("total_patronal", 0) * 0.20)],
        ["Assurance vieillesse (plafonnée)", fmt(min(doc["salary_brut"], 3864)), "6,90%", fmt(doc.get("vieillesse_plafonnee", 0)), "8,45%", fmt(doc.get("total_patronal", 0) * 0.22)],
        ["Assurance vieillesse (déplafonnée)", fmt(doc["salary_brut"]), "0,40%", fmt(doc.get("vieillesse_deplafonnee", 0)), "1,90%", ""],
        ["Maladie - Maternité - Invalidité", fmt(doc["salary_brut"]), "—", "0,00 €", "13,00%", fmt(doc.get("total_patronal", 0) * 0.35)],
        ["Allocations familiales", fmt(doc["salary_brut"]), "—", "0,00 €", "5,25%", fmt(doc.get("total_patronal", 0) * 0.14)],
        ["Accidents du travail", fmt(doc["salary_brut"]), "—", "0,00 €", "2,30%", fmt(doc.get("total_patronal", 0) * 0.06)],
        ["Assurance chômage", fmt(doc["salary_brut"]), "—", "0,00 €", "4,05%", fmt(doc.get("total_patronal", 0) * 0.11)],
        ["Prévoyance", fmt(doc["salary_brut"]), "0,70%", fmt(doc.get("prevoyance_sal", 0)), "—", "—"],
        ["CSG déductible", fmt(doc["salary_brut"]), "6,80%", fmt(doc.get("csg_deductible", 0)), "—", "—"],
        ["CSG non déductible", fmt(doc["salary_brut"]), "2,40%", fmt(doc.get("csg_non_deductible", 0)), "—", "—"],
        ["CRDS", fmt(doc["salary_brut"]), "0,50%", fmt(doc.get("crds", 0)), "—", "—"],
        ["", "", "", "", "", ""],
        ["TOTAL COTISATIONS", "", "", fmt(doc.get("total_cotisations_sal", doc.get("social_charges", 0))), "", fmt(doc.get("total_patronal", 0))],
    ]
    
    cotis_table = Table(cotis_data, colWidths=[130, 65, 60, 70, 65, 70])
    cotis_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.3, HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [HexColor('#f8fafc'), white]),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor('#e8f0fe')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(cotis_table)
    elements.append(Spacer(1, 6*mm))
    
    # ── Récapitulatif net ──
    elements.append(Paragraph("<b>RÉCAPITULATIF</b>", 
        ParagraphStyle('SectionTitle2', parent=styles['Normal'], fontSize=9, 
        textColor=HexColor('#1e3a5f'), spaceAfter=2*mm)))
    
    recap_data = [
        ["Salaire brut", fmt(doc["salary_brut"])],
        ["- Total cotisations salariales", f"- {fmt(doc.get('total_cotisations_sal', doc.get('social_charges', 0)))}"],
        ["= Net avant prélèvement à la source", fmt(doc.get("net_avant_impot", doc["salary_brut"] - doc.get("total_cotisations_sal", doc.get("social_charges", 0))))],
        ["- Prélèvement à la source (11%)", f"- {fmt(doc.get('pas', doc.get('tax_estimation', 0)))}"],
        ["NET À PAYER", fmt(doc["salary_net"])],
        ["", ""],
        ["Coût total employeur", fmt(doc.get("cout_total_employeur", doc["salary_brut"] + doc.get("total_patronal", 0)))],
    ]
    
    recap_table = Table(recap_data, colWidths=[350, 110])
    recap_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.3, HexColor('#dddddd')),
        ('BACKGROUND', (0, 4), (-1, 4), HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 4), (-1, 4), white),
        ('FONTNAME', (0, 4), (-1, 4), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 4), (-1, 4), 11),
        ('BACKGROUND', (0, 6), (-1, 6), HexColor('#fef3c7')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(recap_table)
    elements.append(Spacer(1, 10*mm))
    
    # Status
    status_text = "✅ PAYÉE" if doc["status"] == "paid" else "⏳ EN ATTENTE DE PAIEMENT"
    if doc.get("payment_date"):
        status_text += f" — Payée le {doc['payment_date'][:10]}"
    elements.append(Paragraph(f"<b>Statut :</b> {status_text}", styles['Normal']))
    elements.append(Spacer(1, 15*mm))
    
    # Footer
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=HexColor('#999999'), alignment=TA_CENTER)
    elements.append(Paragraph("Ce bulletin de paie est généré automatiquement par le système ERP Global Clean Home.", footer_style))
    elements.append(Paragraph(f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", footer_style))
    
    pdf.build(elements)
    buf.seek(0)
    
    filename = f"fiche_paie_{doc['employee_name'].replace(' ', '_')}_{doc['period_month']:02d}_{doc['period_year']}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@payroll_rh_router.post("/payslips/{payslip_id}/send-email")
async def send_payslip_email(payslip_id: str, request: Request):
    """Envoyer la fiche de paie par email à l'intervenant."""
    await _require_auth(request)
    doc = await _db.rh_payslips.find_one({"payslip_id": payslip_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fiche de paie introuvable")
    
    emp = await _db.rh_employees.find_one({"employee_id": doc["employee_id"]}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Intervenant introuvable")
    
    if not emp.get("email"):
        raise HTTPException(400, "L'intervenant n'a pas d'adresse email")
    
    # Générer le PDF
    from io import BytesIO
    buf = BytesIO()
    pdf_doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=2*cm, rightMargin=2*cm)
    
    # Réutiliser la même logique de génération PDF
    from fastapi.responses import StreamingResponse as SR
    import sys
    
    # Build PDF inline
    styles = getSampleStyleSheet()
    fmt = lambda v: f"{v:,.2f} €".replace(",", " ").replace(".", ",")
    elements = []
    
    title_style = ParagraphStyle('T', parent=styles['Heading1'], fontSize=14, textColor=HexColor('#1a1a2e'))
    elements.append(Paragraph("BULLETIN DE PAIE", title_style))
    elements.append(Paragraph(f"Global Clean Home — {MONTHS_FR.get(doc['period_month'])} {doc['period_year']}", styles['Normal']))
    elements.append(Spacer(1, 5*mm))
    
    info_data = [
        ["Intervenant :", doc.get("employee_name", "—")],
        ["Fonction :", doc.get("function", emp.get("function", "—"))],
        ["Contrat :", doc.get("contract_type", "—")],
        ["Période :", f"{MONTHS_FR.get(doc['period_month'])} {doc['period_year']}"],
        ["N° Fiche :", payslip_id],
    ]
    info_table = Table(info_data, colWidths=[120, 350])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))
    
    recap_data = [
        ["Désignation", "Montant"],
        ["Salaire brut", fmt(doc["salary_brut"])],
        ["Cotisations salariales", f"- {fmt(doc.get('total_cotisations_sal', doc.get('social_charges', 0)))}"],
        ["Net avant PAS", fmt(doc.get("net_avant_impot", 0))],
        ["Prélèvement à la source", f"- {fmt(doc.get('pas', doc.get('tax_estimation', 0)))}"],
        ["NET À PAYER", fmt(doc["salary_net"])],
    ]
    t = Table(recap_data, colWidths=[300, 170])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, -1), (-1, -1), white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 10*mm))
    footer = ParagraphStyle('F', parent=styles['Normal'], fontSize=7, textColor=HexColor('#999999'), alignment=TA_CENTER)
    elements.append(Paragraph(f"Document généré le {datetime.now().strftime('%d/%m/%Y')} — Global Clean Home, 231 rue Saint-Honoré, 75001 Paris", footer))
    
    pdf_doc.build(elements)
    buf.seek(0)
    pdf_bytes = buf.read()
    
    # Envoyer par email via SendGrid
    try:
        from email_service import send_email
        period_label = f"{MONTHS_FR.get(doc['period_month'])} {doc['period_year']}"
        filename = f"bulletin_paie_{doc['employee_name'].replace(' ', '_')}_{doc['period_month']:02d}_{doc['period_year']}.pdf"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Global Clean Home</h1>
                <p style="color: #93c5fd; margin: 4px 0 0;">Bulletin de paie — {period_label}</p>
            </div>
            <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0;">
                <p>Bonjour <strong>{doc.get('employee_name', '')}</strong>,</p>
                <p>Veuillez trouver ci-joint votre bulletin de paie pour la période de <strong>{period_label}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #1e3a5f; color: white;">
                        <th style="padding: 10px; text-align: left;">Rubrique</th>
                        <th style="padding: 10px; text-align: right;">Montant</th>
                    </tr>
                    <tr style="background: white;">
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">Salaire brut</td>
                        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">{doc['salary_brut']:.2f} €</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">Cotisations salariales</td>
                        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">- {doc.get('total_cotisations_sal', doc.get('social_charges', 0)):.2f} €</td>
                    </tr>
                    <tr style="background: #1e3a5f; color: white; font-weight: bold; font-size: 16px;">
                        <td style="padding: 10px;">NET À PAYER</td>
                        <td style="padding: 10px; text-align: right;">{doc['salary_net']:.2f} €</td>
                    </tr>
                </table>
                <p style="font-size: 12px; color: #64748b;">Ce bulletin de paie est généré automatiquement. Pour toute question, contactez votre responsable.</p>
            </div>
            <div style="padding: 16px; text-align: center; background: #f1f5f9; border-radius: 0 0 8px 8px;">
                <p style="font-size: 11px; color: #94a3b8; margin: 0;">Global Clean Home — 231 rue Saint-Honoré, 75001 Paris</p>
            </div>
        </div>
        """
        
        success = send_email(
            to=emp["email"],
            subject=f"Bulletin de paie — {period_label} — Global Clean Home",
            html_content=html_content,
            attachment_data=pdf_bytes,
            attachment_name=filename,
        )
        
        if success:
            await _db.rh_payslips.update_one(
                {"payslip_id": payslip_id},
                {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "message": f"Bulletin envoyé à {emp['email']}"}
        else:
            raise HTTPException(500, "Erreur envoi email — vérifiez la configuration SendGrid")
    except ImportError:
        raise HTTPException(500, "Service email non configuré")

# ═══════════════════════════════════════════════════════
# 4. NOTES DE FRAIS
# ═══════════════════════════════════════════════════════

@payroll_rh_router.post("/expense-reports")
async def create_expense_report(inp: ExpenseReportCreate, request: Request):
    user = await _require_auth(request)
    
    emp = await _db.rh_employees.find_one({"employee_id": inp.employee_id})
    if not emp:
        raise HTTPException(404, "Intervenant introuvable")
    
    # Compute totals
    computed = compute_expense_totals(inp.items)
    
    report_id = f"exp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "report_id": report_id,
        "employee_id": inp.employee_id,
        "employee_name": emp.get("full_name", ""),
        "period_start": inp.period_start,
        "period_end": inp.period_end,
        "items": computed["items"],
        "total_ht": computed["total_ht"],
        "total_tva": computed["total_tva"],
        "total_ttc": computed["total_ttc"],
        "status": "pending",
        "rejection_reason": "",
        "reimbursement_date": None,
        "journal_entry_id": None,
        "reimbursement_journal_id": None,
        "notes": inp.notes,
        "created_at": now,
        "updated_at": now,
    }
    await _db.rh_expense_reports.insert_one(doc)
    
    await _log_activity(user.get("user_id", "system"), "create", "rh_expense_report", report_id, {
        "employee": emp["full_name"], "total_ttc": computed["total_ttc"]
    })
    return {"report_id": report_id, **computed}


@payroll_rh_router.get("/expense-reports")
async def list_expense_reports(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
):
    await _require_auth(request)
    query: dict = {}
    if employee_id:
        query["employee_id"] = employee_id
    if status and status != "all":
        query["status"] = status
    
    total = await _db.rh_expense_reports.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    docs = await _db.rh_expense_reports.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"reports": docs, "total": total, "page": page, "pages": pages}


@payroll_rh_router.get("/expense-reports/{report_id}")
async def get_expense_report(report_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_expense_reports.find_one({"report_id": report_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Note de frais introuvable")
    return doc


@payroll_rh_router.put("/expense-reports/{report_id}")
async def update_expense_report(report_id: str, inp: ExpenseReportCreate, request: Request):
    user = await _require_auth(request)
    existing = await _db.rh_expense_reports.find_one({"report_id": report_id})
    if not existing:
        raise HTTPException(404, "Note de frais introuvable")
    if existing.get("status") not in ("pending", None):
        raise HTTPException(400, "Note de frais déjà traitée")
    
    computed = compute_expense_totals(inp.items)
    now = datetime.now(timezone.utc).isoformat()
    
    await _db.rh_expense_reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "period_start": inp.period_start,
            "period_end": inp.period_end,
            "items": computed["items"],
            "total_ht": computed["total_ht"],
            "total_tva": computed["total_tva"],
            "total_ttc": computed["total_ttc"],
            "notes": inp.notes,
            "updated_at": now,
        }}
    )
    return {"message": "Note de frais mise à jour", **computed}


@payroll_rh_router.post("/expense-reports/{report_id}/validate")
async def validate_expense_report(report_id: str, request: Request):
    """Validate expense report → journal entry."""
    user = await _require_auth(request)
    user_id = user.get("user_id", "system")
    
    doc = await _db.rh_expense_reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(404, "Note de frais introuvable")
    if doc.get("status") != "pending":
        raise HTTPException(400, f"Statut actuel: {doc.get('status')} — validation impossible")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Journal entry: 625/628 Dépenses (D) + 445 TVA déductible (D) / 421 Dettes salaires (C)
    entries = []
    if doc["total_ht"] > 0:
        entries.append({"account_number": "625", "account_label": f"Frais remboursables - {doc['employee_name']}", "debit": doc["total_ht"], "credit": 0})
    if doc["total_tva"] > 0:
        entries.append({"account_number": "445", "account_label": "TVA déductible (notes de frais)", "debit": doc["total_tva"], "credit": 0})
    entries.append({"account_number": "421", "account_label": f"Dettes salaires (remb.) - {doc['employee_name']}", "debit": 0, "credit": doc["total_ttc"]})
    
    journal_id = await _create_erp_journal_entry(
        journal_type="achats",
        reference_type="expense_report_rh",
        reference_id=report_id,
        entries=entries,
        description=f"Note de frais validée - {doc['employee_name']}",
        user_id=user_id,
    )
    
    await _db.rh_expense_reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": "validated", "journal_entry_id": journal_id, "updated_at": now}}
    )
    
    await _log_activity(user_id, "validate", "rh_expense_report", report_id, {"total_ttc": doc["total_ttc"]})
    return {"message": "Note de frais validée", "journal_entry_id": journal_id}


@payroll_rh_router.post("/expense-reports/{report_id}/reject")
async def reject_expense_report(report_id: str, request: Request):
    user = await _require_auth(request)
    body = await request.json()
    reason = body.get("reason", "")
    
    doc = await _db.rh_expense_reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(404, "Note de frais introuvable")
    if doc.get("status") != "pending":
        raise HTTPException(400, "Statut incorrect")
    
    now = datetime.now(timezone.utc).isoformat()
    await _db.rh_expense_reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": "rejected", "rejection_reason": reason, "updated_at": now}}
    )
    return {"message": "Note de frais rejetée"}


@payroll_rh_router.post("/expense-reports/{report_id}/reimburse")
async def reimburse_expense_report(report_id: str, request: Request):
    """Record reimbursement → bank journal entry."""
    user = await _require_auth(request)
    user_id = user.get("user_id", "system")
    
    doc = await _db.rh_expense_reports.find_one({"report_id": report_id})
    if not doc:
        raise HTTPException(404, "Note de frais introuvable")
    if doc.get("status") != "validated":
        raise HTTPException(400, "Note de frais doit être validée avant remboursement")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Journal: 421 Dettes salaires (D) / 512 Banque (C)
    journal_id = await _create_erp_journal_entry(
        journal_type="banque",
        reference_type="expense_reimbursement_rh",
        reference_id=report_id,
        entries=[
            {"account_number": "421", "account_label": f"Remb. frais - {doc['employee_name']}", "debit": doc["total_ttc"], "credit": 0},
            {"account_number": "512", "account_label": "Banque", "debit": 0, "credit": doc["total_ttc"]},
        ],
        description=f"Remboursement note de frais - {doc['employee_name']}",
        user_id=user_id,
    )
    
    await _db.rh_expense_reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": "reimbursed", "reimbursement_date": now, "reimbursement_journal_id": journal_id, "updated_at": now}}
    )
    
    await _log_activity(user_id, "reimburse", "rh_expense_report", report_id, {"total_ttc": doc["total_ttc"]})
    return {"message": "Remboursement enregistré", "journal_entry_id": journal_id}


@payroll_rh_router.get("/expense-reports/{report_id}/pdf")
async def get_expense_report_pdf(report_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_expense_reports.find_one({"report_id": report_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Note de frais introuvable")
    
    buf = BytesIO()
    pdf_doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('ExpTitle', parent=styles['Heading1'], fontSize=16, textColor=HexColor('#1a1a2e'), spaceAfter=6*mm)
    elements = []
    
    elements.append(Paragraph("NOTE DE FRAIS", title_style))
    elements.append(Paragraph("Global Clean Home", styles['Normal']))
    elements.append(Spacer(1, 5*mm))
    
    # Info
    info_data = [
        ["Intervenant :", doc.get("employee_name", "—")],
        ["Période :", f"{doc.get('period_start', '?')} → {doc.get('period_end', '?')}"],
        ["N° Note :", report_id],
        ["Statut :", doc.get("status", "pending").upper()],
    ]
    info_table = Table(info_data, colWidths=[120, 350])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8*mm))
    
    # Items table
    fmt = lambda v: f"{v:,.2f} €".replace(",", " ").replace(".", ",")
    cat_labels = {"transport": "Transport", "lodging": "Hébergement", "meals": "Repas", "other": "Autres"}
    
    header = ["Date", "Catégorie", "Description", "HT", "TVA", "TTC"]
    rows = [header]
    for item in doc.get("items", []):
        rows.append([
            item.get("date", ""),
            cat_labels.get(item.get("category", ""), item.get("category", "")),
            item.get("description", ""),
            fmt(item.get("amount_ht", 0)),
            fmt(item.get("amount_tva", 0)),
            fmt(item.get("amount_ttc", 0)),
        ])
    rows.append(["", "", "TOTAUX", fmt(doc["total_ht"]), fmt(doc["total_tva"]), fmt(doc["total_ttc"])])
    
    items_table = Table(rows, colWidths=[60, 80, 130, 65, 65, 70])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (3, 0), (5, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor('#f0f7ff')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10*mm))
    
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=HexColor('#999999'), alignment=TA_CENTER)
    elements.append(Paragraph(f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", footer_style))
    
    pdf_doc.build(elements)
    buf.seek(0)
    
    filename = f"note_frais_{doc['employee_name'].replace(' ', '_')}_{report_id}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ═══════════════════════════════════════════════════════
# CONTRACT PDF
# ═══════════════════════════════════════════════════════

@payroll_rh_router.get("/contracts/{contract_id}/pdf")
async def get_contract_pdf(contract_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.rh_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Contrat introuvable")
    
    emp = await _db.rh_employees.find_one({"employee_id": doc["employee_id"]}, {"_id": 0})
    
    buf = BytesIO()
    pdf_doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('ConTitle', parent=styles['Heading1'], fontSize=18, textColor=HexColor('#1a1a2e'), spaceAfter=8*mm, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle('ConSub', parent=styles['Normal'], fontSize=11, textColor=HexColor('#333333'), spaceAfter=4*mm)
    body_style = ParagraphStyle('ConBody', parent=styles['Normal'], fontSize=10, textColor=HexColor('#444444'), spaceAfter=3*mm, leading=14)
    
    elements = []
    
    type_labels = {"CDI": "CONTRAT À DURÉE INDÉTERMINÉE", "CDD": "CONTRAT À DURÉE DÉTERMINÉE", "Prestataire": "CONTRAT DE PRESTATION", "Stage": "CONVENTION DE STAGE"}
    contract_title = type_labels.get(doc.get("contract_type", ""), f"CONTRAT {doc.get('contract_type', '').upper()}")
    
    elements.append(Paragraph(contract_title, title_style))
    elements.append(Spacer(1, 5*mm))
    
    elements.append(Paragraph("<b>ENTRE LES PARTIES</b>", subtitle_style))
    elements.append(Paragraph("<b>L'employeur :</b> Global Clean Home, ci-après dénommé « l'Employeur »", body_style))
    emp_name = emp.get("full_name", "—") if emp else doc.get("employee_name", "—")
    elements.append(Paragraph(f"<b>Le salarié :</b> {emp_name}, ci-après dénommé « le Salarié »", body_style))
    elements.append(Spacer(1, 5*mm))
    
    elements.append(Paragraph("<b>IL A ÉTÉ CONVENU CE QUI SUIT :</b>", subtitle_style))
    elements.append(Spacer(1, 3*mm))
    
    elements.append(Paragraph(f"<b>Article 1 — Fonction :</b> {doc.get('function', '—')}", body_style))
    elements.append(Paragraph(f"<b>Article 2 — Date de début :</b> {doc.get('start_date', '—')}", body_style))
    end_date = doc.get('end_date', '')
    if end_date:
        elements.append(Paragraph(f"<b>Article 3 — Date de fin :</b> {end_date}", body_style))
    else:
        elements.append(Paragraph("<b>Article 3 — Durée :</b> Indéterminée", body_style))
    
    fmt = lambda v: f"{v:,.2f} €".replace(",", " ").replace(".", ",")
    elements.append(Paragraph(f"<b>Article 4 — Rémunération :</b> {fmt(doc.get('salary_brut', 0))} brut mensuel", body_style))
    elements.append(Paragraph(f"<b>Article 5 — Durée du travail :</b> {doc.get('hours_per_week', 35)} heures/semaine", body_style))
    
    if doc.get("special_clauses"):
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph("<b>Clauses particulières :</b>", subtitle_style))
        elements.append(Paragraph(doc["special_clauses"], body_style))
    
    elements.append(Spacer(1, 20*mm))
    
    # Signatures
    sig_data = [
        ["L'Employeur", "Le Salarié"],
        ["", ""],
        ["________________________", "________________________"],
        ["Global Clean Home", emp_name],
    ]
    sig_table = Table(sig_data, colWidths=[220, 220])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sig_table)
    
    elements.append(Spacer(1, 10*mm))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=HexColor('#999999'), alignment=TA_CENTER)
    elements.append(Paragraph(f"Contrat N° {contract_id} — Généré le {datetime.now().strftime('%d/%m/%Y')}", footer_style))
    
    pdf_doc.build(elements)
    buf.seek(0)
    
    filename = f"contrat_{emp_name.replace(' ', '_')}_{contract_id}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ═══════════════════════════════════════════════════════
# DASHBOARD STATS
# ═══════════════════════════════════════════════════════

@payroll_rh_router.get("/stats")
async def get_rh_stats(request: Request):
    """Global RH stats for dashboard."""
    await _require_auth(request)
    
    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month = now.month
    
    # Employees
    total_employees = await _db.rh_employees.count_documents({"status": "active"})
    
    # Contracts
    total_contracts = await _db.rh_contracts.count_documents({"status": "active"})
    
    # Payslips this month
    payslips_month = await _db.rh_payslips.count_documents({
        "period_year": current_year, "period_month": current_month
    })
    
    # Total payroll this year
    pipeline = [
        {"$match": {"period_year": current_year}},
        {"$group": {"_id": None, "total_brut": {"$sum": "$salary_brut"}, "total_net": {"$sum": "$salary_net"}, "total_charges": {"$sum": "$social_charges"}, "count": {"$sum": 1}}}
    ]
    payroll_stats = await _db.rh_payslips.aggregate(pipeline).to_list(1)
    ps = payroll_stats[0] if payroll_stats else {"total_brut": 0, "total_net": 0, "total_charges": 0, "count": 0}
    
    # Pending expense reports
    pending_expenses = await _db.rh_expense_reports.count_documents({"status": "pending"})
    
    # Total expense reports this year
    expense_pipeline = [
        {"$match": {"created_at": {"$gte": f"{current_year}-01-01"}}},
        {"$group": {"_id": None, "total_ttc": {"$sum": "$total_ttc"}, "count": {"$sum": 1}}}
    ]
    expense_stats = await _db.rh_expense_reports.aggregate(expense_pipeline).to_list(1)
    es = expense_stats[0] if expense_stats else {"total_ttc": 0, "count": 0}
    
    # Monthly payroll trend (last 6 months)
    trend_pipeline = [
        {"$match": {"period_year": {"$gte": current_year - 1}}},
        {"$group": {
            "_id": {"year": "$period_year", "month": "$period_month"},
            "total_brut": {"$sum": "$salary_brut"},
            "total_net": {"$sum": "$salary_net"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}},
        {"$limit": 6},
    ]
    trend = await _db.rh_payslips.aggregate(trend_pipeline).to_list(6)
    monthly_trend = [
        {
            "month": f"{MONTHS_FR.get(t['_id']['month'], '?')[:3]} {t['_id']['year']}",
            "brut": t["total_brut"],
            "net": t["total_net"],
            "count": t["count"],
        }
        for t in reversed(trend)
    ]
    
    return {
        "employees_active": total_employees,
        "contracts_active": total_contracts,
        "payslips_this_month": payslips_month,
        "payroll_year": {
            "total_brut": round(ps.get("total_brut", 0), 2),
            "total_net": round(ps.get("total_net", 0), 2),
            "total_charges": round(ps.get("total_charges", 0), 2),
            "count": ps.get("count", 0),
        },
        "pending_expenses": pending_expenses,
        "expenses_year": {
            "total_ttc": round(es.get("total_ttc", 0), 2),
            "count": es.get("count", 0),
        },
        "monthly_trend": monthly_trend,
    }
