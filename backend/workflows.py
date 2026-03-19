from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import asyncio

logger = logging.getLogger(__name__)

SERVICE_LABELS = {
    'menage-domicile': 'Ménage à Domicile',
    'nettoyage-canape': 'Nettoyage de Canapé',
    'nettoyage-matelas': 'Nettoyage de Matelas',
    'nettoyage-tapis': 'Nettoyage de Tapis',
    'nettoyage-bureaux': 'Nettoyage de Bureaux',
    'Menage': 'Ménage à Domicile',
    'Canape': 'Nettoyage de Canapé',
    'Matelas': 'Nettoyage de Matelas',
    'Tapis': 'Nettoyage de Tapis',
    'Bureaux': 'Nettoyage de Bureaux',
}
workflows_router = APIRouter(prefix="/api/workflows", tags=["workflows"])

_db = None

def init_workflows_db(database):
    global _db
    _db = database

# ============ MODELS ============

class WorkflowTrigger(BaseModel):
    type: str  # new_lead, score_change, status_change, time_delay, quote_sent, quote_accepted
    conditions: Optional[Dict] = {}

class WorkflowAction(BaseModel):
    type: str  # send_email, create_task, change_status, send_notification, wait
    config: Optional[Dict] = {}
    delay_hours: Optional[int] = 0

class WorkflowStep(BaseModel):
    id: str
    action: WorkflowAction
    next_step_id: Optional[str] = None
    condition_true_step: Optional[str] = None
    condition_false_step: Optional[str] = None

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    trigger: WorkflowTrigger
    steps: List[Dict]
    is_active: bool = True

# ============ EMAIL TEMPLATES HUMAINS ============

