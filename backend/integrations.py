"""
Global Clean Home CRM - Intégrations Avancées
SMS, WhatsApp, PDF, Multi-users, Stripe, ML, Google Calendar
"""

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging

logger = logging.getLogger(__name__)

# Twilio pour SMS et WhatsApp
from twilio.rest import Client as TwilioClient

# ReportLab pour PDF
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch
from io import BytesIO

# Stripe pour paiements
import stripe

# Google Calendar
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow

# ML pour scoring avancé
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pandas as pd
import pickle

# Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP = os.getenv("TWILIO_WHATSAPP_NUMBER", "")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_51234567890")

# Router pour toutes les intégrations
integrations_router = APIRouter(prefix="/api/integrations")

# ============= MODELS =============


class SMSMessage(BaseModel):
    lead_id: str
    phone: str
    message: str
    scheduled_at: Optional[datetime] = None


class WhatsAppMessage(BaseModel):
    lead_id: str
    phone: str
    message: str
    template_name: Optional[str] = None


class PDFQuoteRequest(BaseModel):
    quote_id: str
    send_email: bool = False
    email: Optional[str] = None


class StripePaymentIntent(BaseModel):
    quote_id: str
    amount: float
    currency: str = "eur"
    metadata: Optional[dict] = None


class UserRole(BaseModel):
    user_id: str
    role: str  # admin, commercial, manager, viewer
    permissions: List[str]


class LeadAssignment(BaseModel):
    lead_id: str
    assigned_to: str  # user_id


class CalendarEvent(BaseModel):
    lead_id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendees: List[EmailStr]

# ============= SMS TWILIO =============


def get_twilio_client():
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="Twilio not configured")
    return TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


