"""
Portail Intervenant — Global Clean Home
Endpoints pour les agents terrain
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import os
import secrets
import logging

logger = logging.getLogger(__name__)
intervenant_router = APIRouter(prefix="/api/intervenant", tags=["intervenant"])
_db = None

def init_intervenant_db(database):
    global _db
    _db = database

async def _get_agent(request: Request):
    token = request.headers.get("X-Intervenant-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Token requis")
    session = await _db.intervenant_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    # Vérifier expiration (7 jours)
    exp = session.get("expires_at", "")
    if exp and datetime.fromisoformat(exp.replace("Z","+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expirée")
    agent = await _db.team_members.find_one({"member_id": session["agent_id"]}, {"_id": 0})
    if not agent:
        # Chercher dans users
        agent = await _db.users.find_one({"user_id": session["agent_id"]}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent introuvable")
    return agent, session["agent_id"]

# ── AUTH ──
@intervenant_router.post("/auth/request")
async def request_auth_code(request: Request):
    """Demander un code de connexion par email."""
    body = await request.json()
    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")

    # SECURITE: Vérifier que l'agent est enregistré
    agent = await _db.team_members.find_one({"email": email}, {"_id": 0})
    if not agent:
        agent = await _db.users.find_one({"email": email, "role": {"$in": ["technicien","agent","senior","chef_equipe"]}}, {"_id": 0})
    
    if not agent:
        # Accès refusé - email non enregistré
        raise HTTPException(status_code=403, detail="Accès refusé. Contactez votre administrateur pour obtenir un accès.")

    # Générer code 6 chiffres
    code = str(secrets.randbelow(1000000)).zfill(6)
    expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    await _db.intervenant_codes.insert_one({
        "email": email,
        "code": code,
        "expires_at": expires,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False,
    })

    # Envoyer email avec le code
    try:
        from gmail_service import _get_any_active_token, _send_gmail_message
        token, _ = await _get_any_active_token()
        if token:
            html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px;">
            <div style="max-width:400px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;">
                <div style="font-size:48px;margin-bottom:10px;">🧹</div>
                <h1 style="color:white;margin:0;font-size:20px;">Code de connexion</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Global Clean Home — Portail Intervenant</p>
              </div>
              <div style="padding:32px;text-align:center;">
                <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Votre code de connexion :</p>
                <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:0 0 20px;">
                  <p style="color:#0f172a;font-size:40px;font-weight:900;letter-spacing:8px;margin:0;font-family:monospace;">{code}</p>
                </div>
                <p style="color:#94a3b8;font-size:12px;">Ce code expire dans 10 minutes.</p>
              </div>
              <div style="background:#0f172a;padding:16px;text-align:center;">
                <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">Global Clean Home · 06 22 66 53 08</p>
              </div>
            </div></body></html>"""
            await _send_gmail_message(token, email, "🔐 Votre code de connexion — Global Clean Home", html)
    except Exception as e:
        logger.warning(f"Code email failed: {e}")

    response = {"message": "Code envoyé", "expires_in": 600}
    # En dev, retourner le code
    if os.getenv("ENVIRONMENT", "production") != "production":
        response["dev_code"] = code
    # Toujours retourner pour debug
    response["dev_code"] = code

    return response

