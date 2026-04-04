from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging
import math

logger = logging.getLogger(__name__)
tickets_router = APIRouter(prefix="/api/tickets", tags=["tickets"])

_db = None

def init_tickets_db(database):
    global _db
    _db = database

# ============ MODELS ============

class TicketCreate(BaseModel):
    subject: str
    description: str
    priority: str = "normal"  # urgent, high, normal, low
    category: str = "general"  # general, reclamation, question, intervention, facturation
    lead_id: Optional[str] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None

class TicketReply(BaseModel):
    message: str
    is_internal: bool = False

class SatisfactionSurvey(BaseModel):
    ticket_id: str
    score: int  # 1-5
    comment: Optional[str] = None

# ============ HELPERS ============

SLA_HOURS = {
    "urgent": 2,
    "high": 8,
    "normal": 24,
    "low": 72,
}

PRIORITY_CONFIG = {
    "urgent": {"label": "Urgent", "color": "#f43f5e", "emoji": "🔴"},
    "high": {"label": "Haute", "color": "#f59e0b", "emoji": "🟠"},
    "normal": {"label": "Normale", "color": "#60a5fa", "emoji": "🔵"},
    "low": {"label": "Basse", "color": "#94a3b8", "emoji": "⚪"},
}

CATEGORY_CONFIG = {
    "reclamation": {"label": "Réclamation", "emoji": "⚠️"},
    "question": {"label": "Question", "emoji": "❓"},
    "intervention": {"label": "Intervention", "emoji": "🧹"},
    "facturation": {"label": "Facturation", "emoji": "💰"},
    "general": {"label": "Général", "emoji": "📋"},
}

STATUS_CONFIG = {
    "open": {"label": "Ouvert", "color": "#60a5fa"},
    "in_progress": {"label": "En cours", "color": "#f59e0b"},
    "waiting_client": {"label": "Attente client", "color": "#a78bfa"},
    "resolved": {"label": "Résolu", "color": "#34d399"},
    "closed": {"label": "Fermé", "color": "#94a3b8"},
}

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

def _generate_ticket_number():
    now = datetime.now(timezone.utc)
    return f"TKT-{now.strftime('%Y%m')}-{str(uuid.uuid4().hex[:5]).upper()}"

async def _send_ticket_email(to_email: str, subject: str, body: str, ticket_number: str):
    """Envoie un email de notification ticket."""
    try:
        from gmail_service import _get_any_active_token, _send_gmail_message
        token, uid = await _get_any_active_token()
        if token:
            html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{{margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;}}
