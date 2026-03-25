"""
Global Clean Home CRM - Interventions & Team Planning Module
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

planning_router = APIRouter(prefix="/api")

# ============= MODELS =============

class TeamCreate(BaseModel):
    name: str
    color: Optional[str] = "#7C3AED"

class TeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "technicien"

class InterventionCreate(BaseModel):
    lead_id: str
    title: str
    description: Optional[str] = None
    service_type: Optional[str] = None
    address: Optional[str] = None
    scheduled_date: str  # ISO date
    scheduled_time: Optional[str] = "09:00"
    duration_hours: Optional[float] = 2.0
    team_id: Optional[str] = None
    assigned_members: Optional[List[str]] = None

class InterventionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    duration_hours: Optional[float] = None
    team_id: Optional[str] = None
    assigned_members: Optional[List[str]] = None
    status: Optional[str] = None

class CheckInOut(BaseModel):
    type: str  # "check_in" or "check_out"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None

# ============= HELPERS =============

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

async def _log_activity(user_id, action, entity_type, entity_id, details=None):
    from server import log_activity
    await log_activity(user_id, action, entity_type, entity_id, details)

# ============= TEAMS =============

@planning_router.post("/teams")
async def create_team(body: TeamCreate, request: Request):
    user = await _require_auth(request)
    team = {
        "team_id": f"team_{uuid.uuid4().hex[:12]}",
        "name": body.name,
        "color": body.color,
        "members": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
    }
    await _db.teams.insert_one(team)
    await _log_activity(user.user_id, "create_team", "team", team["team_id"])
    doc = await _db.teams.find_one({"team_id": team["team_id"]}, {"_id": 0})
    return doc

@planning_router.get("/teams")
async def list_teams(request: Request):
    await _require_auth(request)
    return await _db.teams.find({}, {"_id": 0}).to_list(100)

@planning_router.post("/teams/{team_id}/members")
async def add_team_member(team_id: str, body: TeamMemberCreate, request: Request):
    user = await _require_auth(request)
    team = await _db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Équipe introuvable")
    
    member = {
        "member_id": f"mbr_{uuid.uuid4().hex[:12]}",
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "role": body.role,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await _db.teams.update_one(
        {"team_id": team_id},
        {"$push": {"members": member}}
    )
    return member

@planning_router.delete("/teams/{team_id}/members/{member_id}")
async def remove_team_member(team_id: str, member_id: str, request: Request):
    await _require_auth(request)
    await _db.teams.update_one(
        {"team_id": team_id},
        {"$pull": {"members": {"member_id": member_id}}}
    )
    return {"message": "Membre retiré"}

# ============= INTERVENTIONS =============

@planning_router.post("/interventions")
async def create_intervention(body: InterventionCreate, request: Request):
    user = await _require_auth(request)
    
    lead = await _db.leads.find_one({"lead_id": body.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    
    # Check for scheduling conflicts
    if body.team_id and body.scheduled_date:
        conflicts = await _db.interventions.find({
            "team_id": body.team_id,
            "scheduled_date": body.scheduled_date,
            "status": {"$nin": ["annulée", "terminée"]},
        }, {"_id": 0}).to_list(100)
        
        new_start = body.scheduled_time or "09:00"
        new_end_h = int(new_start.split(":")[0]) + (body.duration_hours or 2)
        
        for c in conflicts:
            c_start = c.get("scheduled_time", "09:00")
            c_end_h = int(c_start.split(":")[0]) + (c.get("duration_hours", 2) or 2)
            if not (new_end_h <= int(c_start.split(":")[0]) or int(new_start.split(":")[0]) >= c_end_h):
                logger.warning(f"Scheduling conflict detected with intervention {c['intervention_id']}")
    
    intervention = {
        "intervention_id": f"intv_{uuid.uuid4().hex[:12]}",
        "lead_id": body.lead_id,
        "lead_name": lead.get("name", ""),
        "lead_phone": lead.get("phone", ""),
        "lead_email": lead.get("email", ""),
        "title": body.title,
        "description": body.description,
        "service_type": body.service_type or lead.get("service_type", ""),
        "address": body.address or lead.get("address", ""),
        "scheduled_date": body.scheduled_date,
        "scheduled_time": body.scheduled_time or "09:00",
        "duration_hours": body.duration_hours or 2.0,
        "team_id": body.team_id,
        "assigned_members": body.assigned_members or [],
        "status": "planifiée",  # planifiée, en_cours, terminée, annulée
        "check_in": None,
        "check_out": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id,
    }
    
    await _db.interventions.insert_one(intervention)
    await _log_activity(user.user_id, "create_intervention", "intervention", intervention["intervention_id"])
    doc = await _db.interventions.find_one({"intervention_id": intervention["intervention_id"]}, {"_id": 0})
    return doc

@planning_router.get("/interventions")
async def list_interventions(
    request: Request,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    team_id: Optional[str] = None,
    status: Optional[str] = None
):
    await _require_auth(request)
    query = {}
    if date_from:
        query.setdefault("scheduled_date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("scheduled_date", {})["$lte"] = date_to
    if team_id:
        query["team_id"] = team_id
    if status:
        query["status"] = status
    
    return await _db.interventions.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)

@planning_router.get("/interventions/{intervention_id}")
async def get_intervention(intervention_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    return doc

@planning_router.patch("/interventions/{intervention_id}")
async def update_intervention(intervention_id: str, body: InterventionUpdate, request: Request):
    user = await _require_auth(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")
    
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    
    await _log_activity(user.user_id, "update_intervention", "intervention", intervention_id, update)
    return {"message": "Intervention mise à jour"}

@planning_router.delete("/interventions/{intervention_id}")
async def delete_intervention(intervention_id: str, request: Request):
    user = await _require_auth(request)
    result = await _db.interventions.delete_one({"intervention_id": intervention_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    await _log_activity(user.user_id, "delete_intervention", "intervention", intervention_id)
    return {"message": "Intervention supprimée"}

# ============= CHECK-IN / CHECK-OUT =============

@planning_router.post("/interventions/{intervention_id}/check")
async def check_in_out(intervention_id: str, body: CheckInOut, request: Request):
    user = await _require_auth(request)
    
    intervention = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    
    now = datetime.now(timezone.utc).isoformat()
    check_data = {
        "time": now,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "notes": body.notes,
        "user_id": user.user_id,
    }
    
    if body.type == "check_in":
        await _db.interventions.update_one(
            {"intervention_id": intervention_id},
            {"$set": {"check_in": check_data, "status": "en_cours"}}
        )
    elif body.type == "check_out":
        await _db.interventions.update_one(
            {"intervention_id": intervention_id},
            {"$set": {"check_out": check_data, "status": "terminée"}}
        )
    
    await _log_activity(user.user_id, f"intervention_{body.type}", "intervention", intervention_id)
    return {"message": f"{body.type} enregistré", "time": now}

# ============= CALENDAR VIEW =============

@planning_router.get("/calendar")
async def get_calendar(request: Request, month: Optional[str] = None):
    """Get interventions for calendar view. month format: YYYY-MM"""
    await _require_auth(request)
    
    if month:
        year, m = month.split("-")
        date_from = f"{year}-{m}-01"
        if int(m) == 12:
            date_to = f"{int(year)+1}-01-01"
        else:
            date_to = f"{year}-{int(m)+1:02d}-01"
    else:
        now = datetime.now(timezone.utc)
        date_from = now.strftime("%Y-%m-01")
        if now.month == 12:
            date_to = f"{now.year+1}-01-01"
        else:
            date_to = f"{now.year}-{now.month+1:02d}-01"
    
    interventions = await _db.interventions.find(
        {"scheduled_date": {"$gte": date_from, "$lt": date_to}},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(1000)
    
    teams = await _db.teams.find({}, {"_id": 0}).to_list(100)
    
    return {
        "month": month or datetime.now(timezone.utc).strftime("%Y-%m"),
        "interventions": interventions,
        "teams": teams,
    }

@planning_router.get("/team-members")
async def list_all_members(request: Request):
    """List all team members across all teams."""
    try:
        teams = await _db.teams.find({}, {"_id": 0}).to_list(100)
        all_members = []
        for team in teams:
            for m in (team.get("members") or []):
                all_members.append({**m, "team_id": team.get("team_id"), "team_name": team.get("name")})
        # Also check team_members collection
        direct = await _db.team_members.find({}, {"_id": 0}).to_list(100)
        for m in direct:
            if not any(x.get("member_id")==m.get("member_id") for x in all_members):
                all_members.append(m)
        return all_members
    except Exception as e:
        return []

@planning_router.patch("/interventions/{intervention_id}")
async def update_intervention(intervention_id: str, request: Request):
    """Update an intervention (assign agent, update status, etc)."""
    body = await request.json()
    from datetime import datetime, timezone
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$set": body}
    )
    if result.matched_count == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    return {"success": True}