HUMAN_EMAIL_TEMPLATES = {
    "new_lead_welcome": {
        "subject": "Votre demande de devis - Global Clean Home",
        "body": """Bonjour {prenom},

Nous avons bien reçu votre demande de devis pour {service} et nous vous en remercions chaleureusement.

Notre équipe prend votre demande très au sérieux et s'engage à vous fournir un devis personnalisé dans les meilleurs délais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RÉCAPITULATIF DE VOTRE DEMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service demandé : {service}
Délai de réponse : Sous 24h ouvrées
Conseiller dédié : Merylis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗓️ LA SUITE DE VOTRE DEMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Analyse de votre demande
     Notre équipe étudie attentivement vos besoins
     pour vous préparer une offre sur mesure.

2️⃣  Envoi de votre devis personnalisé
     Vous recevrez un devis détaillé et transparent,
     sans frais cachés.

3️⃣  Prise de contact par votre conseiller
     Merylis vous appellera pour répondre à toutes
     vos questions et planifier l'intervention.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

En attendant, n'hésitez pas à nous contacter directement :

📞 06 22 66 53 08
📧 contact@globalcleanhome.com
🌐 www.globalcleanhome.com

Merci de votre confiance. Nous mettons tout en œuvre
pour vous offrir un service d'excellence.

Cordialement,
L'équipe Global Clean Home
Nettoyage professionnel à Paris & Île-de-France"""
    },
    "merylis_followup": {
        "subject": "Re: Votre demande {service} - je m'en occupe personnellement",
        "body": """Bonjour {prenom},

Je viens de recevoir votre demande et je voulais vous répondre personnellement.

Votre demande pour **{service}** est bien notée. Je m'en occupe personnellement et je reviens vers vous très rapidement avec une estimation détaillée.

Une question rapide pour mieux vous conseiller : est-ce pour une intervention unique ou vous cherchez quelque chose de régulier ?

N'hésitez pas à m'appeler directement, je décroche toujours 😊

À très vite,
Merylis
Global Clean Home
📞 06 22 66 53 08"""
    },
    "relance_24h": {
        "subject": "Re: Votre demande — j'ai une question",
        "body": """Bonjour {prenom},

J'espère que vous allez bien.

Je voulais m'assurer que vous avez bien reçu mon message d'hier concernant votre demande de {service}.

Je sais que vous êtes certainement très occupé(e), donc je voulais juste confirmer que je suis toujours disponible pour vous aider. J'ai quelques créneaux libres cette semaine si vous souhaitez qu'on intervienne rapidement.

N'hésitez pas à me répondre directement ou à m'appeler — je décroche toujours.

Bonne journée,
Merylis
📞 06 22 66 53 08"""
    },
    "relance_48h": {
        "subject": "Dernière tentative — {service}",
        "body": """Bonjour {prenom},

Je me permets de vous écrire une dernière fois car je ne voudrais pas vous laisser sans solution.

J'imagine que vous avez peut-être trouvé quelqu'un d'autre, ou que les circonstances ont changé — et c'est tout à fait normal.

Si jamais vous avez toujours besoin d'aide pour votre {service}, mon offre reste valable. Sinon, je vous souhaite une excellente journée et à peut-être une prochaine fois !

Avec mes meilleures salutations,
Merylis
Global Clean Home"""
    },
    "devis_envoye": {
        "subject": "Re: Votre devis — quelques précisions",
        "body": """Bonjour {prenom},

Comme promis, voici votre devis personnalisé pour {service}.

J'ai essayé d'être le plus précis possible dans mon estimation. Si vous avez des questions sur certains postes ou si vous souhaitez ajuster quelque chose, dites-le moi — je suis très flexible.

Une petite précision importante : nous travaillons uniquement avec des produits écologiques et certifiés, donc votre intérieur sera impeccable sans produits chimiques agressifs 🌿

Vous pouvez me répondre directement ici ou m'appeler si c'est plus simple.

Bonne journée,
Merylis
📞 06 22 66 53 08"""
    },
    "devis_relance": {
        "subject": "Re: Votre devis — avez-vous eu le temps d'y jeter un œil ?",
        "body": """Bonjour {prenom},

Je voulais juste prendre de vos nouvelles suite au devis que je vous ai envoyé.

Pas de pression du tout — je voulais juste m'assurer qu'il ne s'est pas perdu dans votre boîte mail ! Ces choses arrivent parfois 😊

Si vous avez des questions ou si vous souhaitez qu'on ajuste quelque chose, je suis là.

Bonne continuation,
Merylis"""
    },
    "hot_lead_urgent": {
        "subject": "Votre demande — je peux intervenir cette semaine",
        "body": """Bonjour {prenom},

Excellente nouvelle — j'ai un créneau disponible cette semaine qui pourrait parfaitement correspondre à votre besoin de {service}.

Ce type de demande est très populaire en ce moment, donc je voulais vous en informer en priorité avant de le proposer à d'autres clients.

Si vous souhaitez qu'on en discute rapidement, appelez-moi directement au 06 22 66 53 08 — je réponds immédiatement.

À très vite j'espère,
Merylis
Global Clean Home"""
    },
    "post_intervention": {
        "subject": "Comment s'est passée votre intervention ?",
        "body": """Bonjour {prenom},

J'espère que tout s'est bien passé lors de notre intervention !

Notre équipe m'a dit que ça s'était très bien déroulé, mais votre avis à vous est ce qui compte vraiment.

Est-ce que le résultat est à la hauteur de vos attentes ? Y a-t-il quelque chose qu'on aurait pu faire mieux ?

Votre retour m'aide énormément à améliorer notre service. Et si vous êtes satisfait(e), un petit avis Google nous ferait vraiment plaisir — c'est ce qui permet à des familles comme la vôtre de nous trouver 🙏

Merci encore pour votre confiance,
Merylis"""
    },
    "nurturing_semaine1": {
        "subject": "Quelques astuces pour entretenir votre intérieur",
        "body": """Bonjour {prenom},

Je voulais vous partager quelques conseils pratiques pour garder votre intérieur au top entre deux passages.

Pour les canapés : passez l'aspirateur une fois par semaine sur les coussins et retournez-les régulièrement pour une usure uniforme.

Pour les tapis : un passage d'aspirateur en sens inverse des poils fait des miracles pour redonner du volume.

Pour le ménage quotidien : quelques minutes chaque soir valent mieux qu'un grand ménage le week-end 😊

Si jamais vous avez besoin d'un coup de pouce professionnel, vous savez où me trouver !

Belle semaine,
Merylis"""
    },
    "nurturing_semaine2": {
        "subject": "Une offre spéciale pour vous",
        "body": """Bonjour {prenom},

Je pense à vous et je voulais vous proposer quelque chose.

Pour ce mois-ci, j'offre une remise de 15% sur toute première intervention pour les clients qui n'ont pas encore essayé nos services.

C'est ma façon de vous dire : essayez-nous, et si vous n'êtes pas 100% satisfait(e), on revient gratuitement.

Cette offre est valable jusqu'à la fin du mois. Si vous souhaitez en profiter, répondez juste à cet email ou appelez le 06 22 66 53 08.

À bientôt peut-être,
Merylis
Global Clean Home"""
    }
}

