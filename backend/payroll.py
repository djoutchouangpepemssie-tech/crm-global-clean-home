"""
Global Clean Home CRM — Module Paie Complet
Gestion des bulletins de paie, génération PDF, envoi email.
Normes françaises.
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from io import BytesIO
import os
import logging
import uuid
import math
import json

# ReportLab for PDF
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

payroll_router = APIRouter()


# ── Auth helper ──
async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


# ── Pydantic Models ──

class PrimeItem(BaseModel):
    label: str = ""
    amount: float = 0

class PayslipCreate(BaseModel):
    # Employee info
    employee_id: Optional[str] = None
    employee_name: str = ""
    employee_first_name: str = ""
    employee_email: str = ""
    social_security_number: str = ""
    job_title: str = ""
    hire_date: str = ""
    contract_type: str = "CDI"  # CDI, CDD, Stage, Prestataire
    gross_monthly_salary: float = 0

    # Pay period
    period_month: int = 1
    period_year: int = 2026
    days_worked: float = 22
    hours_worked: float = 151.67
    paid_leave_days: float = 0
    absence_days: float = 0
    absence_reason: str = ""

    # Gross elements
    base_salary: float = 0
    overtime_hours_25: float = 0
    overtime_hours_50: float = 0
    primes: List[PrimeItem] = []
    advantages: List[PrimeItem] = []
    indemnities: List[PrimeItem] = []

    # Employee contributions rates (overridable)
    rate_securite_sociale: float = 8.0
    rate_retraite: float = 3.45
    rate_mutuelle: float = 0
    mutuelle_fixed: float = 50.0
    rate_csg_crds: float = 8.0
    rate_chomage: float = 0.95
    other_deductions: List[PrimeItem] = []

    # Employer contributions rates
    rate_patron_ss: float = 42.5
    rate_patron_retraite: float = 4.5
    rate_patron_chomage: float = 4.4
    rate_patron_transport: float = 5.25
    rate_patron_apprentissage: float = 0.68
    rate_patron_formation: float = 0.55
    rate_patron_other: List[PrimeItem] = []

    # Tax
    income_tax_rate: float = 0  # Prélèvement à la source %

    # Cumulative
    cumul_brut_ytd: float = 0
    cumul_cotisations_ytd: float = 0
    cumul_net_ytd: float = 0
    remaining_leave_days: float = 25

    # Meta
    payment_date: str = ""
    notes: str = ""


class PayslipUpdate(PayslipCreate):
    pass


# ── Helper: compute payslip ──

def compute_payslip(data: dict) -> dict:
    """Compute all payslip amounts from raw data."""
    # Base salary adjusted for days
    standard_days = 22
    days_worked = data.get("days_worked", standard_days)
    gross_monthly = data.get("gross_monthly_salary", 0)
    
    # If base_salary explicitly set and > 0, use it; otherwise compute from days
    base_salary = data.get("base_salary", 0)
    if base_salary <= 0 and gross_monthly > 0:
        base_salary = round(gross_monthly * (days_worked / standard_days), 2)
    
    # Overtime
    hourly_rate = gross_monthly / 151.67 if gross_monthly > 0 else 0
    overtime_25 = round(data.get("overtime_hours_25", 0) * hourly_rate * 1.25, 2)
    overtime_50 = round(data.get("overtime_hours_50", 0) * hourly_rate * 1.50, 2)
    
    # Primes, advantages, indemnities
    total_primes = sum(p.get("amount", 0) if isinstance(p, dict) else p.amount for p in data.get("primes", []))
    total_advantages = sum(p.get("amount", 0) if isinstance(p, dict) else p.amount for p in data.get("advantages", []))
    total_indemnities = sum(p.get("amount", 0) if isinstance(p, dict) else p.amount for p in data.get("indemnities", []))
    
    # Gross
    gross = round(base_salary + overtime_25 + overtime_50 + total_primes + total_advantages + total_indemnities, 2)
    
    # Employee contributions
    ss = round(gross * data.get("rate_securite_sociale", 8.0) / 100, 2)
    retraite = round(gross * data.get("rate_retraite", 3.45) / 100, 2)
    mutuelle = data.get("mutuelle_fixed", 50.0) if data.get("rate_mutuelle", 0) == 0 else round(gross * data.get("rate_mutuelle", 0) / 100, 2)
    csg = round(gross * data.get("rate_csg_crds", 8.0) / 100, 2)
    chomage = round(gross * data.get("rate_chomage", 0.95) / 100, 2)
    other_ded = sum(p.get("amount", 0) if isinstance(p, dict) else p.amount for p in data.get("other_deductions", []))
    
    total_employee_contributions = round(ss + retraite + mutuelle + csg + chomage + other_ded, 2)
    
    net_before_tax = round(gross - total_employee_contributions, 2)
    
    # Income tax
    tax_rate = data.get("income_tax_rate", 0)
    income_tax = round(net_before_tax * tax_rate / 100, 2)
    
    net_pay = round(net_before_tax - income_tax, 2)
    
    # Employer contributions
    patron_ss = round(gross * data.get("rate_patron_ss", 42.5) / 100, 2)
    patron_retraite = round(gross * data.get("rate_patron_retraite", 4.5) / 100, 2)
    patron_chomage = round(gross * data.get("rate_patron_chomage", 4.4) / 100, 2)
    patron_transport = round(gross * data.get("rate_patron_transport", 5.25) / 100, 2)
    patron_apprentissage = round(gross * data.get("rate_patron_apprentissage", 0.68) / 100, 2)
    patron_formation = round(gross * data.get("rate_patron_formation", 0.55) / 100, 2)
    patron_other = sum(p.get("amount", 0) if isinstance(p, dict) else p.amount for p in data.get("rate_patron_other", []))
    
    total_employer = round(patron_ss + patron_retraite + patron_chomage + patron_transport + patron_apprentissage + patron_formation + patron_other, 2)
    total_cost = round(gross + total_employer, 2)
    
    return {
        "base_salary_computed": base_salary,
        "overtime_25": overtime_25,
        "overtime_50": overtime_50,
        "total_primes": round(total_primes, 2),
        "total_advantages": round(total_advantages, 2),
        "total_indemnities": round(total_indemnities, 2),
        "gross": gross,
        
        "contribution_ss": ss,
        "contribution_retraite": retraite,
        "contribution_mutuelle": mutuelle,
        "contribution_csg": csg,
        "contribution_chomage": chomage,
        "contribution_other": round(other_ded, 2),
        "total_employee_contributions": total_employee_contributions,
        
        "net_before_tax": net_before_tax,
        "income_tax": income_tax,
        "net_pay": net_pay,
        
        "patron_ss": patron_ss,
        "patron_retraite": patron_retraite,
        "patron_chomage": patron_chomage,
        "patron_transport": patron_transport,
        "patron_apprentissage": patron_apprentissage,
        "patron_formation": patron_formation,
        "patron_other": round(patron_other, 2),
        "total_employer": total_employer,
        "total_cost": total_cost,
    }


# ── ENDPOINTS ──

MONTHS_FR = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
}


@payroll_router.post("/api/payroll/create")
async def create_payslip(request: Request, body: PayslipCreate):
    """Create a new payslip (draft)."""
    user = await _require_auth(request)
    
    data = body.model_dump()
    computed = compute_payslip(data)
    
    payslip_id = f"payslip_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    doc = {
        **data,
        **computed,
        "payslip_id": payslip_id,
        "status": "brouillon",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": user["user_id"],
        "validated_at": None,
        "validated_by": None,
        "sent_at": None,
        "sent_to": None,
        "paid_at": None,
        "archived": False,
        "audit_trail": [{
            "action": "created",
            "by": user["user_id"],
            "at": now.isoformat(),
            "details": "Bulletin créé"
        }],
        # Convert pydantic items to dicts
        "primes": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.primes],
        "advantages": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.advantages],
        "indemnities": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.indemnities],
        "other_deductions": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.other_deductions],
        "rate_patron_other": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.rate_patron_other],
    }
    
    await _db.payslips.insert_one(doc)
    doc.pop("_id", None)
    return doc


@payroll_router.put("/api/payroll/{payslip_id}")
async def update_payslip(request: Request, payslip_id: str, body: PayslipUpdate):
    """Update a payslip."""
    user = await _require_auth(request)
    
    existing = await _db.payslips.find_one({"payslip_id": payslip_id, "archived": {"$ne": True}})
    if not existing:
        raise HTTPException(404, "Bulletin non trouvé")
    
    data = body.model_dump()
    computed = compute_payslip(data)
    
    now = datetime.now(timezone.utc)
    
    update_data = {
        **data,
        **computed,
        "updated_at": now.isoformat(),
        "primes": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.primes],
        "advantages": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.advantages],
        "indemnities": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.indemnities],
        "other_deductions": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.other_deductions],
        "rate_patron_other": [p.model_dump() if hasattr(p, 'model_dump') else p for p in body.rate_patron_other],
    }
    
    audit_entry = {
        "action": "updated",
        "by": user["user_id"],
        "at": now.isoformat(),
        "details": "Bulletin modifié"
    }
    
    await _db.payslips.update_one(
        {"payslip_id": payslip_id},
        {"$set": update_data, "$push": {"audit_trail": audit_entry}}
    )
    
    updated = await _db.payslips.find_one({"payslip_id": payslip_id})
    updated.pop("_id", None)
    return updated


@payroll_router.get("/api/payroll/{payslip_id}")
async def get_payslip(request: Request, payslip_id: str):
    """Get payslip details."""
    user = await _require_auth(request)
    
    doc = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Bulletin non trouvé")
    doc.pop("_id", None)
    return doc


@payroll_router.get("/api/payroll")
async def list_payslips(
    request: Request,
    employee_name: Optional[str] = None,
    period_month: Optional[int] = None,
    period_year: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    include_archived: bool = False,
    page: int = 1,
    limit: int = 50
):
    """List payslips with filters."""
    user = await _require_auth(request)
    
    query: Dict[str, Any] = {}
    if not include_archived:
        query["archived"] = {"$ne": True}
    if employee_name:
        query["employee_name"] = {"$regex": employee_name, "$options": "i"}
    if period_month:
        query["period_month"] = period_month
    if period_year:
        query["period_year"] = period_year
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"employee_name": {"$regex": search, "$options": "i"}},
            {"employee_first_name": {"$regex": search, "$options": "i"}},
            {"payslip_id": {"$regex": search, "$options": "i"}},
        ]
    
    skip = (page - 1) * limit
    total = await _db.payslips.count_documents(query)
    cursor = _db.payslips.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    items = []
    async for doc in cursor:
        doc.pop("_id", None)
        items.append(doc)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@payroll_router.post("/api/payroll/{payslip_id}/validate")
async def validate_payslip(request: Request, payslip_id: str):
    """Validate a payslip."""
    user = await _require_auth(request)
    
    doc = await _db.payslips.find_one({"payslip_id": payslip_id, "archived": {"$ne": True}})
    if not doc:
        raise HTTPException(404, "Bulletin non trouvé")
    
    now = datetime.now(timezone.utc)
    audit_entry = {
        "action": "validated",
        "by": user["user_id"],
        "at": now.isoformat(),
        "details": "Bulletin validé"
    }
    
    await _db.payslips.update_one(
        {"payslip_id": payslip_id},
        {
            "$set": {
                "status": "validée",
                "validated_at": now.isoformat(),
                "validated_by": user["user_id"],
                "updated_at": now.isoformat()
            },
            "$push": {"audit_trail": audit_entry}
        }
    )
    return {"success": True, "status": "validée"}


@payroll_router.post("/api/payroll/{payslip_id}/mark-paid")
async def mark_paid(request: Request, payslip_id: str):
    """Mark payslip as paid."""
    user = await _require_auth(request)
    
    doc = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Bulletin non trouvé")
    
    now = datetime.now(timezone.utc)
    await _db.payslips.update_one(
        {"payslip_id": payslip_id},
        {
            "$set": {
                "status": "payée",
                "paid_at": now.isoformat(),
                "updated_at": now.isoformat()
            },
            "$push": {"audit_trail": {
                "action": "paid",
                "by": user["user_id"],
                "at": now.isoformat(),
                "details": "Marqué comme payé"
            }}
        }
    )
    return {"success": True, "status": "payée"}


@payroll_router.delete("/api/payroll/{payslip_id}")
async def archive_payslip(request: Request, payslip_id: str):
    """Archive (soft delete) a payslip."""
    user = await _require_auth(request)
    
    doc = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Bulletin non trouvé")
    
    now = datetime.now(timezone.utc)
    await _db.payslips.update_one(
        {"payslip_id": payslip_id},
        {
            "$set": {"archived": True, "status": "archivée", "updated_at": now.isoformat()},
            "$push": {"audit_trail": {
                "action": "archived",
                "by": user["user_id"],
                "at": now.isoformat(),
                "details": "Bulletin archivé"
            }}
        }
    )
    return {"success": True}


# ── PDF GENERATION ──

def _fmt(amount: float) -> str:
    """Format amount French style."""
    return f"{amount:,.2f}".replace(",", " ").replace(".", ",")


def generate_payslip_pdf(payslip: dict) -> BytesIO:
    """Generate a professional French payslip PDF."""
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=15*mm, bottomMargin=20*mm, leftMargin=15*mm, rightMargin=15*mm)
    
    elements = []
    width = A4[0] - 30*mm
    
    # Colors
    PRIMARY = HexColor("#1e40af")
    DARK = HexColor("#1e293b")
    GRAY = HexColor("#64748b")
    LIGHT_BG = HexColor("#f8fafc")
    ACCENT = HexColor("#f97316")
    GREEN = HexColor("#16a34a")
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Normal'], fontSize=18, textColor=PRIMARY, fontName='Helvetica-Bold', spaceAfter=2*mm)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, textColor=GRAY, fontName='Helvetica')
    section_style = ParagraphStyle('Section', parent=styles['Normal'], fontSize=11, textColor=PRIMARY, fontName='Helvetica-Bold', spaceBefore=4*mm, spaceAfter=2*mm)
    normal_style = ParagraphStyle('Norm', parent=styles['Normal'], fontSize=9, textColor=DARK, fontName='Helvetica')
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=7.5, textColor=GRAY, fontName='Helvetica')
    confidential_style = ParagraphStyle('Conf', parent=styles['Normal'], fontSize=8, textColor=HexColor("#dc2626"), fontName='Helvetica-Bold', alignment=TA_CENTER)
    
    period_label = f"{MONTHS_FR.get(payslip.get('period_month', 1), 'Janvier')} {payslip.get('period_year', 2026)}"
    
    # ── HEADER: Company info ──
    company_data = [
        [Paragraph("<b>GLOBAL CLEAN HOME</b>", ParagraphStyle('Co', parent=styles['Normal'], fontSize=14, textColor=PRIMARY, fontName='Helvetica-Bold')),
         Paragraph(f"<b>BULLETIN DE PAIE</b><br/>{period_label}", ParagraphStyle('BP', parent=styles['Normal'], fontSize=12, textColor=DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
        [Paragraph("Paris & Île-de-France<br/>SIRET : 123 456 789 00012<br/>APE : 8121Z — Nettoyage courant des bâtiments<br/>Tél : 06 22 66 53 08", subtitle_style), 
         Paragraph(f"N° Bulletin : {payslip.get('payslip_id', '—').upper()}<br/>Date d'édition : {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('R', parent=subtitle_style, alignment=TA_RIGHT))],
    ]
    t = Table(company_data, colWidths=[width*0.55, width*0.45])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('LINEBELOW', (0,-1), (-1,-1), 1, PRIMARY),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    
    # ── EMPLOYEE INFO ──
    emp_name = f"{payslip.get('employee_first_name', '')} {payslip.get('employee_name', '')}".strip()
    contract_type = payslip.get('contract_type', 'CDI')
    
    emp_data = [
        [Paragraph("<b>SALARIÉ</b>", ParagraphStyle('H', parent=normal_style, fontSize=10, textColor=PRIMARY)),
         Paragraph("<b>PÉRIODE</b>", ParagraphStyle('H', parent=normal_style, fontSize=10, textColor=PRIMARY))],
        [Paragraph(f"<b>{emp_name}</b><br/>"
                   f"N° SS : {payslip.get('social_security_number', '—')}<br/>"
                   f"Poste : {payslip.get('job_title', '—')}<br/>"
                   f"Embauche : {payslip.get('hire_date', '—')}<br/>"
                   f"Contrat : {contract_type}", normal_style),
         Paragraph(f"Période : <b>{period_label}</b><br/>"
                   f"Jours travaillés : {payslip.get('days_worked', 22)}<br/>"
                   f"Heures travaillées : {payslip.get('hours_worked', 151.67)}<br/>"
                   f"Congés payés : {payslip.get('paid_leave_days', 0)} jours<br/>"
                   f"Absences : {payslip.get('absence_days', 0)} jours<br/>"
                   f"Date de versement : {payslip.get('payment_date', '—')}", normal_style)],
    ]
    t = Table(emp_data, colWidths=[width*0.5, width*0.5])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,0), LIGHT_BG),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 0.5, GRAY),
        ('LINEBELOW', (0,0), (-1,0), 0.5, PRIMARY),
        ('LINEBETWEEN', (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    
    # ── REMUNERATION TABLE ──
    elements.append(Paragraph("ÉLÉMENTS DE RÉMUNÉRATION", section_style))
    
    rem_rows = [
        [Paragraph("<b>Désignation</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold')),
         Paragraph("<b>Base</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
         Paragraph("<b>Taux</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
         Paragraph("<b>Montant (€)</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
    ]
    
    right_style = ParagraphStyle('R', parent=normal_style, alignment=TA_RIGHT)
    
    base_sal = payslip.get('base_salary_computed', payslip.get('base_salary', 0))
    rem_rows.append([
        Paragraph("Salaire de base", normal_style),
        Paragraph(f"{payslip.get('days_worked', 22)} j", right_style),
        Paragraph("—", right_style),
        Paragraph(f"{_fmt(base_sal)}", right_style)
    ])
    
    if payslip.get('overtime_25', 0) > 0:
        rem_rows.append([
            Paragraph("Heures supp. (+25%)", normal_style),
            Paragraph(f"{payslip.get('overtime_hours_25', 0)} h", right_style),
            Paragraph("125%", right_style),
            Paragraph(f"{_fmt(payslip['overtime_25'])}", right_style)
        ])
    
    if payslip.get('overtime_50', 0) > 0:
        rem_rows.append([
            Paragraph("Heures supp. (+50%)", normal_style),
            Paragraph(f"{payslip.get('overtime_hours_50', 0)} h", right_style),
            Paragraph("150%", right_style),
            Paragraph(f"{_fmt(payslip['overtime_50'])}", right_style)
        ])
    
    for p in payslip.get('primes', []):
        lbl = p.get('label', 'Prime') if isinstance(p, dict) else p.label
        amt = p.get('amount', 0) if isinstance(p, dict) else p.amount
        if amt > 0:
            rem_rows.append([Paragraph(f"Prime {lbl}", normal_style), Paragraph("—", right_style), Paragraph("—", right_style), Paragraph(f"{_fmt(amt)}", right_style)])
    
    for p in payslip.get('advantages', []):
        lbl = p.get('label', 'Avantage') if isinstance(p, dict) else p.label
        amt = p.get('amount', 0) if isinstance(p, dict) else p.amount
        if amt > 0:
            rem_rows.append([Paragraph(f"Avantage {lbl}", normal_style), Paragraph("—", right_style), Paragraph("—", right_style), Paragraph(f"{_fmt(amt)}", right_style)])
    
    for p in payslip.get('indemnities', []):
        lbl = p.get('label', 'Indemnité') if isinstance(p, dict) else p.label
        amt = p.get('amount', 0) if isinstance(p, dict) else p.amount
        if amt > 0:
            rem_rows.append([Paragraph(f"Indemnité {lbl}", normal_style), Paragraph("—", right_style), Paragraph("—", right_style), Paragraph(f"{_fmt(amt)}", right_style)])
    
    # Gross total row
    gross = payslip.get('gross', 0)
    rem_rows.append([
        Paragraph("<b>BRUT IMPOSABLE</b>", ParagraphStyle('B', parent=normal_style, fontName='Helvetica-Bold', textColor=PRIMARY)),
        Paragraph("", right_style), Paragraph("", right_style),
        Paragraph(f"<b>{_fmt(gross)}</b>", ParagraphStyle('BR', parent=right_style, fontName='Helvetica-Bold', textColor=PRIMARY))
    ])
    
    t = Table(rem_rows, colWidths=[width*0.40, width*0.15, width*0.15, width*0.30])
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.3, HexColor("#e2e8f0")),
        ('BACKGROUND', (0,-1), (-1,-1), HexColor("#eff6ff")),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [white, LIGHT_BG]),
    ]
    t.setStyle(TableStyle(style_cmds))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    
    # ── EMPLOYEE CONTRIBUTIONS ──
    elements.append(Paragraph("COTISATIONS SALARIÉ", section_style))
    
    cot_rows = [
        [Paragraph("<b>Cotisation</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold')),
         Paragraph("<b>Base</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
         Paragraph("<b>Taux</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
         Paragraph("<b>Montant (€)</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
    ]
    
    red_style = ParagraphStyle('Red', parent=right_style, textColor=HexColor("#dc2626"))
    
    cot_items = [
        ("Sécurité Sociale", gross, payslip.get('rate_securite_sociale', 8), payslip.get('contribution_ss', 0)),
        ("Retraite AGIRC-ARRCO", gross, payslip.get('rate_retraite', 3.45), payslip.get('contribution_retraite', 0)),
        ("Mutuelle", gross, payslip.get('rate_mutuelle', 0), payslip.get('contribution_mutuelle', 0)),
        ("CSG / CRDS", gross, payslip.get('rate_csg_crds', 8), payslip.get('contribution_csg', 0)),
        ("Assurance chômage", gross, payslip.get('rate_chomage', 0.95), payslip.get('contribution_chomage', 0)),
    ]
    
    for label, base, rate, amount in cot_items:
        rate_str = f"{rate}%" if rate > 0 else "forfait"
        cot_rows.append([
            Paragraph(label, normal_style),
            Paragraph(f"{_fmt(base)}", right_style),
            Paragraph(rate_str, right_style),
            Paragraph(f"-{_fmt(amount)}", red_style)
        ])
    
    # Other deductions
    for p in payslip.get('other_deductions', []):
        lbl = p.get('label', 'Retenue') if isinstance(p, dict) else p.label
        amt = p.get('amount', 0) if isinstance(p, dict) else p.amount
        if amt > 0:
            cot_rows.append([Paragraph(lbl, normal_style), Paragraph("—", right_style), Paragraph("—", right_style), Paragraph(f"-{_fmt(amt)}", red_style)])
    
    total_cot = payslip.get('total_employee_contributions', 0)
    cot_rows.append([
        Paragraph("<b>TOTAL COTISATIONS</b>", ParagraphStyle('B', parent=normal_style, fontName='Helvetica-Bold', textColor=HexColor("#dc2626"))),
        Paragraph("", right_style), Paragraph("", right_style),
        Paragraph(f"<b>-{_fmt(total_cot)}</b>", ParagraphStyle('BR', parent=red_style, fontName='Helvetica-Bold'))
    ])
    
    t = Table(cot_rows, colWidths=[width*0.40, width*0.20, width*0.15, width*0.25])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor("#dc2626")),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.3, HexColor("#e2e8f0")),
        ('BACKGROUND', (0,-1), (-1,-1), HexColor("#fef2f2")),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [white, LIGHT_BG]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    
    # ── INCOME TAX ──
    if payslip.get('income_tax', 0) > 0:
        elements.append(Paragraph("PRÉLÈVEMENT À LA SOURCE", section_style))
        tax_rows = [
            [Paragraph("Impôt sur le revenu", normal_style),
             Paragraph(f"{_fmt(payslip.get('net_before_tax', 0))}", right_style),
             Paragraph(f"{payslip.get('income_tax_rate', 0)}%", right_style),
             Paragraph(f"-{_fmt(payslip.get('income_tax', 0))}", red_style)],
        ]
        t = Table(tax_rows, colWidths=[width*0.40, width*0.20, width*0.15, width*0.25])
        t.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.3, HexColor("#e2e8f0")),
            ('BACKGROUND', (0,0), (-1,-1), HexColor("#fffbeb")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 4*mm))
    
    # ── NET PAY ──
    net_pay = payslip.get('net_pay', 0)
    net_data = [
        [Paragraph("<b>NET À PAYER</b>", ParagraphStyle('NP', parent=styles['Normal'], fontSize=14, textColor=white, fontName='Helvetica-Bold')),
         Paragraph(f"<b>{_fmt(net_pay)} €</b>", ParagraphStyle('NPA', parent=styles['Normal'], fontSize=14, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
    ]
    t = Table(net_data, colWidths=[width*0.5, width*0.5])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREEN),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    
    # ── EMPLOYER CONTRIBUTIONS (informational) ──
    elements.append(Paragraph("COTISATIONS PATRONALES (pour information)", section_style))
    patron_rows = [
        [Paragraph("<b>Cotisation</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold')),
         Paragraph("<b>Taux</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
         Paragraph("<b>Montant (€)</b>", ParagraphStyle('TH', parent=normal_style, textColor=white, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
    ]
    patron_items = [
        ("Sécurité Sociale", payslip.get('rate_patron_ss', 42.5), payslip.get('patron_ss', 0)),
        ("Retraite complémentaire", payslip.get('rate_patron_retraite', 4.5), payslip.get('patron_retraite', 0)),
        ("Assurance chômage", payslip.get('rate_patron_chomage', 4.4), payslip.get('patron_chomage', 0)),
        ("Versement transport", payslip.get('rate_patron_transport', 5.25), payslip.get('patron_transport', 0)),
        ("Taxe apprentissage", payslip.get('rate_patron_apprentissage', 0.68), payslip.get('patron_apprentissage', 0)),
        ("Formation professionnelle", payslip.get('rate_patron_formation', 0.55), payslip.get('patron_formation', 0)),
    ]
    for label, rate, amount in patron_items:
        patron_rows.append([Paragraph(label, normal_style), Paragraph(f"{rate}%", right_style), Paragraph(f"{_fmt(amount)}", right_style)])
    
    total_employer = payslip.get('total_employer', 0)
    total_cost = payslip.get('total_cost', 0)
    patron_rows.append([
        Paragraph("<b>TOTAL PATRONAL</b>", ParagraphStyle('B', parent=normal_style, fontName='Helvetica-Bold')),
        Paragraph("", right_style),
        Paragraph(f"<b>{_fmt(total_employer)}</b>", ParagraphStyle('BR', parent=right_style, fontName='Helvetica-Bold'))
    ])
    patron_rows.append([
        Paragraph("<b>COÛT TOTAL EMPLOYEUR</b>", ParagraphStyle('B', parent=normal_style, fontName='Helvetica-Bold', textColor=PRIMARY)),
        Paragraph("", right_style),
        Paragraph(f"<b>{_fmt(total_cost)}</b>", ParagraphStyle('BR', parent=right_style, fontName='Helvetica-Bold', textColor=PRIMARY))
    ])
    
    t = Table(patron_rows, colWidths=[width*0.50, width*0.20, width*0.30])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), GRAY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.3, HexColor("#e2e8f0")),
        ('BACKGROUND', (0,-2), (-1,-1), LIGHT_BG),
        ('ROWBACKGROUNDS', (0,1), (-1,-3), [white, LIGHT_BG]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    
    # ── CUMULS ──
    elements.append(Paragraph("CUMULS ANNUELS", section_style))
    cum_data = [
        [Paragraph("<b>Cumul Brut</b>", normal_style), Paragraph(f"{_fmt(payslip.get('cumul_brut_ytd', 0))} €", right_style),
         Paragraph("<b>Congés restants</b>", normal_style), Paragraph(f"{payslip.get('remaining_leave_days', 25)} jours", right_style)],
        [Paragraph("<b>Cumul Cotisations</b>", normal_style), Paragraph(f"{_fmt(payslip.get('cumul_cotisations_ytd', 0))} €", right_style),
         Paragraph("<b>Cumul Net</b>", normal_style), Paragraph(f"{_fmt(payslip.get('cumul_net_ytd', 0))} €", right_style)],
    ]
    t = Table(cum_data, colWidths=[width*0.25, width*0.25, width*0.25, width*0.25])
    t.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, GRAY),
        ('GRID', (0,0), (-1,-1), 0.3, HexColor("#e2e8f0")),
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 6*mm))
    
    # ── CONFIDENTIAL ──
    elements.append(Paragraph("⚠️ CONFIDENTIEL — Ce document est strictement personnel", confidential_style))
    elements.append(Spacer(1, 2*mm))
    
    # ── FOOTER ──
    footer_text = (
        "Ce bulletin de paie doit être conservé sans limitation de durée (Article L3243-4 du Code du travail).<br/>"
        "Contact RH : contact@globalcleanhome.com — Tél : 06 22 66 53 08<br/>"
        f"Dossier : {payslip.get('payslip_id', '—').upper()}"
    )
    elements.append(Paragraph(footer_text, small_style))
    
    doc.build(elements)
    buf.seek(0)
    return buf


@payroll_router.get("/api/payroll/{payslip_id}/pdf")
async def download_payslip_pdf(request: Request, payslip_id: str):
    """Download payslip as PDF."""
    user = await _require_auth(request)
    
    doc = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Bulletin non trouvé")
    
    doc.pop("_id", None)
    pdf_buf = generate_payslip_pdf(doc)
    
    period = f"{MONTHS_FR.get(doc.get('period_month', 1), 'Janvier')}_{doc.get('period_year', 2026)}"
    emp = f"{doc.get('employee_name', 'Salarie')}".replace(" ", "_")
    filename = f"Bulletin_Paie_{emp}_{period}.pdf"
    
    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@payroll_router.post("/api/payroll/{payslip_id}/send-email")
async def send_payslip_email(request: Request, payslip_id: str):
    """Generate PDF and send payslip by email."""
    user = await _require_auth(request)
    
    doc = await _db.payslips.find_one({"payslip_id": payslip_id})
    if not doc:
        raise HTTPException(404, "Bulletin non trouvé")
    
    email = doc.get("employee_email", "")
    if not email or "@" not in email:
        raise HTTPException(400, "Email du salarié invalide ou manquant")
    
    doc.pop("_id", None)
    
    # Generate PDF
    pdf_buf = generate_payslip_pdf(doc)
    pdf_data = pdf_buf.read()
    
    period_label = f"{MONTHS_FR.get(doc.get('period_month', 1), 'Janvier')} {doc.get('period_year', 2026)}"
    emp_name = f"{doc.get('employee_first_name', '')} {doc.get('employee_name', '')}".strip()
    
    # Send via Gmail
    try:
        from gmail_service import _get_valid_access_token, _get_any_active_token
        import base64
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.base import MIMEBase
        from email import encoders
        
        access_token = await _get_valid_access_token(user["user_id"])
        if not access_token:
            access_token, _ = await _get_any_active_token()
        if not access_token:
            raise HTTPException(500, "Aucun compte Gmail connecté")
        
        msg = MIMEMultipart()
        msg["To"] = email
        msg["Subject"] = f"Votre bulletin de paie — {period_label}"
        msg["From"] = f"Global Clean Home <{os.environ.get('GMAIL_FROM_ADDRESS', 'contact@globalcleanhome.com')}>"
        
        body_html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1e40af;">📋 Bulletin de Paie — {period_label}</h2>
            <p>Bonjour {doc.get('employee_first_name', '')},</p>
            <p>Veuillez trouver ci-joint votre bulletin de paie pour la période de <b>{period_label}</b>.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <tr style="background:#f8fafc;">
                    <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Brut</td>
                    <td style="padding:10px;border:1px solid #e2e8f0;">{_fmt(doc.get('gross', 0))} €</td>
                </tr>
                <tr>
                    <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Cotisations</td>
                    <td style="padding:10px;border:1px solid #e2e8f0;color:#dc2626;">-{_fmt(doc.get('total_employee_contributions', 0))} €</td>
                </tr>
                <tr style="background:#f0fdf4;">
                    <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;color:#16a34a;">Net à payer</td>
                    <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;color:#16a34a;">{_fmt(doc.get('net_pay', 0))} €</td>
                </tr>
            </table>
            <p style="color:#64748b;font-size:13px;">En cas de question, contactez la direction RH à <a href="mailto:contact@globalcleanhome.com">contact@globalcleanhome.com</a> ou au 06 22 66 53 08.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
            <p style="color:#94a3b8;font-size:11px;">Ce document est confidentiel. Conservez votre bulletin de paie sans limitation de durée.</p>
        </div>
        """
        
        msg.attach(MIMEText(body_html, "html", "utf-8"))
        
        # Attach PDF
        part = MIMEBase("application", "pdf")
        part.set_payload(pdf_data)
        encoders.encode_base64(part)
        filename = f"Bulletin_Paie_{doc.get('employee_name', 'Salarie')}_{period_label.replace(' ', '_')}.pdf"
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)
        
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        
        import httpx
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json={"raw": raw},
                timeout=30
            )
        
        if resp.status_code not in (200, 202):
            logger.error(f"Gmail send failed: {resp.status_code} {resp.text[:200]}")
            raise HTTPException(500, f"Erreur envoi email: {resp.status_code}")
        
        # Update payslip status
        now = datetime.now(timezone.utc)
        await _db.payslips.update_one(
            {"payslip_id": payslip_id},
            {
                "$set": {
                    "status": "envoyée",
                    "sent_at": now.isoformat(),
                    "sent_to": email,
                    "updated_at": now.isoformat()
                },
                "$push": {"audit_trail": {
                    "action": "email_sent",
                    "by": user["user_id"],
                    "at": now.isoformat(),
                    "details": f"Email envoyé à {email}"
                }}
            }
        )
        
        logger.info(f"Payslip email sent to {email} for {period_label}")
        return {"success": True, "message": f"Email envoyé à {email}", "sent_to": email}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending payslip email: {e}")
        raise HTTPException(500, f"Erreur envoi email: {str(e)}")


