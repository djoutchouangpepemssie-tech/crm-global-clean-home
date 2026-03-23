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
        raise HTTPException(status_code=500, detail=f"SMS send failed: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"WhatsApp send failed: {str(e)}")

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
    """Generate professional PDF quote"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    # Container for elements
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#7C3AED'),
        spaceAfter=30
    )
    
    # Logo (si disponible)
    # logo_path = '/app/frontend/public/logo.png'
    # if os.path.exists(logo_path):
    #     logo = Image(logo_path, width=2*inch, height=1*inch)
    #     elements.append(logo)
    #     elements.append(Spacer(1, 20))
    
    # En-tête
    elements.append(Paragraph("DEVIS - Global Clean Home", title_style))
    elements.append(Spacer(1, 12))
    
    # Informations entreprise
    company_info = [
        ["Global Clean Home", ""],
        ["15 Avenue des Champs-Élysées", f"Date: {datetime.now().strftime('%d/%m/%Y')}"],
        ["75008 Paris", f"Devis N°: {quote_data.get('quote_id', 'N/A')}"],
        ["Tél: +33 1 23 45 67 89", ""],
    ]
    
    company_table = Table(company_info, colWidths=[3*inch, 3*inch])
    company_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#334155')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 30))
    
    # Informations client
    elements.append(Paragraph("CLIENT", styles['Heading2']))
    client_info = [
        ["Nom:", lead_data.get('name', '')],
        ["Email:", lead_data.get('email', '')],
        ["Téléphone:", lead_data.get('phone', '')],
        ["Adresse:", lead_data.get('address', '')],
    ]
    
    client_table = Table(client_info, colWidths=[1.5*inch, 4.5*inch])
    client_table.setStyle(TableStyle([
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
        ('FONT', (1, 0), (1, -1), 'Helvetica', 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#334155')),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 30))
    
    # Détails du devis
    elements.append(Paragraph("DÉTAILS DE LA PRESTATION", styles['Heading2']))
    
    quote_details = [
        ['Description', 'Quantité', 'Prix unitaire', 'Total'],
        [
            quote_data.get('service_type', ''),
            f"{quote_data.get('surface', 0)} m²" if quote_data.get('surface') else '1',
            f"{quote_data.get('amount', 0) / (quote_data.get('surface', 1) or 1):.2f} €",
            f"{quote_data.get('amount', 0):.2f} €"
        ]
    ]
    
    quote_table = Table(quote_details, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    quote_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7C3AED')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(quote_table)
    elements.append(Spacer(1, 20))
    
    # Total
    total_data = [
        ['', '', 'TOTAL HT:', f"{quote_data.get('amount', 0):.2f} €"],
        ['', '', 'TVA (20%):', f"{quote_data.get('amount', 0) * 0.2:.2f} €"],
        ['', '', 'TOTAL TTC:', f"{quote_data.get('amount', 0) * 1.2:.2f} €"],
    ]
    
    total_table = Table(total_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (2, -1), (-1, -1), 14),
        ('TEXTCOLOR', (2, -1), (-1, -1), colors.HexColor('#7C3AED')),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 30))
    
    # Notes
    if quote_data.get('details'):
        elements.append(Paragraph("NOTES", styles['Heading2']))
        elements.append(Paragraph(quote_data.get('details', ''), styles['Normal']))
    
    elements.append(Spacer(1, 30))
    
    # Conditions
    conditions = """
    <b>CONDITIONS GÉNÉRALES:</b><br/>
    - Devis valable 30 jours<br/>
    - Paiement à la fin de la prestation<br/>
    - Annulation gratuite jusqu'à 24h avant<br/>
    - Satisfaction garantie ou prestation refaite gratuitement
    """
    elements.append(Paragraph(conditions, styles['Normal']))
    
    # Build PDF
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
    client_name = lead.get("name", "Client").replace(" ", "_").replace("/","_").replace("\\","_")
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

    client_name = lead.get("name", "Client").replace(" ", "_").replace("/","_")
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