@intervenant_router.post("/auth/verify")
async def verify_auth_code(request: Request):
    """Vérifier le code et créer une session."""
    body = await request.json()
    email = body.get("email", "").lower().strip()
    code = body.get("code", "").strip()

    # Vérifier le code
    code_doc = await _db.intervenant_codes.find_one({
        "email": email, "code": code, "used": False
    }, {"_id": 0})

    if not code_doc:
        raise HTTPException(status_code=401, detail="Code invalide")

    exp = code_doc.get("expires_at", "")
    if exp and datetime.fromisoformat(exp.replace("Z","+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Code expiré")

    # Marquer code comme utilisé
    await _db.intervenant_codes.update_one(
        {"email": email, "code": code},
        {"$set": {"used": True}}
    )

    # Trouver l'agent
    agent = await _db.team_members.find_one({"email": email}, {"_id": 0})
    if not agent:
        agent = await _db.users.find_one({"email": email}, {"_id": 0})

    if not agent:
        raise HTTPException(status_code=403, detail="Accès refusé. Contactez votre administrateur.")

    agent_id = agent.get("member_id") or agent.get("user_id")

    # Créer session
    session_token = secrets.token_urlsafe(32)
    await _db.intervenant_sessions.insert_one({
        "token": session_token,
        "agent_id": agent_id,
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })

    return {
        "token": session_token,
        "agent": {
            "name": agent.get("name", email.split("@")[0].title()),
            "email": email,
            "role": agent.get("role", "technicien"),
            "member_id": agent_id,
        }
    }

@intervenant_router.get("/me")
async def get_me(request: Request):
    """Récupérer les infos de l'agent connecté."""
    agent, _ = await _get_agent(request)
    return {
        "name": agent.get("name", "Agent"),
        "email": agent.get("email", ""),
        "role": agent.get("role", "technicien"),
        "member_id": agent.get("member_id") or agent.get("user_id"),
    }

# ── INTERVENTIONS ──
@intervenant_router.get("/interventions")
async def get_interventions(request: Request):
    """Récupérer les interventions de l'agent."""
    agent, agent_id = await _get_agent(request)

    # Chercher interventions assignées à cet agent ou son équipe
    interventions = await _db.interventions.find(
        {"$or": [
            {"assigned_agent_id": agent_id},
            {"agent_id": agent_id},
            {"team_member_id": agent_id},
        ]},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(100)

    # Si aucune intervention assignée spécifiquement, retourner toutes les planifiées
    if not interventions:
        interventions = await _db.interventions.find(
            {"status": {"$in": ["planifiée", "en_cours"]}},
            {"_id": 0}
        ).sort("scheduled_date", 1).to_list(50)

    # Enrichir avec infos lead
    enriched = []
    for intv in interventions:
        lead_id = intv.get("lead_id")
        if lead_id:
            lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
            if lead:
                intv["lead_name"] = lead.get("name", "")
                intv["lead_phone"] = lead.get("phone", "")
                intv["client_name"] = lead.get("name", "")
        enriched.append(intv)

    return {"interventions": enriched}

@intervenant_router.post("/interventions/{intervention_id}/checkin")
async def check_in(intervention_id: str, request: Request):
    """Enregistrer l'arrivée sur site."""
    agent, agent_id = await _get_agent(request)
    body = await request.json()

    now = datetime.now(timezone.utc)
    await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$set": {
            "status": "en_cours",
            "check_in": {
                "time": now.isoformat(),
                "agent_id": agent_id,
                "agent_name": agent.get("name", ""),
                "lat": body.get("lat"),
                "lng": body.get("lng"),
            },
            "updated_at": now.isoformat(),
        }}
    )

    # Notifier le bureau
    try:
        from notifications import create_notification
        intv = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
        await create_notification(
            type="checkin",
            title=f"✅ Check-in — {agent.get('name','')}",
            message=f"Intervention démarrée : {intv.get('title','') if intv else intervention_id}",
        )
    except: pass

    return {"success": True, "message": "Check-in enregistré", "time": now.isoformat()}

@intervenant_router.post("/interventions/{intervention_id}/checkout")
async def check_out(intervention_id: str, request: Request):
    """Enregistrer la fin d'intervention."""
    agent, agent_id = await _get_agent(request)
    body = await request.json()

    now = datetime.now(timezone.utc)
    await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$set": {
            "status": "terminée",
            "check_out": {
                "time": now.isoformat(),
                "agent_id": agent_id,
                "agent_name": agent.get("name", ""),
                "checklist": body.get("checklist", {}),
                "notes": body.get("notes", ""),
                "completed_items": body.get("completed_items", 0),
            },
            "updated_at": now.isoformat(),
        }}
    )

    # Notifier le bureau
    try:
        from notifications import create_notification
        await create_notification(
            type="checkout",
            title=f"🏁 Intervention terminée — {agent.get('name','')}",
            message=f"Checklist : {body.get('completed_items',0)} items complétés. Notes : {body.get('notes','')[:50]}",
        )
    except: pass

    return {"success": True, "message": "Intervention terminée", "time": now.isoformat()}

# ── TÂCHES ──
@intervenant_router.get("/tasks")
async def get_tasks(request: Request):
    """Récupérer les tâches de l'agent."""
    agent, agent_id = await _get_agent(request)

    tasks = await _db.tasks.find(
        {"$or": [
            {"assigned_to": agent_id},
            {"assigned_agent": agent_id},
        ]},
        {"_id": 0}
    ).sort("due_date", 1).to_list(50)

    # Si aucune tâche assignée, retourner tâches pending générales
    if not tasks:
        tasks = await _db.tasks.find(
            {"status": "pending"},
            {"_id": 0}
        ).sort("due_date", 1).to_list(20)

    return tasks

# ── MESSAGES ──
@intervenant_router.get("/messages")
async def get_messages(request: Request):
    """Récupérer les messages de l'agent."""
    agent, agent_id = await _get_agent(request)

    messages = await _db.intervenant_messages.find(
        {"$or": [
            {"agent_id": agent_id},
            {"to_all": True},
        ]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)

    return {"messages": messages}

@intervenant_router.post("/messages")
async def send_message(request: Request):
    """Envoyer un message au bureau."""
    agent, agent_id = await _get_agent(request)
    body = await request.json()
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message vide")

    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "agent_id": agent_id,
        "agent_name": agent.get("name", "Agent"),
        "content": content,
        "sender": "agent",
        "from_agent": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.intervenant_messages.insert_one(msg)

    return {"success": True, "message_id": msg["message_id"]}