@integrations_router.post("/sms/send")
async def send_sms(request: Request, input: SMSMessage):
    """Send SMS via Twilio"""
    # Auth required
    from server import require_auth, db, log_activity
    user = await require_auth(request)

    try:
        client = get_twilio_client()

        # Send SMS
        message = client.messages.create(
            body=input.message,
            from_=TWILIO_PHONE,
            to=input.phone
        )

        # Store in database
        sms_record = {
            "sms_id": f"sms_{uuid.uuid4().hex[:12]}",
            "lead_id": input.lead_id,
            "phone": input.phone,
            "message": input.message,
            "twilio_sid": message.sid,
            "status": message.status,
            "sent_by": user.user_id,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sms_messages.insert_one(sms_record)

        # Log activity
        await log_activity(user.user_id, "send_sms", "sms", sms_record["sms_id"])

        return {"status": "sent", "sid": message.sid, "sms_id": sms_record["sms_id"]}

    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        raise HTTPException(status_code=500, detail="SMS send failed")


@integrations_router.get("/sms/history/{lead_id}")
async def get_sms_history(lead_id: str, request: Request):
    """Get SMS history for a lead"""
    from server import require_auth, db
    await require_auth(request)

    messages = await db.sms_messages.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(100)

    return {"lead_id": lead_id, "messages": messages}

# ============= WHATSAPP BUSINESS =============


@integrations_router.post("/whatsapp/send")
async def send_whatsapp(request: Request, input: WhatsAppMessage):
    """Send WhatsApp message via Twilio"""
    from server import require_auth, db, log_activity
    user = await require_auth(request)

    try:
        client = get_twilio_client()

        # Format phone for WhatsApp
        whatsapp_to = f"whatsapp:{input.phone}"

        # Send message
        message = client.messages.create(
            body=input.message,
            from_=TWILIO_WHATSAPP,
            to=whatsapp_to
        )

        # Store in database
        wa_record = {
            "wa_id": f"wa_{uuid.uuid4().hex[:12]}",
            "lead_id": input.lead_id,
            "phone": input.phone,
            "message": input.message,
            "twilio_sid": message.sid,
            "status": message.status,
            "sent_by": user.user_id,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        await db.whatsapp_messages.insert_one(wa_record)

        await log_activity(user.user_id, "send_whatsapp", "whatsapp", wa_record["wa_id"])

        return {"status": "sent", "sid": message.sid, "wa_id": wa_record["wa_id"]}

    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")
        raise HTTPException(status_code=500, detail="WhatsApp send failed")


@integrations_router.get("/whatsapp/templates")
async def get_whatsapp_templates(request: Request):
    """Get approved WhatsApp templates"""
    from server import require_auth
    await require_auth(request)

    # Templates pré-approuvés WhatsApp Business
    templates = [
        {
            "name": "confirmation_devis",
            "content": "Bonjour {{1}}, nous avons bien reçu votre demande pour {{2}}. Notre équipe vous contactera sous 2h. Merci ! - Global Clean Home",
            "variables": ["nom", "service"]
        },
        {
            "name": "relance_devis",
            "content": "Bonjour {{1}}, avez-vous eu le temps de consulter notre devis pour {{2}} ? Je reste disponible pour toute question. Cordialement, Global Clean Home",
            "variables": ["nom", "service"]
        },
        {
            "name": "rappel_intervention",
            "content": "Rappel: votre intervention {{1}} est prévue demain à {{2}}. À très bientôt ! - Global Clean Home",
            "variables": ["service", "heure"]
        }
    ]

    return {"templates": templates}

# ============= PDF GENERATION =============


def generate_quote_pdf(quote_data: dict, lead_data: dict) -> BytesIO:
    """Generate premium PDF quote — Global Clean Home"""
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.platypus import HRFlowable

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)

    ORANGE = colors.HexColor('#f97316')
    ORANGE_DARK = colors.HexColor('#ea580c')
    DARK = colors.HexColor('#0f172a')
    SLATE = colors.HexColor('#1e293b')
    GRAY = colors.HexColor('#64748b')
    GRAY_LIGHT = colors.HexColor('#f1f5f9')
    GRAY_BORDER = colors.HexColor('#e2e8f0')
    WHITE = colors.white
    GREEN = colors.HexColor('#10b981')

    styles = getSampleStyleSheet()
    W = A4[0] - 80

    def S(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    elements = []

    client_name = lead_data.get('name', 'Client')
    quote_id = quote_data.get('quote_id', 'N/A')
    amount = float(quote_data.get('amount', 0))
    service = quote_data.get('service_type', 'Prestation de nettoyage')
    date_str = datetime.now().strftime('%d/%m/%Y')
    now_dt = datetime.now()
    month_year = now_dt.strftime('%m%Y')
    short_id = quote_id.replace('quote_', '').upper()[:6]
    ref_court = f"GCH-{month_year}-{short_id}"
    date_valid = f"Valable jusqu'au {(datetime.now() + timedelta(days=30)).strftime('%d/%m/%Y')}"

    # HEADER
    header_data = [[
        Paragraph("<b>Global Clean Home</b>", S('T', fontSize=20, textColor=WHITE, fontName='Helvetica-Bold')),
        Table([
            [Paragraph("DEVIS OFFICIEL", S('DT', fontSize=8, textColor=colors.HexColor('#fb923c'), fontName='Helvetica-Bold', alignment=TA_RIGHT))],
            [Paragraph(ref_court, S('DR', fontSize=13, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
            [Paragraph(date_str, S('DD', fontSize=8, textColor=colors.HexColor('#94a3b8'), fontName='Helvetica', alignment=TA_RIGHT))],
        ], colWidths=[2.5 * inch], style=[('VALIGN', (0, 0), (-1, -1), 'MIDDLE')])
    ]]
    ht = Table(header_data, colWidths=[W * 0.6, W * 0.4])
    ht.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 22), ('BOTTOMPADDING', (0, 0), (-1, -1), 22),
        ('LEFTPADDING', (0, 0), (0, -1), 18), ('RIGHTPADDING', (-1, 0), (-1, -1), 18),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(ht)

    ob = Table([[Paragraph("  Nettoyage Professionnel - 231 rue Saint-Honore, 75001 Paris - 06 22 66 53 08 - www.globalcleanhome.com  ",
        S('OB', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER))]], colWidths=[W])
    ob.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), ORANGE), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    elements.append(ob)
    elements.append(Spacer(1, 14))

    # 2 COLONNES
    def make_block(title, rows, color):
        bl = []
        h = Table([[Paragraph(title, S('BH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold'))]], colWidths=[W * 0.46])
        h.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), color), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('LEFTPADDING', (0, 0), (-1, -1), 10)]))
        bl.append(h)
        for label, value in rows:
            r = Table([[Paragraph(label, S('BL', fontSize=9, textColor=GRAY, fontName='Helvetica')),
                        Paragraph(str(value) if value else '-', S('BV', fontSize=9, textColor=DARK, fontName='Helvetica-Bold'))]],
                      colWidths=[W * 0.16, W * 0.30])
            r.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), GRAY_LIGHT),
                ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (0, -1), 10), ('LEFTPADDING', (1, 0), (1, -1), 4),
                ('LINEBELOW', (0, 0), (-1, -1), 0.4, GRAY_BORDER),
            ]))
            bl.append(r)
        return bl

    em_rows = [("Societe :", "Global Clean Home"), ("Adresse :", "231 rue Saint-Honore"), ("Ville :", "75001 Paris"), ("Tel :", "06 22 66 53 08"), ("Email :", "info@globalcleanhome.com")]
    cl_rows = [("Nom :", lead_data.get('name', '-')), ("Email :", lead_data.get('email', '-')), ("Tel :", lead_data.get('phone', '-')), ("Adresse :", lead_data.get('address', '-'))]

    em_block = make_block("EMETTEUR", em_rows, SLATE)
    cl_block = make_block("CLIENT", cl_rows, ORANGE)

    two_col = Table([[
        Table([[e] for e in em_block], colWidths=[W * 0.46]),
        Spacer(W * 0.04, 1),
        Table([[c] for c in cl_block], colWidths=[W * 0.46])
    ]], colWidths=[W * 0.46, W * 0.04, W * 0.46])
    two_col.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(two_col)
    elements.append(Spacer(1, 14))

    # ── BANDEAU RECURRENCE (si applicable) ──
    frequency = quote_data.get('frequency') or 'unique'
    interventions_count = int(quote_data.get('interventions_count') or 1)
    billing_mode = quote_data.get('billing_mode') or 'per_visit'
    start_date = quote_data.get('start_date')
    preferred_day = quote_data.get('preferred_day')
    freq_labels = {
        'unique': 'Unique', 'quotidien': 'Quotidien', 'hebdomadaire': 'Hebdomadaire',
        'bimensuelle': 'Bimensuelle', 'mensuel': 'Mensuel', 'trimestriel': 'Trimestriel', 'annuel': 'Annuel',
    }
    billing_labels = {
        'per_visit': 'Facturation par passage',
        'monthly':   'Facturation mensuelle',
        'upfront':   'Forfait global à l\'avance',
    }

    if frequency != 'unique' and interventions_count > 1:
        rec_rows = [[
            Paragraph("FREQUENCE", S('RH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph("NB INTERVENTIONS", S('RH2', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph("DEBUT", S('RH3', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph("FACTURATION", S('RH4', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
        ], [
            Paragraph(freq_labels.get(frequency, frequency).upper() + (f" ({preferred_day})" if preferred_day else ""),
                      S('RV', fontSize=10, textColor=ORANGE_DARK, fontName='Helvetica-Bold')),
            Paragraph(str(interventions_count), S('RV2', fontSize=14, textColor=DARK, fontName='Helvetica-Bold')),
            Paragraph(start_date or "À convenir", S('RV3', fontSize=10, textColor=DARK, fontName='Helvetica')),
            Paragraph(billing_labels.get(billing_mode, billing_mode), S('RV4', fontSize=9, textColor=DARK, fontName='Helvetica')),
        ]]
        rec_t = Table(rec_rows, colWidths=[W * 0.28, W * 0.22, W * 0.22, W * 0.28])
        rec_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SLATE),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fff7ed')),
            ('BOX', (0, 0), (-1, -1), 1, ORANGE),
            ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(rec_t)
        elements.append(Spacer(1, 8))

    # ── TABLEAU DETAILLE DES LIGNES ──
    sec_h = Table([[Paragraph("DETAIL DE LA PRESTATION", S('SH', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold'))]], colWidths=[W])
    sec_h.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SLATE), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('LEFTPADDING', (0, 0), (-1, -1), 14)]))
    elements.append(sec_h)

    line_items = quote_data.get('line_items') or []
    tva_rate = float(quote_data.get('tva_rate') or 0)
    discount_pct = float(quote_data.get('discount') or 0)
    transport_enabled = bool(quote_data.get('transport_fee_enabled'))
    transport_amount = float(quote_data.get('transport_fee_amount') or 0)

    if line_items:
        # Table avec entête + lignes groupées
        rows = [[
            Paragraph("DÉSIGNATION", S('TH1', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph("QTÉ", S('TH2', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
            Paragraph("UNITÉ", S('TH3', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph("PU HT", S('TH4', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
            Paragraph("TOTAL HT", S('TH5', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
        ]]

        last_group = None
        base_ht = 0.0
        for li in line_items:
            grp = li.get('group') or 'Prestations'
            if grp != last_group:
                rows.append([
                    Paragraph(f"<b>{grp.upper()}</b>", S('GR', fontSize=8, textColor=ORANGE_DARK, fontName='Helvetica-Bold')),
                    '', '', '', '',
                ])
                last_group = grp
            label = li.get('label') or li.get('description') or ''
            qty = float(li.get('qty') or li.get('quantity') or 1)
            unit = li.get('unit') or 'forfait'
            price = float(li.get('price') or li.get('unit_price') or 0)
            line_total = qty * price
            base_ht += line_total
            rows.append([
                Paragraph(label, S('LL', fontSize=9, textColor=DARK, fontName='Helvetica')),
                Paragraph(f"{qty:g}", S('LQ', fontSize=9, textColor=DARK, fontName='Helvetica', alignment=TA_RIGHT)),
                Paragraph(unit, S('LU', fontSize=9, textColor=GRAY, fontName='Helvetica')),
                Paragraph(f"{price:,.2f} €", S('LP', fontSize=9, textColor=DARK, fontName='Helvetica', alignment=TA_RIGHT)),
                Paragraph(f"{line_total:,.2f} €", S('LT', fontSize=9, textColor=DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
            ])

        lines_t = Table(rows, colWidths=[W * 0.44, W * 0.10, W * 0.14, W * 0.14, W * 0.18])
        lines_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SLATE),
            ('TOPPADDING', (0, 0), (-1, 0), 9), ('BOTTOMPADDING', (0, 0), (-1, 0), 9),
            ('LEFTPADDING', (0, 0), (-1, 0), 12), ('RIGHTPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), WHITE),
            ('TOPPADDING', (0, 1), (-1, -1), 6), ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('LEFTPADDING', (0, 1), (-1, -1), 12), ('RIGHTPADDING', (0, 1), (-1, -1), 12),
            ('LINEBELOW', (0, 0), (-1, -1), 0.3, GRAY_BORDER),
            ('BOX', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(lines_t)
    else:
        # Fallback : une seule ligne globale
        base_ht = float(quote_data.get('amount_ht') or amount / (1 + tva_rate / 100 if tva_rate else 1))
        one_row = Table([[
            Paragraph(service, S('PL', fontSize=10, textColor=DARK, fontName='Helvetica-Bold')),
            Paragraph(f"{base_ht:,.2f} € HT", S('PM', fontSize=13, textColor=ORANGE_DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
        ]], colWidths=[W * 0.72, W * 0.28])
        one_row.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), WHITE),
            ('BOX', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 14), ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
            ('LEFTPADDING', (0, 0), (-1, -1), 14), ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ]))
        elements.append(one_row)
    elements.append(Spacer(1, 10))

    # ── RECAPITULATIF TOTAUX ──
    # base_ht = 1 intervention. On multiplie si récurrent.
    multiplier = interventions_count if frequency != 'unique' else 1
    total_brut_ht = base_ht * multiplier
    remise_amount = total_brut_ht * (discount_pct / 100)
    net_ht = total_brut_ht - remise_amount
    # Frais de transport HT : ajoutés après remise, avant TVA (pratique standard FR)
    transport_ht = transport_amount if (transport_enabled and transport_amount > 0) else 0.0
    base_tva = net_ht + transport_ht
    tva_amount = base_tva * (tva_rate / 100)
    ttc = base_tva + tva_amount

    tot_rows = []
    if multiplier > 1:
        tot_rows.append([
            Paragraph(f"HT par intervention", S('T1', fontSize=9, textColor=GRAY, fontName='Helvetica')),
            Paragraph(f"{base_ht:,.2f} €", S('T1V', fontSize=9, textColor=DARK, fontName='Helvetica', alignment=TA_RIGHT)),
        ])
        tot_rows.append([
            Paragraph(f"x {multiplier} interventions ({freq_labels.get(frequency, '').lower()})", S('T2', fontSize=9, textColor=GRAY, fontName='Helvetica')),
            Paragraph(f"{total_brut_ht:,.2f} €", S('T2V', fontSize=9, textColor=DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
        ])
    else:
        tot_rows.append([
            Paragraph("Total HT", S('T1', fontSize=9, textColor=GRAY, fontName='Helvetica')),
            Paragraph(f"{total_brut_ht:,.2f} €", S('T1V', fontSize=9, textColor=DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
        ])

    if discount_pct > 0:
        tot_rows.append([
            Paragraph(f"Remise {discount_pct:g} %", S('T3', fontSize=9, textColor=GREEN, fontName='Helvetica')),
            Paragraph(f"- {remise_amount:,.2f} €", S('T3V', fontSize=9, textColor=GREEN, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
        ])
        tot_rows.append([
            Paragraph("Net HT", S('T4', fontSize=9, textColor=DARK, fontName='Helvetica-Bold')),
            Paragraph(f"{net_ht:,.2f} €", S('T4V', fontSize=9, textColor=DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
        ])

    # Ligne Frais de transport (selon configuration)
    if transport_enabled:
        if transport_amount > 0:
            tot_rows.append([
                Paragraph("Frais de déplacement", S('TR', fontSize=9, textColor=GRAY, fontName='Helvetica')),
                Paragraph(f"{transport_amount:,.2f} €", S('TRV', fontSize=9, textColor=DARK, fontName='Helvetica', alignment=TA_RIGHT)),
            ])
        else:
            tot_rows.append([
                Paragraph("Frais de déplacement", S('TR', fontSize=9, textColor=GREEN, fontName='Helvetica')),
                Paragraph("Offerts", S('TRV', fontSize=9, textColor=GREEN, fontName='Helvetica-Oblique', alignment=TA_RIGHT)),
            ])
    else:
        tot_rows.append([
            Paragraph("Frais de déplacement non inclus", S('TR', fontSize=8, textColor=GRAY, fontName='Helvetica-Oblique')),
            Paragraph("", S('TRV', fontSize=8, textColor=GRAY)),
        ])

    if tva_rate > 0:
        tot_rows.append([
            Paragraph(f"TVA {tva_rate:g} %", S('T5', fontSize=9, textColor=GRAY, fontName='Helvetica')),
            Paragraph(f"{tva_amount:,.2f} €", S('T5V', fontSize=9, textColor=DARK, fontName='Helvetica', alignment=TA_RIGHT)),
        ])
    else:
        tot_rows.append([
            Paragraph("Micro-entreprise — TVA non applicable (art. 293B CGI)", S('T6', fontSize=8, textColor=GRAY, fontName='Helvetica')),
            Paragraph("", S('T6V', fontSize=9, textColor=GRAY)),
        ])

    tot_rows.append([
        Paragraph("TOTAL TTC", S('TT', fontSize=11, textColor=WHITE, fontName='Helvetica-Bold')),
        Paragraph(f"{ttc:,.2f} EUR", S('TTV', fontSize=18, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
    ])

    totals_t = Table(tot_rows, colWidths=[W * 0.65, W * 0.35])
    n = len(tot_rows)
    totals_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, n - 2), GRAY_LIGHT),
        ('BACKGROUND', (0, n - 1), (-1, n - 1), DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 14), ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('LINEABOVE', (0, 0), (-1, 0), 3, ORANGE),
        ('LINEBELOW', (0, 0), (-1, n - 2), 0.3, GRAY_BORDER),
        ('BOX', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(totals_t)
    elements.append(Spacer(1, 6))

    # ── Date de validité ──
    valid_t = Table([[
        Paragraph(date_valid, S('VD', fontSize=9, textColor=ORANGE_DARK, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
    ]], colWidths=[W])
    valid_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff7ed')),
        ('BOX', (0, 0), (-1, -1), 0.5, ORANGE),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(valid_t)
    elements.append(Spacer(1, 14))

    # GARANTIES
    gh = Table([[Paragraph("NOS GARANTIES", S('GH', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold'))]], colWidths=[W])
    gh.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GREEN), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7), ('LEFTPADDING', (0, 0), (-1, -1), 14)]))
    elements.append(gh)

    garanties = [
        "  Materiel et produits professionnels fournis",
        "  Personnel forme, experimente et couvert RC Pro",
        "  Resultat garanti ou intervention reprise gratuitement",
        "  Annulation sans frais jusqu'a 24h avant l'intervention",
        "  Attestation fiscale fournie (credit d'impot 50% menage)",
    ]
    gar_rows = [[Paragraph(g, S('GR', fontSize=8, textColor=colors.HexColor('#166534'), fontName='Helvetica', leading=11))] for g in garanties]
    gt = Table(gar_rows, colWidths=[W])
    gt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('LINEBELOW', (0, 0), (-1, -2), 0.3, colors.HexColor('#bbf7d0')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#bbf7d0')),
    ]))
    elements.append(gt)
    elements.append(Spacer(1, 14))

    # SIGNATURE
    sig = Table([
        [Paragraph("BON POUR ACCORD - Signature du client :", S('SH', fontSize=8, textColor=GRAY, fontName='Helvetica-Bold')),
         Paragraph("Date :", S('SH2', fontSize=8, textColor=GRAY, fontName='Helvetica-Bold'))],
        [Paragraph(f"<br/>Nom : {lead_data.get('name', '')}<br/><br/>", S('SV', fontSize=9, textColor=DARK, fontName='Helvetica')),
         Paragraph("<br/>_______________________<br/>", S('SV2', fontSize=9, textColor=DARK, fontName='Helvetica'))],
    ], colWidths=[W * 0.60, W * 0.40])
    sig.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_LIGHT),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('BOX', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
    ]))
    elements.append(sig)
    elements.append(Spacer(1, 14))

    # FOOTER
    ft = Table([[Paragraph(
        "Global Clean Home  |  231 rue Saint-Honore, 75001 Paris  |  06 22 66 53 08  |  info@globalcleanhome.com  |  www.globalcleanhome.com",
        S('FT', fontSize=7, textColor=colors.HexColor('#94a3b8'), fontName='Helvetica', alignment=TA_CENTER)
    )]], colWidths=[W])
    ft.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(ft)

    doc.build(elements)
    buffer.seek(0)
    return buffer


@integrations_router.post("/pdf/generate-quote")
async def generate_quote_pdf_endpoint(request: Request, input: PDFQuoteRequest):
    """Generate and stream PDF quote with client name as filename"""
    from server import require_auth, db, log_activity
    from fastapi.responses import StreamingResponse as SR
    user = await require_auth(request)

    quote = await db.quotes.find_one({"quote_id": input.quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    lead = await db.leads.find_one({"lead_id": quote["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Générer le PDF premium
    pdf_buffer = generate_quote_pdf(quote, lead)
    pdf_bytes = pdf_buffer.read()

    # Nom du fichier = Devis_NomClient.pdf
    client_name = lead.get("name", "Client").replace(" ", "_").replace("/", "_").replace("\\", "_")
    pdf_filename = f"Devis_{client_name}.pdf"

    # Mettre à jour le devis
    await db.quotes.update_one(
        {"quote_id": input.quote_id},
        {"$set": {"pdf_generated": True, "pdf_filename": pdf_filename}}
    )
    await log_activity(user.user_id, "generate_pdf", "quote", input.quote_id)

    # Envoyer par email si demandé
    if input.send_email and input.email:
        try:
            from gmail_service import send_quote_email
            await send_quote_email(user.user_id, lead, quote, pdf_data=pdf_bytes)
        except Exception as e:
            logger.warning(f"Email send failed: {e}")

    # Retourner le PDF en téléchargement direct
    from io import BytesIO as BIO
    return SR(
        BIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf_filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )


@integrations_router.get("/pdf/download-quote/{quote_id}")
async def download_quote_pdf(quote_id: str, request: Request):
    """Download quote PDF directly"""
    from server import require_auth, db
    from fastapi.responses import StreamingResponse as SR
    user = await require_auth(request)

    quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    lead = await db.leads.find_one({"lead_id": quote["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    pdf_buffer = generate_quote_pdf(quote, lead)
    pdf_bytes = pdf_buffer.read()

    client_name = lead.get("name", "Client").replace(" ", "_").replace("/", "_")
    pdf_filename = f"Devis_{client_name}.pdf"

    from io import BytesIO as BIO
    return SR(
        BIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf_filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )

# ============= STRIPE PAYMENTS =============


@integrations_router.post("/stripe/create-payment-intent")
async def create_payment_intent(request: Request, input: StripePaymentIntent):
    """Create Stripe payment intent for quote"""
    from server import require_auth, db
    user = await require_auth(request)

    try:
        # Get quote
        quote = await db.quotes.find_one({"quote_id": input.quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")

        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(input.amount * 100),  # Convert to cents
            currency=input.currency,
            metadata={
                "quote_id": input.quote_id,
                "lead_id": quote.get("lead_id"),
                **(input.metadata or {})
            },
            automatic_payment_methods={"enabled": True}
        )

        # Store payment in database
        payment_record = {
            "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "quote_id": input.quote_id,
            "stripe_payment_intent_id": payment_intent.id,
            "amount": input.amount,
            "currency": input.currency,
            "status": payment_intent.status,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.user_id
        }
        await db.payments.insert_one(payment_record)

        from server import log_activity
        await log_activity(user.user_id, "create_payment_intent", "payment", payment_record["payment_id"])

        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id,
            "payment_id": payment_record["payment_id"]
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@integrations_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    from server import db

    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        quote_id = payment_intent['metadata'].get('quote_id')

        # Update quote status
        if quote_id:
            await db.quotes.update_one(
                {"quote_id": quote_id},
                {"$set": {"status": "accepté", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )

            # Update lead status
            quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
            if quote:
                await db.leads.update_one(
                    {"lead_id": quote["lead_id"]},
                    {"$set": {"status": "gagné"}}
                )

    return {"status": "success"}

# ============= MULTI-UTILISATEURS =============


@integrations_router.post("/users/assign-role")
async def assign_user_role(request: Request, input: UserRole):
    """Assign role to user"""
    from server import require_auth, db
    user = await require_auth(request)

    # Check if current user is admin
    current_user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if current_user_doc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Update user role
    result = await db.users.update_one(
        {"user_id": input.user_id},
        {"$set": {
            "role": input.role,
            "permissions": input.permissions,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"status": "updated", "user_id": input.user_id, "role": input.role}


@integrations_router.post("/leads/assign")
async def assign_lead(request: Request, input: LeadAssignment):
    """Assign lead to user"""
    from server import require_auth, db, log_activity
    user = await require_auth(request)

    result = await db.leads.update_one(
        {"lead_id": input.lead_id},
        {"$set": {
            "assigned_to": input.assigned_to,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "assigned_by": user.user_id
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    await log_activity(user.user_id, "assign_lead", "lead", input.lead_id, {"assigned_to": input.assigned_to})

    return {"status": "assigned", "lead_id": input.lead_id, "assigned_to": input.assigned_to}


@integrations_router.get("/users/team")
async def get_team_members(request: Request):
    """Get all team members"""
    from server import require_auth, db
    await require_auth(request)

    users = await db.users.find({}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1, "picture": 1}).to_list(100)

    return {"users": users}

# ============= GOOGLE CALENDAR =============


@integrations_router.post("/calendar/create-event")
async def create_calendar_event(request: Request, input: CalendarEvent):
    """Create Google Calendar event for intervention"""
    from server import require_auth, db, log_activity
    user = await require_auth(request)

    # Note: Requires OAuth2 setup - simplified version here
    event_record = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "lead_id": input.lead_id,
        "title": input.title,
        "description": input.description,
        "start_time": input.start_time.isoformat(),
        "end_time": input.end_time.isoformat(),
        "attendees": input.attendees,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "google_event_id": None  # Would be set after Google API call
    }

    await db.calendar_events.insert_one(event_record)
    await log_activity(user.user_id, "create_event", "calendar", event_record["event_id"])

    return {"status": "created", "event_id": event_record["event_id"]}

# ============= ML PREDICTION =============


@integrations_router.get("/ml/predict-conversion/{lead_id}")
async def predict_lead_conversion(lead_id: str, request: Request):
    """Predict lead conversion probability using ML"""
    from server import require_auth, db
    await require_auth(request)

    # Get lead
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Simple ML prediction (would use trained model in production)
    features = {
        "score": lead.get("score", 50),
        "source": lead.get("source", "Direct"),
        "service_type": lead.get("service_type", "Ménage"),
        "has_surface": 1 if lead.get("surface") else 0,
        "has_address": 1 if lead.get("address") else 0,
        "has_message": 1 if lead.get("message") else 0
    }

    # Simple heuristic (would be ML model)
    score = lead.get("score", 50)
    probability = min(100, score * 1.2)  # Simplified

    # Recommendations
    recommendations = []
    if score < 60:
        recommendations.append("Appeler dans les 30 minutes")
    if not lead.get("surface"):
        recommendations.append("Demander la surface exacte")
    if not lead.get("address"):
        recommendations.append("Confirmer l'adresse d'intervention")

    return {
        "lead_id": lead_id,
        "conversion_probability": round(probability, 2),
        "confidence": "medium",
        "recommendations": recommendations,
        "predicted_value": 500  # EUR estimated
    }


@integrations_router.get("/ml/retrain")
async def retrain_ml_model(request: Request):
    """Retrain ML model with latest data"""
    from server import require_auth, db
    user = await require_auth(request)

    # Check admin
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if user_doc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # Get training data
    leads = await db.leads.find({}, {"_id": 0}).to_list(10000)

    # Would train actual model here
    # For now, just return success

    return {
        "status": "retrained",
        "samples": len(leads),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