PREDEFINED_WORKFLOWS = [
    {
        "workflow_id": "wf_new_lead_hot",
        "name": "🔥 Nouveau lead chaud — Réponse immédiate",
        "description": "Pour les leads avec score > 70. Réponse ultra-rapide pour maximiser la conversion.",
        "trigger": {"type": "new_lead", "conditions": {"min_score": 70}},
        "is_active": False,
        "steps": [
            {"id": "s1", "type": "send_email", "template": "new_lead_welcome", "delay_hours": 0, "label": "Email de bienvenue immédiat"},
            {"id": "s2", "type": "create_task", "delay_hours": 1, "label": "Tâche: Appeler le prospect", "task_title": "📞 Appeler {name} — lead chaud !"},
            {"id": "s3", "type": "send_notification", "delay_hours": 0, "label": "Notification push équipe"},
        ]
    },
    {
        "workflow_id": "wf_new_lead_standard",
        "name": "📧 Nouveau lead — Séquence standard",
        "description": "Pour tous les nouveaux leads. Confirmation pro immediate + Merylis 5 min apres.",
        "trigger": {"type": "new_lead", "conditions": {}},
        "is_active": True,
        "steps": [
            {"id": "s1", "type": "send_email", "template": "new_lead_welcome", "delay_hours": 0, "label": "Email confirmation professionnel"},
            {"id": "s2", "type": "send_email", "template": "merylis_followup", "delay_hours": 0.084, "label": "Email Merylis personnel (5 min)"},
            {"id": "s3", "type": "send_email", "template": "relance_24h", "delay_hours": 24, "label": "Relance J+1"},
            {"id": "s4", "type": "send_email", "template": "relance_48h", "delay_hours": 48, "label": "Relance J+2"},
            {"id": "s5", "type": "create_task", "delay_hours": 72, "label": "Tâche: Relance manuelle J+3"},
        ]
    },
    {
        "workflow_id": "wf_quote_sent",
        "name": "📄 Devis envoyé — Suivi automatique",
        "description": "Après envoi d'un devis. Relance intelligente si pas de réponse.",
        "trigger": {"type": "quote_sent", "conditions": {}},
        "is_active": True,
        "steps": [
            {"id": "s1", "type": "send_email", "template": "devis_envoye", "delay_hours": 0, "label": "Email accompagnement devis"},
            {"id": "s2", "type": "send_email", "template": "devis_relance", "delay_hours": 48, "label": "Relance devis J+2"},
            {"id": "s3", "type": "create_task", "delay_hours": 96, "label": "Tâche: Appel de suivi devis"},
        ]
    },
    {
        "workflow_id": "wf_nurturing_cold",
        "name": "❄️ Leads froids — Nurturing 14 jours",
        "description": "Pour les leads avec score < 40. Séquence douce sur 2 semaines.",
        "trigger": {"type": "score_change", "conditions": {"max_score": 40}},
        "is_active": False,
        "steps": [
            {"id": "s1", "type": "send_email", "template": "nurturing_semaine1", "delay_hours": 0, "label": "Email conseils semaine 1"},
            {"id": "s2", "type": "send_email", "template": "nurturing_semaine2", "delay_hours": 168, "label": "Offre spéciale semaine 2"},
        ]
    },
    {
        "workflow_id": "wf_post_intervention",
        "name": "⭐ Post-intervention — Demande d'avis",
        "description": "24h après une intervention confirmée. Demande d'avis client.",
        "trigger": {"type": "status_change", "conditions": {"new_status": "gagne"}},
        "is_active": True,
        "steps": [
            {"id": "s1", "type": "send_email", "template": "post_intervention", "delay_hours": 24, "label": "Email de satisfaction J+1"},
            {"id": "s2", "type": "create_task", "delay_hours": 72, "label": "Tâche: Demander avis Google"},
        ]
    }
]