@payroll_router.post("/api/payroll/compute")
async def compute_payslip_preview(request: Request, body: PayslipCreate):
    """Compute payslip amounts without saving (preview)."""
    await _require_auth(request)
    data = body.model_dump()
    return compute_payslip(data)


@payroll_router.get("/api/payroll/export/excel")
async def export_payslips_excel(
    request: Request,
    period_month: Optional[int] = None,
    period_year: Optional[int] = None,
):
    """Export payslips list as CSV (Excel-compatible)."""
    user = await _require_auth(request)
    
    query: Dict[str, Any] = {"archived": {"$ne": True}}
    if period_month:
        query["period_month"] = period_month
    if period_year:
        query["period_year"] = period_year
    
    cursor = _db.payslips.find(query).sort("created_at", -1)
    
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow([
        "N° Bulletin", "Période", "Nom", "Prénom", "Poste", "Contrat",
        "Brut", "Cotisations", "Net", "Coût employeur", "Statut",
        "Jours travaillés", "Heures travaillées", "Date création"
    ])
    
    async for doc in cursor:
        period = f"{MONTHS_FR.get(doc.get('period_month', 1), '?')} {doc.get('period_year', '')}"
        writer.writerow([
            doc.get("payslip_id", ""),
            period,
            doc.get("employee_name", ""),
            doc.get("employee_first_name", ""),
            doc.get("job_title", ""),
            doc.get("contract_type", ""),
            f"{doc.get('gross', 0):.2f}",
            f"{doc.get('total_employee_contributions', 0):.2f}",
            f"{doc.get('net_pay', 0):.2f}",
            f"{doc.get('total_cost', 0):.2f}",
            doc.get("status", ""),
            doc.get("days_worked", ""),
            doc.get("hours_worked", ""),
            doc.get("created_at", ""),
        ])
    
    csv_content = output.getvalue()
    buf = BytesIO(csv_content.encode("utf-8-sig"))
    
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="bulletins_paie.csv"'}
    )


