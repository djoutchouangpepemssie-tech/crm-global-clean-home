"""
Global Clean Home CRM - Phase 6: External Integrations
- Zapier/Make Webhooks (outgoing)
- Google Calendar iCal sync
- WhatsApp messaging
- Tracking Widget generator
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import httpx
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

ext_router = APIRouter(prefix="/api")

# ============= MODELS =============

class WebhookCreate(BaseModel):
    name: str
    url: str
    events: List[str]  # new_lead, quote_sent, invoice_paid, intervention_created, etc.
    active: bool = True

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    active: Optional[bool] = None

class WhatsAppMessage(BaseModel):
    lead_id: str
    message: str
    template: Optional[str] = None

# ============= AUTH HELPER =============

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

async def _log_activity(user_id, action, entity_type, entity_id, details=None):
    from server import log_activity
    await log_activity(user_id, action, entity_type, entity_id, details)

# ============= ZAPIER/MAKE WEBHOOKS =============

VALID_EVENTS = [
    "new_lead", "lead_updated", "lead_status_changed",
    "quote_created", "quote_sent", "quote_accepted", "quote_rejected",
    "invoice_created", "invoice_paid",
    "intervention_created", "intervention_completed",
    "review_submitted",
]

@ext_router.post("/webhooks")
async def create_webhook(body: WebhookCreate, request: Request):
    """Register a new webhook endpoint (for Zapier/Make)."""
    user = await _require_auth(request)

    for ev in body.events:
        if ev not in VALID_EVENTS:
            raise HTTPException(status_code=400, detail=f"Événement invalide: {ev}. Valides: {VALID_EVENTS}")

    webhook = {
        "webhook_id": f"wh_{uuid.uuid4().hex[:12]}",
        "name": body.name,
        "url": body.url,
        "events": body.events,
        "active": body.active,
        "secret": uuid.uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
        "last_triggered": None,
        "trigger_count": 0,
        "last_error": None,
    }

    await _db.webhooks.insert_one(webhook)
    await _log_activity(user.user_id, "create_webhook", "webhook", webhook["webhook_id"])
    doc = await _db.webhooks.find_one({"webhook_id": webhook["webhook_id"]}, {"_id": 0})
    return doc


@ext_router.get("/webhooks")
async def list_webhooks(request: Request):
    """List all registered webhooks."""
    await _require_auth(request)
    return await _db.webhooks.find({}, {"_id": 0}).to_list(100)


@ext_router.patch("/webhooks/{webhook_id}")
async def update_webhook(webhook_id: str, body: WebhookUpdate, request: Request):
    """Update a webhook."""
    user = await _require_auth(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")

    if "events" in update:
        for ev in update["events"]:
            if ev not in VALID_EVENTS:
                raise HTTPException(status_code=400, detail=f"Événement invalide: {ev}")

    result = await _db.webhooks.update_one({"webhook_id": webhook_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Webhook introuvable")
    return {"message": "Webhook mis à jour"}


@ext_router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, request: Request):
    """Delete a webhook."""
    user = await _require_auth(request)
    result = await _db.webhooks.delete_one({"webhook_id": webhook_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook introuvable")
    await _log_activity(user.user_id, "delete_webhook", "webhook", webhook_id)
    return {"message": "Webhook supprimé"}


@ext_router.get("/webhooks/events")
async def list_webhook_events(request: Request):
    """List available webhook event types."""
    await _require_auth(request)
    return {"events": VALID_EVENTS}


@ext_router.get("/webhooks/{webhook_id}/logs")
async def get_webhook_logs(webhook_id: str, request: Request):
    """Get delivery logs for a webhook."""
    await _require_auth(request)
    logs = await _db.webhook_logs.find(
        {"webhook_id": webhook_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)
    return logs


async def fire_webhooks(event_type: str, payload: dict):
    """Fire all active webhooks registered for this event type."""
    webhooks = await _db.webhooks.find(
        {"events": event_type, "active": True}, {"_id": 0}
    ).to_list(100)

    for wh in webhooks:
        log_entry = {
            "log_id": f"whl_{uuid.uuid4().hex[:12]}",
            "webhook_id": wh["webhook_id"],
            "event_type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "pending",
            "response_code": None,
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    wh["url"],
                    json={
                        "event": event_type,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": payload,
                        "webhook_id": wh["webhook_id"],
                    },
                    headers={"X-Webhook-Secret": wh.get("secret", "")},
                )
                log_entry["status"] = "delivered"
                log_entry["response_code"] = resp.status_code
        except Exception as e:
            log_entry["status"] = "failed"
            log_entry["error"] = str(e)[:500]
            logger.warning(f"Webhook delivery failed for {wh['webhook_id']}: {e}")

        await _db.webhook_logs.insert_one(log_entry)
        await _db.webhooks.update_one(
            {"webhook_id": wh["webhook_id"]},
            {"$set": {
                "last_triggered": log_entry["timestamp"],
                "last_error": log_entry["error"],
            }, "$inc": {"trigger_count": 1}},
        )


# ============= GOOGLE CALENDAR (iCal) =============

@ext_router.get("/calendar/ical", response_class=PlainTextResponse)
async def export_ical(request: Request, team_id: Optional[str] = None):
    """Export interventions as iCal (.ics) format for Google Calendar sync."""
    await _require_auth(request)

    query = {"status": {"$ne": "annulée"}}
    if team_id:
        query["team_id"] = team_id

    interventions = await _db.interventions.find(query, {"_id": 0}).to_list(10000)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Global Clean Home CRM//FR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Global Clean Home - Planning",
    ]

    for intv in interventions:
        dtstart = _parse_datetime(intv["scheduled_date"], intv.get("scheduled_time", "09:00"))
        duration_h = intv.get("duration_hours", 2) or 2
        dtend = dtstart + timedelta(hours=duration_h)

        uid = f"{intv['intervention_id']}@globalcleanhome.crm"
        summary = intv.get("title", "Intervention")
        location = intv.get("address", "")
        description = (
            f"Client: {intv.get('lead_name', '')}\n"
            f"Tél: {intv.get('lead_phone', '')}\n"
            f"Service: {intv.get('service_type', '')}\n"
            f"Statut: {intv.get('status', '')}\n"
            f"{intv.get('description', '')}"
        )

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART:{dtstart.strftime('%Y%m%dT%H%M%S')}",
            f"DTEND:{dtend.strftime('%Y%m%dT%H%M%S')}",
            f"SUMMARY:{_ical_escape(summary)}",
            f"LOCATION:{_ical_escape(location)}",
            f"DESCRIPTION:{_ical_escape(description)}",
            f"STATUS:{'CONFIRMED' if intv.get('status') in ('planifiée', 'en_cours') else 'CANCELLED'}",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")

    return PlainTextResponse(
        "\r\n".join(lines),
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=global-clean-home.ics"},
    )


def _parse_datetime(date_str: str, time_str: str) -> datetime:
    try:
        parts = date_str.split("-")
        t_parts = time_str.split(":")
        return datetime(
            int(parts[0]), int(parts[1]), int(parts[2]),
            int(t_parts[0]), int(t_parts[1]) if len(t_parts) > 1 else 0,
        )
    except Exception:
        return datetime.now()


def _ical_escape(text: str) -> str:
    if not text:
        return ""
    return text.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


# ============= WHATSAPP MESSAGING =============

WHATSAPP_TEMPLATES = {
    "welcome": "Bonjour {name} ! Merci pour votre demande. Notre équipe vous contactera sous peu. - Global Clean Home",
    "quote_ready": "Bonjour {name}, votre devis est prêt ! Montant: {amount}€. Consultez-le sur votre espace client: {portal_link}",
    "reminder": "Bonjour {name}, n'oubliez pas votre rendez-vous le {date} à {time}. - Global Clean Home",
    "invoice": "Bonjour {name}, votre facture de {amount}€ est disponible. Payez en ligne: {link}",
    "followup": "Bonjour {name}, nous espérons que notre service vous a satisfait. N'hésitez pas à nous laisser un avis !",
}


@ext_router.get("/whatsapp/templates")
async def get_whatsapp_templates(request: Request):
    """Get available WhatsApp message templates."""
    await _require_auth(request)
    return {"templates": {k: v for k, v in WHATSAPP_TEMPLATES.items()}}


@ext_router.post("/whatsapp/send")
async def send_whatsapp(body: WhatsAppMessage, request: Request):
    """Send a WhatsApp message to a lead (click-to-chat or API)."""
    user = await _require_auth(request)

    lead = await _db.leads.find_one({"lead_id": body.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")

    phone = lead.get("phone", "").replace(" ", "").replace("+", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Le lead n'a pas de numéro de téléphone")

    # Resolve template
    message = body.message
    if body.template and body.template in WHATSAPP_TEMPLATES:
        message = WHATSAPP_TEMPLATES[body.template].format(
            name=lead.get("name", ""),
            amount="",
            portal_link="",
            link="",
            date="",
            time="",
        )

    # Generate WhatsApp click-to-chat link
    encoded_msg = message.replace(" ", "%20").replace("\n", "%0A")
    wa_link = f"https://wa.me/{phone}?text={encoded_msg}"

    # Log the message
    interaction = {
        "interaction_id": f"int_{uuid.uuid4().hex[:12]}",
        "lead_id": body.lead_id,
        "type": "whatsapp",
        "content": f"[WhatsApp] {message}",
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.interactions.insert_one(interaction)

    await _log_activity(user.user_id, "send_whatsapp", "lead", body.lead_id)

    # Fire webhook
    try:
        await fire_webhooks("lead_updated", {
            "lead_id": body.lead_id,
            "action": "whatsapp_sent",
            "message_preview": message[:100],
        })
    except Exception:
        pass

    return {
        "message": "Message WhatsApp préparé",
        "whatsapp_link": wa_link,
        "phone": phone,
    }


# ============= TRACKING WIDGET GENERATOR =============

@ext_router.get("/widget/script")
async def get_tracking_widget(request: Request):
    """Generate the JavaScript tracking widget for external websites."""
    backend_url = str(request.base_url).rstrip("/")

    script = f"""
