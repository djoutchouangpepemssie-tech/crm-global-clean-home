"""
Global Clean Home CRM - Email Service (SendGrid)
Handles all outgoing emails: magic links, notifications, invoices, quotes.
"""
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
from typing import Optional
import os
import logging
import base64

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@globalcleanhome.com")
SENDER_NAME = os.environ.get("SENDER_NAME", "Global Clean Home")
SITE_URL = os.environ.get("SITE_URL", "https://www.globalcleanhome.com")


def _get_client():
    if not SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured")
        return None
    return SendGridAPIClient(SENDGRID_API_KEY)


def _base_html(content: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #7C3AED, #6D28D9); padding: 32px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }}
            .header p {{ color: #DDD6FE; margin: 8px 0 0; font-size: 14px; }}
            .body {{ padding: 32px; }}
            .body h2 {{ color: #1e293b; font-size: 20px; margin-top: 0; }}
            .body p {{ color: #475569; line-height: 1.6; font-size: 15px; }}
            .btn {{ display: inline-block; background: #7C3AED; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }}
            .btn:hover {{ background: #6D28D9; }}
            .footer {{ padding: 24px 32px; background: #f8fafc; text-align: center; }}
            .footer p {{ color: #94a3b8; font-size: 12px; margin: 4px 0; }}
            .info-box {{ background: #f8fafc; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }}
            .info-box p {{ margin: 4px 0; }}
            .amount {{ font-size: 28px; font-weight: 700; color: #7C3AED; }}
        </style>
    </head>
    <body>
        <div style="padding: 24px;">
            <div class="container">
                <div class="header">
                    <h1>Global Clean Home</h1>
                    <p>Services de nettoyage professionnel</p>
                </div>
                <div class="body">
                    {content}
                </div>
                <div class="footer">
                    <p>Global Clean Home - Services de nettoyage professionnel</p>
                    <p>Cet email a ete envoye automatiquement. Ne repondez pas directement.</p>
                    <p><a href="{SITE_URL}" style="color: #7C3AED; text-decoration: none;">{SITE_URL}</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def send_email(to: str, subject: str, html_content: str, attachment_data: Optional[bytes] = None, attachment_name: Optional[str] = None) -> bool:
    """Send an email via SendGrid. Returns True on success."""
    sg = _get_client()
    if not sg:
        logger.info(f"[EMAIL MOCK] To: {to}, Subject: {subject}")
        return False

    message = Mail(
        from_email=(SENDER_EMAIL, SENDER_NAME),
        to_emails=to,
        subject=subject,
        html_content=html_content,
    )

    if attachment_data and attachment_name:
        encoded = base64.b64encode(attachment_data).decode()
        attachment = Attachment(
            FileContent(encoded),
            FileName(attachment_name),
            FileType("application/pdf"),
            Disposition("attachment"),
        )
        message.attachment = attachment

    try:
        response = sg.send(message)
        logger.info(f"Email sent to {to}: status={response.status_code}")
        return response.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f"SendGrid error sending to {to}: {e}")
        return False


def send_magic_link(to: str, name: str, token: str, portal_base_url: str) -> bool:
    """Send magic link for client portal access."""
    link = f"{portal_base_url}/portal?token={token}"
    content = f"""
    <h2>Bonjour {name},</h2>
    <p>Vous avez demande l'acces a votre espace client Global Clean Home.</p>
    <p>Cliquez sur le bouton ci-dessous pour acceder a votre espace :</p>
    <p style="text-align: center;">
        <a href="{link}" class="btn">Acceder a mon espace client</a>
    </p>
    <p style="font-size: 13px; color: #94a3b8;">Ce lien est valable 24 heures. Si vous n'avez pas demande cet acces, ignorez cet email.</p>
    """
    return send_email(to, "Votre acces Global Clean Home", _base_html(content))


def send_quote_email(to: str, name: str, quote_id: str, amount: float, service_type: str, portal_base_url: str, pdf_data: Optional[bytes] = None) -> bool:
    """Send quote to client."""
    amount_ttc = amount * 1.2
    content = f"""
    <h2>Bonjour {name},</h2>
    <p>Nous avons le plaisir de vous transmettre votre devis pour notre service de <strong>{service_type}</strong>.</p>
    <div class="info-box">
        <p><strong>Reference :</strong> {quote_id}</p>
        <p><strong>Service :</strong> {service_type}</p>
        <p><strong>Montant TTC :</strong> <span class="amount">{amount_ttc:,.2f} EUR</span></p>
    </div>
    <p>Vous pouvez consulter et accepter ce devis depuis votre espace client :</p>
    <p style="text-align: center;">
        <a href="{portal_base_url}/portal" class="btn">Voir mon devis</a>
    </p>
    <p>N'hesitez pas a nous contacter pour toute question.</p>
    """
    return send_email(
        to,
        f"Votre devis Global Clean Home - {quote_id}",
        _base_html(content),
        attachment_data=pdf_data,
        attachment_name=f"devis_{quote_id}.pdf" if pdf_data else None,
    )


def send_invoice_email(to: str, name: str, invoice_id: str, amount_ttc: float, portal_base_url: str, pdf_data: Optional[bytes] = None) -> bool:
    """Send invoice to client."""
    content = f"""
    <h2>Bonjour {name},</h2>
    <p>Veuillez trouver ci-joint votre facture.</p>
    <div class="info-box">
        <p><strong>Facture N deg :</strong> {invoice_id}</p>
        <p><strong>Montant TTC :</strong> <span class="amount">{amount_ttc:,.2f} EUR</span></p>
    </div>
    <p>Vous pouvez payer cette facture en ligne depuis votre espace client :</p>
    <p style="text-align: center;">
        <a href="{portal_base_url}/portal" class="btn">Payer ma facture</a>
    </p>
    <p>Merci pour votre confiance.</p>
    """
    return send_email(
        to,
        f"Facture Global Clean Home - {invoice_id}",
        _base_html(content),
        attachment_data=pdf_data,
        attachment_name=f"facture_{invoice_id}.pdf" if pdf_data else None,
    )


def send_intervention_reminder(to: str, name: str, date: str, time: str, service_type: str, address: str) -> bool:
    """Send intervention reminder to client."""
    content = f"""
    <h2>Rappel d'intervention</h2>
    <p>Bonjour {name},</p>
    <p>Nous vous rappelons votre intervention prevue prochainement :</p>
    <div class="info-box">
        <p><strong>Service :</strong> {service_type}</p>
        <p><strong>Date :</strong> {date}</p>
        <p><strong>Heure :</strong> {time}</p>
        <p><strong>Adresse :</strong> {address}</p>
    </div>
    <p>Notre equipe sera presente a l'heure convenue. En cas d'empechement, merci de nous prevenir au plus vite.</p>
    """
    return send_email(to, f"Rappel : intervention du {date}", _base_html(content))


def send_notification_email(to: str, name: str, subject: str, message: str) -> bool:
    """Send a generic notification email."""
    content = f"""
    <h2>Bonjour {name},</h2>
    <p>{message}</p>
    """
    return send_email(to, subject, _base_html(content))


def get_sendgrid_status() -> dict:
    """Check if SendGrid is properly configured."""
    return {
        "configured": bool(SENDGRID_API_KEY),
        "sender_email": SENDER_EMAIL,
        "sender_name": SENDER_NAME,
    }
