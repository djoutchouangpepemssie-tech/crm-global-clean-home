"""
Global Clean Home CRM - PDF & CSV Report Exports
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from io import BytesIO, StringIO
import csv
import os
import logging

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

exports_router = APIRouter(prefix="/api/exports")

VIOLET = HexColor('#7C3AED')
SLATE_900 = HexColor('#0F172A')
SLATE_600 = HexColor('#475569')
SLATE_200 = HexColor('#E2E8F0')
SLATE_50 = HexColor('#F8FAFC')
WHITE = HexColor('#FFFFFF')

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

# ============= PDF HELPERS =============

def _create_pdf_header(elements, styles, title, subtitle=""):
    """Add company header to PDF."""
    header_style = ParagraphStyle('Header', parent=styles['Heading1'], fontSize=20, textColor=VIOLET, spaceAfter=4, fontName='Helvetica-Bold')
    sub_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=10, textColor=SLATE_600, spaceAfter=16)
    
    elements.append(Paragraph("Global Clean Home", header_style))
    elements.append(Paragraph(title, ParagraphStyle('Title', parent=styles['Heading2'], fontSize=14, textColor=SLATE_900, spaceAfter=4)))
    if subtitle:
        elements.append(Paragraph(subtitle, sub_style))
    elements.append(Spacer(1, 8))

def _format_amount(amount):
    if amount is None:
        return "0,00 €"
    return f"{amount:,.2f} €".replace(",", " ").replace(".", ",")

def _format_date(dt_str):
    if not dt_str:
        return "-"
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(dt_str)[:10]

# ============= INVOICE PDF =============

@exports_router.get("/invoice/{invoice_id}/pdf")
async def export_invoice_pdf(invoice_id: str, request: Request):
    """Generate a PDF for a single invoice."""
    await _require_auth(request)
    
    invoice = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    elements = []
    styles = getSampleStyleSheet()
    
    _create_pdf_header(elements, styles, f"Facture {invoice_id}", f"Date: {_format_date(invoice.get('created_at'))}")
    
    # Client info
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=10, textColor=SLATE_900, spaceAfter=2)
    elements.append(Paragraph(f"<b>Client:</b> {invoice.get('lead_name', '')}", info_style))
    elements.append(Paragraph(f"<b>Email:</b> {invoice.get('lead_email', '')}", info_style))
    elements.append(Paragraph(f"<b>Tél:</b> {invoice.get('lead_phone', '')}", info_style))
    elements.append(Spacer(1, 12))
    
    # Invoice table
    table_data = [
        ['Description', 'Quantité', 'Montant'],
        [invoice.get('service_type', 'Service'), f"{invoice.get('surface', '-')} m²", _format_amount(invoice.get('amount_ht'))],
        ['', 'Sous-total HT', _format_amount(invoice.get('amount_ht'))],
        ['', 'TVA (20%)', _format_amount(invoice.get('tva'))],
        ['', 'Total TTC', _format_amount(invoice.get('amount_ttc'))],
    ]
    
    table = Table(table_data, colWidths=[80*mm, 50*mm, 40*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), VIOLET),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, SLATE_200),
        ('BACKGROUND', (0, -2), (-1, -1), SLATE_50),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Status
    status_label = {"en_attente": "En attente de paiement", "payée": "Payée", "en_retard": "En retard"}.get(invoice.get('status'), invoice.get('status', ''))
    elements.append(Paragraph(f"<b>Statut:</b> {status_label}", info_style))
    if invoice.get('due_date'):
        elements.append(Paragraph(f"<b>Échéance:</b> {_format_date(invoice.get('due_date'))}", info_style))
    if invoice.get('paid_at'):
        elements.append(Paragraph(f"<b>Payée le:</b> {_format_date(invoice.get('paid_at'))}", info_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=facture_{invoice_id}.pdf"}
    )

# ============= QUOTE PDF =============

@exports_router.get("/quote/{quote_id}/pdf")
async def export_quote_pdf(quote_id: str, request: Request):
    """Generate premium PDF for a quote — filename = Devis_NomClient.pdf"""
    await _require_auth(request)

    quote = await _db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    lead = await _db.leads.find_one({"lead_id": quote.get("lead_id")}, {"_id": 0})
    if not lead:
        lead = {}

    # Utiliser le générateur premium
    try:
        from integrations import generate_quote_pdf
        pdf_buffer = generate_quote_pdf(quote, lead)
        pdf_bytes = pdf_buffer.read()
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur génération PDF: {str(e)}")

    # Nom fichier = Devis_PrenomNom.pdf
    client_name = lead.get("name", "Client")
    safe_name = "".join(c if c.isalnum() or c in "_ -" else "_" for c in client_name).strip()
    pdf_filename = f"Devis_{safe_name}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf_filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )

# ============= CSV EXPORTS =============

@exports_router.get("/invoices/csv")
async def export_invoices_csv(request: Request, status: str = None):
    """Export invoices to CSV."""
    await _require_auth(request)
    
    query = {}
    if status:
        query["status"] = status
    invoices = await _db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    output = StringIO()
    fieldnames = ["invoice_id", "lead_name", "lead_email", "service_type", "amount_ht", "tva", "amount_ttc", "status", "due_date", "paid_at", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for inv in invoices:
        writer.writerow(inv)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=factures_export.csv"}
    )

@exports_router.get("/clients/csv")
async def export_clients_csv(request: Request):
    """Export converted clients to CSV."""
    await _require_auth(request)
    
    clients = await _db.leads.find({"status": "gagné"}, {"_id": 0}).to_list(10000)
    
    output = StringIO()
    fieldnames = ["lead_id", "name", "email", "phone", "service_type", "surface", "address", "source", "score", "created_at", "updated_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for c in clients:
        writer.writerow(c)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients_export.csv"}
    )

@exports_router.get("/interventions/csv")
async def export_interventions_csv(request: Request):
    """Export interventions to CSV."""
    await _require_auth(request)
    
    interventions = await _db.interventions.find({}, {"_id": 0}).sort("scheduled_date", -1).to_list(10000)
    
    output = StringIO()
    fieldnames = ["intervention_id", "lead_name", "title", "service_type", "address", "scheduled_date", "scheduled_time", "duration_hours", "status", "team_id"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for intv in interventions:
        writer.writerow(intv)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=interventions_export.csv"}
    )

# ============= FINANCIAL REPORT PDF =============

@exports_router.get("/financial/pdf")
async def export_financial_report_pdf(request: Request, period: str = "30d"):
    """Generate a financial summary PDF report."""
    await _require_auth(request)
    
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    start = now - timedelta(days=days)
    
    invoices = await _db.invoices.find({"created_at": {"$gte": start.isoformat()}}, {"_id": 0}).to_list(10000)
    
    paid = [i for i in invoices if i.get("status") == "payée"]
    pending = [i for i in invoices if i.get("status") == "en_attente"]
    
    total_revenue = sum(i.get("amount_ttc", 0) for i in paid)
    total_pending = sum(i.get("amount_ttc", 0) for i in pending)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    elements = []
    styles = getSampleStyleSheet()
    
    _create_pdf_header(elements, styles, "Rapport Financier", f"Période: {days} derniers jours | Généré le {now.strftime('%d/%m/%Y')}")
    
    # Summary table
    summary_data = [
        ['Indicateur', 'Valeur'],
        ['Total factures', str(len(invoices))],
        ['Factures payées', str(len(paid))],
        ['Factures en attente', str(len(pending))],
        ['Chiffre d\'affaires', _format_amount(total_revenue)],
        ['Montant en attente', _format_amount(total_pending)],
    ]
    
    summary_table = Table(summary_data, colWidths=[100*mm, 70*mm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), VIOLET),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, SLATE_200),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, SLATE_50]),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Detailed invoices
    if invoices:
        elements.append(Paragraph("<b>Détail des factures</b>", styles['Heading3']))
        elements.append(Spacer(1, 8))
        
        detail_data = [['Facture', 'Client', 'Montant TTC', 'Statut', 'Date']]
        for inv in invoices[:50]:
            status_label = {"en_attente": "En attente", "payée": "Payée", "en_retard": "En retard"}.get(inv.get('status'), inv.get('status', ''))
            detail_data.append([
                inv.get('invoice_id', '')[:20],
                inv.get('lead_name', '')[:20],
                _format_amount(inv.get('amount_ttc')),
                status_label,
                _format_date(inv.get('created_at')),
            ])
        
        detail_table = Table(detail_data, colWidths=[35*mm, 40*mm, 30*mm, 30*mm, 30*mm])
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), VIOLET),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, SLATE_200),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, SLATE_50]),
        ]))
        elements.append(detail_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rapport_financier_{period}.pdf"}
    )
