from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_token: str
    user_id: str
    expires_at: datetime
    created_at: datetime

class SessionCreate(BaseModel):
    session_id: str

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead_id: str
    name: str
    email: EmailStr
    phone: str
    service_type: str  # Ménage, Canapé, Matelas, Tapis, Bureaux
    surface: Optional[float] = None
    address: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None  # Google Ads, SEO, Meta Ads, Direct
    campaign: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    status: str = "nouveau"  # nouveau, contacté, en_attente, devis_envoyé, gagné, perdu
    probability: int = 50
    score: int = 50  # Score intelligent 0-100
    tags: List[str] = []  # Tags personnalisables
    created_at: datetime
    updated_at: datetime
    assigned_to: Optional[str] = None

class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    service_type: str
    services: Optional[List[str]] = None
    surface: Optional[float] = None
    address: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None
    campaign: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    page_origine: Optional[str] = None
    estimated_price: Optional[float] = None
    service_details: Optional[dict] = None
    date_preference: Optional[str] = None
    manual: Optional[bool] = False

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    probability: Optional[int] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class LeadBulkUpdate(BaseModel):
    lead_ids: List[str]
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None

class Template(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str
    name: str
    type: str  # email, note, relance
    content: str
    created_by: str
    created_at: datetime

class TemplateCreate(BaseModel):
    name: str
    type: str
    content: str

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    quote_id: str
    lead_id: Optional[str] = None
    service_type: str
    surface: Optional[float] = None
    amount: float
    details: str
    status: str = "brouillon"  # brouillon, envoyé, accepté, refusé, expiré
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    pdf_url: Optional[str] = None
    created_at: datetime
    created_by: str

class QuoteCreate(BaseModel):
    lead_id: Optional[str] = None
    service_type: str
    surface: Optional[float] = None
    amount: float
    details: str

class Interaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    interaction_id: Optional[str] = None
    lead_id: str
    type: str  # appel, email, note, relance
    content: str
    created_by: Optional[str] = None
    created_at: datetime

class InteractionCreate(BaseModel):
    lead_id: str
    type: str
    content: str

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    lead_id: Optional[str] = None
    event_type: str  # clic_devis, clic_appel, clic_reserver, visite_page
    page_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    created_at: datetime

class EventCreate(BaseModel):
    lead_id: Optional[str] = None
    event_type: str
    page_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str
    lead_id: Optional[str] = None
    type: Optional[str] = "relance"
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "pending"
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    lead_id: str
    type: str
    title: str
    description: Optional[str] = None
    due_date: datetime

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

# ============= HELPER FUNCTIONS =============

async def get_current_user(request: Request) -> Optional[User]:
    """Extract user from session_token cookie or Authorization header."""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        return None
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)