# ============ EXECUTION ENGINE ============

async def execute_workflow(workflow: dict, lead: dict, trigger_event: str = ""):
    """Execute un workflow pour un lead donné."""
    if not workflow.get("is_active"):
        return
    
    steps = workflow.get("steps", [])
    lead_id = lead.get("lead_id")
    
    for step in steps:
        delay_hours = step.get("delay_hours", 0)
        scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=delay_hours)).isoformat()
        
        execution = {
            "execution_id": f"exec_{uuid.uuid4().hex[:10]}",
            "workflow_id": workflow.get("workflow_id"),
            "workflow_name": workflow.get("name"),
            "lead_id": lead_id,
            "step_id": step.get("id"),
            "step_type": step.get("type"),
            "step_label": step.get("label", ""),
            "template": step.get("template", ""),
            "status": "scheduled",
            "scheduled_at": scheduled_at,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "lead_name": lead.get("name", ""),
            "lead_email": lead.get("email", ""),
            "task_title": step.get("task_title", ""),
        }
        await _db.workflow_executions.insert_one(execution)

async def process_pending_executions():
    """Traite les executions en attente — appelée par le scheduler."""
    now = datetime.now(timezone.utc).isoformat()
    
    pending = await _db.workflow_executions.find(
        {"status": "scheduled", "scheduled_at": {"$lte": now}},
        {"_id": 0}
    ).to_list(100)
    
    for exec_item in pending:
        try:
            await _execute_step(exec_item)
            await _db.workflow_executions.update_one(
                {"execution_id": exec_item["execution_id"]},
                {"$set": {"status": "completed", "executed_at": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception as e:
            logger.error(f"Workflow execution error: {e}")
            await _db.workflow_executions.update_one(
                {"execution_id": exec_item["execution_id"]},
                {"$set": {"status": "failed", "error": str(e)}}
            )

async def _execute_step(exec_item: dict):
    """Execute une étape concrète."""
    step_type = exec_item.get("step_type")
    lead_email = exec_item.get("lead_email", "")
    lead_name = exec_item.get("lead_name", "")
    prenom = lead_name.split()[0] if lead_name else "cher client"
    
    lead = await _db.leads.find_one({"lead_id": exec_item["lead_id"]}, {"_id": 0}) or {}
    service = SERVICE_LABELS.get(lead.get("service_type", ""), lead.get("service_type", "nettoyage"))
    
    if step_type == "send_email" and lead_email:
        template_key = exec_item.get("template", "")
        template = HUMAN_EMAIL_TEMPLATES.get(template_key)
        if template:
            subject = template["subject"].format(prenom=prenom, service=service, name=lead_name)
            body = template["body"].format(prenom=prenom, service=service, name=lead_name)
            
            try:
                from gmail_service import _get_any_active_token, _send_gmail_message
                token, uid = await _get_any_active_token()
                if not token:
                    logger.warning(f"No Gmail token available for workflow email to {lead_email}")
                if token:
                    # Choisir template HTML selon le type
                    is_confirmation = template_key == "new_lead_welcome"
                    is_merylis = template_key == "merylis_followup"
                    
                    if is_confirmation:
                        dark_css = """<meta name="color-scheme" content="light dark">
<style>
@media (prefers-color-scheme: dark) {
  body { background-color: #1e1e2e !important; }
  .eb { background-color: #2d2d3f !important; color: #e2e8f0 !important; }
}
</style>"""
                        html = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">{dark_css}</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<div style="max-width:620px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 50%,#059669 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:44px;margin-bottom:10px;">🏠</div>
    <h1 style="color:white;margin:0 0 6px;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Global Clean Home</h1>
    <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Nettoyage Professionnel à Paris & Île-de-France</p>
  </div>

  <!-- BODY -->
  <div style="padding:36px 32px;">
    <h2 style="color:#1e293b;margin:0 0 12px;font-size:20px;">Bonjour <span style="color:#1d4ed8;">{prenom}</span>,</h2>
    <p style="color:#475569;line-height:1.8;margin:0 0 28px;font-size:15px;">
      Nous avons bien reçu votre demande de devis pour <strong style="color:#1e293b;">{service}</strong> et nous vous en remercions chaleureusement.<br><br>
      Notre équipe prend votre demande très au sérieux et s'engage à vous fournir un devis personnalisé dans les meilleurs délais.
    </p>

    <!-- RECAP -->
    <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:0 0 28px;border:1px solid #e2e8f0;">
      <h3 style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">📋 Récapitulatif de votre demande</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748b;font-size:14px;">Service demandé</td>
          <td style="padding:10px 0;color:#1e293b;font-weight:700;font-size:14px;text-align:right;">{service}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748b;font-size:14px;">Délai de réponse</td>
          <td style="padding:10px 0;color:#1e293b;font-weight:700;font-size:14px;text-align:right;">Sous 24h ouvrées</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748b;font-size:14px;">Conseiller dédié</td>
          <td style="padding:10px 0;color:#1e293b;font-weight:700;font-size:14px;text-align:right;">Merylis</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:14px;">Statut</td>
          <td style="padding:10px 0;font-size:14px;text-align:right;"><span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-weight:700;font-size:12px;">✓ Demande reçue</span></td>
        </tr>
      </table>
    </div>

    <!-- ETAPES -->
    <h3 style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 20px;">🗓️ La suite de votre demande</h3>

    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px;">
      <div style="width:36px;height:36px;min-width:36px;background:linear-gradient(135deg,#1d4ed8,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:15px;font-weight:800;text-align:center;line-height:36px;">1</div>
      <div style="padding-top:4px;">
        <p style="color:#1e293b;font-weight:700;font-size:15px;margin:0 0 4px;">Analyse de votre demande</p>
        <p style="color:#64748b;font-size:13px;margin:0;line-height:1.6;">Notre équipe étudie attentivement vos besoins pour vous préparer une offre sur mesure.</p>
      </div>
    </div>

    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px;">
      <div style="width:36px;height:36px;min-width:36px;background:linear-gradient(135deg,#1d4ed8,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:15px;font-weight:800;text-align:center;line-height:36px;">2</div>
      <div style="padding-top:4px;">
        <p style="color:#1e293b;font-weight:700;font-size:15px;margin:0 0 4px;">Envoi de votre devis personnalisé</p>
        <p style="color:#64748b;font-size:13px;margin:0;line-height:1.6;">Vous recevrez un devis détaillé et transparent, sans frais cachés.</p>
      </div>
    </div>

    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;">
      <div style="width:36px;height:36px;min-width:36px;background:linear-gradient(135deg,#1d4ed8,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:15px;font-weight:800;text-align:center;line-height:36px;">3</div>
      <div style="padding-top:4px;">
        <p style="color:#1e293b;font-weight:700;font-size:15px;margin:0 0 4px;">Prise de contact par votre conseiller</p>
        <p style="color:#64748b;font-size:13px;margin:0;line-height:1.6;">Merylis vous appellera pour répondre à toutes vos questions et planifier l'intervention.</p>
      </div>
    </div>

    <!-- CONTACT -->
    <div style="background:linear-gradient(135deg,#0f2a5e,#1d4ed8);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
      <p style="color:rgba(255,255,255,0.95);font-size:15px;font-weight:600;margin:0 0 20px;">En attendant, contactez-nous directement</p>
      <p style="margin:0 0 10px;">
        <a href="tel:+33622665308" style="color:white;text-decoration:none;font-weight:800;font-size:18px;display:block;padding:10px 0;">📞 06 22 66 53 08</a>
      </p>
      <p style="margin:0 0 20px;">
        <a href="mailto:contact@globalcleanhome.com" style="color:rgba(255,255,255,0.85);text-decoration:none;font-size:14px;display:block;padding:6px 0;">📧 contact@globalcleanhome.com</a>
      </p>
      <p style="margin:0 0 10px;">
        <a href="https://wa.me/33622665308" style="display:inline-block;background:#25D366;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:4px;">💬 WhatsApp</a>
      </p>
      <p style="margin:0;">
        <a href="https://www.globalcleanhome.com" style="display:inline-block;background:rgba(255,255,255,0.2);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:4px;">🌐 Visiter notre site</a>
      </p>
    </div>

    <p style="color:#94a3b8;font-size:13px;text-align:center;line-height:1.6;margin:0;">
      Merci de votre confiance. Nous mettons tout en œuvre pour vous offrir un service d'excellence.
    </p>
  </div>

  <!-- FOOTER -->
  <div style="background:#1e293b;padding:20px 32px;text-align:center;">
    <p style="color:white;font-weight:700;margin:0 0 4px;font-size:15px;">Global Clean Home</p>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">Nettoyage professionnel à Paris & Île-de-France</p>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:6px 0 0;">www.globalcleanhome.com | 06 22 66 53 08</p>
  </div>

</div>
</body></html>"""
                    else:
                        html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{{margin:0;padding:0;background:#f8fafc;font-family:Georgia,'Times New Roman',serif;}}
.wrap{{max-width:560px;margin:32px auto;}}
.header{{background:linear-gradient(135deg,#7c3aed,#2563eb);padding:20px 28px;border-radius:12px 12px 0 0;}}
.header p{{color:white;font-size:16px;font-weight:bold;margin:0;}}
.body{{background:white;padding:36px 40px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;}}
p{{color:#1e293b;line-height:1.9;font-size:15px;margin:0 0 16px;}}
.sig{{color:#64748b;font-size:14px;border-top:1px solid #f1f5f9;padding-top:16px;margin-top:24px;}}
strong{{color:#1e293b;}}
</style>
</head>
<body>
<div class="wrap">
<div class="header"><p>🏠 Global Clean Home</p></div>
<div class="body">
<p>{body.replace(chr(10), '</p><p>').replace('<p></p>', '').replace(service, '<strong>' + service + '</strong>')}</p>
</div>
</div>
</body></html>"""
                    await _send_gmail_message(token, lead_email, subject, html)
                    logger.info(f"Workflow email sent to {lead_email}: {subject}")
                    
                    # Log interaction
                    await _db.interactions.insert_one({
                        "interaction_id": f"int_{uuid.uuid4().hex[:10]}",
                        "lead_id": exec_item["lead_id"],
                        "type": "email_sent",
                        "content": f"[Workflow Auto] {subject}",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "automated": True
                    })
            except Exception as e:
                logger.error(f"Email send error: {e}")
    
    elif step_type == "create_task":
        title = exec_item.get("task_title", exec_item.get("step_label", "Tâche workflow"))
        title = title.format(name=lead_name, prenom=prenom, service=service)
        await _db.tasks.insert_one({
            "task_id": f"task_{uuid.uuid4().hex[:10]}",
            "lead_id": exec_item["lead_id"],
            "title": title,
            "status": "pending",
            "priority": "high",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "automated": True,
            "workflow_id": exec_item.get("workflow_id")
        })
    
    elif step_type == "send_notification":
        await _db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:10]}",
            "type": "workflow_alert",
            "title": f"🔥 Lead chaud: {lead_name}",
            "message": f"Action requise pour {lead_name} — {service}",
            "lead_id": exec_item["lead_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        })

# ============ ROUTES ============

@workflows_router.get("/")
async def get_workflows(request: Request):
    """Lister tous les workflows."""
    from server import require_auth
    await require_auth(request)
    
    db_workflows = await _db.workflows.find({}, {"_id": 0}).to_list(100)
    
    # Sync workflows prédéfinis
    for wf in PREDEFINED_WORKFLOWS:
        existing = await _db.workflows.find_one({"workflow_id": wf["workflow_id"]})
        if not existing:
            await _db.workflows.insert_one(wf)
        else:
            # Mettre à jour les steps mais garder is_active de l'utilisateur
            await _db.workflows.update_one(
                {"workflow_id": wf["workflow_id"]},
                {"$set": {"steps": wf["steps"], "name": wf["name"], "description": wf["description"]}}
            )
    db_workflows = await _db.workflows.find({}, {"_id": 0}).to_list(100)
    
    return db_workflows

@workflows_router.post("/")
async def create_workflow(workflow: WorkflowCreate, request: Request):
    """Créer un workflow."""
    from server import require_auth
    await require_auth(request)
    
    doc = {
        "workflow_id": f"wf_{uuid.uuid4().hex[:10]}",
        **workflow.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "executions_count": 0,
    }
    await _db.workflows.insert_one(doc)
    return {"success": True, "workflow_id": doc["workflow_id"]}

@workflows_router.patch("/{workflow_id}/toggle")
async def toggle_workflow(workflow_id: str, request: Request):
    """Activer/désactiver un workflow."""
    from server import require_auth
    await require_auth(request)
    
    wf = await _db.workflows.find_one({"workflow_id": workflow_id})
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow introuvable")
    
    new_status = not wf.get("is_active", True)
    await _db.workflows.update_one(
        {"workflow_id": workflow_id},
        {"$set": {"is_active": new_status}}
    )
    return {"is_active": new_status}

@workflows_router.post("/{workflow_id}/test")
async def test_workflow(workflow_id: str, request: Request):
    """Tester un workflow sur un lead."""
    from server import require_auth
    await require_auth(request)
    
    body = await request.json()
    lead_id = body.get("lead_id")
    
    wf = await _db.workflows.find_one({"workflow_id": workflow_id}, {"_id": 0})
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow introuvable")
    
    lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    
    await execute_workflow(wf, lead, "manual_test")
    return {"success": True, "message": f"Workflow lancé sur {lead.get('name')}"}

@workflows_router.get("/executions")
async def get_executions(request: Request, limit: int = 50):
    """Historique des executions."""
    from server import require_auth
    await require_auth(request)
    
    execs = await _db.workflow_executions.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return execs

@workflows_router.post("/process")
async def process_workflows(request: Request):
    """Traiter les executions en attente."""
    from server import require_auth
    await require_auth(request)
    await process_pending_executions()
    return {"success": True}

@workflows_router.get("/stats")
async def get_workflow_stats(request: Request):
    """Stats des workflows."""
    from server import require_auth
    await require_auth(request)
    
    total = await _db.workflow_executions.count_documents({})
    completed = await _db.workflow_executions.count_documents({"status": "completed"})
    scheduled = await _db.workflow_executions.count_documents({"status": "scheduled"})
    failed = await _db.workflow_executions.count_documents({"status": "failed"})
    emails = await _db.workflow_executions.count_documents({"step_type": "send_email", "status": "completed"})
    
    return {
        "total": total, "completed": completed,
        "scheduled": scheduled, "failed": failed,
        "emails_sent": emails
    }
