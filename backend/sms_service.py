"""
sms_service.py — SMS Notifications via Twilio (or simulated log mode)
Phase 5: SMS reminders, confirmations, templates
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = _client[os.environ['DB_NAME']]

logger = logging.getLogger(__name__)
sms_router = APIRouter(prefix="/api/sms", tags=["sms"])

# ── DEFAULT TEMPLATES ──
DEFAULT_TEMPLATES = [
    {
        "id": "reminder_j1",
        "name": "Rappel J-1",
        "type": "reminder",
        "content": "Bonjour {name}, rappel de votre intervention demain à {time}. Global Clean Home",
        "variables": ["name", "time"],
        "is_default": True,
    },
    {
        "id": "confirmation",
        "name": "Confirmation",
        "type": "confirmation",
        "content": "Votre intervention du {date} est confirmée. Intervenant: {intervenant}. Global Clean Home",
        "variables": ["date", "intervenant"],
        "is_default": True,
    },
    {
        "id": "on_the_way",
        "name": "En route",
        "type": "on_the_way",
        "content": "Votre intervenant {intervenant} est en route. Arrivée estimée: {eta}. Global Clean Home",
        "variables": ["intervenant", "eta"],
        "is_default": True,
    },
    {
        "id": "completed",
        "name": "Intervention terminée",
        "type": "completed",
        "content": "Intervention terminée! Merci de noter notre service: {survey_link}. Global Clean Home",
        "variables": ["survey_link"],
        "is_default": True,
    },
    {
        "id": "payment_reminder",
        "name": "Rappel paiement",
        "type": "payment_reminder",
        "content": "Rappel: facture {invoice_id} de {amount}€ en attente. Lien: {pay_link}. Global Clean Home",
        "variables": ["invoice_id", "amount", "pay_link"],
        "is_default": True,
    },
]


# ── MODELS ──

class SendSMSRequest(BaseModel):
    to: str
    message: str
    type: str = "custom"
    metadata: Optional[Dict[str, Any]] = None


class SMSTemplateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    type: str
    content: str
    variables: Optional[List[str]] = None


class AutoReminderRequest(BaseModel):
    dry_run: bool = False


# ── HELPERS ──

def _twilio_configured() -> bool:
    return bool(os.environ.get("TWILIO_SID") and os.environ.get("TWILIO_TOKEN") and os.environ.get("TWILIO_FROM"))


async def _send_or_simulate(to: str, message: str, sms_type: str, metadata: dict = None) -> dict:
    """Send SMS via Twilio or log as simulated."""
    now = datetime.now(timezone.utc)
    log_id = str(uuid.uuid4())

    if _twilio_configured():
        try:
            from twilio.rest import Client as TwilioClient
            twilio = TwilioClient(os.environ["TWILIO_SID"], os.environ["TWILIO_TOKEN"])
            msg = twilio.messages.create(
                body=message,
                from_=os.environ["TWILIO_FROM"],
                to=to,
            )
            status = "sent"
            provider_sid = msg.sid
            logger.info(f"SMS sent via Twilio to {to}: {msg.sid}")
        except Exception as e:
            logger.error(f"Twilio send failed: {e}")
            status = "error"
            provider_sid = None
            metadata = {**(metadata or {}), "error": str(e)}
    else:
        logger.info(f"[SMS SIMULATED] To: {to} | Type: {sms_type} | Message: {message}")
        status = "simulated"
        provider_sid = None

    log_entry = {
        "id": log_id,
        "to": to,
        "message": message,
        "type": sms_type,
        "status": status,
        "provider_sid": provider_sid,
        "metadata": metadata or {},
        "sent_at": now,
    }
    await db.sms_log.insert_one(log_entry)
    log_entry.pop("_id", None)
    return log_entry


async def _ensure_default_templates():
    """Seed default templates if not present."""
    count = await db.sms_templates.count_documents({"is_default": True})
    if count == 0:
        for tpl in DEFAULT_TEMPLATES:
            await db.sms_templates.update_one({"id": tpl["id"]}, {"$setOnInsert": tpl}, upsert=True)


def _render_template(content: str, variables: dict) -> str:
    """Replace {variable} placeholders."""
    for key, value in variables.items():
        content = content.replace(f"{{{key}}}", str(value))
    return content


# ── ENDPOINTS ──

@sms_router.post("/send")
async def send_sms(req: SendSMSRequest):
    """Send SMS (real via Twilio or simulated if not configured)."""
    if not req.to.startswith("+"):
        raise HTTPException(status_code=400, detail="Le numéro doit commencer par + (format E.164).")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message vide.")
    if len(req.message) > 1600:
        raise HTTPException(status_code=400, detail="Message trop long (max 1600 caractères).")

    result = await _send_or_simulate(req.to, req.message.strip(), req.type, req.metadata)
    result.pop("_id", None)
    return {
        "success": result["status"] in ("sent", "simulated"),
        "sms": result,
        "twilio_configured": _twilio_configured(),
    }


@sms_router.get("/log")
async def sms_log(
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    sms_type: Optional[str] = Query(None, alias="type"),
    to: Optional[str] = Query(None),
):
    """Get SMS history with optional filters."""
    query: dict = {}
    if status:
        query["status"] = status
    if sms_type:
        query["type"] = sms_type
    if to:
        query["to"] = {"$regex": to, "$options": "i"}

    cursor = db.sms_log.find(query, {"_id": 0}).sort("sent_at", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    total = await db.sms_log.count_documents(query)

    return {"logs": logs, "total": total, "limit": limit, "skip": skip}


@sms_router.get("/templates")
async def list_templates():
    """List all SMS templates."""
    await _ensure_default_templates()
    cursor = db.sms_templates.find({}, {"_id": 0})
    templates = await cursor.to_list(length=100)
    return {"templates": templates, "total": len(templates)}


@sms_router.post("/templates")
async def upsert_template(req: SMSTemplateRequest):
    """Create or update an SMS template."""
    tpl_id = req.id or str(uuid.uuid4())
    template = {
        "id": tpl_id,
        "name": req.name,
        "type": req.type,
        "content": req.content,
        "variables": req.variables or [],
        "is_default": False,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.sms_templates.update_one({"id": tpl_id}, {"$set": template}, upsert=True)
    return {"success": True, "template": template}


@sms_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a custom SMS template (default templates cannot be deleted)."""
    tpl = await db.sms_templates.find_one({"id": template_id})
    if not tpl:
        raise HTTPException(status_code=404, detail="Template introuvable.")
    if tpl.get("is_default"):
        raise HTTPException(status_code=403, detail="Impossible de supprimer un template par défaut.")
    await db.sms_templates.delete_one({"id": template_id})
    return {"success": True, "deleted_id": template_id}


