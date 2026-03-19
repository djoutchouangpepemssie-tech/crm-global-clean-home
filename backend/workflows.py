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
        "is_active": True,
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
            {"id": "s2", "type": "send_email", "template": "merylis_followup", "delay_hours": 0.083, "label": "Email Merylis personnel (5 min)"},
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
                        html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{background:#f1f5f9;font-family:Arial,sans-serif;}}
.wrap{{max-width:600px;margin:0 auto;padding:20px;}}
.header{{background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#059669 100%);padding:32px 28px;border-radius:12px 12px 0 0;text-align:center;}}
.header h1{{color:white;font-size:22px;font-weight:bold;margin-bottom:4px;}}
.header p{{color:rgba(255,255,255,0.85);font-size:13px;}}
.body{{background:white;padding:32px 28px;}}
.greeting{{font-size:16px;color:#1e293b;margin-bottom:16px;}}
.intro{{font-size:14px;color:#475569;line-height:1.7;margin-bottom:24px;}}
.recap{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px;}}
.recap h3{{font-size:13px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;}}
.recap-row{{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;}}
.recap-row:last-child{{border-bottom:none;}}
.recap-label{{font-size:13px;color:#64748b;}}
.recap-value{{font-size:13px;font-weight:bold;color:#1e293b;}}
.steps{{margin-bottom:24px;}}
.steps h3{{font-size:13px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;}}
.step{{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px;}}
.step-num{{width:32px;height:32px;background:linear-gradient(135deg,#2563eb,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;flex-shrink:0;}}
.step-content h4{{font-size:14px;font-weight:bold;color:#1e293b;margin-bottom:3px;}}
.step-content p{{font-size:13px;color:#64748b;line-height:1.5;}}
.contact{{background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;}}
.contact p{{color:rgba(255,255,255,0.85);font-size:13px;margin-bottom:12px;}}
.contact-items{{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;}}
.contact-item{{color:white;font-size:13px;font-weight:bold;}}
.footer{{background:#f8fafc;padding:20px 28px;border-radius:0 0 12px 12px;text-align:center;border-top:1px solid #e2e8f0;}}
.footer p{{font-size:12px;color:#94a3b8;}}
.footer strong{{color:#64748b;}}
</style>
</head>
<body>
<div class="wrap">
<div class="header">
  <h1>🏠 Global Clean Home</h1>
  <p>Nettoyage Professionnel à Paris & Île-de-France</p>
</div>
<div class="body">
  <p class="greeting">Bonjour <strong>{prenom}</strong>,</p>
  <p class="intro">Nous avons bien reçu votre demande de devis pour <strong>{service}</strong> et nous vous en remercions chaleureusement.<br><br>Notre équipe prend votre demande très au sérieux et s'engage à vous fournir un devis personnalisé dans les meilleurs délais.</p>
  
  <div class="recap">
    <h3>📋 Récapitulatif de votre demande</h3>
    <div class="recap-row"><span class="recap-label">Service demandé</span><span class="recap-value">{service}</span></div>
    <div class="recap-row"><span class="recap-label">Délai de réponse</span><span class="recap-value">Sous 24h ouvrées</span></div>
    <div class="recap-row"><span class="recap-label">Conseiller dédié</span><span class="recap-value">Merylis</span></div>
    <div class="recap-row"><span class="recap-label">Statut</span><span class="recap-value" style="color:#059669;">✓ Demande reçue</span></div>
  </div>

  <div class="steps">
    <h3>🗓️ La suite de votre demande</h3>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-content">
        <h4>Analyse de votre demande</h4>
        <p>Notre équipe étudie attentivement vos besoins pour vous préparer une offre sur mesure.</p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-content">
        <h4>Envoi de votre devis personnalisé</h4>
        <p>Vous recevrez un devis détaillé et transparent, sans frais cachés.</p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-content">
        <h4>Prise de contact par votre conseiller</h4>
        <p>Merylis vous appellera pour répondre à toutes vos questions et planifier l'intervention.</p>
      </div>
    </div>
  </div>

  <div class="contact">
    <p>En attendant, n'hésitez pas à nous contacter directement</p>
    <div class="contact-items">
      <span class="contact-item">📞 06 22 66 53 08</span>
      <span class="contact-item">📧 contact@globalcleanhome.com</span>
      <span class="contact-item">🌐 globalcleanhome.com</span>
    </div>
  </div>

  <p style="font-size:13px;color:#64748b;line-height:1.6;">Merci de votre confiance. Nous mettons tout en œuvre pour vous offrir un service d'excellence.</p>
</div>
<div class="footer">
  <strong>Global Clean Home</strong>
  <p>Nettoyage professionnel à Paris & Île-de-France</p>
  <p>www.globalcleanhome.com | 06 22 66 53 08</p>
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
    
    if not db_workflows:
        for wf in PREDEFINED_WORKFLOWS:
            existing = await _db.workflows.find_one({"workflow_id": wf["workflow_id"]})
            if not existing:
                await _db.workflows.insert_one(wf)
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