async def require_auth(request: Request) -> User:
    """Require authenticated user or raise 401."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

async def log_activity(user_id: str, action: str, entity_type: str, entity_id: str, details: Optional[Dict[str, Any]] = None):
    """Log user activity."""
    log = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(log)

def calculate_lead_score(lead_data: Dict[str, Any]) -> int:
    """Calcul intelligent du score lead (0-100) - Algorithme avancé Global Clean Home."""
    score = 30  # Base score
    breakdown = {}

    # ============ 1. QUALITE DE LA SOURCE (max +20) ============
    source_scores = {
        "Google Ads": 20,      # Intention d achat forte
        "SEO": 18,             # Recherche active
        "recommandation": 18,  # Confiance élevée
        "Referral": 16,        # Bouche à oreille
        "Meta Ads": 12,        # Intention moyenne
        "site_web": 10,
        "Direct": 8,
        "réseaux-sociaux": 6,
    }
    src_score = source_scores.get(lead_data.get("source", ""), 5)
    score += src_score
    breakdown["source"] = src_score

    # ============ 2. VALEUR DU SERVICE (max +18) ============
    service_scores = {
        "nettoyage-bureaux": 18,   # Contrats récurrents haute valeur
        "Bureaux": 18,
        "menage-domicile": 14,     # Récurrent
        "Ménage": 14,
        "nettoyage-canape": 10,    # Ponctuel moyen
        "Canapé": 10,
        "nettoyage-matelas": 10,
        "Matelas": 10,
        "nettoyage-tapis": 8,
        "Tapis": 8,
    }
    svc_score = service_scores.get(lead_data.get("service_type", ""), 5)
    score += svc_score
    breakdown["service"] = svc_score

    # ============ 3. COMPLETUDE DU PROFIL (max +20) ============
    profile_score = 0
    if lead_data.get("address"): profile_score += 5
    if lead_data.get("surface"): profile_score += 5
    if lead_data.get("message") and len(str(lead_data.get("message", ""))) > 30: profile_score += 5
    if lead_data.get("phone"): profile_score += 3
    if lead_data.get("email"): profile_score += 2
    score += profile_score
    breakdown["profil"] = profile_score

    # ============ 4. SIGNAUX D INTENTION FORTE (max +15) ============
    intention_score = 0
    message = str(lead_data.get("message", "")).lower()
    services = lead_data.get("services", [])
    
    # Multi-services demandés = budget élevé
    if isinstance(services, list) and len(services) > 1:
        intention_score += min(10, len(services) * 4)
    
    # Urgence exprimée
    urgency_keywords = ["urgent", "rapidement", "vite", "dès que", "asap", "cette semaine"]
    if any(kw in message for kw in urgency_keywords):
        intention_score += 8
    
    # Prix estimé élevé
    estimated_price = lead_data.get("estimated_price", 0) or 0
    if estimated_price >= 500: intention_score += 7
    elif estimated_price >= 200: intention_score += 4
    elif estimated_price > 0: intention_score += 2
    
    # Grande surface
    surface = lead_data.get("surface") or 0
    try:
        surface = float(surface)
        if surface >= 100: intention_score += 5
        elif surface >= 50: intention_score += 3
    except: pass
    
    intention_score = min(15, intention_score)
    score += intention_score
    breakdown["intention"] = intention_score

    # ============ 5. UTM / TRACKING (max +5) ============
    tracking_score = 0
    if lead_data.get("utm_campaign"): tracking_score += 3
    if lead_data.get("utm_medium") == "cpc": tracking_score += 2
    score += tracking_score
    breakdown["tracking"] = tracking_score

    # ============ 6. PENALITE TEMPORELLE (max -20) ============
    time_penalty = 0
    created_at = lead_data.get("created_at")
    if created_at:
        try:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            hours_old = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
            # Pénalité progressive après 4h
            if hours_old > 4:
                time_penalty = min(20, int((hours_old - 4) / 3))
                score -= time_penalty
        except: pass
    breakdown["time_penalty"] = -time_penalty

    return max(0, min(100, score))


def get_score_label(score: int) -> str:
    """Retourne le label du score avec emoji."""
    if score >= 80: return "🔥 Très chaud"
    if score >= 65: return "♨️ Chaud"
    if score >= 50: return "🌡️ Tiède"
    if score >= 35: return "❄️ Froid"
    return "🧊 Très froid"

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/session")
async def create_session(input: SessionCreate, response: Response):
    """Exchange session_id for user data and session_token."""
    try:
        # Verify Google token
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {input.session_id}"},
                timeout=10.0
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")
            data = resp.json()
        
        email = data.get("email")
        name = data.get("name", email)
        picture = data.get("picture", "")
        session_token = f"st_{uuid.uuid4().hex}"
        
        if not email:
            raise HTTPException(status_code=400, detail="Invalid session data")
        
        # Check allowed emails whitelist
        allowed_raw = os.environ.get("ALLOWED_EMAILS", "")
        if allowed_raw:
            allowed_emails = [e.strip().lower() for e in allowed_raw.split(",") if e.strip()]
            if allowed_emails and email.lower() not in allowed_emails:
                raise HTTPException(status_code=403, detail="not_authorized")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        # Create session
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session_doc = {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,
            path="/"
        )
        
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if isinstance(user_doc["created_at"], str):
            user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
        
        result = dict(user_doc)
        result["session_token"] = session_token
        return result
    
    except httpx.HTTPError as e:
        logger.error(f"Error exchanging session: {e}")
        raise HTTPException(status_code=500, detail="Failed to authenticate")


@api_router.post("/auth/fcm-token")
async def save_fcm_token(request: Request):
    """Save FCM token for push notifications."""
    user = await require_auth(request)
    body = await request.json()
    token = body.get("token")
    if token:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"fcm_token": token}}
        )
    return {"status": "ok"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user."""
    user = await require_auth(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout current user."""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============= LEADS ENDPOINTS =============

@api_router.post("/leads", response_model=Lead)
async def create_lead(input: LeadCreate, request: Request):
    """Create a new lead (public endpoint - can be called from website)."""
    now = datetime.now(timezone.utc)
    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    
    lead_dict = {
        "lead_id": lead_id,
        **input.model_dump(),
        "status": "nouveau",
        "probability": 50,
        "tags": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    # Formater le message lisible
    services_labels = {
        'menage-domicile': 'Menage a domicile',
        'nettoyage-canape': 'Nettoyage canape',
        'nettoyage-matelas': 'Nettoyage matelas',
        'nettoyage-tapis': 'Nettoyage tapis',
        'nettoyage-bureaux': 'Nettoyage bureaux',
    }
    services_list = lead_dict.get('services') or [lead_dict.get('service_type', '')]
    parts = []
    if lead_dict.get('message'):
        parts.append(lead_dict['message'])
    parts.append("Services: " + ', '.join(services_labels.get(s, s) for s in services_list))
    if lead_dict.get('estimated_price'):
        parts.append("Prix estime: " + str(lead_dict['estimated_price']) + "EUR")
    if lead_dict.get('date_preference'):
        parts.append("Date souhaitee: " + str(lead_dict['date_preference']))
    sd = lead_dict.get('service_details') or {}
    for svc_id, details in sd.items():
        svc_label = services_labels.get(svc_id, svc_id)
        parts.append("-- " + svc_label + " --")
        if svc_id == 'menage-domicile':
            if details.get('surface'): parts.append("  Surface: " + str(details['surface']) + " m2")
            if details.get('nombrePieces'): parts.append("  Pieces: " + str(details['nombrePieces']))
            if details.get('etatLogement'): parts.append("  Etat: " + str(details['etatLogement']))
            if details.get('frequence'): parts.append("  Frequence: " + str(details['frequence']))
            jours = details.get('joursIntervention') or details.get('joursSelectionnes') or []
            if jours: parts.append("  Jours: " + ', '.join(jours))
        elif svc_id == 'nettoyage-bureaux':
            if details.get('surfaceBureau'): parts.append("  Surface: " + str(details['surfaceBureau']) + " m2")
            if details.get('frequenceBureau'): parts.append("  Frequence: " + str(details['frequenceBureau']))
            espaces = details.get('espacesInclus') or []
            if espaces: parts.append("  Espaces: " + ', '.join(espaces))
        elif svc_id == 'nettoyage-canape':
            sofas = details.get('sofas') or []
            parts.append("  Nombre: " + str(len(sofas)) + " canape(s)")
            for i, s in enumerate(sofas):
                parts.append("  Canape " + str(i+1) + ": " + str(s.get('places','?')) + " places")
        elif svc_id == 'nettoyage-matelas':
            mattresses = details.get('mattresses') or []
            parts.append("  Nombre: " + str(len(mattresses)) + " matelas")
            sizes = {1: '1 place', 2: '2 places', 3: 'King size', 4: 'Super King'}
            for i, m in enumerate(mattresses):
                parts.append("  Matelas " + str(i+1) + ": " + sizes.get(m.get('places', 2), str(m.get('places','?')) + ' places'))
        elif svc_id == 'nettoyage-tapis':
            if details.get('quantity'): parts.append("  Nombre: " + str(details['quantity']) + " tapis")
            if details.get('surface'): parts.append("  Surface: " + str(details['surface']) + " m2")
    lead_dict['message'] = '\n'.join(parts)
    
    # Calculate intelligent score
    lead_dict["score"] = calculate_lead_score(lead_dict)
    
    await db.leads.insert_one(lead_dict)
    
    # Log activity if authenticated
    user = await get_current_user(request)
    if user:
        await log_activity(user.user_id, "create_lead", "lead", lead_id)
    
    # Notification nouveau lead
    try:
        score = lead_dict.get("score", 0)
        notif_type = "hot_lead" if score >= 70 else "new_lead"
        notif_title = f"🔥 Lead chaud — {lead_dict.get('name', '')}" if score >= 70 else f"🎯 Nouveau lead — {lead_dict.get('name', '')}"
        await create_notification(
            type=notif_type,
            title=notif_title,
            message=f"{lead_dict.get('service_type', '')} · Score {score}/100",
            lead_id=lead_id,
            action_url=f"/leads/{lead_id}",
            priority="high" if score >= 70 else "normal"
        )
    except Exception as e:
        logger.warning(f"Notification error: {e}")
    
    # Déclencher workflows automatiques
    try:
        score = lead_dict.get("score", 0)
        wf_filter = {"is_active": True, "trigger.type": "new_lead"}
        workflows = await db.workflows.find(wf_filter, {"_id": 0}).to_list(10)
        for wf in workflows:
            conditions = wf.get("trigger", {}).get("conditions", {})
            min_score = conditions.get("min_score", 0)
            max_score = conditions.get("max_score", 100)
            if min_score <= score <= max_score:
                await execute_workflow(wf, lead_dict, "new_lead")
        # Traiter UNIQUEMENT les executions immediates (delay=0)
        from datetime import timezone as tz2
        now_str = datetime.now(timezone.utc).isoformat()
        # Donner 10 secondes de marge pour les executions immediates
        cutoff = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
        pending = await db.workflow_executions.find(
            {"status": "scheduled", "scheduled_at": {"$lte": cutoff}},
            {"_id": 0}
        ).to_list(20)
        for exec_item in pending:
            try:
                await _execute_step(exec_item)
                await db.workflow_executions.update_one(
                    {"execution_id": exec_item["execution_id"]},
                    {"$set": {"status": "completed", "executed_at": datetime.now(timezone.utc).isoformat()}}
                )
            except Exception as ex:
                logger.warning(f"Immediate execution error: {ex}")
    except Exception as e:
        logger.warning(f"Workflow trigger error: {e}")
    
    # Create task for follow-up
    task = {
        "task_id": f"task_{uuid.uuid4().hex[:12]}",
        "lead_id": lead_id,
        "type": "rappel",
        "title": f"Contacter {input.name}",
        "description": f"Nouveau lead {input.service_type}",
        "due_date": (now + timedelta(hours=2)).isoformat(),
        "status": "pending",
        "created_at": now.isoformat()
    }
    await db.tasks.insert_one(task)
    
    # Envoi email de confirmation (desactive si workflows actifs pour eviter double envoi)
    if not getattr(input, 'manual', False):
        try:
            active_wf = await db.workflows.count_documents({"is_active": True, "trigger.type": "new_lead"})
            if active_wf == 0:
                from gmail_service import send_confirmation_email
                if input.email:
                    all_services = input.services or [input.service_type]
                    await send_confirmation_email(
                        to_email=input.email,
                        client_name=input.name,
                        service_type=input.service_type,
                        services=all_services
                    )
        except Exception as e:
            logger.warning(f"Email confirmation non envoye: {e}")

    # Create notification for new lead
    try:
        from advanced import create_notification
        score_label = get_score_label(lead_dict["score"])
        await create_notification(
            user_id="all",
            title=f"Nouveau lead {score_label}",
            message=f"{input.name} - {input.service_type} ({input.source})",
            notification_type="success" if lead_dict["score"] >= 70 else "info",
            link=f"/leads/{lead_id}",
        )
    except Exception as e:
        logger.warning(f"Failed to create notification: {e}")
    
    # Fire webhooks for new lead
    try:
        from external_integrations import fire_webhooks
        await fire_webhooks("new_lead", {
            "lead_id": lead_id,
            "name": input.name,
            "email": input.email,
            "phone": input.phone,
            "service_type": input.service_type,
            "source": input.source,
            "score": lead_dict["score"],
        })
    except Exception as e:
        logger.warning(f"Failed to fire webhooks: {e}")
    
    lead_doc = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if isinstance(lead_doc["created_at"], str):
        lead_doc["created_at"] = datetime.fromisoformat(lead_doc["created_at"])
    if isinstance(lead_doc["updated_at"], str):
        lead_doc["updated_at"] = datetime.fromisoformat(lead_doc["updated_at"])
    
    return Lead(**lead_doc)

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(
    request: Request,
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    source: Optional[str] = None,
    period: Optional[str] = "30d"
):
    """Get all leads with filters."""
    await require_auth(request)
    
    query = {}
    
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if source:
        query["source"] = source
    
    # Period filter
    if period:
        now = datetime.now(timezone.utc)
        if period == "1d":
            start_date = now - timedelta(days=1)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=30)
        
        query["created_at"] = {"$gte": start_date.isoformat()}
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for lead in leads:
        # Add default values for new fields if missing
        if "score" not in lead:
            lead["score"] = 50
        if "tags" not in lead:
            lead["tags"] = []
        
        if isinstance(lead["created_at"], str):
            lead["created_at"] = datetime.fromisoformat(lead["created_at"])
        if isinstance(lead["updated_at"], str):
            lead["updated_at"] = datetime.fromisoformat(lead["updated_at"])
    
    return leads

# IMPORTANT: Static routes (/leads/recent, /leads/export) must be defined BEFORE dynamic route (/leads/{lead_id})
# to prevent FastAPI from matching "recent" or "export" as a lead_id

@api_router.get("/leads/recent")
async def get_recent_leads(request: Request, since: Optional[str] = None):
    """Get recent leads for real-time notifications (polling endpoint)."""
    await require_auth(request)
    
    query = {}
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            query["created_at"] = {"$gt": since_dt.isoformat()}
        except Exception:
            pass
    else:
        query["created_at"] = {"$gt": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()}
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    for lead in leads:
        if "score" not in lead:
            lead["score"] = 50
        if "tags" not in lead:
            lead["tags"] = []
        if isinstance(lead["created_at"], str):
            lead["created_at"] = datetime.fromisoformat(lead["created_at"])
        if isinstance(lead["updated_at"], str):
            lead["updated_at"] = datetime.fromisoformat(lead["updated_at"])
    
    return {"leads": [Lead(**lead) for lead in leads], "count": len(leads)}

@api_router.get("/leads/export")
async def export_leads(
    request: Request,
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    source: Optional[str] = None
):
    """Export leads to CSV format."""
    await require_auth(request)
    
    from fastapi.responses import StreamingResponse
    import csv
    from io import StringIO
    
    query = {}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if source:
        query["source"] = source
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)
    
    output = StringIO()
    if leads:
        fieldnames = ["lead_id", "name", "email", "phone", "service_type", "surface", 
                     "address", "source", "status", "score", "created_at", "updated_at"]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        for lead in leads:
            if isinstance(lead.get("created_at"), datetime):
                lead["created_at"] = lead["created_at"].isoformat()
            if isinstance(lead.get("updated_at"), datetime):
                lead["updated_at"] = lead["updated_at"].isoformat()
            writer.writerow(lead)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )

@api_router.post("/leads/bulk")
async def bulk_update_leads(input: LeadBulkUpdate, request: Request):
    """Bulk update multiple leads."""
    user = await require_auth(request)
    
    update_data = {}
    if input.status:
        update_data["status"] = input.status
    if input.assigned_to:
        update_data["assigned_to"] = input.assigned_to
    if input.tags is not None:
        update_data["tags"] = input.tags
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_many(
        {"lead_id": {"$in": input.lead_ids}},
        {"$set": update_data}
    )
    
    await log_activity(
        user.user_id,
        "bulk_update_leads",
        "leads",
        ",".join(input.lead_ids),
        {"count": result.modified_count, "updates": update_data}
    )
    
    return {"message": f"{result.modified_count} leads updated"}

# Dynamic route MUST come AFTER static routes to prevent matching "recent"/"export" as lead_id
@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, request: Request):
    """Get a specific lead."""
    await require_auth(request)
    
    lead_doc = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Add default values for new fields if missing
    if "score" not in lead_doc:
        lead_doc["score"] = calculate_lead_score(lead_doc)
    if "tags" not in lead_doc:
        lead_doc["tags"] = []
    
    if isinstance(lead_doc["created_at"], str):
        lead_doc["created_at"] = datetime.fromisoformat(lead_doc["created_at"])
    if isinstance(lead_doc["updated_at"], str):
        lead_doc["updated_at"] = datetime.fromisoformat(lead_doc["updated_at"])
    
    return Lead(**lead_doc)

@api_router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, input: LeadUpdate, request: Request):
    """Update a lead."""
    user = await require_auth(request)
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await log_activity(user.user_id, "update_lead", "lead", lead_id, update_data)
    
    return {"message": "Lead updated"}

# ============= TEMPLATES ENDPOINTS =============

@api_router.post("/templates", response_model=Template)
async def create_template(input: TemplateCreate, request: Request):
    """Create a response template."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    template_id = f"tpl_{uuid.uuid4().hex[:12]}"
    
    template = {
        "template_id": template_id,
        **input.model_dump(),
        "created_by": user.user_id,
        "created_at": now.isoformat()
    }
    
    await db.templates.insert_one(template)
    await log_activity(user.user_id, "create_template", "template", template_id)
    
    template_doc = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    if isinstance(template_doc["created_at"], str):
        template_doc["created_at"] = datetime.fromisoformat(template_doc["created_at"])
    
    return Template(**template_doc)

@api_router.get("/templates", response_model=List[Template])
async def get_templates(request: Request, type: Optional[str] = None):
    """Get all templates."""
    await require_auth(request)
    
    query = {}
    if type:
        query["type"] = type
    
    templates = await db.templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for template in templates:
        if isinstance(template["created_at"], str):
            template["created_at"] = datetime.fromisoformat(template["created_at"])
    
    return templates

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, request: Request):
    """Delete a template."""
    user = await require_auth(request)
    
    result = await db.templates.delete_one({"template_id": template_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await log_activity(user.user_id, "delete_template", "template", template_id)
    
    return {"message": "Template deleted"}

# ============= QUOTES ENDPOINTS =============

@api_router.post("/quotes", response_model=Quote)
async def create_quote(input: QuoteCreate, request: Request):
    """Create a new quote."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    quote_id = f"quote_{uuid.uuid4().hex[:12]}"
    
    quote = {
        "quote_id": quote_id,
        **input.model_dump(),
        "status": "brouillon",
        "created_at": now.isoformat(),
        "created_by": user.user_id
    }
    
    await db.quotes.insert_one(quote)
    await log_activity(user.user_id, "create_quote", "quote", quote_id)
    
    quote_doc = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if isinstance(quote_doc["created_at"], str):
        quote_doc["created_at"] = datetime.fromisoformat(quote_doc["created_at"])
    
    return Quote(**quote_doc)

@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes(request: Request, lead_id: Optional[str] = None):
    """Get all quotes."""
    await require_auth(request)
    
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for quote in quotes:
        if isinstance(quote["created_at"], str):
            quote["created_at"] = datetime.fromisoformat(quote["created_at"])
        if quote.get("sent_at") and isinstance(quote["sent_at"], str):
            quote["sent_at"] = datetime.fromisoformat(quote["sent_at"])
        if quote.get("opened_at") and isinstance(quote["opened_at"], str):
            quote["opened_at"] = datetime.fromisoformat(quote["opened_at"])
        if quote.get("responded_at") and isinstance(quote["responded_at"], str):
            quote["responded_at"] = datetime.fromisoformat(quote["responded_at"])
    
    return quotes

@api_router.post("/quotes/{quote_id}/send")
async def send_quote(quote_id: str, request: Request):
    """Mark quote as sent, send email via Gmail if connected, and create follow-up task."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    
    result = await db.quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {"status": "envoyé", "sent_at": now.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Get quote to find lead_id
    quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    
    # Update lead status
    await db.leads.update_one(
        {"lead_id": quote["lead_id"]},
        {"$set": {"status": "devis_envoyé", "updated_at": now.isoformat()}}
    )
    
    # Send email via Gmail WITH PDF attached
    email_sent = False
    lead = await db.leads.find_one({"lead_id": quote["lead_id"]}, {"_id": 0})
    if lead and lead.get("email"):
        try:
            # Générer PDF premium
            pdf_data = None
            try:
                from integrations import generate_quote_pdf
                pdf_buffer = generate_quote_pdf(quote, lead)
                pdf_data = pdf_buffer.read()
                logger.info(f"PDF generated: {len(pdf_data)} bytes")
            except Exception as pdf_err:
                logger.warning(f"PDF generation failed: {pdf_err}")

            from gmail_service import send_quote_email
            email_sent = await send_quote_email(user.user_id, lead, quote, pdf_data=pdf_data)
            logger.info(f"Quote email sent: {email_sent}, PDF attached: {pdf_data is not None}")
        except Exception as e:
            logger.warning(f"Gmail send failed for quote {quote_id}: {e}")
    
    # Create follow-up task (48h)
    task = {
        "task_id": f"task_{uuid.uuid4().hex[:12]}",
        "lead_id": quote["lead_id"],
        "type": "relance",
        "title": "Relance devis",
        "description": f"Relancer pour devis #{quote_id}",
        "due_date": (now + timedelta(hours=48)).isoformat(),
        "status": "pending",
        "created_at": now.isoformat()
    }
    await db.tasks.insert_one(task)
    
    # Désactiver l'exécution des workflows "devis_envoye" car on envoie déjà l'email premium
    try:
        await db.workflow_executions.update_many(
            {"lead_id": quote["lead_id"], "template": "devis_envoye", "status": "pending"},
            {"$set": {"status": "skipped", "skip_reason": "Email premium envoyé directement"}}
        )
    except Exception as wf_err:
        logger.warning(f"Workflow skip error: {wf_err}")

    await log_activity(user.user_id, "send_quote", "quote", quote_id)

    return {"message": "Devis envoye" + (" par email avec PDF" if email_sent else ""), "email_sent": email_sent}

# ============= INTERACTIONS ENDPOINTS =============

@api_router.post("/interactions", response_model=Interaction)
async def create_interaction(input: InteractionCreate, request: Request):
    """Create a new interaction."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    interaction_id = f"int_{uuid.uuid4().hex[:12]}"
    
    interaction = {
        "interaction_id": interaction_id,
        **input.model_dump(),
        "created_by": user.user_id,
        "created_at": now.isoformat()
    }
    
    await db.interactions.insert_one(interaction)
    await log_activity(user.user_id, "create_interaction", "interaction", interaction_id)
    
    interaction_doc = await db.interactions.find_one({"interaction_id": interaction_id}, {"_id": 0})
    if isinstance(interaction_doc["created_at"], str):
        interaction_doc["created_at"] = datetime.fromisoformat(interaction_doc["created_at"])
    
    return Interaction(**interaction_doc)

@api_router.get("/interactions", response_model=List[Interaction])
async def get_interactions(request: Request, lead_id: Optional[str] = None):
    """Get interactions."""
    await require_auth(request)
    
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    interactions = await db.interactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for interaction in interactions:
        if isinstance(interaction["created_at"], str):
            interaction["created_at"] = datetime.fromisoformat(interaction["created_at"])
    
    return interactions

# ============= EVENTS ENDPOINTS =============

@api_router.post("/events", response_model=Event)
async def create_event(input: EventCreate):
    """Create a new event (public endpoint for website tracking)."""
    now = datetime.now(timezone.utc)
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    event = {
        "event_id": event_id,
        **input.model_dump(),
        "created_at": now.isoformat()
    }
    
    await db.events.insert_one(event)
    
    event_doc = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if isinstance(event_doc["created_at"], str):
        event_doc["created_at"] = datetime.fromisoformat(event_doc["created_at"])
    
    return Event(**event_doc)

@api_router.get("/events", response_model=List[Event])
async def get_events(request: Request, lead_id: Optional[str] = None):
    """Get events."""
    await require_auth(request)
    
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for event in events:
        if isinstance(event["created_at"], str):
            event["created_at"] = datetime.fromisoformat(event["created_at"])
    
    return events

# ============= TASKS ENDPOINTS =============

@api_router.post("/tasks", response_model=Task)
async def create_task(input: TaskCreate, request: Request):
    """Create a new task."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    
    task = {
        "task_id": task_id,
        **input.model_dump(exclude={"due_date"}),
        "due_date": input.due_date.isoformat() if isinstance(input.due_date, datetime) else input.due_date,
        "status": "pending",
        "created_at": now.isoformat()
    }
    
    await db.tasks.insert_one(task)
    await log_activity(user.user_id, "create_task", "task", task_id)
    
    task_doc = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if isinstance(task_doc["created_at"], str):
        task_doc["created_at"] = datetime.fromisoformat(task_doc["created_at"])
    if isinstance(task_doc["due_date"], str):
        task_doc["due_date"] = datetime.fromisoformat(task_doc["due_date"])
    
    return Task(**task_doc)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(request: Request, status: Optional[str] = None):
    """Get tasks."""
    await require_auth(request)
    
    query = {}
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    
    for task in tasks:
        if isinstance(task["created_at"], str):
            task["created_at"] = datetime.fromisoformat(task["created_at"])
        if task.get("due_date") and isinstance(task["due_date"], str):
            task["due_date"] = datetime.fromisoformat(task["due_date"])
        if task.get("completed_at") and isinstance(task["completed_at"], str):
            task["completed_at"] = datetime.fromisoformat(task["completed_at"])
    
    return tasks

@api_router.patch("/tasks/{task_id}/complete")
async def complete_task(task_id: str, request: Request):
    """Mark task as completed."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    
    result = await db.tasks.update_one(
        {"task_id": task_id},
        {"$set": {"status": "completed", "completed_at": now.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await log_activity(user.user_id, "complete_task", "task", task_id)
    
    return {"message": "Task completed"}

# ============= ACTIVITY LOGS ENDPOINTS =============

@api_router.get("/activity", response_model=List[ActivityLog])
async def get_activity_logs(request: Request, limit: int = 100):
    """Get activity logs."""
    await require_auth(request)
    
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for log in logs:
        if isinstance(log["created_at"], str):
            log["created_at"] = datetime.fromisoformat(log["created_at"])
    
    return logs

# ============= TRACKING ENDPOINTS (PUBLIC) =============

@api_router.post("/tracking/event")
async def track_event(request: Request):
    """Public endpoint to receive tracking events from website."""
    try:
        data = await request.json()
        
        # Add server timestamp
        data["server_timestamp"] = datetime.now(timezone.utc).isoformat()
        
        # Store in tracking_events collection
        await db.tracking_events.insert_one(data)
        
        # If it's a form submit with lead data, create lead automatically
        if data.get("event_type") == "form_submit" and data.get("lead_data"):
            lead_data = data["lead_data"]
            lead_id = f"lead_{uuid.uuid4().hex[:12]}"
            
            lead_dict = {
                "lead_id": lead_id,
                "name": lead_data.get("name", "Inconnu"),
                "email": lead_data.get("email", ""),
                "phone": lead_data.get("phone", ""),
                "service_type": lead_data.get("service_type", "Ménage"),
                "surface": lead_data.get("surface"),
                "address": lead_data.get("address"),
                "message": lead_data.get("message"),
                "source": data.get("utm_source", "Direct"),
                "campaign": data.get("utm_campaign"),
                "utm_source": data.get("utm_source"),
                "utm_medium": data.get("utm_medium"),
                "utm_campaign": data.get("utm_campaign"),
                "visitor_id": data.get("visitor_id"),
                "session_id": data.get("session_id"),
                "status": "nouveau",
                "probability": 50,
                "tags": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Calculate score
            lead_dict["score"] = calculate_lead_score(lead_dict)
            
            await db.leads.insert_one(lead_dict)
            
            # Create follow-up task
            task = {
                "task_id": f"task_{uuid.uuid4().hex[:12]}",
                "lead_id": lead_id,
                "type": "rappel",
                "title": f"Contacter {lead_dict['name']}",
                "description": f"Nouveau lead {lead_dict['service_type']} via tracking",
                "due_date": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tasks.insert_one(task)
        
        return {"status": "tracked", "timestamp": data["server_timestamp"]}
    
    except Exception as e:
        logger.error(f"Tracking error: {e}")
        return {"status": "error", "message": str(e)}

@api_router.get("/tracking/visitor/{visitor_id}")
async def get_visitor_journey(visitor_id: str, request: Request):
    """Get complete journey of a visitor."""
    await require_auth(request)
    
    events = await db.tracking_events.find(
        {"visitor_id": visitor_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    return {
        "visitor_id": visitor_id,
        "total_events": len(events),
        "events": events
    }

@api_router.get("/tracking/stats")
async def get_tracking_stats(request: Request, period: str = "7d"):
    """Get tracking analytics."""
    await require_auth(request)
    
    now = datetime.now(timezone.utc)
    if period == "1d":
        start_date = now - timedelta(days=1)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=7)
    
    # Get all tracking events
    events = await db.tracking_events.find(
        {"timestamp": {"$gte": start_date.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    # Calculate stats
    total_visitors = len(set([e.get("visitor_id") for e in events if e.get("visitor_id")]))
    total_sessions = len(set([e.get("session_id") for e in events if e.get("session_id")]))
    total_page_views = len([e for e in events if e.get("event_type") == "page_view"])
    total_cta_clicks = len([e for e in events if e.get("event_type") == "cta_click"])
    total_form_submits = len([e for e in events if e.get("event_type") == "form_submit"])
    
    # Top pages
    page_views = [e for e in events if e.get("event_type") == "page_view"]
    page_counts = {}
    for pv in page_views:
        url = pv.get("page_url", "")
        page_counts[url] = page_counts.get(url, 0) + 1
    
    top_pages = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Device breakdown
    devices = {}
    for e in events:
        device = e.get("device_info", {}).get("device_type", "unknown")
        devices[device] = devices.get(device, 0) + 1
    
    # Traffic sources
    sources = {}
    for e in page_views:
        source = e.get("utm_source") or e.get("referrer", "direct")
        if "google" in source.lower():
            source = "Google"
        elif "facebook" in source.lower() or "fb" in source.lower():
            source = "Facebook"
        elif source == "direct":
            source = "Direct"
        sources[source] = sources.get(source, 0) + 1
    
    # Conversion funnel
    visitors_with_page_views = set([e.get("visitor_id") for e in page_views])
    visitors_with_cta_clicks = set([e.get("visitor_id") for e in events if e.get("event_type") == "cta_click"])
    visitors_with_form_submits = set([e.get("visitor_id") for e in events if e.get("event_type") == "form_submit"])
    
    conversion_rate = (len(visitors_with_form_submits) / len(visitors_with_page_views) * 100) if visitors_with_page_views else 0
    
    return {
        "period": period,
        "total_visitors": total_visitors,
        "total_sessions": total_sessions,
        "total_page_views": total_page_views,
        "total_cta_clicks": total_cta_clicks,
        "total_form_submits": total_form_submits,
        "conversion_rate": round(conversion_rate, 2),
        "top_pages": [{"url": url, "views": count} for url, count in top_pages],
        "devices": devices,
        "sources": sources,
        "funnel": {
            "visitors": len(visitors_with_page_views),
            "cta_clicks": len(visitors_with_cta_clicks),
            "form_submits": len(visitors_with_form_submits)
        }
    }

# ============= DASHBOARD STATS ENDPOINTS =============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(request: Request, period: str = "30d"):
    """Get dashboard statistics."""
    await require_auth(request)
    
    now = datetime.now(timezone.utc)
    
    # Determine period
    if period == "1d":
        start_date = now - timedelta(days=1)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=30)
    
    # Count leads
    total_leads = await db.leads.count_documents({"created_at": {"$gte": start_date.isoformat()}})
    new_leads = await db.leads.count_documents({"status": "nouveau", "created_at": {"$gte": start_date.isoformat()}})
    contacted_leads = await db.leads.count_documents({"status": "contacté", "created_at": {"$gte": start_date.isoformat()}})
    won_leads = await db.leads.count_documents({"status": "gagné", "created_at": {"$gte": start_date.isoformat()}})
    
    # Count quotes
    total_quotes = await db.quotes.count_documents({"created_at": {"$gte": start_date.isoformat()}})
    sent_quotes = await db.quotes.count_documents({"status": "envoyé", "created_at": {"$gte": start_date.isoformat()}})
    accepted_quotes = await db.quotes.count_documents({"status": "accepté", "created_at": {"$gte": start_date.isoformat()}})
    
    # Conversion rates
    conversion_lead_to_quote = (total_quotes / total_leads * 100) if total_leads > 0 else 0
    conversion_quote_to_client = (accepted_quotes / total_quotes * 100) if total_quotes > 0 else 0
    
    # Leads by source
    leads_by_source = {}
    all_leads = await db.leads.find({"created_at": {"$gte": start_date.isoformat()}}, {"_id": 0, "source": 1}).to_list(1000)
    for lead in all_leads:
        source = lead.get("source") or "Direct"
        leads_by_source[source] = leads_by_source.get(source, 0) + 1
    
    # Leads by service
    leads_by_service = {}
    for lead in all_leads:
        service = lead.get("service_type", "Autre")
        leads_by_service[service] = leads_by_service.get(service, 0) + 1
    
    # Leads by day (last 30 days)
    leads_by_day = []
    for i in range(30):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.leads.count_documents({
            "created_at": {
                "$gte": day_start.isoformat(),
                "$lt": day_end.isoformat()
            }
        })
        leads_by_day.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })
    leads_by_day.reverse()
    
    # Pending tasks
    pending_tasks = await db.tasks.count_documents({"status": "pending"})
    
    # Average lead score
    all_leads_full = await db.leads.find({"created_at": {"$gte": start_date.isoformat()}}, {"_id": 0, "score": 1, "source": 1, "service_type": 1}).to_list(1000)
    avg_score = sum([lead.get("score", 50) for lead in all_leads_full]) / len(all_leads_full) if all_leads_full else 50
    
    # Top performing source (by conversion rate)
    source_performance = {}
    for lead in await db.leads.find({"created_at": {"$gte": start_date.isoformat()}}, {"_id": 0, "lead_id": 1, "source": 1, "status": 1}).to_list(1000):
        source = lead.get("source", "Direct")
        if source not in source_performance:
            source_performance[source] = {"total": 0, "won": 0}
        source_performance[source]["total"] += 1
        if lead.get("status") == "gagné":
            source_performance[source]["won"] += 1
    
    # Calculate ROI estimates per source (assuming avg deal value 500€)
    for source, data in source_performance.items():
        data["conversion_rate"] = (data["won"] / data["total"] * 100) if data["total"] > 0 else 0
        data["estimated_revenue"] = data["won"] * 500  # Avg deal
    
    best_source = max(source_performance.items(), key=lambda x: x[1]["conversion_rate"]) if source_performance else ("N/A", {"conversion_rate": 0})
    
    return {
        "period": period,
        "total_leads": total_leads,
        "new_leads": new_leads,
        "contacted_leads": contacted_leads,
        "won_leads": won_leads,
        "total_quotes": total_quotes,
        "sent_quotes": sent_quotes,
        "accepted_quotes": accepted_quotes,
        "conversion_lead_to_quote": round(conversion_lead_to_quote, 2),
        "conversion_quote_to_client": round(conversion_quote_to_client, 2),
        "leads_by_source": leads_by_source,
        "leads_by_service": leads_by_service,
        "leads_by_day": leads_by_day,
        "pending_tasks": pending_tasks,
        "avg_lead_score": round(avg_score, 1),
        "best_source": {
            "name": best_source[0],
            "conversion_rate": round(best_source[1]["conversion_rate"], 1),
            "revenue": best_source[1].get("estimated_revenue", 0)
        },
        "source_performance": source_performance
    }

# ============= INTEGRATION STATUS ENDPOINTS =============

@api_router.get("/settings/integrations")
async def get_integration_status(request: Request):
    """Get status of all external integrations."""
    user = await require_auth(request)
    
    from google_calendar import _is_configured as gcal_configured
    
    # Gmail status
    gmail_account = await db.email_accounts.find_one(
        {"user_id": user.user_id, "is_active": True},
        {"_id": 0, "email": 1, "connected_at": 1},
    )
    gmail_status = {
        "connected": bool(gmail_account),
        "email": gmail_account.get("email", "") if gmail_account else "",
        "configured": bool(os.environ.get("GOOGLE_CLIENT_ID")),
    }
    
    stripe_key = os.environ.get("STRIPE_API_KEY", "")
    stripe_status = {
        "configured": bool(stripe_key),
        "mode": "test" if stripe_key.startswith("sk_test") else "live" if stripe_key.startswith("sk_live") else "unknown",
    }
    
    whatsapp_number = os.environ.get("WHATSAPP_NUMBER", "0622665308")
    
    return {
        "gmail": gmail_status,
        "google_calendar": {"configured": gcal_configured()},
        "stripe": stripe_status,
        "whatsapp": {"number": whatsapp_number, "configured": bool(whatsapp_number)},
        "tracking_widget": {"configured": True},
        "zapier_webhooks": {"configured": True},
    }

# CORS - must be added before routes

@api_router.get("/stats/financial")
async def get_financial_stats(request: Request, period: str = "30d"):
    """Get financial statistics."""
    await require_auth(request)
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:
        start = now - timedelta(days=30)
    
    all_invoices = await db.invoices.find({}, {"_id": 0}).to_list(10000)
    invoices = [i for i in all_invoices if i.get("created_at", "") >= start.isoformat()]
    
    paid = [i for i in all_invoices if i.get("status") in ["payée", "payee"]]
    pending = [i for i in all_invoices if i.get("status") == "en_attente"]
    overdue = [i for i in all_invoices if i.get("status") == "en_retard"]
    
    total_revenue = sum(i.get("amount_ttc", 0) for i in paid)
    total_pending = sum(i.get("amount_ttc", 0) for i in pending)
    total_overdue = sum(i.get("amount_ttc", 0) for i in overdue)
    
    # Revenue par service
    revenue_by_service = {}
    for inv in paid:
        svc = inv.get("service_type", "Autre")
        revenue_by_service[svc] = revenue_by_service.get(svc, 0) + inv.get("amount_ttc", 0)
    
    # Revenue par jour
    revenue_by_day = []
    for i in range(int((now - start).days) + 1):
        day = start + timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        day_rev = sum(
            inv.get("amount_ttc", 0) for inv in paid
            if inv.get("paid_at", inv.get("created_at", ""))[:10] == day_str
        )
        revenue_by_day.append({"date": day_str, "revenue": day_rev})
    
    # Transactions récentes
    recent_transactions = sorted(
        [i for i in all_invoices if i.get("status") in ["payée", "payee", "en_attente"]],
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )[:10]
    
    recent_tx = [{
        "transaction_id": i.get("invoice_id", ""),
        "invoice_id": i.get("invoice_id", ""),
        "amount": i.get("amount_ttc", 0),
        "payment_status": "paid" if i.get("status") in ["payée", "payee"] else "pending",
        "lead_name": i.get("lead_name", ""),
        "created_at": i.get("created_at", ""),
    } for i in recent_transactions]
    
    return {
        "total_revenue": total_revenue,
        "total_pending": total_pending,
        "total_overdue": total_overdue,
        "total_invoices": len(all_invoices),
        "paid_count": len(paid),
        "pending_count": len(pending),
        "revenue_by_service": revenue_by_service,
        "revenue_by_day": revenue_by_day,
        "recent_transactions": recent_tx,
    }

# CORS - Force headers on all responses including errors
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse

ALLOWED_ORIGINS = [
    "https://crm.globalcleanhome.com",
    "https://www.globalcleanhome.com", 
    "https://globalcleanhome.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
]

@app.middleware("http")
async def force_cors_middleware(request: StarletteRequest, call_next):
    origin = request.headers.get("origin", "")
    is_allowed = origin in ALLOWED_ORIGINS or not origin
    
    if request.method == "OPTIONS":
        response = StarletteResponse(status_code=200, content="OK")
        if is_allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Portal-Token,X-Requested-With,Accept,Origin"
            response.headers["Access-Control-Max-Age"] = "86400"
        return response
    
    try:
        response = await call_next(request)
    except Exception as e:
        from starlette.responses import JSONResponse
        response = JSONResponse({"detail": str(e)}, status_code=500)
    
    if is_allowed and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Portal-Token,X-Requested-With,Accept,Origin"
        response.headers["Vary"] = "Origin"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://crm.globalcleanhome.com", "https://www.globalcleanhome.com", "https://globalcleanhome.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["*", "X-Portal-Token", "Content-Type", "Authorization", "Accept", "Origin"],
    expose_headers=["*"],
    max_age=86400,
)

# Include router
app.include_router(api_router)

# Include integrations router
from integrations import integrations_router
app.include_router(integrations_router)

# Include invoices/payments router
from invoices import invoices_router
app.include_router(invoices_router)

# Include client portal router
from portal import portal_router
app.include_router(portal_router)

# Ads tracking router
from ads_tracking import ads_router, init_ads_db
app.include_router(ads_router)

from ai_engine import ai_router, init_ai_db
app.include_router(ai_router)

from workflows import workflows_router, init_workflows_db, execute_workflow, process_pending_executions, _execute_step
app.include_router(workflows_router)

from tickets import tickets_router, init_tickets_db
app.include_router(tickets_router)

from notifications import notifications_router, init_notifications_db, create_notification
app.include_router(notifications_router)

from chat import chat_router, init_chat_db
app.include_router(chat_router)

# Include planning/interventions router
from planning import planning_router
app.include_router(planning_router)

# Include advanced features router
from advanced import advanced_router
app.include_router(advanced_router)

# Include external integrations router
from external_integrations import ext_router
app.include_router(ext_router)

# Include exports router
from exports import exports_router
app.include_router(exports_router)

# Include Google Calendar router
from google_calendar import gcal_router
app.include_router(gcal_router)

# Include Gmail router
from gmail_service import gmail_router
app.include_router(gmail_router)

@app.on_event("startup")
async def startup_db_indexes():
    """Create MongoDB indexes for performance."""
    await db.leads.create_index("lead_id", unique=True)
    await db.leads.create_index("status")
    await db.leads.create_index("created_at")
    await db.leads.create_index("source")
    await db.leads.create_index("service_type")
    await db.quotes.create_index("quote_id", unique=True)
    await db.quotes.create_index("lead_id")
    await db.tasks.create_index("task_id", unique=True)
    await db.tasks.create_index("status")
    await db.tasks.create_index("due_date")
    await db.interactions.create_index("lead_id")
    await db.events.create_index("event_id", unique=True)
    await db.activity_logs.create_index("created_at")
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.tracking_events.create_index("visitor_id")
    await db.tracking_events.create_index("timestamp")
    init_ads_db(db)
    init_ai_db(db)
    init_workflows_db(db)
    # Desactiver workflow hot pour eviter double envoi
    try:
        await db.workflows.update_one(
            {"workflow_id": "wf_new_lead_hot"},
            {"$set": {"is_active": False}}
        )
        # Mettre a jour les steps du workflow standard avec merylis 5min
        await db.workflows.update_one(
            {"workflow_id": "wf_new_lead_standard"},
            {"$set": {"steps": [
                {"id": "s1", "type": "send_email", "template": "new_lead_welcome", "delay_hours": 0, "label": "Email confirmation professionnel"},
                {"id": "s2", "type": "send_email", "template": "merylis_followup", "delay_hours": 0.084, "label": "Email Merylis personnel (5 min)"},
                {"id": "s3", "type": "send_email", "template": "relance_24h", "delay_hours": 24, "label": "Relance J+1"},
                {"id": "s4", "type": "send_email", "template": "relance_48h", "delay_hours": 48, "label": "Relance J+2"},
                {"id": "s5", "type": "create_task", "delay_hours": 72, "label": "Tache: Relance manuelle J+3"}
            ]}}
        )
    except Exception as e:
        logger.warning(f"Workflow init error: {e}")
    init_tickets_db(db)
    init_notifications_db(db)
    init_chat_db(db)
    
    # Scheduler pour traiter les workflows toutes les 30 minutes
    import asyncio
    async def workflow_scheduler():
        while True:
            try:
                await asyncio.sleep(1800)  # 30 minutes
                await process_pending_executions()
                logger.info("Workflows traites automatiquement")
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
    asyncio.create_task(workflow_scheduler())
    await db.invoices.create_index("invoice_id", unique=True)
    await db.invoices.create_index("quote_id")
    await db.invoices.create_index("lead_id")
    await db.invoices.create_index("status")
    await db.payment_transactions.create_index("stripe_session_id")
    await db.payment_transactions.create_index("invoice_id")
    await db.magic_links.create_index("token", unique=True)
    await db.magic_links.create_index("email")
    await db.portal_sessions.create_index("token", unique=True)
    await db.reviews.create_index("lead_id")
    await db.interventions.create_index("intervention_id", unique=True)
    await db.interventions.create_index("scheduled_date")
    await db.interventions.create_index("team_id")
    await db.interventions.create_index("lead_id")
    await db.teams.create_index("team_id", unique=True)
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.notifications.create_index("created_at")
    
    # Lancer la tache de relance automatique toutes les heures
    import asyncio
    async def auto_tasks():
        while True:
            try:
                await asyncio.sleep(3600)  # Toutes les heures
                
                # 1. Synchroniser les emails reçus depuis Gmail
                from gmail_service import _db as gmail_db, _get_any_active_token, _sync_inbox
                token, uid = await _get_any_active_token()
                if token and uid:
                    synced, errors = await _sync_inbox(token, uid)
                    logger.info(f"Sync Gmail auto: {synced} emails synchronises")
                
                # 2. Envoyer les relances 48h
                from gmail_service import check_followups_auto
                await check_followups_auto()
                
            except Exception as e:
                logger.warning(f"Erreur taches auto: {e}")
    
    asyncio.create_task(auto_tasks())
    await db.webhooks.create_index("webhook_id", unique=True)
    await db.webhooks.create_index("events")
    await db.webhook_logs.create_index("webhook_id")
    await db.email_accounts.create_index("user_id", unique=True)
    await db.emails.create_index([("lead_id", 1), ("created_at", -1)])
    await db.emails.create_index("gmail_message_id", unique=True, sparse=True)
    await db.emails.create_index("direction")
    logger.info("MongoDB indexes created successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Keepalive endpoint pour éviter le cold start Railway
@app.get("/ping")
async def ping():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}



@app.get("/cors-check")
async def cors_check():
    return {"cors": "ok", "origins": "configured"}

@app.get("/api/gmail-status")
async def gmail_status():
    """Check Gmail connection status."""
    try:
        account = await db.email_accounts.find_one({"is_active": True}, {"_id": 0, "email": 1, "is_active": 1, "updated_at": 1})
        if account:
            return {"connected": True, "email": account.get("email"), "updated_at": account.get("updated_at")}
        return {"connected": False, "message": "Aucun compte Gmail connecte"}
    except Exception as e:
        return {"connected": False, "error": str(e)}
# CORS fix Wed Mar 18 13:48:54 UTC 2026