@payroll_router.get("/api/payroll/config")
async def get_payroll_config(request: Request):
    """Get company payroll configuration."""
    user = await _require_auth(request)
    
    config = await _db.payroll_config.find_one({"type": "company_config"})
    if not config:
        config = {
            "type": "company_config",
            "company_name": "Global Clean Home",
            "address": "Paris & Île-de-France",
            "siret": "",
            "siren": "",
            "ape": "8121Z",
            "phone": "06 22 66 53 08",
            "email": "contact@globalcleanhome.com",
            "logo_url": "",
            # Default rates
            "rate_securite_sociale": 8.0,
            "rate_retraite": 3.45,
            "rate_mutuelle": 0,
            "mutuelle_fixed": 50.0,
            "rate_csg_crds": 8.0,
            "rate_chomage": 0.95,
            "rate_patron_ss": 42.5,
            "rate_patron_retraite": 4.5,
            "rate_patron_chomage": 4.4,
            "rate_patron_transport": 5.25,
            "rate_patron_apprentissage": 0.68,
            "rate_patron_formation": 0.55,
            "working_days_per_month": 22,
            "legal_hours_per_month": 151.67,
            "public_holidays_2026": [
                "2026-01-01", "2026-04-06", "2026-05-01", "2026-05-14",
                "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01",
                "2026-11-11", "2026-12-25"
            ],
        }
        await _db.payroll_config.insert_one(config)
    
    config.pop("_id", None)
    return config