(function() {{
  'use strict';
  
  var GCH_TRACKING = {{
    apiUrl: '{backend_url}/api/tracking/event',
    visitorId: null,
    sessionId: null,
    startTime: Date.now(),
    
    init: function() {{
      this.visitorId = this.getOrCreateId('gch_visitor_id', 365);
      this.sessionId = this.getOrCreateId('gch_session_id', 0);
      
      this.trackPageView();
      this.trackClicks();
      this.trackFormSubmissions();
      this.trackScrollDepth();
      this.trackTimeOnPage();
    }},
    
    getOrCreateId: function(key, days) {{
      var id = this.getCookie(key);
      if (!id) {{
        id = 'v_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
        if (days > 0) {{
          this.setCookie(key, id, days);
        }} else {{
          sessionStorage.setItem(key, id);
        }}
      }}
      return id;
    }},
    
    getCookie: function(name) {{
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : sessionStorage.getItem(name);
    }},
    
    setCookie: function(name, value, days) {{
      var d = new Date();
      d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    }},
    
    send: function(eventType, data) {{
      var payload = {{
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        event_type: eventType,
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer,
        utm_params: this.getUtmParams(),
        device_info: {{
          screen_width: screen.width,
          screen_height: screen.height,
          user_agent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }},
        timestamp: new Date().toISOString(),
        data: data || {{}}
      }};
      
      if (navigator.sendBeacon) {{
        navigator.sendBeacon(this.apiUrl, JSON.stringify(payload));
      }} else {{
        var xhr = new XMLHttpRequest();
        xhr.open('POST', this.apiUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      }}
    }},
    
    getUtmParams: function() {{
      var params = {{}};
      var search = window.location.search;
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function(key) {{
        var match = search.match(new RegExp('[?&]' + key + '=([^&]*)'));
        if (match) params[key] = decodeURIComponent(match[1]);
      }});
      return Object.keys(params).length > 0 ? params : null;
    }},
    
    trackPageView: function() {{
      this.send('page_view');
    }},
    
    trackClicks: function() {{
      var self = this;
      document.addEventListener('click', function(e) {{
        var target = e.target.closest('a, button, [data-gch-track]');
        if (target) {{
          self.send('click', {{
            element: target.tagName.toLowerCase(),
            text: (target.textContent || '').trim().substring(0, 100),
            href: target.href || '',
            id: target.id || '',
            classes: target.className || ''
          }});
        }}
      }});
    }},
    
    trackFormSubmissions: function() {{
      var self = this;
      document.addEventListener('submit', function(e) {{
        var form = e.target;
        self.send('form_submit', {{
          form_id: form.id || '',
          form_action: form.action || '',
          form_name: form.name || ''
        }});
      }});
    }},
    
    trackScrollDepth: function() {{
      var self = this;
      var maxScroll = 0;
      var milestones = [25, 50, 75, 100];
      window.addEventListener('scroll', function() {{
        var scrollPercent = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        if (scrollPercent > maxScroll) {{
          maxScroll = scrollPercent;
          milestones.forEach(function(m) {{
            if (scrollPercent >= m && maxScroll - scrollPercent < 5) {{
              self.send('scroll_depth', {{ depth: m }});
            }}
          }});
        }}
      }});
    }},
    
    trackTimeOnPage: function() {{
      var self = this;
      window.addEventListener('beforeunload', function() {{
        var timeSpent = Math.round((Date.now() - self.startTime) / 1000);
        self.send('time_on_page', {{ seconds: timeSpent }});
      }});
    }}
  }};
  
  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', function() {{ GCH_TRACKING.init(); }});
  }} else {{
    GCH_TRACKING.init();
  }}
}})();
"""

    return PlainTextResponse(script.strip(), media_type="application/javascript")


@ext_router.get("/widget/snippet")
async def get_widget_snippet(request: Request):
    """Get the HTML snippet to install the tracking widget."""
    await _require_auth(request)
    backend_url = str(request.base_url).rstrip("/")

    return {
        "snippet": f'<script src="{backend_url}/api/widget/script" async defer></script>',
        "description": "Ajoutez ce code juste avant </body> sur votre site web pour activer le tracking.",
    }