@sms_router.post("/auto-reminders")
async def auto_reminders(req: AutoReminderRequest):
    """Trigger auto-reminders for all interventions tomorrow."""
    from datetime import date as date_type

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()

    # Load reminder template
    await _ensure_default_templates()
    tpl = await db.sms_templates.find_one({"id": "reminder_j1"}, {"_id": 0})
    if not tpl:
        raise HTTPException(status_code=500, detail="Template rappel_j1 introuvable.")

    # Get tomorrow's interventions
    cursor = db.interventions.find(
        {"date": tomorrow, "status": {"$nin": ["cancelled", "done"]}},
        {"_id": 0},
    )
    interventions = await cursor.to_list(length=500)

    sent = []
    skipped = []
    errors = []

    for interv in interventions:
        # Resolve client phone
        phone = interv.get("client_phone") or interv.get("phone")
        client_name = interv.get("client_name") or ""

        if not phone and interv.get("client_id"):
            client_doc = await db.clients.find_one(
                {"id": interv["client_id"]}, {"_id": 0, "phone": 1, "name": 1}
            )
            if client_doc:
                phone = client_doc.get("phone")
                client_name = client_doc.get("name", client_name)

        if not phone:
            skipped.append({"intervention_id": interv.get("id"), "reason": "Pas de téléphone"})
            continue

        # Check not already reminded
        already = await db.sms_log.find_one(
            {
                "to": phone,
                "type": "reminder",
                "metadata.intervention_id": interv.get("id"),
                "status": {"$in": ["sent", "simulated"]},
            }
        )
        if already:
            skipped.append({"intervention_id": interv.get("id"), "reason": "Déjà envoyé"})
            continue

        message = _render_template(
            tpl["content"],
            {
                "name": client_name or "Client",
                "time": interv.get("time") or interv.get("start_time") or "horaire confirmé",
            },
        )

        if req.dry_run:
            sent.append({
                "intervention_id": interv.get("id"),
                "to": phone,
                "message": message,
                "dry_run": True,
            })
        else:
            try:
                result = await _send_or_simulate(
                    phone, message, "reminder",
                    metadata={"intervention_id": interv.get("id"), "date": tomorrow},
                )
                result.pop("_id", None)
                sent.append(result)
            except Exception as e:
                errors.append({"intervention_id": interv.get("id"), "error": str(e)})

    return {
        "date": tomorrow,
        "dry_run": req.dry_run,
        "sent_count": len(sent),
        "skipped_count": len(skipped),
        "error_count": len(errors),
        "sent": sent,
        "skipped": skipped,
        "errors": errors,
        "twilio_configured": _twilio_configured(),
    }
