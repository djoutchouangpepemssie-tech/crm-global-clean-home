from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)
chat_router = APIRouter(prefix="/api/chat", tags=["chat"])

_db = None

def init_chat_db(database):
    global _db
    _db = database

class MessageCreate(BaseModel):
    content: str
    from_client: bool = True

async def _get_portal_lead(request: Request):
    token = request.headers.get("X-Portal-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Token requis")
    session = await _db.portal_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    lead = await _db.leads.find_one({"lead_id": session["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    return lead

# ========== ROUTES PORTAIL CLIENT ==========

@chat_router.get("/portal/conversation")
async def get_portal_conversation(request: Request):
    lead = await _get_portal_lead(request)
    lead_id = lead["lead_id"]
    
    conv = await _db.conversations.find_one({"lead_id": lead_id}, {"_id": 0})
    if not conv:
        conv = {
            "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
            "lead_id": lead_id,
            "lead_name": lead.get("name", ""),
            "lead_email": lead.get("email", ""),
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "unread_crm": 0,
        }
        await _db.conversations.insert_one(conv)
    
    # Purger messages > 30 jours
    if conv.get("messages"):
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        fresh_msgs = [m for m in conv["messages"] if m.get("created_at", "") >= cutoff]
        if len(fresh_msgs) != len(conv["messages"]):
            await _db.conversations.update_one(
                {"lead_id": lead_id},
                {"$set": {"messages": fresh_msgs}}
            )
            conv["messages"] = fresh_msgs
    
    return conv

@chat_router.post("/portal/message")
async def send_portal_message(msg: MessageCreate, request: Request):
    lead = await _get_portal_lead(request)
    lead_id = lead["lead_id"]
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "content": msg.content,
        "from_client": True,
        "sender_name": lead.get("name", "Client"),
        "created_at": now,
        "read": False,
    }
    
    # Upsert conversation
    conv = await _db.conversations.find_one({"lead_id": lead_id})
    if not conv:
        await _db.conversations.insert_one({
            "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
            "lead_id": lead_id,
            "lead_name": lead.get("name", ""),
            "lead_email": lead.get("email", ""),
            "messages": [message],
            "created_at": now,
            "updated_at": now,
            "unread_crm": 1,
        })
    else:
        await _db.conversations.update_one(
            {"lead_id": lead_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": now},
                "$inc": {"unread_crm": 1}
            }
        )
    
    # Notification dans le CRM
    try:
        from notifications import create_notification
        await create_notification(
            type="system",
            title=f"Message de {lead.get('name', 'Client')}",
            message=msg.content[:80] + ("..." if len(msg.content) > 80 else ""),
            lead_id=lead_id,
            action_url=f"/leads/{lead_id}?tab=chat",
            priority="high"
        )
    except Exception as e:
        logger.warning(f"Notification error: {e}")
    
    return {"success": True, "message": message}

# ========== ROUTES CRM ==========

@chat_router.get("/conversations")
async def get_all_conversations(request: Request):
    from server import require_auth
    await require_auth(request)
    
    convs = await _db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return convs

@chat_router.get("/conversations/{lead_id}")
async def get_conversation(lead_id: str, request: Request):
    from server import require_auth
    await require_auth(request)
    
    conv = await _db.conversations.find_one({"lead_id": lead_id}, {"_id": 0})
    if not conv:
        return {"lead_id": lead_id, "messages": [], "unread_crm": 0}
    return conv

@chat_router.post("/conversations/{lead_id}/reply")
async def reply_to_client(lead_id: str, msg: MessageCreate, request: Request):
    from server import require_auth
    user = await require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "content": msg.content,
        "from_client": False,
        "sender_name": "Merylis - Global Clean Home",
        "created_at": now,
        "read": False,
    }
    
    conv = await _db.conversations.find_one({"lead_id": lead_id})
    if not conv:
        lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        await _db.conversations.insert_one({
            "conversation_id": f"conv_{uuid.uuid4().hex[:12]}",
            "lead_id": lead_id,
            "lead_name": lead.get("name", "") if lead else "",
            "lead_email": lead.get("email", "") if lead else "",
            "messages": [message],
            "created_at": now,
            "updated_at": now,
            "unread_crm": 0,
        })
    else:
        await _db.conversations.update_one(
            {"lead_id": lead_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": now, "unread_crm": 0}
            }
        )
    
    return {"success": True, "message": message}

@chat_router.post("/conversations/{lead_id}/mark-read")
async def mark_conversation_read(lead_id: str, request: Request):
    from server import require_auth
    await require_auth(request)
    
    await _db.conversations.update_one(
        {"lead_id": lead_id},
        {"$set": {"unread_crm": 0}}
    )
    return {"success": True}

@chat_router.get("/unread-count")
async def get_unread_count(request: Request):
    from server import require_auth
    await require_auth(request)
    
    convs = await _db.conversations.find({"unread_crm": {"$gt": 0}}, {"_id": 0}).to_list(1000)
    total = sum(c.get("unread_crm", 0) for c in convs)
    return {"count": total, "conversations": len(convs)}
