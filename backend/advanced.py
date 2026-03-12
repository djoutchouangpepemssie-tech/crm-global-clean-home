"""
Global Clean Home CRM - Notifications & Advanced Features Module
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

advanced_router = APIRouter(prefix="/api")

# ============= MODELS =============

class NotificationMarkRead(BaseModel):
    notification_ids: Optional[List[str]] = None

class UserRoleUpdate(BaseModel):
    role: str  # super_admin, manager, commercial, technicien

# ============= HELPERS =============

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

# ============= NOTIFICATION CENTER =============

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    link: str = None,
    target_roles: list = None
):
    """Create a notification. Can be called from other modules."""
    notif = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,  # "all" for broadcast
        "title": title,
        "message": message,
        "type": notification_type,  # info, success, warning, alert
        "link": link,
        "target_roles": target_roles,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.notifications.insert_one(notif)
    return notif["notification_id"]


@advanced_router.get("/notifications")
async def get_notifications(request: Request, unread_only: bool = False):
    """Get notifications for the current user."""
    user = await _require_auth(request)
    
    query = {
        "$or": [
            {"user_id": user.user_id},
            {"user_id": "all"}
        ]
    }
    if unread_only:
        query["read"] = False
    
    notifications = await _db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    unread_count = await _db.notifications.count_documents({
        "$or": [{"user_id": user.user_id}, {"user_id": "all"}],
        "read": False
    })
    
    return {"notifications": notifications, "unread_count": unread_count}


@advanced_router.post("/notifications/read")
async def mark_notifications_read(body: NotificationMarkRead, request: Request):
    """Mark notifications as read."""
    user = await _require_auth(request)
    
    if body.notification_ids:
        await _db.notifications.update_many(
            {"notification_id": {"$in": body.notification_ids}},
            {"$set": {"read": True}}
        )
    else:
        await _db.notifications.update_many(
            {"$or": [{"user_id": user.user_id}, {"user_id": "all"}], "read": False},
            {"$set": {"read": True}}
        )
    
    return {"message": "Notifications marquées comme lues"}


# ============= ADVANCED LEAD SCORING =============

SCORING_RULES = {
    "source": {
        "Google Ads": 25,
        "SEO": 20,
        "Meta Ads": 15,
        "Referral": 30,
        "Direct": 10,
    },
    "service_type": {
        "Bureaux": 30,
        "Ménage": 15,
        "Canapé": 10,
        "Matelas": 10,
        "Tapis": 10,
    },
    "has_phone": 10,
    "has_email": 5,
    "has_address": 10,
    "has_message": 5,
    "surface_bonus": {
        50: 5,
        100: 10,
        200: 15,
        500: 20,
    },
}


def calculate_lead_score(lead: dict) -> int:
    """Calculate lead score based on advanced rules."""
    score = 0
    
    # Source score
    source = lead.get("source", "Direct")
    score += SCORING_RULES["source"].get(source, 5)
    
    # Service type score
    svc = lead.get("service_type", "")
    score += SCORING_RULES["service_type"].get(svc, 5)
    
    # Contact info
    if lead.get("phone"):
        score += SCORING_RULES["has_phone"]
    if lead.get("email"):
        score += SCORING_RULES["has_email"]
    if lead.get("address"):
        score += SCORING_RULES["has_address"]
    if lead.get("message") and len(lead.get("message", "")) > 20:
        score += SCORING_RULES["has_message"]
    
    # Surface bonus
    surface = lead.get("surface", 0) or 0
    for threshold, bonus in sorted(SCORING_RULES["surface_bonus"].items()):
        if surface >= threshold:
            score = max(score, score + bonus - 5)
    
    # Engagement bonus
    if lead.get("utm_params"):
        score += 5
    
    return min(score, 100)


@advanced_router.get("/scoring/rules")
async def get_scoring_rules(request: Request):
    """Get current scoring rules."""
    await _require_auth(request)
    return SCORING_RULES


@advanced_router.post("/scoring/recalculate")
async def recalculate_all_scores(request: Request):
    """Recalculate scores for all leads."""
    await _require_auth(request)
    
    leads = await _db.leads.find({}, {"_id": 0}).to_list(10000)
    updated = 0
    
    for lead in leads:
        new_score = calculate_lead_score(lead)
        if new_score != lead.get("score"):
            await _db.leads.update_one(
                {"lead_id": lead["lead_id"]},
                {"$set": {"score": new_score}}
            )
            updated += 1
    
    return {"message": f"{updated} scores recalculés", "total": len(leads)}


# ============= USER ROLES =============

@advanced_router.get("/users")
async def list_users(request: Request):
    """List all users with their roles."""
    await _require_auth(request)
    users = await _db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users


@advanced_router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, body: UserRoleUpdate, request: Request):
    """Update a user's role."""
    admin = await _require_auth(request)
    
    valid_roles = ["super_admin", "manager", "commercial", "technicien"]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Valides: {valid_roles}")
    
    result = await _db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": body.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    # Create notification
    await create_notification(
        user_id=user_id,
        title="Rôle mis à jour",
        message=f"Votre rôle a été changé en {body.role}",
        notification_type="info"
    )
    
    return {"message": f"Rôle mis à jour: {body.role}"}


# ============= CLIENT RETENTION =============

@advanced_router.get("/clients")
async def list_converted_clients(request: Request):
    """List leads converted to clients (status=gagné)."""
    await _require_auth(request)
    
    clients = await _db.leads.find(
        {"status": "gagné"},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(1000)
    
    # Enrich with invoice data
    for client in clients:
        invoices = await _db.invoices.find(
            {"lead_id": client["lead_id"], "status": "payée"},
            {"_id": 0}
        ).to_list(100)
        client["total_spent"] = sum(i.get("amount_ttc", 0) for i in invoices)
        client["invoice_count"] = len(invoices)
    
    return clients


@advanced_router.get("/clients/{lead_id}/history")
async def get_client_history(lead_id: str, request: Request):
    """Get full history for a converted client."""
    await _require_auth(request)
    
    lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Client introuvable")
    
    quotes = await _db.quotes.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    invoices = await _db.invoices.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    interactions = await _db.interactions.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    interventions = await _db.interventions.find({"lead_id": lead_id}, {"_id": 0}).sort("scheduled_date", -1).to_list(100)
    
    return {
        "client": lead,
        "quotes": quotes,
        "invoices": invoices,
        "interactions": interactions,
        "interventions": interventions,
        "total_revenue": sum(i.get("amount_ttc", 0) for i in invoices if i.get("status") == "payée"),
    }
