"""
Global Clean Home CRM - Interventions & Team Planning Module
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import logging
import math

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
    skills: Optional[List[str]] = []
    zones: Optional[List[str]] = []
    notes: Optional[str] = ""

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
        "phone": body.phone or "",
        "role": body.role or "technicien",
        "skills": getattr(body, 'skills', []) or [],
        "zones": getattr(body, 'zones', []) or [],
        "notes": getattr(body, 'notes', '') or "",
        "added_at": datetime.now(timezone.utc).isoformat(),
        "team_id": team_id,
        "team_name": team.get("name",""),
    }
    
    # Sauvegarder dans teams ET team_members pour accès facile
    await _db.teams.update_one(
        {"team_id": team_id},
        {"$push": {"members": member}}
    )
    await _db.team_members.update_one(
        {"member_id": member["member_id"]},
        {"$set": member},
        upsert=True
    )

    # Envoyer email de bienvenue avec lien portail
    if body.email:
        try:
            from gmail_service import _get_any_active_token, _send_gmail_message
            token, _ = await _get_any_active_token()
            if token:
                portal_url = "https://crm.globalcleanhome.com/intervenant"
                html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:36px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🧹</div>
    <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">Bienvenue dans l'équipe !</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Global Clean Home — Portail Intervenant</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 8px;">Bonjour {body.name} 👋</p>
    <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0 0 24px;">
      Vous avez été ajouté(e) à l'équipe <strong>Global Clean Home</strong> en tant que <strong>{body.role or 'Technicien'}</strong>.
      Votre espace personnel vous permet de consulter vos missions, faire vos check-in/check-out et communiquer avec le bureau.
    </p>
    <div style="background:#f0fdf4;border-radius:14px;padding:20px;margin:0 0 24px;border:1px solid #bbf7d0;text-align:center;">
      <p style="color:#15803d;font-size:13px;font-weight:700;margin:0 0 12px;">🔐 Comment vous connecter :</p>
      <p style="color:#166534;font-size:13px;margin:0 0 8px;">1. Allez sur votre portail intervenant</p>
      <p style="color:#166534;font-size:13px;margin:0 0 16px;">2. Entrez votre email : <strong>{body.email}</strong></p>
      <p style="color:#166534;font-size:13px;margin:0 0 16px;">3. Entrez le code reçu par email</p>
      <a href="{portal_url}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
        🚀 Accéder à mon portail
      </a>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
      <p style="color:#64748b;font-size:12px;margin:0;">Lien direct : <span style="color:#10b981;font-family:monospace;">{portal_url}</span></p>
    </div>
  </div>
  <div style="background:#0f172a;padding:20px 32px;text-align:center;">
    <p style="color:white;font-weight:700;margin:0 0 3px;font-size:13px;">Global Clean Home</p>
    <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">06 22 66 53 08 · info@globalcleanhome.com</p>
  </div>
</div></body></html>"""
                await _send_gmail_message(token, body.email,
                    f"🧹 Bienvenue chez Global Clean Home — Accès portail intervenant",
                    html)
                logger.info(f"Welcome email sent to {body.email}")
        except Exception as e:
            logger.warning(f"Welcome email failed: {e}")

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
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    await _require_auth(request)
    query = {}
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}
    if date_from:
        query.setdefault("scheduled_date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("scheduled_date", {})["$lte"] = date_to
    if team_id:
        query["team_id"] = team_id
    if status:
        query["status"] = status
    
    total = await _db.interventions.count_documents(query)
    skip = (page - 1) * page_size
    items = await _db.interventions.find(query, {"_id": 0}).sort("scheduled_date", 1).skip(skip).limit(page_size).to_list(page_size)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }

@planning_router.get("/interventions/{intervention_id}")
async def get_intervention(intervention_id: str, request: Request):
    await _require_auth(request)
    doc = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    return doc

@planning_router.patch("/interventions/{intervention_id}")
async def update_intervention(intervention_id: str, request: Request):
    user = await _require_auth(request)
    # Accepter JSON libre pour tout type de mise à jour
    try:
        raw = await request.json()
    except Exception:
        raw = {}
    update = {k: v for k, v in raw.items() if k != '_id'}
    if not update:
        raise HTTPException(status_code=400, detail="Rien a mettre a jour")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    await _log_activity(user.user_id, "update_intervention", "intervention", intervention_id, update)
    
    # Notifier l'intervenant si assignation
    if update.get("assigned_agent_id") or update.get("assigned_agent_name"):
        try:
            intv = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
            agent_id = update.get("assigned_agent_id")
            member = await _db.team_members.find_one({"member_id": agent_id}, {"_id": 0}) if agent_id else None
            if member and member.get("email") and intv:
                from gmail_service import _get_any_active_token, _send_gmail_message
                token, _ = await _get_any_active_token()
                if token:
                    portal_url = "https://crm.globalcleanhome.com/intervenant"
                    html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:20px;">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;text-align:center;">
    <div style="font-size:48px;">📋</div>
    <h2 style="color:white;margin:8px 0 0;">Nouvelle mission assignée !</h2>
  </div>
  <div style="padding:24px;">
    <p style="color:#1e293b;font-size:15px;">Bonjour <strong>{member.get("name","").split()[0]}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.8;">Une nouvelle mission vous a été assignée :</p>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #bbf7d0;">
      <p style="color:#15803d;font-weight:700;margin:0 0 8px;">📋 Détails de la mission</p>
      <p style="color:#166534;font-size:13px;margin:4px 0;">🧹 <strong>{intv.get("service_type") or intv.get("title","Nettoyage")}</strong></p>
      <p style="color:#166534;font-size:13px;margin:4px 0;">📅 {intv.get("scheduled_date","—")} à {intv.get("scheduled_time","—")}</p>
      <p style="color:#166534;font-size:13px;margin:4px 0;">📍 {intv.get("address","—")}</p>
      <p style="color:#166534;font-size:13px;margin:4px 0;">⏱️ Durée : {intv.get("duration_hours","—")}h</p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="{portal_url}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
        📱 Voir sur mon portail
      </a>
    </div>
  </div>
  <div style="background:#0f172a;padding:16px;text-align:center;">
    <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">Global Clean Home · 06 22 66 53 08</p>
  </div>
</div></body></html>"""
                    await _send_gmail_message(token, member["email"],
                        f"📋 Nouvelle mission — {intv.get('scheduled_date','')}", html)
                    logger.info(f"Assignment email sent to {member['email']}")
        except Exception as e:
            logger.warning(f"Assignment notification failed: {e}")
    
    return {"success": True, "message": "Intervention mise a jour"}

@planning_router.delete("/interventions/{intervention_id}")
async def delete_intervention(intervention_id: str, request: Request):
    user = await _require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    result = await _db.interventions.update_one(
        {"intervention_id": intervention_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    await _log_activity(user.user_id, "delete_intervention", "intervention", intervention_id)
    return {"message": "Intervention supprimée"}

@planning_router.post("/interventions/{intervention_id}/restore")
async def restore_intervention(intervention_id: str, request: Request):
    """Restore a soft-deleted intervention."""
    user = await _require_auth(request)
    result = await _db.interventions.update_one(
        {"intervention_id": intervention_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention introuvable ou non supprimée")
    return {"message": "Intervention restaurée"}

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