@payroll_router.put("/api/payroll/config")
async def update_payroll_config(request: Request):
    """Update company payroll configuration."""
    user = await _require_auth(request)
    body = await request.json()
    
    body.pop("_id", None)
    body["type"] = "company_config"
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    body["updated_by"] = user["user_id"]
    
    await _db.payroll_config.update_one(
        {"type": "company_config"},
        {"$set": body},
        upsert=True
    )
    return {"success": True}


@payroll_router.get("/api/payroll/stats")
async def payroll_stats(request: Request, year: int = 2026):
    """Get payroll statistics for a year."""
    user = await _require_auth(request)
    
    pipeline = [
        {"$match": {"period_year": year, "archived": {"$ne": True}}},
        {"$group": {
            "_id": "$period_month",
            "total_gross": {"$sum": "$gross"},
            "total_net": {"$sum": "$net_pay"},
            "total_cost": {"$sum": "$total_cost"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = []
    async for doc in _db.payslips.aggregate(pipeline):
        results.append({
            "month": doc["_id"],
            "month_label": MONTHS_FR.get(doc["_id"], "?"),
            "total_gross": round(doc["total_gross"], 2),
            "total_net": round(doc["total_net"], 2),
            "total_cost": round(doc["total_cost"], 2),
            "count": doc["count"],
        })
    
    # Overall totals
    total_pipeline = [
        {"$match": {"period_year": year, "archived": {"$ne": True}}},
        {"$group": {
            "_id": None,
            "total_gross": {"$sum": "$gross"},
            "total_net": {"$sum": "$net_pay"},
            "total_cost": {"$sum": "$total_cost"},
            "total_contributions": {"$sum": "$total_employee_contributions"},
            "count": {"$sum": 1},
        }}
    ]
    totals = {"total_gross": 0, "total_net": 0, "total_cost": 0, "total_contributions": 0, "count": 0}
    async for doc in _db.payslips.aggregate(total_pipeline):
        totals = {k: round(doc.get(k, 0), 2) for k in totals}
    
    return {"year": year, "monthly": results, "totals": totals}
