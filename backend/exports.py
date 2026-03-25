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
    """Generate premium invoice PDF — same template as quote."""
    await _require_auth(request)

    invoice = await _db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    lead = await _db.leads.find_one({"lead_id": invoice.get("lead_id")}, {"_id": 0})
    if not lead:
        lead = {
            "name": invoice.get("lead_name", "Client"),
            "email": invoice.get("lead_email", ""),
            "phone": invoice.get("lead_phone", ""),
            "address": invoice.get("address", ""),
        }

    pdf_bytes = generate_invoice_pdf_bytes(invoice, lead)
    client_name = "".join(c if c.isalnum() or c in "_ -" else "_" for c in lead.get("name","Client")).strip()
    filename = f"Facture_{client_name}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )

# ============= QUOTE PDF =============


def generate_invoice_pdf_bytes(invoice: dict, lead: dict) -> bytes:
    """Generate premium invoice PDF and return bytes."""
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)

    ORANGE=colors.HexColor('#f97316'); DARK=colors.HexColor('#0f172a')
    SLATE=colors.HexColor('#1e293b'); GRAY=colors.HexColor('#64748b')
    GRAY_LIGHT=colors.HexColor('#f1f5f9'); GRAY_BORDER=colors.HexColor('#e2e8f0')
    WHITE=colors.white; GREEN=colors.HexColor('#10b981')
    styles=getSampleStyleSheet(); W=A4[0]-80

    def S(n,**k): return ParagraphStyle(n,parent=styles['Normal'],**k)

    elements = []
    invoice_id = invoice.get('invoice_id','—')
    amount = float(invoice.get('amount_ttc', invoice.get('amount_ht', 0)))
    service = invoice.get('service_type', lead.get('service_type','Nettoyage'))
    date_str = datetime.now().strftime('%d/%m/%Y')
    now_dt = datetime.now()
    ref = f"FCT-{now_dt.strftime('%m%Y')}-{invoice_id.replace('inv_','').upper()[:6]}"
    statut = invoice.get('status','en_attente')
    statut_colors = {'payée':GREEN,'en_attente':colors.HexColor('#f59e0b'),'en_retard':colors.HexColor('#f43f5e')}
    statut_labels = {'payée':'PAYÉE','en_attente':'EN ATTENTE','en_retard':'EN RETARD'}
    sc = statut_colors.get(statut, colors.HexColor('#f59e0b'))

    # HEADER
    ht = Table([[
        Paragraph("<b>Global Clean Home</b>", S('T',fontSize=20,textColor=WHITE,fontName='Helvetica-Bold')),
        Table([
            [Paragraph("FACTURE OFFICIELLE",S('a',fontSize=8,textColor=colors.HexColor('#fb923c'),fontName='Helvetica-Bold',alignment=TA_RIGHT))],
            [Paragraph(ref,S('b',fontSize=13,textColor=WHITE,fontName='Helvetica-Bold',alignment=TA_RIGHT))],
            [Paragraph(date_str,S('c',fontSize=8,textColor=colors.HexColor('#94a3b8'),fontName='Helvetica',alignment=TA_RIGHT))],
        ], colWidths=[2.5*inch], style=[('VALIGN',(0,0),(-1,-1),'MIDDLE')])
    ]], colWidths=[W*0.6, W*0.4])
    ht.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),DARK),
        ('TOPPADDING',(0,0),(-1,-1),22),('BOTTOMPADDING',(0,0),(-1,-1),22),
        ('LEFTPADDING',(0,0),(0,-1),18),('RIGHTPADDING',(-1,0),(-1,-1),18),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    elements.append(ht)

    ob = Table([[Paragraph(
        f"  Nettoyage Professionnel - 231 rue Saint-Honore, 75001 Paris - 06 22 66 53 08  ",
        S('ob',fontSize=8,textColor=WHITE,fontName='Helvetica-Bold',alignment=TA_CENTER)
    )]], colWidths=[W])
    ob.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),ORANGE),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    elements.append(ob)
    elements.append(Spacer(1,14))

    # STATUT badge
    sb = Table([[Paragraph(
        f"STATUT : {statut_labels.get(statut,'EN ATTENTE')}",
        S('sb',fontSize=11,textColor=WHITE,fontName='Helvetica-Bold',alignment=TA_CENTER)
    )]], colWidths=[W])
    sb.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),sc),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    elements.append(sb)
    elements.append(Spacer(1,14))

    # 2 colonnes emetteur/client
    def block(title,rows,color):
        bl=[]
        h=Table([[Paragraph(title,S('bh',fontSize=8,textColor=WHITE,fontName='Helvetica-Bold'))]],colWidths=[W*0.46])
        h.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),color),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LEFTPADDING',(0,0),(-1,-1),10)]))
        bl.append(h)
        for l,v in rows:
            r=Table([[Paragraph(l,S('bl',fontSize=9,textColor=GRAY,fontName='Helvetica')),Paragraph(str(v) if v else '-',S('bv',fontSize=9,textColor=DARK,fontName='Helvetica-Bold'))]],colWidths=[W*0.16,W*0.30])
            r.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),GRAY_LIGHT),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LEFTPADDING',(0,0),(0,-1),10),('LEFTPADDING',(1,0),(1,-1),4),('LINEBELOW',(0,0),(-1,-1),0.4,GRAY_BORDER)]))
            bl.append(r)
        return bl

    em=block("EMETTEUR",[("Societe:","Global Clean Home"),("Adresse:","231 rue Saint-Honore"),("Ville:","75001 Paris"),("Tel:","06 22 66 53 08"),("Email:","info@globalcleanhome.com")],SLATE)
    cl=block("CLIENT",[("Nom:",lead.get('name','-')),("Email:",lead.get('email','-')),("Tel:",lead.get('phone','-')),("Adresse:",lead.get('address','-'))],ORANGE)
    tc=Table([[Table([[e] for e in em],colWidths=[W*0.46]),Spacer(W*0.04,1),Table([[c] for c in cl],colWidths=[W*0.46])]],colWidths=[W*0.46,W*0.04,W*0.46])
    tc.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP')]))
    elements.append(tc)
    elements.append(Spacer(1,14))

    # PRESTATION
    sh=Table([[Paragraph("DETAIL DE LA PRESTATION",S('sh',fontSize=9,textColor=WHITE,fontName='Helvetica-Bold'))]],colWidths=[W])
    sh.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),SLATE),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),14)]))
    elements.append(sh)

    pt=Table([
        [Paragraph("Prestation",S('ph',fontSize=9,textColor=WHITE,fontName='Helvetica-Bold')),Paragraph("Montant",S('pm',fontSize=9,textColor=WHITE,fontName='Helvetica-Bold',alignment=TA_RIGHT))],
        [Paragraph(service,S('pl',fontSize=10,textColor=DARK,fontName='Helvetica-Bold')),Paragraph(f"{amount:,.2f} EUR",S('pa',fontSize=13,textColor=colors.HexColor('#ea580c'),fontName='Helvetica-Bold',alignment=TA_RIGHT))],
    ],colWidths=[W*0.72,W*0.28])
    pt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),SLATE),('TOPPADDING',(0,0),(-1,0),9),('BOTTOMPADDING',(0,0),(-1,0),9),('LEFTPADDING',(0,0),(-1,0),14),('RIGHTPADDING',(-1,0),(-1,0),14),
        ('BACKGROUND',(0,1),(-1,-1),WHITE),('TOPPADDING',(0,1),(-1,-1),14),('BOTTOMPADDING',(0,1),(-1,-1),14),('LEFTPADDING',(0,1),(-1,-1),14),('RIGHTPADDING',(-1,1),(-1,-1),14),
        ('LINEBELOW',(0,0),(-1,-1),0.5,GRAY_BORDER),('BOX',(0,0),(-1,-1),1,GRAY_BORDER),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    elements.append(pt)
    elements.append(Spacer(1,10))

    # TOTAL
    tot=Table([
        [Paragraph("MONTANT TOTAL",S('tl',fontSize=9,textColor=GRAY,fontName='Helvetica-Bold')),Paragraph(f"{amount:,.2f} EUR",S('ta',fontSize=22,textColor=ORANGE,fontName='Helvetica-Bold',alignment=TA_RIGHT))],
        [Paragraph("Micro-entreprise - TVA non applicable (art. 293B CGI)",S('tn',fontSize=8,textColor=GRAY,fontName='Helvetica')),
         Paragraph(f"Reference: {ref}",S('tr2',fontSize=8,textColor=GRAY,fontName='Helvetica',alignment=TA_RIGHT))],
    ],colWidths=[W*0.60,W*0.40])
    tot.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),GRAY_LIGHT),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),
        ('LEFTPADDING',(0,0),(-1,-1),14),('RIGHTPADDING',(0,0),(-1,-1),14),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEABOVE',(0,0),(-1,0),3,ORANGE),('BOX',(0,0),(-1,-1),0.5,GRAY_BORDER),
    ]))
    elements.append(tot)
    elements.append(Spacer(1,14))

    # PAIEMENT si en attente
    if statut == 'en_attente':
        pay=Table([[Paragraph(
            "COMMENT REGLER VOTRE FACTURE ?\nVirement bancaire, cheque ou carte bancaire.\nContactez-nous : info@globalcleanhome.com | 06 22 66 53 08",
            S('pay',fontSize=9,textColor=colors.HexColor('#92400e'),fontName='Helvetica',leading=14)
        )]],colWidths=[W])
        pay.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#fffbeb')),
            ('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),
            ('LEFTPADDING',(0,0),(-1,-1),14),
            ('BOX',(0,0),(-1,-1),1,colors.HexColor('#fde68a')),
        ]))
        elements.append(pay)
        elements.append(Spacer(1,14))

    # FOOTER
    ft=Table([[Paragraph(
        "Global Clean Home  |  231 rue Saint-Honore, 75001 Paris  |  06 22 66 53 08  |  info@globalcleanhome.com  |  www.globalcleanhome.com",
        S('ft',fontSize=7,textColor=colors.HexColor('#94a3b8'),fontName='Helvetica',alignment=TA_CENTER)
    )]],colWidths=[W])
    ft.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),DARK),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    elements.append(ft)

    doc.build(elements)
    return buffer.getvalue()

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
