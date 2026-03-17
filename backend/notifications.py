from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)
notifications_router = APIRouter(prefix="/api/notifications", tags=["notifications"])

_db = None

def init_notifications_db(database):
    global _db
    _db = database

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    lead_id: Optional[str] = None
    ticket_id: Optional[str] = None
    quote_id: Optional[str] = None
    priority: str = "normal"
    action_url: Optional[str] = None

NOTIFICATION_TYPES = {
    "new_lead": {"icon": "🎯", "color": "#a78bfa", "sound": True},
    "hot_lead": {"icon": "🔥", "color": "#f43f5e", "sound": True},
    "quote_opened": {"icon": "👁️", "color": "#60a5fa", "sound": False},
    "quote_accepted": {"icon": "✅", "color": "#34d399", "sound": True},
    "quote_rejected": {"icon": "❌", "color": "#f43f5e", "sound": False},
    "payment_received": {"icon": "💰", "color": "#34d399", "sound": True},
    "ticket_created": {"icon": "🎫", "color": "#f59e0b", "sound": True},
    "ticket_sla_breach": {"icon": "⚠️", "color": "#f43f5e", "sound": True},
    "workflow_executed": {"icon": "⚡", "color": "#a78bfa", "sound": False},
    "task_due": {"icon": "📋", "color": "#f59e0b", "sound": True},
    "lead_score_high": {"icon": "⭐", "color": "#f59e0b", "sound": True},
    "system": {"icon": "🔔", "color": "#94a3b8", "sound": False},
}

async def create_notification(type: str, title: str, message: str, **kwargs):
    """Helper pour creer une notification depuis n importe quel module."""
    if _db is None:
        return
    try:
        doc = {
            "notification_id": f"notif_{uuid.uuid4().hex[:10]}",
            "type": type,
            "title": title,
            "message": message,
            "icon": NOTIFICATION_TYPES.get(type, {}).get("icon", "🔔"),
            "color": NOTIFICATION_TYPES.get(type, {}).get("color", "#94a3b8"),
            "priority": kwargs.get("priority", "normal"),
            "lead_id": kwargs.get("lead_id"),
            "ticket_id": kwargs.get("ticket_id"),
            "quote_id": kwargs.get("quote_id"),
            "action_url": kwargs.get("action_url"),
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await _db.notifications.insert_one(doc)
        return doc
    except Exception as e:
        logger.error(f"Notification create error: {e}")

@notifications_router.get("/")
async def get_notifications(request: Request, limit: int = 30, unread_only: bool = False):
    from server import require_auth
    await require_auth(request)
    query = {"read": False} if unread_only else {}
    notifs = await _db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return notifs

@notifications_router.get("/unread-count")
async def get_unread_count(request: Request):
    from server import require_auth
    await require_auth(request)
    count = await _db.notifications.count_documents({"read": False})
    return {"count": count}

@notifications_router.post("/mark-read/{notification_id}")
async def mark_read(notification_id: str, request: Request):
    from server import require_auth
    await require_auth(request)
    await _db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@notifications_router.post("/mark-all-read")
async def mark_all_read(request: Request):
    from server import require_auth
    await require_auth(request)
    await _db.notifications.update_many(
        {"read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@notifications_router.delete("/{notification_id}")
async def delete_notification(notification_id: str, request: Request):
    from server import require_auth
    await require_auth(request)
    await _db.notifications.delete_one({"notification_id": notification_id})
    return {"success": True}

@notifications_router.get("/stats")
async def get_notification_stats(request: Request):
    from server import require_auth
    await require_auth(request)
    total = await _db.notifications.count_documents({})
    unread = await _db.notifications.count_documents({"read": False})
    by_type = {}
    for t in NOTIFICATION_TYPES.keys():
        by_type[t] = await _db.notifications.count_documents({"type": t})
    return {"total": total, "unread": unread, "by_type": by_type}