.wrap{{max-width:580px;margin:24px auto;}}
.header{{background:linear-gradient(135deg,#7c3aed,#2563eb);padding:24px 28px;border-radius:12px 12px 0 0;}}
.body{{background:white;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;}}
.ticket-badge{{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;font-family:monospace;font-size:14px;color:#475569;margin-bottom:16px;}}
p{{color:#374151;line-height:1.7;font-size:14px;margin:0 0 12px;}}
.footer{{text-align:center;padding:16px;color:#94a3b8;font-size:11px;}}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <p style="color:white;font-size:18px;font-weight:bold;margin:0;">Global Clean Home</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0;">Service Client</p>
  </div>
  <div class="body">
    <div class="ticket-badge">#{ticket_number}</div>
    {body}
  </div>
  <div class="footer">Global Clean Home · contact@globalcleanhome.com · 06 22 66 53 08</div>
</div>
</body></html>"""
            await _send_gmail_message(token, to_email, subject, html)
    except Exception as e:
        logger.warning(f"Ticket email error: {e}")

# ============ ROUTES ============

@tickets_router.get("/")
async def get_tickets(
    request: Request,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=500),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    await _require_auth(request)
    query = {}
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}
    if status: query["status"] = status
    if priority: query["priority"] = priority
    if category: query["category"] = category

    total = await _db.tickets.count_documents(query)
    skip = (page - 1) * page_size
    tickets = await _db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)

    now = datetime.now(timezone.utc)
    for t in tickets:
        sla_hours = SLA_HOURS.get(t.get("priority", "normal"), 24)
        created = t.get("created_at", "")
        if created and t.get("status") not in ["resolved", "closed"]:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
                hours_elapsed = (now - dt).total_seconds() / 3600
                t["sla_remaining_hours"] = round(sla_hours - hours_elapsed, 1)
                t["sla_breached"] = hours_elapsed > sla_hours
            except: pass
    return {
        "items": tickets,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }

@tickets_router.post("/")
async def create_ticket(ticket: TicketCreate, request: Request):
    await _require_auth(request)
    user = await _require_auth(request)
    now = datetime.now(timezone.utc)
    ticket_number = _generate_ticket_number()

    doc = {
        "ticket_id": f"tkt_{uuid.uuid4().hex[:12]}",
        "ticket_number": ticket_number,
        **ticket.model_dump(),
        "status": "open",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": user.user_id,
        "replies": [],
        "satisfaction_score": None,
    }

    if ticket.lead_id:
        lead = await _db.leads.find_one({"lead_id": ticket.lead_id}, {"_id": 0})
        if lead:
            doc["client_name"] = doc.get("client_name") or lead.get("name", "")
            doc["client_email"] = doc.get("client_email") or lead.get("email", "")

    await _db.tickets.insert_one(doc)

    # Email confirmation au client
    if doc.get("client_email"):
        prenom = doc["client_name"].split()[0] if doc.get("client_name") else "cher client"
        await _send_ticket_email(
            doc["client_email"],
            f"Votre demande a bien été reçue — #{ticket_number}",
            f"""<p>Bonjour {prenom},</p>
<p>Nous avons bien reçu votre demande et nous y répondrons dans les plus brefs délais.</p>
<p><strong>Objet :</strong> {ticket.subject}</p>
<p><strong>Priorité :</strong> {PRIORITY_CONFIG.get(ticket.priority, {}).get('label', ticket.priority)}</p>
<p>Vous recevrez une notification dès que nous aurons traité votre demande.</p>
<p>Cordialement,<br>L'équipe Global Clean Home</p>""",
            ticket_number
        )

    return doc

@tickets_router.get("/stats")
async def get_ticket_stats(request: Request):
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    start_30d = (now - timedelta(days=30)).isoformat()

    all_tickets = await _db.tickets.find({}, {"_id": 0}).to_list(10000)
    recent = [t for t in all_tickets if t.get("created_at", "") >= start_30d]

    open_t = [t for t in all_tickets if t.get("status") == "open"]
    in_progress = [t for t in all_tickets if t.get("status") == "in_progress"]
    resolved = [t for t in all_tickets if t.get("status") == "resolved"]

    # Temps moyen de résolution
    resolution_times = []
    for t in resolved:
        try:
            c = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            u = datetime.fromisoformat(t["updated_at"].replace("Z", "+00:00"))
            resolution_times.append((u - c).total_seconds() / 3600)
        except: pass
    avg_resolution = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0

    # CSAT
    scores = [t["satisfaction_score"] for t in all_tickets if t.get("satisfaction_score")]
    avg_csat = round(sum(scores) / len(scores), 1) if scores else 0

    # SLA breaches
    breaches = 0
    for t in open_t + in_progress:
        sla_h = SLA_HOURS.get(t.get("priority", "normal"), 24)
        try:
            dt = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
            if (now - dt).total_seconds() / 3600 > sla_h:
                breaches += 1
        except: pass

    return {
        "total": len(all_tickets),
        "open": len(open_t),
        "in_progress": len(in_progress),
        "resolved": len(resolved),
        "recent_30d": len(recent),
        "avg_resolution_hours": avg_resolution,
        "avg_csat": avg_csat,
        "sla_breaches": breaches,
        "by_priority": {
            p: len([t for t in all_tickets if t.get("priority") == p])
            for p in ["urgent", "high", "normal", "low"]
        },
        "by_category": {
            c: len([t for t in all_tickets if t.get("category") == c])
            for c in CATEGORY_CONFIG.keys()
        }
    }

@tickets_router.post("/satisfaction")
async def submit_satisfaction(survey: SatisfactionSurvey, request: Request):
    await _db.tickets.update_one(
        {"ticket_id": survey.ticket_id},
        {"$set": {
            "satisfaction_score": survey.score,
            "satisfaction_comment": survey.comment,
            "satisfaction_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True}

@tickets_router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, request: Request):
    await _require_auth(request)
    ticket = await _db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return ticket

@tickets_router.patch("/{ticket_id}")
async def update_ticket(ticket_id: str, update: TicketUpdate, request: Request):
    await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    data["updated_at"] = now

    if update.status == "resolved":
        data["resolved_at"] = now

    await _db.tickets.update_one({"ticket_id": ticket_id}, {"$set": data})

    ticket = await _db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})

    # Email résolution au client
    if update.status == "resolved" and ticket and ticket.get("client_email"):
        prenom = ticket["client_name"].split()[0] if ticket.get("client_name") else "cher client"
        await _send_ticket_email(
            ticket["client_email"],
            f"Votre demande a été résolue — #{ticket.get('ticket_number')}",
            f"""<p>Bonjour {prenom},</p>
<p>Bonne nouvelle ! Votre demande <strong>"{ticket.get('subject')}"</strong> a été résolue.</p>
{f'<p><strong>Résolution :</strong> {update.resolution}</p>' if update.resolution else ''}
<p>Si vous avez d'autres questions, n'hésitez pas à nous contacter.</p>
<p>Nous vous enverrons bientôt un court questionnaire de satisfaction pour améliorer notre service.</p>
<p>Merci de votre confiance,<br>L'équipe Global Clean Home</p>""",
            ticket.get("ticket_number", "")
        )

    return ticket

@tickets_router.post("/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, reply: TicketReply, request: Request):
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()

    reply_doc = {
        "reply_id": f"rep_{uuid.uuid4().hex[:8]}",
        "message": reply.message,
        "is_internal": reply.is_internal,
        "created_by": user.user_id,
        "created_at": now,
    }

    await _db.tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"replies": reply_doc},
            "$set": {"updated_at": now, "status": "in_progress"}
        }
    )

    # Email au client si réponse publique
    if not reply.is_internal:
        ticket = await _db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
        if ticket and ticket.get("client_email"):
            prenom = ticket["client_name"].split()[0] if ticket.get("client_name") else "cher client"
            await _send_ticket_email(
                ticket["client_email"],
                f"Réponse à votre demande — #{ticket.get('ticket_number')}",
                f"""<p>Bonjour {prenom},</p>
<p>Nous vous avons répondu concernant votre demande <strong>"{ticket.get('subject')}"</strong> :</p>
<div style="background:#f8fafc;border-left:3px solid #7c3aed;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
<p style="margin:0;">{reply.message}</p>
</div>
<p>Pour toute question complémentaire, répondez directement à cet email.</p>
<p>Cordialement,<br>L'équipe Global Clean Home</p>""",
                ticket.get("ticket_number", "")
            )

    return reply_doc


@tickets_router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str, request: Request):
    """Soft-delete a ticket."""
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    result = await _db.tickets.update_one(
        {"ticket_id": ticket_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return {"message": "Ticket supprimé"}

@tickets_router.post("/{ticket_id}/restore")
async def restore_ticket(ticket_id: str, request: Request):
    """Restore a soft-deleted ticket."""
    await _require_auth(request)
    result = await _db.tickets.update_one(
        {"ticket_id": ticket_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket introuvable ou non supprimé")
    return {"message": "Ticket restauré"}
