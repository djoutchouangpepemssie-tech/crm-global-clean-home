from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Query
from fastapi.responses import JSONResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import math
import hashlib
import bcrypt
import secrets as secrets_module
import time as time_module
from collections import defaultdict as defaultdict_import


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── SECURITY HELPERS ──────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash password with bcrypt (replaces SHA256)."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def hash_session_token(token: str) -> str:
    """Hash session token with SHA256 before storing in DB."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


# ── AUTH RATE LIMITING (auth/join specific) ───────────────────────────────────
_auth_join_attempts = defaultdict_import(list)
_auth_join_blocked = {}
AUTH_JOIN_MAX_ATTEMPTS = 5
AUTH_JOIN_WINDOW = 300       # 5 minutes
AUTH_JOIN_BLOCK_DURATION = 300  # 5 minutes block


def check_auth_join_rate_limit(ip: str) -> bool:
    """Returns True if IP is rate-limited for auth/join."""
    now = time_module.time()
    if ip in _auth_join_blocked:
        if now < _auth_join_blocked[ip]:
            return True
        else:
            del _auth_join_blocked[ip]
    _auth_join_attempts[ip] = [t for t in _auth_join_attempts[ip] if now - t < AUTH_JOIN_WINDOW]
    return len(_auth_join_attempts[ip]) >= AUTH_JOIN_MAX_ATTEMPTS


def record_auth_join_attempt(ip: str, success: bool = False):
    """Record auth/join attempt. Block IP after too many failures."""
    now = time_module.time()
    if not success:
        _auth_join_attempts[ip].append(now)
        _auth_join_attempts[ip] = [t for t in _auth_join_attempts[ip] if now - t < AUTH_JOIN_WINDOW]
        if len(_auth_join_attempts[ip]) >= AUTH_JOIN_MAX_ATTEMPTS:
            _auth_join_blocked[ip] = now + AUTH_JOIN_BLOCK_DURATION
            logger.warning(f"🚫 IP {ip} blocked after {AUTH_JOIN_MAX_ATTEMPTS} failed auth/join attempts")
    else:
        _auth_join_attempts.pop(ip, None)
        _auth_join_blocked.pop(ip, None)


# ── GESTION ERREURS MONGODB ──
from pymongo.errors import PyMongoError, ConnectionFailure, ServerSelectionTimeoutError


@app.exception_handler(PyMongoError)
async def mongodb_exception_handler(request: Request, exc: PyMongoError):
    logger.error(f"MongoDB error: {type(exc).__name__}: {str(exc)[:100]}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Service temporairement indisponible. Réessayez dans quelques secondes."}
    )


@app.exception_handler(ConnectionFailure)
async def mongodb_connection_handler(request: Request, exc: ConnectionFailure):
    logger.error(f"MongoDB connection failed: {str(exc)[:100]}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Base de données indisponible."}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Ne pas exposer les détails en production
    logger.error(f"Unhandled error on {request.url.path}: {type(exc).__name__}: {str(exc)[:200]}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne est survenue."}
    )


# ── SECURITY HEADERS ──
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # Force HTTPS in production (handle Railway X-Forwarded-Proto header)
    if os.environ.get("ENVIRONMENT") == "production":
        proto = request.headers.get("X-Forwarded-Proto", "http")
        if proto == "http" and "localhost" not in request.url.hostname:
            return RedirectResponse(url=request.url.replace(scheme="https"), status_code=301)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
    return response

# ── RATE LIMITING ──
from collections import defaultdict
import time

_rate_limit_store = defaultdict(list)
RATE_LIMIT_REQUESTS = 60  # max requêtes
RATE_LIMIT_WINDOW = 60    # par minute


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Endpoints publics à protéger
    public_paths = ["/api/leads", "/api/auth", "/api/intervenant/auth", "/api/portal"]
    path = request.url.path

    if any(path.startswith(p) for p in public_paths):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Nettoyer les anciennes requêtes
        _rate_limit_store[client_ip] = [t for t in _rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]

        if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={"detail": "Trop de requêtes. Réessayez dans une minute."}
            )

        _rate_limit_store[client_ip].append(now)

    return await call_next(request)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ── SANITIZATION ──
import re
import html


def sanitize_string(value: str, max_length: int = 500) -> str:
    """Nettoyer et sécuriser les inputs utilisateur."""
    if not value:
        return value
    # Échapper HTML
    value = html.escape(str(value))
    # Supprimer scripts
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    # Supprimer tags dangereux
    value = re.sub(r'<(iframe|object|embed|form)[^>]*>.*?</\1>', '', value, flags=re.IGNORECASE | re.DOTALL)
    # Limiter longueur
    return value[:max_length].strip()


def sanitize_email(email: str) -> str:
    """Valider et normaliser un email."""
    if not email:
        return email
    email = email.lower().strip()[:254]
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="Format email invalide")
    return email


def sanitize_phone(phone: str) -> str:
    """Nettoyer un numéro de téléphone."""
    if not phone:
        return phone
    return re.sub(r'[^0-9+\-\s\(\)]', '', phone)[:20]


# ── DISPOSABLE EMAIL DOMAINS ──
DISPOSABLE_EMAIL_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "throwaway.email",
    "yopmail.com", "tempmail.com", "trashmail.com", "sharklasers.com",
    "guerrillamailblock.com", "grr.la", "guerrillamail.info", "spam4.me",
    "temp-mail.org", "dispostable.com", "mailnull.com", "maildrop.cc",
    "fakeinbox.com", "getnada.com", "throwam.com", "discard.email",
    "mailsac.com", "mohmal.com", "inboxkitten.com", "spamgourmet.com",
}


def check_disposable_email(email: str) -> str:
    """Vérifier que l'email n'est pas un email jetable."""
    if not email:
        return email
    domain = email.lower().split("@")[-1] if "@" in email else ""
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        raise ValueError(f"Les emails temporaires/jetables ne sont pas acceptés")
    return email

# ── PAGINATION HELPER ──


def paginate(items: list, page: int, page_size: int) -> dict:
    """Paginate a list and return standard pagination object."""
    total = len(items)
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def paginate_cursor(cursor, page: int, page_size: int, total_count: int) -> dict:
    """Paginate a MongoDB cursor."""
    skip = (page - 1) * page_size
    items = await cursor.skip(skip).limit(page_size).to_list(page_size)
    total_pages = math.ceil(total_count / page_size) if page_size > 0 else 1
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }

# ── AUDIT LOG ──


async def write_audit_log(
    entity_type: str,
    entity_id: str,
    action: str,
    user_id: str = "system",
    changes: Optional[Dict[str, Any]] = None
):
    """Write an entry to the audit_log collection."""
    try:
        log = {
            "audit_id": f"audit_{uuid.uuid4().hex[:16]}",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "user_id": user_id,
            "changes": changes or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.audit_log.insert_one(log)
    except Exception as e:
        logger.warning(f"Audit log write error: {e}")


# ── SYSTÈME DE VERROUS (anti race conditions) ──
import asyncio
_execution_locks = {}


async def acquire_lock(key: str, timeout: int = 30) -> bool:
    """Acquérir un verrou pour éviter les exécutions simultanées."""
    if key in _execution_locks:
        return False
    _execution_locks[key] = datetime.now(timezone.utc)
    asyncio.get_event_loop().call_later(timeout, lambda: _execution_locks.pop(key, None))
    return True


def release_lock(key: str):
    """Libérer un verrou."""
    _execution_locks.pop(key, None)


# ── MACHINE À ÉTATS LEADS ──
LEAD_STATE_TRANSITIONS = {
    "nouveau": {"contacté", "archivé"},
    "contacté": {"qualifié", "perdu", "archivé"},
    "qualifié": {"devis_envoyé", "perdu", "archivé"},
    "devis_envoyé": {"devis_accepté", "perdu", "archivé"},
    "devis_accepté": {"gagné", "perdu", "archivé"},
    "gagné": {"archivé"},
    "perdu": {"nouveau", "archivé"},
    "archivé": set(),
}


def validate_lead_transition(current: str, new: str) -> bool:
    """Vérifier si la transition de statut est valide."""
    allowed = LEAD_STATE_TRANSITIONS.get(current, set())
    return new in allowed or new == current


# ── ENUMS STATUTS ──
LEAD_STATUSES = {"nouveau", "contacté", "qualifié", "devis_envoyé", "devis_accepté", "gagné", "perdu", "archivé"}
QUOTE_STATUSES = {"brouillon", "envoyé", "accepté", "refusé", "expiré"}
INVOICE_STATUSES = {"en_attente", "payée", "en_retard", "annulée"}
INTERVENTION_STATUSES = {"planifiée", "en_cours", "terminée", "annulée"}

# Service types acceptés (validation stricte des leads et devis)
SERVICE_TYPES = {
    "Ménage", "Canapé", "Matelas", "Tapis", "Bureaux",
    "Vitres", "Fin de chantier", "Déménagement", "Autre",
}


def validate_service_type(value: Optional[str]) -> Optional[str]:
    """Valide un service_type contre la liste SERVICE_TYPES (insensible à la casse/espaces)."""
    if value is None or value == "":
        return value
    normalized = value.strip()
    for allowed in SERVICE_TYPES:
        if allowed.lower() == normalized.lower():
            return allowed
    raise ValueError(f"service_type '{value}' invalide. Valeurs acceptées: {sorted(SERVICE_TYPES)}")


def validate_status(value: str, valid_statuses: set, field: str = "status") -> str:
    if value not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut '{value}' invalide pour {field}. Valeurs acceptées: {sorted(valid_statuses)}")
    return value

# ── Helpers de masquage pour logs (éviter de leaker des données sensibles) ──


def mask_email(email: Optional[str]) -> str:
    """Masque un email pour les logs: jean.dupont@example.com → j***t@e***e.com"""
    if not email or "@" not in str(email):
        return "***"
    try:
        local, domain = str(email).split("@", 1)
        local_masked = local[0] + "***" + local[-1] if len(local) > 2 else "***"
        if "." in domain:
            name, tld = domain.rsplit(".", 1)
            domain_masked = (name[0] + "***" + name[-1] if len(name) > 2 else "***") + "." + tld
        else:
            domain_masked = "***"
        return f"{local_masked}@{domain_masked}"
    except Exception:
        return "***"


def mask_phone(phone: Optional[str]) -> str:
    """Masque un téléphone pour les logs: +33612345678 → +33******678"""
    if not phone:
        return "***"
    s = str(phone)
    if len(s) <= 4:
        return "***"
    return s[:3] + "*" * (len(s) - 6) + s[-3:]


# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Optional[str] = None
    totp_enabled: bool = False
    email_verified: bool = False
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
    # Modèle volontairement permissif sur les documents stockés :
    # - des leads historiques peuvent avoir des emails malformés, des champs
    #   manquants, ou des types différents. On ne veut PAS renvoyer 422 sur
    #   les GETs à cause de ça → Optional + permissif.
    model_config = ConfigDict(extra="ignore")
    lead_id: str
    name: Optional[str] = ""
    email: Optional[str] = None                    # Plus d'EmailStr strict (leads historiques)
    phone: Optional[str] = ""
    service_type: Optional[str] = "Autre"
    surface: Optional[float] = None
    address: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None
    campaign: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    status: str = "nouveau"
    probability: int = 50
    score: int = 50
    tags: List[str] = []
    created_at: Optional[datetime] = None          # Peut être ISO string → converti côté endpoint
    updated_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    coords: Optional[List[float]] = None           # Géocodage cache
    geocoding_method: Optional[str] = None
    geocoding_label: Optional[str] = None
    geocoded_at: Optional[str] = None
    deleted_at: Optional[str] = None


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

    @field_validator("phone")
    @classmethod
    def sanitize_phone_field(cls, v: str) -> str:
        return re.sub(r'[^0-9+\-\s\(\)]', '', v)[:20]

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        return check_disposable_email(str(v))

    @field_validator("surface")
    @classmethod
    def validate_surface(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("La surface doit être supérieure à 0")
        return v

    @field_validator("estimated_price")
    @classmethod
    def validate_estimated_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Le prix estimé doit être >= 0")
        return v

    @field_validator("service_type")
    @classmethod
    def validate_service_type_field(cls, v: str) -> str:
        return validate_service_type(v)


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    probability: Optional[int] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("status")
    @classmethod
    def validate_status_field(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in LEAD_STATUSES:
            raise ValueError(f"Statut '{v}' invalide. Valeurs acceptées: {sorted(LEAD_STATUSES)}")
        return v


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
    quote_number: Optional[str] = None
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    lead_city: Optional[str] = None
    service_type: str
    surface: Optional[float] = None
    amount: float
    title: Optional[str] = None
    details: str
    expiry_date: Optional[str] = None
    payment_mode: Optional[str] = None
    payment_delay: Optional[str] = None
    tva_rate: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    notes: Optional[str] = None
    line_items: Optional[List[Dict[str, Any]]] = None
    status: str = "brouillon"  # brouillon, envoyé, accepté, refusé, expiré
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    pdf_url: Optional[str] = None
    created_at: datetime
    created_by: str


class QuoteCreate(BaseModel):
    lead_id: Optional[str] = None
    service_type: Optional[str] = "Autre"
    surface: Optional[float] = None
    amount: float = 0.0
    details: Optional[str] = ""
    title: Optional[str] = None
    expiry_date: Optional[str] = None
    payment_mode: Optional[str] = None
    payment_delay: Optional[str] = None
    tva_rate: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    notes: Optional[str] = None
    line_items: Optional[List[Dict[str, Any]]] = None

    @field_validator("surface")
    @classmethod
    def validate_surface(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("La surface doit être supérieure à 0")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Le montant doit être >= 0")
        return v

    @field_validator("service_type")
    @classmethod
    def validate_service_type_field(cls, v: Optional[str]) -> str:
        if not v or not v.strip():
            return "Autre"
        normalized = v.strip()
        for allowed in SERVICE_TYPES:
            if allowed.lower() == normalized.lower():
                return allowed
        return normalized[:100]


class QuoteUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    amount: Optional[float] = None
    details: Optional[str] = None
    title: Optional[str] = None
    expiry_date: Optional[str] = None
    payment_mode: Optional[str] = None
    payment_delay: Optional[str] = None
    tva_rate: Optional[float] = None
    discount: Optional[float] = None
    line_items: Optional[List[Dict[str, Any]]] = None


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

    # Try hashed token first, fallback to plaintext for migration
    token_hash = hash_session_token(session_token)
    session_doc = await db.user_sessions.find_one({"token_hash": token_hash}, {"_id": 0})
    if not session_doc:
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
        if surface >= 100:
            intention_score += 5
        elif surface >= 50:
            intention_score += 3
    except (ValueError, TypeError):
        pass

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
        except (ValueError, TypeError, AttributeError):
            pass
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

        # Create session — store hashed token, return plaintext to client
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session_doc = {
            "token_hash": hash_session_token(session_token),
            "session_token": session_token,  # kept for migration, will be removed later
            "user_id": user_id,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)

        # 2FA check for admin users
        user_check = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user_check and user_check.get("role") == "admin":
            if not user_check.get("totp_enabled"):
                logger.warning(f"⚠️ Admin {mask_email(email)} logged in WITHOUT 2FA enabled!")

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
    """Get current authenticated user. Includes 2FA alert for admins."""
    user = await require_auth(request)
    result = user.model_dump() if hasattr(user, 'model_dump') else dict(user)

    # 2FA enforcement alert for admins
    is_admin = getattr(user, 'role', None) == "admin"
    totp_on = getattr(user, 'totp_enabled', False)
    if is_admin and not totp_on:
        result["_2fa_alert"] = "⚠️ SÉCURITÉ: Activez la double authentification (2FA). Obligatoire pour les administrateurs."
        result["requires_2fa_setup"] = True

    return result


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout current user."""
    session_token = request.cookies.get("session_token")
    if session_token:
        token_hash = hash_session_token(session_token)
        result = await db.user_sessions.delete_one({"token_hash": token_hash})
        if result.deleted_count == 0:
            await db.user_sessions.delete_one({"session_token": session_token})

    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}


# ============= INVITATION AUTH (for team members) =============
class InvitationJoin(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
    name: Optional[str] = None
    verification_code: Optional[str] = None  # 6-digit email verification code


@api_router.post("/auth/join")
async def join_with_invitation(input: InvitationJoin, request: Request, response: Response):
    """Join team using invitation token (no Google OAuth required).

    Security: bcrypt password hashing, rate limiting, email verification, hashed session tokens.
    """
    client_ip = request.client.host if request.client else "unknown"

    try:
        # ── RATE LIMITING ──
        if check_auth_join_rate_limit(client_ip):
            logger.warning(f"🚫 Rate limited auth/join attempt from IP {client_ip}")
            raise HTTPException(
                status_code=429,
                detail="Trop de tentatives. Réessayez dans 5 minutes."
            )

        # Verify invitation token
        invite = await db.team_invitations.find_one({
            "token": input.token,
            "status": "pending"
        }, {"_id": 0})

        if not invite:
            record_auth_join_attempt(client_ip, success=False)
            logger.warning(f"❌ Failed auth/join: invalid token from IP {client_ip}")
            raise HTTPException(status_code=400, detail="Invitation invalide ou expirée")

        # Check expiry
        expires_at = invite.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            record_auth_join_attempt(client_ip, success=False)
            raise HTTPException(status_code=400, detail="Invitation expirée")

        email = invite.get("email", "").lower()
        role = invite.get("role", "operator")
        name = input.name or invite.get("name", email)

        # ── NOTE: Email verification was already done via /auth/verify-email ──
        # We don't re-verify the code here, it's already been validated and marked as used
        # The verification_code field is just for reference/logging

        # Check if user already exists
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            record_auth_join_attempt(client_ip, success=False)
            raise HTTPException(status_code=400, detail="Utilisateur déjà inscrit")

        # ── HASH PASSWORD WITH BCRYPT ──
        password_hashed = hash_password(input.password)

        # Create user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": password_hashed,
            "role": role,
            "invited_by": invite.get("invited_by"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "picture": "",
            "email_verified": True,
            "totp_enabled": False,  # 2FA flag
        }

        await db.users.insert_one(user_doc)

        # Mark invitation as used
        await db.team_invitations.update_one(
            {"token": input.token},
            {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat()}}
        )

        # ── CREATE SESSION WITH HASHED TOKEN ──
        session_token = f"st_{uuid.uuid4().hex}"
        session_doc = {
            "token_hash": hash_session_token(session_token),
            "session_token": session_token,  # migration period
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),  # 7 days (rotation)
        }
        await db.user_sessions.insert_one(session_doc)

        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            max_age =7 * 24 * 60 * 60,  # 7 days for rotation
            httponly=True,
            secure=True,
            samesite="Lax",
            path="/"
        )

        record_auth_join_attempt(client_ip, success=True)
        logger.info(f"✅ User {mask_email(email)} created via invitation (role: {role}) from IP {client_ip}")

        # ── 2FA WARNING FOR ADMIN ──
        result = {
            "success": True,
            "user_id": user_id,
            "session_token": session_token,  # Return the actual token for frontend!
            "email": email,
            "name": name,
            "role": role,
            "message": "Compte créé avec succès ! Bienvenue 🎉"
        }

        if role == "admin":
            result["requires_2fa"] = True
            result["message"] = "Compte admin créé ! ⚠️ Activez la double authentification (2FA) obligatoire."

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur join_with_invitation: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur serveur")


# ── EMAIL VERIFICATION: Send code when requesting to join ──
@api_router.post("/auth/send-verification")
async def send_verification_code(request: Request):
    """Send 6-digit verification code to the invited email."""
    body = await request.json()
    invite_token = body.get("token")

    if not invite_token:
        raise HTTPException(status_code=400, detail="Token d'invitation requis")

    # Find invitation
    invite = await db.team_invitations.find_one({
        "token": invite_token,
        "status": "pending"
    }, {"_id": 0})

    if not invite:
        raise HTTPException(status_code=400, detail="Invitation invalide ou expirée")

    email = invite.get("email", "").lower()

    # Generate 6-digit code
    import random
    code = f"{random.randint(100000, 999999)}"

    # Store verification code (expires in 15 minutes)
    await db.email_verifications.insert_one({
        "email": email,
        "code": code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
        "used": False,
    })

    # Send email with verification code via Gmail
    try:
        from gmail_service import send_verification_email
        email_sent = await send_verification_email(email, code)
        if email_sent:
            logger.info(f"✅ Verification code sent to {mask_email(email)}")
        else:
            logger.warning(f"⚠️ Verification code NOT sent to {mask_email(email)} (Gmail may not be connected)")
    except Exception as e:
        logger.error(f"❌ Failed to send verification email to {mask_email(email)}: {e}")
        # Still return success - code is in DB for testing/manual verification

    return {"success": True, "message": f"Code de vérification envoyé à {email}"}


@api_router.get("/auth/invitation/{token}")
async def get_invitation_info(token: str):
    """Get invitation info (email, role, company) without authentication."""
    try:
        invite = await db.team_invitations.find_one({
            "token": token,
            "status": "pending"
        }, {"_id": 0, "token": 0})

        if not invite:
            raise HTTPException(status_code=400, detail="Invitation invalide")

        # Check expiry
        expires_at = invite.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        is_expired = expires_at < datetime.now(timezone.utc)

        return {
            "email": invite.get("email"),
            "role": invite.get("role"),
            "name": invite.get("name"),
            "company": "Global Clean Home",
            "is_expired": is_expired,
            "expires_at": expires_at.isoformat() if not is_expired else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_invitation_info: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur serveur")


# ============= EMAIL VERIFICATION =============
class VerifyEmailRequest(BaseModel):
    email: str
    code: str


@api_router.post("/auth/verify-email")
async def verify_email_code(body: VerifyEmailRequest):
    """Verify email code for invitation signup."""
    try:
        email = body.email.lower()
        code = body.code.strip()

        if not email or not code:
            raise HTTPException(status_code=400, detail="Email et code requis")

        # Find verification code in DB
        verification = await db.email_verifications.find_one({
            "email": email,
            "code": code,
            "used": False
        }, {"_id": 0})

        if not verification:
            logger.warning(f"❌ Failed email verification for {mask_email(email)} - invalid code")
            raise HTTPException(status_code=400, detail="Code invalide")

        # Check expiry
        expires_at = verification.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            logger.warning(f"❌ Email verification expired for {mask_email(email)}")
            raise HTTPException(status_code=400, detail="Code expiré")

        # Mark as used
        await db.email_verifications.update_one(
            {"email": email, "code": code},
            {"$set": {"used": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
        )

        logger.info(f"✅ Email verified for {mask_email(email)}")
        return {"success": True, "message": "Email vérifié avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur verify_email: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur serveur")

# ============= 2FA ENFORCEMENT FOR ADMIN =============


@api_router.get("/auth/2fa-status")
async def get_2fa_status(request: Request):
    """Check 2FA status for current user. Admin MUST have 2FA enabled."""
    user = await require_auth(request)
    is_admin = user.role == "admin" if hasattr(user, 'role') else user.get("role") == "admin"
    totp_enabled = user.totp_enabled if hasattr(user, 'totp_enabled') else user.get("totp_enabled", False)

    result = {
        "totp_enabled": totp_enabled,
        "role": user.role if hasattr(user, 'role') else user.get("role"),
        "requires_2fa": is_admin,
    }

    if is_admin and not totp_enabled:
        result["alert"] = "⚠️ ALERTE SÉCURITÉ: La double authentification (2FA) est OBLIGATOIRE pour les administrateurs. Activez-la immédiatement."
        result["must_setup_2fa"] = True

    return result


@api_router.post("/auth/enforce-2fa")
async def enforce_2fa_check(request: Request):
    """Middleware-style endpoint: block admin actions if 2FA not enabled."""
    user = await require_auth(request)
    is_admin = user.role == "admin" if hasattr(user, 'role') else user.get("role") == "admin"
    totp_enabled = user.totp_enabled if hasattr(user, 'totp_enabled') else user.get("totp_enabled", False)

    if is_admin and not totp_enabled:
        raise HTTPException(
            status_code=403,
            detail="⚠️ 2FA obligatoire pour les administrateurs. Activez la double authentification avant de continuer."
        )

    return {"status": "ok", "2fa_verified": True}


@api_router.post("/auth/rotate-session")
async def rotate_session_token(request: Request, response: Response):
    """Rotate session token (recommended every 7 days)."""
    user = await require_auth(request)
    old_token = request.cookies.get("session_token")

    if not old_token:
        raise HTTPException(status_code=401, detail="No session to rotate")

    # Delete old session
    old_hash = hash_session_token(old_token)
    result = await db.user_sessions.delete_one({"token_hash": old_hash})
    if result.deleted_count == 0:
        await db.user_sessions.delete_one({"session_token": old_token})

    # Create new session
    new_token = f"st_{uuid.uuid4().hex}"
    session_doc = {
        "token_hash": hash_session_token(new_token),
        "session_token": new_token,
        "user_id": user.user_id if hasattr(user, 'user_id') else user.get("user_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }
    await db.user_sessions.insert_one(session_doc)

    response.set_cookie(
        key="session_token",
        value=new_token,
        max_age =7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="Lax",
        path="/"
    )

    logger.info(f"🔄 Session rotated for user {user.user_id if hasattr(user, 'user_id') else user.get('user_id')}")
    return {"success": True, "message": "Session renouvelée"}


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
                parts.append("  Canape " + str(i + 1) + ": " + str(s.get('places', '?')) + " places")
        elif svc_id == 'nettoyage-matelas':
            mattresses = details.get('mattresses') or []
            parts.append("  Nombre: " + str(len(mattresses)) + " matelas")
            sizes = {1: '1 place', 2: '2 places', 3: 'King size', 4: 'Super King'}
            for i, m in enumerate(mattresses):
                parts.append("  Matelas " + str(i + 1) + ": " + sizes.get(m.get('places', 2), str(m.get('places', '?')) + ' places'))
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
        await write_audit_log("lead", lead_id, "create", user.user_id, {"name": input.name, "email": str(input.email), "service_type": input.service_type})
    else:
        await write_audit_log("lead", lead_id, "create", "public", {"name": input.name, "service_type": input.service_type})

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


@api_router.get("/leads")
async def get_leads(
    request: Request,
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    source: Optional[str] = None,
    period: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    """Get all leads with filters. Returns paginated results.

    period: "1d" | "7d" | "30d" | "90d" | "all" | None (None/all = no date filter → tous les leads).
    """
    await require_auth(request)

    query = {}

    # Soft delete filter
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}

    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if source:
        query["source"] = source

    # Period filter — n'applique PAS de filtre par défaut (tous les leads)
    if period and period not in ("all", "ALL"):
        now = datetime.now(timezone.utc)
        days_map = {"1d": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = days_map.get(period)
        if days:
            start_date = now - timedelta(days=days)
            query["created_at"] = {"$gte": start_date.isoformat()}

    total = await db.leads.count_documents(query)
    skip = (page - 1) * page_size
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)

    for lead in leads:
        # Add default values for new fields if missing
        if "score" not in lead:
            lead["score"] = 50
        if "tags" not in lead:
            lead["tags"] = []

        if isinstance(lead.get("created_at"), str):
            lead["created_at"] = datetime.fromisoformat(lead["created_at"])
        if isinstance(lead.get("updated_at"), str):
            lead["updated_at"] = datetime.fromisoformat(lead["updated_at"])

    return {
        "items": [Lead(**lead) for lead in leads],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }

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

    lead_doc = await db.leads.find_one({"lead_id": lead_id, "deleted_at": {"$exists": False}}, {"_id": 0})
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
        {"lead_id": lead_id, "deleted_at": {"$exists": False}},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    await log_activity(user.user_id, "update_lead", "lead", lead_id, update_data)
    await write_audit_log("lead", lead_id, "update", user.user_id, update_data)

    return {"message": "Lead updated"}


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, request: Request):
    """Soft-delete a lead."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc).isoformat()

    result = await db.leads.update_one(
        {"lead_id": lead_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now, "updated_at": now}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    await log_activity(user.user_id, "delete_lead", "lead", lead_id)
    await write_audit_log("lead", lead_id, "delete", user.user_id)

    return {"message": "Lead deleted"}


# ============= GÉOCODAGE & DISTANCE TRAJET ROUTIER =============
# Référence : adresse du siège de Global Clean Home (Saint-Thibault-des-Vignes 77400)
# Utilise Nominatim (OSM) pour le géocodage et OSRM public pour le routing —
# 100% gratuit, pas de clé API. Cache les coordonnées dans chaque lead après
# la première requête pour limiter les appels.

REFERENCE_ADDRESS = "5 rue de l'Étang de la Loy, 77400 Saint-Thibault-des-Vignes, France"
_reference_coords_cache: Optional[Dict[str, Any]] = None  # set à la 1ère utilisation


def _clean_address(raw: str) -> str:
    """Nettoie une adresse : espaces multiples, virgules, fautes courantes."""
    if not raw:
        return ""
    s = re.sub(r"\s+", " ", raw).strip()
    s = s.replace(";", ",").replace("  ", " ")
    return s


def _extract_postal_city(address: str) -> Optional[str]:
    """Extrait 'CODE_POSTAL VILLE' depuis une adresse."""
    if not address:
        return None
    m = re.search(r"(\d{5})\s+([A-Za-zÀ-ÿ'\-\s]{2,40})", address)
    if m:
        return f"{m.group(1)} {m.group(2).strip()}"
    return None


async def _ban_query(q: str) -> Optional[Dict[str, Any]]:
    """Interroge la Base Adresse Nationale française (api-adresse.data.gouv.fr).
    Service officiel de l'État français, GRATUIT, TRÈS précis pour adresses FR.
    Tolère les fautes de frappe (distance d'édition interne).
    Retourne {coords: (lat, lon), label, score, type} ou None.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                "https://api-adresse.data.gouv.fr/search/",
                params={"q": q, "limit": 1, "autocomplete": 0},
                headers={"User-Agent": "GlobalCleanHomeCRM/1.0"},
            )
            if res.status_code != 200:
                logger.warning(f"BAN HTTP {res.status_code} pour '{q[:60]}'")
                return None
            data = res.json()
            features = data.get("features") or []
            if not features:
                return None
            f = features[0]
            geom = f.get("geometry") or {}
            coords = geom.get("coordinates") or []
            if len(coords) != 2:
                return None
            props = f.get("properties") or {}
            return {
                # BAN retourne [lon, lat] — on retourne (lat, lon) comme partout
                "coords":  (float(coords[1]), float(coords[0])),
                "label":   props.get("label") or "",
                "score":   float(props.get("score") or 0),
                "type":    props.get("type") or "",
                "city":    props.get("city") or "",
                "postcode": props.get("postcode") or "",
            }
    except Exception as e:
        logger.warning(f"BAN error for '{q[:60]}': {e}")
        return None


async def _nominatim_query(q: str) -> Optional[Tuple[float, float]]:
    """Fallback Nominatim si BAN échoue (adresses non-FR ou incomplètes)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 1, "countrycodes": "fr"},
                headers={
                    "User-Agent": "GlobalCleanHomeCRM/1.0 (contact@globalcleanhome.com)",
                    "Accept-Language": "fr",
                },
            )
            if res.status_code != 200 or not res.json():
                return None
            data = res.json()
            return (float(data[0]["lat"]), float(data[0]["lon"]))
    except Exception as e:
        logger.warning(f"Nominatim error: {e}")
        return None


async def _geocode_address(address: str) -> Optional[Dict[str, Any]]:
    """Géocode une adresse française avec la BAN officielle.
    Stratégie : 3 tentatives BAN successives, puis Nominatim en dernier recours.
    Toujours retourne {coords, method, label, score} ou None en cas d'échec total.
    """
    if not address or not address.strip():
        return None
    cleaned = _clean_address(address)
    attempts = [cleaned]

    # Variante sans 'France' si présent
    if "france" in cleaned.lower():
        attempts.append(re.sub(r",?\s*france\b", "", cleaned, flags=re.IGNORECASE).strip())

    # Variante juste postal + ville
    pc_city = _extract_postal_city(cleaned)
    if pc_city and pc_city not in attempts:
        attempts.append(pc_city)

    # 1. Tentatives BAN (API française officielle)
    best = None
    for q in attempts:
        r = await _ban_query(q)
        if r and r["coords"]:
            # Prend le meilleur score (BAN attribue 0.0 → 1.0)
            if not best or r["score"] > best["score"]:
                best = r
            # Si on a un housenumber avec bon score, c'est parfait
            if r["type"] == "housenumber" and r["score"] >= 0.6:
                logger.info(f"BAN OK (housenumber, score={r['score']:.2f}): '{r['label']}'")
                return {"coords": r["coords"], "method": "ban_precise", "label": r["label"], "score": r["score"]}

    if best and best["score"] >= 0.4:
        method = "ban_precise" if best["type"] == "housenumber" else f"ban_{best['type'] or 'city'}"
        logger.info(f"BAN OK ({best['type']}, score={best['score']:.2f}): '{best['label']}'")
        return {"coords": best["coords"], "method": method, "label": best["label"], "score": best["score"]}

    # 2. Dernier recours : Nominatim
    logger.info(f"BAN n'a rien trouvé de fiable, bascule sur Nominatim pour : {cleaned[:60]}")
    for q in attempts:
        coords = await _nominatim_query(q)
        if coords:
            return {"coords": coords, "method": "nominatim", "label": q, "score": 0.5}

    return None


# Wrapper rétro-compat : renvoie juste les coords
async def _geocode_nominatim(address: str) -> Optional[Tuple[float, float]]:
    r = await _geocode_address(address)
    return r["coords"] if r else None


async def _get_reference_coords() -> Tuple[float, float]:
    """Géocodage paresseux du siège (fait 1 fois puis gardé en mémoire)."""
    global _reference_coords_cache
    if _reference_coords_cache and _reference_coords_cache.get("coords"):
        return _reference_coords_cache["coords"]
    coords = await _geocode_nominatim(REFERENCE_ADDRESS)
    if not coords:
        # Fallback hardcodé — approximation centre Saint-Thibault-des-Vignes 77400
        coords = (48.8556, 2.6800)
    _reference_coords_cache = {"coords": coords, "address": REFERENCE_ADDRESS}
    return coords


def _haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """Distance à vol d'oiseau en km (fallback si OSRM indisponible)."""
    import math
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return round(2 * R * math.asin(math.sqrt(h)), 1)


async def _osrm_route(origin: Tuple[float, float], dest: Tuple[float, float]) -> Optional[Dict[str, Any]]:
    """Calcule la vraie distance routière (voiture) + durée via OSRM public."""
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            # OSRM attend lon,lat (pas lat,lon)
            url = f"https://router.project-osrm.org/route/v1/driving/{origin[1]},{origin[0]};{dest[1]},{dest[0]}"
            res = await client.get(url, params={"overview": "false", "alternatives": "false"})
            if res.status_code != 200:
                return None
            data = res.json()
            if data.get("code") != "Ok" or not data.get("routes"):
                return None
            r = data["routes"][0]
            return {
                "distance_km":  round(r["distance"] / 1000, 1),
                "duration_min": round(r["duration"] / 60),
                "method":       "osrm",
            }
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}")
        return None


# ============= TRACKING EMAIL/DEVIS OUVERTS =============
# Système pixel + lien tracké pour mesurer précisément :
#   - Combien de fois un client ouvre l'email (pixel 1x1 GIF invisible)
#   - Combien de fois il clique sur le lien du devis (redirection)
# Chaque ouverture/clic est stocké en DB avec timestamp, IP, user-agent.

TRACKING_PIXEL_GIF = bytes([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
    0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21,
    0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3B,
])  # 43 octets : GIF 1x1 transparent


def _public_backend_url() -> str:
    """Base URL du backend pour les liens tracking embarqués dans les emails."""
    return os.environ.get("PUBLIC_BACKEND_URL", "https://crm-global-clean-home-production.up.railway.app").rstrip("/")


async def create_tracking_token(kind: str, lead_id: str, target_id: str, target_type: str = "quote") -> str:
    """Génère un token unique lié à un lead+cible et le stocke en DB.
    kind : 'pixel' (ouverture email) | 'link' (clic sur devis).
    """
    token = secrets_module.token_urlsafe(16)
    await db.tracking_tokens.insert_one({
        "token":       token,
        "kind":        kind,
        "lead_id":     lead_id,
        "target_id":   target_id,
        "target_type": target_type,
        "created_at":  datetime.now(timezone.utc).isoformat(),
        "hits":        0,
    })
    return token


async def _log_tracking_hit(token_doc: Dict[str, Any], request: Request, event_kind: str) -> None:
    """Enregistre un hit (ouverture ou clic) + incrémente le compteur du token."""
    now = datetime.now(timezone.utc).isoformat()
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "") or ""
    if "," in ip: ip = ip.split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "")[:500]

    # Incrémente le compteur du token (utile pour stats rapides par cible)
    await db.tracking_tokens.update_one(
        {"token": token_doc["token"]},
        {"$inc": {"hits": 1}, "$set": {"last_hit_at": now}},
    )

    # Enregistre l'event détaillé (pour timeline et analytics)
    await db.email_tracking_events.insert_one({
        "event_kind":  event_kind,          # email_open | quote_view
        "token":       token_doc["token"],
        "lead_id":     token_doc.get("lead_id"),
        "target_id":   token_doc.get("target_id"),
        "target_type": token_doc.get("target_type"),
        "ip":          ip,
        "user_agent":  user_agent,
        "created_at":  now,
    })


@app.get("/api/track/pixel/{token}")
async def track_email_open(token: str, request: Request):
    """Pixel 1x1 embarqué dans les emails. Chaque chargement = une ouverture
    détectée. Retourne toujours un GIF transparent, même si le token n'existe
    pas (pour ne pas casser l'email)."""
    try:
        doc = await db.tracking_tokens.find_one({"token": token, "kind": "pixel"})
        if doc:
            await _log_tracking_hit(doc, request, "email_open")
    except Exception as e:
        logger.warning(f"Pixel tracking failed: {e}")
    return Response(
        content=TRACKING_PIXEL_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma":        "no-cache",
            "Expires":       "0",
        },
    )


@app.get("/api/track/quote/{token}")
async def track_quote_link(token: str, request: Request):
    """Lien tracké qui redirige vers le PDF du devis. Log le clic avant redirect."""
    doc = await db.tracking_tokens.find_one({"token": token, "kind": "link"})
    if not doc:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré")
    try:
        await _log_tracking_hit(doc, request, "quote_view")
    except Exception as e:
        logger.warning(f"Link tracking failed: {e}")
    # Redirige vers le PDF du devis (ou URL portail si dispo)
    target = f"{_public_backend_url()}/api/quotes/{doc['target_id']}/pdf"
    return RedirectResponse(url=target, status_code=302)


@api_router.get("/leads/{lead_id}/engagement")
async def get_lead_engagement(lead_id: str, request: Request):
    """Statistiques d'engagement RÉELLES d'un lead : combien de fois il a ouvert
    les emails envoyés, combien de fois il a cliqué sur les liens devis, etc."""
    await require_auth(request)

    # Compte total d'ouvertures (tous emails reçus par ce lead)
    email_opens = await db.email_tracking_events.count_documents({
        "lead_id":    lead_id,
        "event_kind": "email_open",
    })
    # Compte total de clics sur devis
    quote_views = await db.email_tracking_events.count_documents({
        "lead_id":    lead_id,
        "event_kind": "quote_view",
    })
    # Distincts — combien d'emails différents ont été ouverts (1 email peut être ouvert N fois)
    pipeline_opens = await db.email_tracking_events.aggregate([
        {"$match": {"lead_id": lead_id, "event_kind": "email_open"}},
        {"$group": {"_id": "$target_id"}},
        {"$count": "n"},
    ]).to_list(1)
    unique_emails_opened = pipeline_opens[0]["n"] if pipeline_opens else 0

    # Nombre de devis envoyés à ce lead
    quotes_sent = await db.quotes.count_documents({
        "lead_id":    lead_id,
        "status":     {"$in": ["envoyé", "accepté", "refusé"]},
    })

    # Dernière ouverture / dernier clic
    last_open = await db.email_tracking_events.find_one(
        {"lead_id": lead_id, "event_kind": "email_open"},
        sort=[("created_at", -1)],
    )
    last_view = await db.email_tracking_events.find_one(
        {"lead_id": lead_id, "event_kind": "quote_view"},
        sort=[("created_at", -1)],
    )

    # Nombre d'interactions (appels/emails/notes/rdv) enregistrées
    interactions_count = await db.interactions.count_documents({"lead_id": lead_id})

    return {
        "lead_id":               lead_id,
        "email_opens":           email_opens,            # total hits du pixel
        "unique_emails_opened":  unique_emails_opened,   # nb d'emails différents vus
        "quote_views":           quote_views,            # total clics sur lien devis
        "quotes_sent":           quotes_sent,
        "interactions_count":    interactions_count,
        "last_email_open_at":    (last_open or {}).get("created_at"),
        "last_quote_view_at":    (last_view or {}).get("created_at"),
    }


@api_router.get("/leads/{lead_id}/distance")
async def get_lead_distance(lead_id: str, request: Request):
    """Calcule la distance routière depuis le siège jusqu'à l'adresse du lead.

    Cache les coordonnées géocodées dans le document lead (champ `coords`)
    pour éviter les appels répétés à Nominatim.
    """
    await require_auth(request)
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    address = lead.get("address") or ""
    if not address.strip():
        raise HTTPException(status_code=422, detail="Adresse du lead manquante")

    # Coordonnées du lead — cache dans le document après 1er appel réussi
    lead_coords = lead.get("coords")
    geocoding_method = lead.get("geocoding_method", "cached")
    geocoding_label = lead.get("geocoding_label")

    if not lead_coords or not isinstance(lead_coords, (list, tuple)) or len(lead_coords) != 2:
        geo = await _geocode_address(address)
        if not geo:
            raise HTTPException(
                status_code=422,
                detail=f"Adresse non géolocalisable : « {address[:80]} ». Vérifie qu'elle contient le code postal + la ville (ex: « 10 rue Victor Hugo, 75016 Paris »).",
            )
        lead_coords = list(geo["coords"])
        geocoding_method = geo["method"]
        geocoding_label = geo["label"]
        await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": {
                "coords":            lead_coords,
                "geocoded_at":       datetime.now(timezone.utc).isoformat(),
                "geocoding_method":  geocoding_method,
                "geocoding_label":   geocoding_label,
            }},
        )
    else:
        lead_coords = tuple(lead_coords)

    # Coordonnées de référence (siège)
    ref_coords = await _get_reference_coords()

    # Routing via OSRM (trajet voiture réel)
    route = await _osrm_route(ref_coords, tuple(lead_coords))

    # Fallback : vol d'oiseau si OSRM ne répond pas
    if not route:
        straight = _haversine_km(ref_coords, tuple(lead_coords))
        # Estimation voiture : ~1.3× vol d'oiseau en zone urbaine + vitesse moyenne 45 km/h
        route = {
            "distance_km":  round(straight * 1.3, 1),
            "duration_min": round((straight * 1.3) / 45 * 60),
            "method":       "estimate",
        }

    return {
        "lead_id":            lead_id,
        "origin":             REFERENCE_ADDRESS,
        "origin_coords":      list(ref_coords),
        "destination":        address,
        "destination_coords": list(lead_coords),
        "destination_label":  geocoding_label,
        "distance_km":        route["distance_km"],
        "duration_min":       route["duration_min"],
        "method":             route["method"],
        "geocoding_method":   geocoding_method,
    }


@api_router.post("/leads/{lead_id}/restore")
async def restore_lead(lead_id: str, request: Request):
    """Restore a soft-deleted lead."""
    user = await require_auth(request)

    result = await db.leads.update_one(
        {"lead_id": lead_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found or not deleted")

    await write_audit_log("lead", lead_id, "restore", user.user_id)
    return {"message": "Lead restored"}

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

    templates = await db.templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    for template in templates:
        if isinstance(template["created_at"], str):
            template["created_at"] = datetime.fromisoformat(template["created_at"])

    return templates


@api_router.put("/templates/{template_id}")
async def update_template(template_id: str, request: Request):
    """Update an existing template."""
    await require_auth(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.templates.update_one(
        {"template_id": template_id},
        {"$set": body}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template introuvable")
    return {"success": True, "message": "Template mis à jour"}


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


async def _next_quote_number() -> str:
    """Génère un numéro de devis séquentiel D-YYYY-NNNN."""
    year = datetime.now(timezone.utc).year
    counter = await db.counters.find_one_and_update(
        {"_id": f"quote_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    n = counter.get("seq", 1)
    return f"D-{year}-{n:04d}"


def _extract_city_from_address(address: str) -> str:
    if not address:
        return ""
    parts = [p.strip() for p in address.split(",")]
    return parts[-1] if len(parts) > 1 else parts[0][:50]


@api_router.post("/quotes", response_model=Quote)
async def create_quote(input: QuoteCreate, request: Request):
    """Crée un nouveau devis avec numéro auto-incrémenté."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    quote_id = f"quote_{uuid.uuid4().hex[:12]}"
    quote_number = await _next_quote_number()

    # Enrichir avec les infos du lead
    lead_name = ""
    lead_city = ""
    if input.lead_id:
        lead_doc = await db.leads.find_one({"lead_id": input.lead_id}, {"_id": 0, "name": 1, "address": 1})
        if lead_doc:
            lead_name = lead_doc.get("name", "")
            lead_city = _extract_city_from_address(lead_doc.get("address", ""))

    quote = {
        "quote_id": quote_id,
        "quote_number": quote_number,
        **input.model_dump(),
        "lead_name": lead_name,
        "lead_city": lead_city,
        "status": "brouillon",
        "created_at": now.isoformat(),
        "created_by": user.user_id,
    }

    await db.quotes.insert_one(quote)
    await log_activity(user.user_id, "create_quote", "quote", quote_id)
    await write_audit_log("quote", quote_id, "create", user.user_id, input.model_dump())

    quote_doc = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if isinstance(quote_doc.get("created_at"), str):
        quote_doc["created_at"] = datetime.fromisoformat(quote_doc["created_at"])

    return Quote(**quote_doc)


@api_router.get("/quotes/stats")
async def get_quotes_stats(request: Request):
    """Statistiques des devis pour QuotesList."""
    await require_auth(request)

    now = datetime.now(timezone.utc)
    start_30d = (now - timedelta(days=30)).isoformat()

    all_quotes = await db.quotes.find(
        {"deleted_at": {"$exists": False}},
        {"_id": 0, "amount": 1, "status": 1, "created_at": 1}
    ).to_list(10000)

    total = len(all_quotes)
    pending  = [q for q in all_quotes if q.get("status") == "envoyé"]
    accepted = [q for q in all_quotes if q.get("status") == "accepté"]
    last_30  = [q for q in all_quotes if (q.get("created_at") or "") >= start_30d]

    ca_pending  = sum(q.get("amount", 0) for q in pending)
    taux_accept = round(len(accepted) / total * 100) if total > 0 else 0
    panier_moy  = round(sum(q.get("amount", 0) for q in all_quotes) / total) if total > 0 else 0

    return {
        "ca_attente":       round(ca_pending, 2),
        "total_30j":        len(last_30),
        "taux_acceptation": taux_accept,
        "panier_moyen":     panier_moy,
        "total":            total,
    }


@api_router.get("/quotes")
async def get_quotes(
    request: Request,
    lead_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    """Liste paginée des devis, enrichie avec les infos du lead."""
    await require_auth(request)

    query: Dict[str, Any] = {}
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}
    if lead_id:
        query["lead_id"] = lead_id
    if status:
        query["status"] = status

    total = await db.quotes.count_documents(query)
    skip = (page - 1) * page_size
    quotes = await db.quotes.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)

    # Enrichir en masse avec les infos des leads
    lead_ids_to_fetch = list({
        q.get("lead_id") for q in quotes
        if q.get("lead_id") and not q.get("lead_name")
    })
    leads_map: Dict[str, Any] = {}
    if lead_ids_to_fetch:
        leads_docs = await db.leads.find(
            {"lead_id": {"$in": lead_ids_to_fetch}},
            {"_id": 0, "lead_id": 1, "name": 1, "address": 1}
        ).to_list(len(lead_ids_to_fetch))
        for l in leads_docs:
            leads_map[l["lead_id"]] = l

    for quote in quotes:
        # Enrichir lead_name / lead_city si absents
        if not quote.get("lead_name") and quote.get("lead_id") in leads_map:
            lead = leads_map[quote["lead_id"]]
            quote["lead_name"] = lead.get("name", "")
            quote["lead_city"] = _extract_city_from_address(lead.get("address", ""))

        # Rétrocompatibilité : champs absents dans anciennes entrées
        quote.setdefault("quote_number", None)
        quote.setdefault("lead_name", "")
        quote.setdefault("lead_city", "")
        quote.setdefault("title", None)
        quote.setdefault("tva_rate", 0.0)
        quote.setdefault("discount", 0.0)

        # Normaliser les dates
        for dt_field in ("created_at", "sent_at", "opened_at", "responded_at"):
            if quote.get(dt_field) and isinstance(quote[dt_field], str):
                try:
                    quote[dt_field] = datetime.fromisoformat(quote[dt_field])
                except ValueError:
                    pass

    return {
        "items": quotes,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }


@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, request: Request):
    """Soft-delete a quote."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc).isoformat()

    result = await db.quotes.update_one(
        {"quote_id": quote_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    await write_audit_log("quote", quote_id, "delete", user.user_id)
    return {"message": "Devis supprimé"}


@api_router.post("/quotes/{quote_id}/restore")
async def restore_quote(quote_id: str, request: Request):
    """Restore a soft-deleted quote."""
    user = await require_auth(request)
    result = await db.quotes.update_one(
        {"quote_id": quote_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis introuvable ou non supprimé")
    await write_audit_log("quote", quote_id, "restore", user.user_id)
    return {"message": "Devis restauré"}


@api_router.patch("/quotes/{quote_id}")
async def update_quote(quote_id: str, inp: QuoteUpdate, request: Request):
    """Met à jour un devis (statut, montant, notes, conditions)."""
    user = await require_auth(request)

    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")

    result = await db.quotes.update_one(
        {"quote_id": quote_id, "deleted_at": {"$exists": False}},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    await log_activity(user.user_id, "update_quote", "quote", quote_id, update)
    await write_audit_log("quote", quote_id, "update", user.user_id, update)

    doc = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if doc and isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


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

    # Send email via Gmail WITH PDF attached + TRACKING (pixel ouverture + lien cliqué)
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

            # Générer tokens de tracking (pixel + lien) — stockés côté DB pour compter les hits
            pixel_token = await create_tracking_token("pixel", quote["lead_id"], quote_id, "quote")
            link_token  = await create_tracking_token("link",  quote["lead_id"], quote_id, "quote")
            base_url = _public_backend_url()
            tracking = {
                "pixel_url":    f"{base_url}/api/track/pixel/{pixel_token}",
                "link_url":     f"{base_url}/api/track/quote/{link_token}",
                "pixel_token":  pixel_token,
                "link_token":   link_token,
            }

            # Générer un magic link vers le portail client (valable 30 jours
            # pour qu'un prospect puisse revenir au devis plusieurs fois)
            import secrets as _sec
            magic_token = _sec.token_urlsafe(36)
            await db.magic_links.insert_one({
                "token":      magic_token,
                "email":      lead.get("email", ""),
                "lead_id":    quote["lead_id"],
                "lead_name":  lead.get("name", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "used":       False,
                "context":    {"type": "quote", "quote_id": quote_id},
            })
            frontend_url = (os.environ.get("FRONTEND_URL")
                            or "https://crm.globalcleanhome.com").rstrip("/")
            portal_url = f"{frontend_url}/portal?magic={magic_token}"

            quote_for_mail = {
                **quote,
                "_tracking":   tracking,
                "_portal_url": portal_url,
            }
            await db.quotes.update_one(
                {"quote_id": quote_id},
                {"$set": {
                    "tracking_tokens":       tracking,
                    "portal_magic_token":    magic_token,
                    "portal_url":            portal_url,
                }},
            )

            from gmail_service import send_quote_email, _get_valid_access_token, _get_any_active_token
            token_ok = await _get_valid_access_token(user.user_id)
            if not token_ok:
                token_ok, _ = await _get_any_active_token()
                logger.info("Fallback Gmail token used")
            if token_ok:
                email_sent = await send_quote_email(user.user_id, lead, quote_for_mail, pdf_data=pdf_data)
                logger.info(f"Email sent: {email_sent}, PDF: {len(pdf_data) if pdf_data else 0}b, tracking pixel={pixel_token[:8]}")
            else:
                logger.error("No Gmail token - email NOT sent")
        except Exception as e:
            logger.error(f"Gmail error quote {quote_id}: {e}", exc_info=True)

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

# ============= STUBS — features non implémentées côté backend =============
# Ces endpoints renvoient des données vides pour éviter les 404/403/CORS
# qui polluent la console frontend quand un module (bookings, ga4, analytics)
# n'est pas encore branché. Dès qu'on implémente réellement, on remplace.


# ============= DYNAMIC LAYOUTS (dashboard personnalisable) =============
# Chaque utilisateur a son propre layout par "scope" (dashboard, director, etc.)
# Layout = liste ordonnée de blocs avec type, largeur (1-12) et config.

DEFAULT_LAYOUTS = {
    "dashboard": [
        {"id": "cover",       "type": "cover",              "w": 12},
        {"id": "quickact",    "type": "quick-actions",      "w": 12},
        {"id": "hero-rev",    "type": "hero-revenue",       "w": 8},
        {"id": "kpi-leads",   "type": "kpi-leads",          "w": 4},
        {"id": "leads-evo",   "type": "leads-evolution",    "w": 8},
        {"id": "leads-src",   "type": "leads-by-source",    "w": 4},
        {"id": "pipeline",    "type": "pipeline",           "w": 8},
        {"id": "tasks",       "type": "tasks",              "w": 4},
        {"id": "revenue-ch",  "type": "revenue-chart",      "w": 8},
        {"id": "conv-funnel", "type": "conversion-funnel",  "w": 4},
        {"id": "activity",    "type": "activity-feed",      "w": 6},
        {"id": "insights",    "type": "ai-insights",        "w": 6},
    ],
}


@api_router.get("/layouts/{scope}")
async def get_user_layout(scope: str, request: Request):
    """Layout persistant de l'utilisateur pour un scope donné (dashboard, director…)."""
    user = await require_auth(request)
    doc = await db.user_layouts.find_one(
        {"user_id": user.user_id, "scope": scope}, {"_id": 0}
    )
    if doc and doc.get("blocks"):
        return {"scope": scope, "blocks": doc["blocks"]}
    # Fallback : layout par défaut (copie, pas de persistance tant que l'user ne sauve pas)
    return {"scope": scope, "blocks": DEFAULT_LAYOUTS.get(scope, [])}


@api_router.put("/layouts/{scope}")
async def save_user_layout(scope: str, payload: Dict[str, Any], request: Request):
    """Sauvegarde le layout de l'utilisateur."""
    user = await require_auth(request)
    blocks = payload.get("blocks")
    if not isinstance(blocks, list):
        raise HTTPException(status_code=400, detail="Le champ 'blocks' doit être une liste.")
    # Sanitize : chaque bloc a au moins id + type ; w default 12
    cleaned = []
    for b in blocks:
        if not isinstance(b, dict) or not b.get("type"):
            continue
        cleaned.append({
            "id":     str(b.get("id") or uuid.uuid4().hex[:8]),
            "type":   str(b["type"])[:50],
            "w":      max(1, min(12, int(b.get("w") or 12))),
            "config": b.get("config") or {},
        })
    await db.user_layouts.update_one(
        {"user_id": user.user_id, "scope": scope},
        {"$set": {
            "user_id":    user.user_id,
            "scope":      scope,
            "blocks":     cleaned,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"scope": scope, "blocks": cleaned}


@api_router.delete("/layouts/{scope}")
async def reset_user_layout(scope: str, request: Request):
    """Réinitialise le layout au défaut (supprime la personnalisation)."""
    user = await require_auth(request)
    await db.user_layouts.delete_one({"user_id": user.user_id, "scope": scope})
    return {"scope": scope, "blocks": DEFAULT_LAYOUTS.get(scope, [])}


# ============= COMMANDE CLAUDE — Phase 2 =============
# L'utilisateur tape une instruction en langage naturel, Claude la transforme
# en patch du layout via tool_use (sortie JSON garantie par l'API).

# Catalogue des blocs disponibles (synchro avec frontend/blocks.jsx BLOCK_REGISTRY)
AVAILABLE_BLOCKS = {
    "cover":              {"title": "Cover / accueil",             "description": "Bandeau d'accueil avec salutation contextuelle et résumé du jour."},
    "quick-actions":      {"title": "Actions rapides",             "description": "4 CTA : nouveau lead, nouveau devis, planning, carte."},
    "hero-revenue":       {"title": "Chiffre d'affaires",          "description": "Gros chiffre du CA + encaissé/attente/retard + sparkline."},
    "kpi-leads":          {"title": "KPI leads",                   "description": "Total leads de la période + breakdown par statut (nouveaux/contactés/gagnés)."},
    "pipeline":           {"title": "Pipeline commercial",         "description": "Entonnoir des 6 étapes (Nouveau → Gagné)."},
    "activity-feed":      {"title": "Activité en direct",          "description": "Flux temps réel des derniers événements (leads, devis, factures)."},
    "ai-insights":        {"title": "Recommandations IA",          "description": "Suggestions d'actions basées sur les données."},
    "recent-leads":       {"title": "Leads récents",               "description": "Liste cliquable des 8 derniers leads."},
    "leads-evolution":    {"title": "Évolution des leads",         "description": "Graphique area avec l'arrivée quotidienne de leads."},
    "leads-by-source":    {"title": "Leads par source",            "description": "Camembert des sources (Facebook, Google, Direct, etc.)."},
    "revenue-chart":      {"title": "CA encaissé · courbe",        "description": "Graphique du CA jour par jour."},
    "conversion-funnel":  {"title": "Entonnoir de conversion",     "description": "Taux de passage à chaque étape du pipeline."},
    "tasks":              {"title": "Tâches",                      "description": "Tâches aujourd'hui, en retard, à venir + liste."},
}


class LayoutCommand(BaseModel):
    instruction: str = Field(..., max_length=500, description="Instruction en langage naturel")


# ============= AGENT VOCAL — contrôle complet du CRM ==============
# L'agent combine des outils READ (search_*) exécutés côté backend et des
# outils PLAN (plan_navigation, plan_action) qui produisent un plan exécuté
# par le frontend avec l'auth de l'utilisateur. Chaque action destructive
# requiert confirmation côté frontend.


class VoiceAgentCommand(BaseModel):
    instruction: str = Field(..., max_length=1000)


async def _agent_search_leads(query: str, user_id: str) -> List[Dict[str, Any]]:
    """Recherche leads par nom/email/téléphone. Lecture seule."""
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    cursor = db.leads.find(
        {
            "deleted_at": {"$exists": False},
            "$or": [
                {"name": pattern}, {"email": pattern},
                {"phone": pattern}, {"address": pattern},
            ],
        },
        {"_id": 0, "lead_id": 1, "name": 1, "email": 1, "phone": 1, "service_type": 1, "status": 1, "address": 1},
    ).sort("created_at", -1).limit(10)
    leads = await cursor.to_list(10)
    return leads


async def _agent_search_quotes(query: str, user_id: str) -> List[Dict[str, Any]]:
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    cursor = db.quotes.find(
        {
            "deleted_at": {"$exists": False},
            "$or": [
                {"quote_number": pattern}, {"lead_name": pattern},
                {"title": pattern}, {"service_type": pattern},
            ],
        },
        {"_id": 0, "quote_id": 1, "quote_number": 1, "lead_id": 1, "lead_name": 1, "title": 1, "amount": 1, "status": 1, "created_at": 1},
    ).sort("created_at", -1).limit(10)
    return await cursor.to_list(10)


async def _agent_search_invoices(query: str, user_id: str) -> List[Dict[str, Any]]:
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    cursor = db.invoices.find(
        {
            "deleted_at": {"$exists": False},
            "$or": [
                {"invoice_number": pattern}, {"lead_name": pattern},
                {"project": pattern},
            ],
        },
        {"_id": 0, "invoice_id": 1, "invoice_number": 1, "lead_id": 1, "lead_name": 1, "amount_ttc": 1, "amount": 1, "status": 1, "due_date": 1, "created_at": 1},
    ).sort("created_at", -1).limit(10)
    return await cursor.to_list(10)


VOICE_AGENT_SYSTEM = """Tu es un agent de contrôle vocal pour un CRM français (Global Clean Home — société de nettoyage).
Tu reçois une instruction en français et tu dois exécuter ce que l'utilisateur demande en enchaînant des outils.

OUTILS DE RECHERCHE (read-only, exécutés côté backend) :
- search_leads(query) : trouve des leads/prospects par nom, email, téléphone.
- search_quotes(query) : trouve des devis par numéro ou nom de client.
- search_invoices(query) : trouve des factures.

OUTILS DE PLANIFICATION (produisent des actions exécutées par le navigateur) :
- plan_navigation(path, description) : navigue vers une page du CRM.
  Routes courantes : /dashboard, /leads, /leads/{lead_id}, /leads/new,
  /quotes, /quotes/{quote_id}, /quotes/new?leadId={lead_id},
  /invoices, /invoices/{invoice_id}, /invoices/new?leadId={lead_id},
  /planning, /tasks, /director.
- plan_action(action, params, description, destructive) : exécute une action.
  Actions disponibles :
    * "send_quote"        params={quote_id}         → POST /quotes/{id}/send
    * "mark_invoice_paid" params={invoice_id}       → POST /invoices/{id}/mark-paid
    * "send_reminder"     params={invoice_id}       → POST /invoices/{id}/remind
    * "update_lead_status" params={lead_id, status} → PATCH /leads/{id} (status: nouveau|contacté|en_attente|devis_envoyé|gagné|perdu)
    * "add_interaction"   params={lead_id, type, content} → POST /interactions (type: appel|email|sms|note|rdv)
  destructive=true pour celles qui envoient quelque chose au client ou modifient un statut
  (send_quote, send_reminder, mark_invoice_paid, update_lead_status).

DÉMARCHE :
1. Identifie l'entité concernée (lead, devis, facture) → utilise search_* si besoin.
2. Si plusieurs matches ambigus → renvoie un plan avec plan_navigation vers la liste et demande à l'user de préciser (dans ton `final_answer`).
3. Si un seul match → chaîne les actions (par ex : search_leads puis plan_navigation vers son détail).
4. Pour créer un devis/facture : plan_navigation vers /quotes/new?leadId=X ou /invoices/new?leadId=X.
5. Termine TOUJOURS par un appel à `final_answer(summary)` résumant en 1 phrase ce qui a été fait/planifié.

RÈGLES :
- Jamais supprimer d'entité sans demande explicite ET confirmation.
- Si l'instruction est ambiguë ou irréalisable, utilise final_answer pour expliquer au lieu de deviner.
- Toujours en français, ton professionnel et concis.
"""


VOICE_AGENT_TOOLS = [
    {
        "name": "search_leads",
        "description": "Cherche des leads/prospects par nom, email ou téléphone.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "search_quotes",
        "description": "Cherche des devis par numéro ou nom de client.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "search_invoices",
        "description": "Cherche des factures par numéro ou nom de client.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "plan_navigation",
        "description": "Planifie une navigation vers une URL du CRM.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path":        {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["path", "description"],
        },
    },
    {
        "name": "plan_action",
        "description": "Planifie une action (envoi, marquage payé, relance, changement de statut…).",
        "input_schema": {
            "type": "object",
            "properties": {
                "action":      {"type": "string", "enum": ["send_quote", "mark_invoice_paid", "send_reminder", "update_lead_status", "add_interaction"]},
                "params":      {"type": "object"},
                "description": {"type": "string"},
                "destructive": {"type": "boolean"},
            },
            "required": ["action", "params", "description"],
        },
    },
    {
        "name": "final_answer",
        "description": "Réponse finale à l'utilisateur. DOIT être appelé en dernier.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "1-2 phrases en français, ton pro."},
            },
            "required": ["summary"],
        },
    },
]


@api_router.post("/voice/agent")
async def voice_agent(payload: VoiceAgentCommand, request: Request):
    """Agent vocal : transforme une instruction française en plan d'actions
    exécutable par le frontend. Boucle Claude + tool_use jusqu'à final_answer.
    """
    import httpx

    user = await require_auth(request)
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        raise HTTPException(
            status_code=503,
            detail="Mode agent vocal indisponible : ANTHROPIC_API_KEY manquant. L'agent requiert Claude pour comprendre les instructions complexes.",
        )

    # Historique de la conversation Claude ↔ backend (tools roundtrip)
    messages: List[Dict[str, Any]] = [{"role": "user", "content": payload.instruction}]
    actions: List[Dict[str, Any]] = []  # le plan d'actions retourné au frontend
    summary: Optional[str] = None
    max_rounds = 6

    async with httpx.AsyncClient(timeout=25) as client:
        for _round in range(max_rounds):
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 2000,
                    "system": VOICE_AGENT_SYSTEM,
                    "tools": VOICE_AGENT_TOOLS,
                    "messages": messages,
                },
            )
            if res.status_code != 200:
                logger.error(f"Voice agent Claude error {res.status_code}: {res.text[:500]}")
                raise HTTPException(status_code=502, detail=f"Claude a refusé la requête ({res.status_code})")

            data = res.json()
            stop_reason = data.get("stop_reason")
            content_blocks = data.get("content", [])

            # Ajoute la réponse de Claude à l'historique
            messages.append({"role": "assistant", "content": content_blocks})

            # Collecte les tool_uses de ce round
            tool_uses = [b for b in content_blocks if b.get("type") == "tool_use"]
            if not tool_uses:
                # Claude a répondu en texte sans outil — on termine
                for b in content_blocks:
                    if b.get("type") == "text" and not summary:
                        summary = (b.get("text") or "").strip()
                break

            # Exécute chaque tool_use
            tool_results = []
            ended = False
            for tu in tool_uses:
                name = tu.get("name")
                tu_id = tu.get("id")
                tu_input = tu.get("input") or {}

                try:
                    if name == "search_leads":
                        result = await _agent_search_leads(str(tu_input.get("query", ""))[:200], user.user_id)
                    elif name == "search_quotes":
                        result = await _agent_search_quotes(str(tu_input.get("query", ""))[:200], user.user_id)
                    elif name == "search_invoices":
                        result = await _agent_search_invoices(str(tu_input.get("query", ""))[:200], user.user_id)
                    elif name == "plan_navigation":
                        path = str(tu_input.get("path", "")).strip()
                        desc = str(tu_input.get("description", "")).strip()
                        if path and path.startswith("/"):
                            actions.append({"type": "navigate", "path": path, "description": desc})
                        result = {"status": "planned", "path": path}
                    elif name == "plan_action":
                        act = str(tu_input.get("action", ""))
                        params = tu_input.get("params") or {}
                        desc = str(tu_input.get("description", "")).strip()
                        destructive = bool(tu_input.get("destructive", False))
                        actions.append({
                            "type": "api_call", "action": act, "params": params,
                            "description": desc, "destructive": destructive,
                        })
                        result = {"status": "planned", "action": act}
                    elif name == "final_answer":
                        summary = str(tu_input.get("summary", "")).strip() or summary
                        ended = True
                        result = {"status": "completed"}
                    else:
                        result = {"error": f"Outil inconnu : {name}"}
                except Exception as e:
                    logger.error(f"Agent tool {name} failed: {e}", exc_info=True)
                    result = {"error": str(e)[:200]}

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu_id,
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })

            # Renvoie les résultats à Claude pour continuer la boucle
            messages.append({"role": "user", "content": tool_results})

            if ended or stop_reason == "end_turn":
                break

    if not summary:
        summary = "Action planifiée." if actions else "Je n'ai rien compris à faire — reformule."

    return {
        "instruction": payload.instruction,
        "actions": actions,
        "summary": summary,
    }


def _local_layout_command(instruction: str, current_blocks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Fallback local : interprète des commandes simples via regex quand Claude
    n'est pas dispo. Couvre : ajouter, enlever, redimensionner, réinitialiser.
    Retourne {blocks, explanation} ou None si impossible d'interpréter localement.
    """
    import re as _re
    instr = instruction.lower().strip()
    blocks = [dict(b) for b in current_blocks]

    # Table de reconnaissance : mots-clés FR → type de bloc
    KEYWORDS = {
        "pipeline":      "pipeline",
        "entonnoir":     "pipeline",
        "ca ":           "hero-revenue", "chiffre d'affaires": "hero-revenue", "revenu": "hero-revenue",
        "facturation":   "hero-revenue",
        "leads récents": "recent-leads", "derniers leads": "recent-leads",
        "kpi leads":     "kpi-leads", "objectif leads": "kpi-leads", "nouveaux leads": "kpi-leads",
        "activité":      "activity-feed", "direct":         "activity-feed", "temps réel": "activity-feed",
        "insights":      "ai-insights", "recommandations":  "ai-insights", "suggestion": "ai-insights",
        "actions rapides": "quick-actions", "raccourcis":   "quick-actions",
        "cover":         "cover", "accueil":               "cover", "salutation":   "cover",
    }

    def _find_type():
        for kw, t in KEYWORDS.items():
            if kw in instr and t in AVAILABLE_BLOCKS:
                return t
        return None

    target_type = _find_type()

    # reset / réinitialise
    if _re.search(r"\b(reset|réinitialise|remet|par défaut)\b", instr):
        return {"blocks": DEFAULT_LAYOUTS.get("dashboard", []), "explanation": "Layout réinitialisé au défaut."}

    # enlève / supprime / retire / enlever
    if _re.search(r"\b(enl[èe]ve|retire|supprime|vire)\b", instr) and target_type:
        new_blocks = [b for b in blocks if b.get("type") != target_type]
        if len(new_blocks) == len(blocks):
            return None
        meta = AVAILABLE_BLOCKS.get(target_type, {})
        return {"blocks": new_blocks, "explanation": f"Bloc « {meta.get('title', target_type)} » supprimé."}

    # ajoute / met / affiche
    if _re.search(r"\b(ajoute|met(s|)|affiche|rajoute)\b", instr) and target_type:
        if any(b.get("type") == target_type for b in blocks):
            # Déjà présent : éventuellement redimensionner
            w_match = _re.search(r"\b(pleine largeur|full|12|8|6|4|1/2|2/3|1/3|demi|tier)\b", instr)
            if w_match:
                m = w_match.group(1)
                w = 12 if m in ("pleine largeur", "full", "12") else \
                    8  if m in ("8", "2/3") else \
                    6  if m in ("6", "1/2", "demi") else \
                    4  if m in ("4", "1/3", "tier") else None
                if w:
                    for b in blocks:
                        if b.get("type") == target_type:
                            b["w"] = w
                    meta = AVAILABLE_BLOCKS.get(target_type, {})
                    return {"blocks": blocks, "explanation": f"Bloc « {meta.get('title', target_type)} » redimensionné à {w}/12."}
            return None
        meta = AVAILABLE_BLOCKS.get(target_type, {})
        new_block = {"id": f"{target_type}-{uuid.uuid4().hex[:6]}", "type": target_type, "w": 6}
        # En haut si "en haut", sinon à la fin
        if _re.search(r"\b(en haut|début|dessus)\b", instr):
            blocks.insert(0, new_block)
        else:
            blocks.append(new_block)
        return {"blocks": blocks, "explanation": f"Bloc « {meta.get('title', target_type)} » ajouté."}

    return None


@api_router.post("/layouts/{scope}/command")
async def layout_command(scope: str, payload: LayoutCommand, request: Request):
    """Transforme une instruction en français en un nouveau layout via Claude,
    avec un fallback local (regex) si la clé Anthropic n'est pas disponible.
    """
    import httpx, json

    user = await require_auth(request)
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")

    # Récupère le layout courant
    doc = await db.user_layouts.find_one({"user_id": user.user_id, "scope": scope}, {"_id": 0})
    current_blocks = (doc or {}).get("blocks") or DEFAULT_LAYOUTS.get(scope, [])

    # ── Fallback local si pas de Claude ─────────────────────────────
    if not anthropic_key:
        local = _local_layout_command(payload.instruction, current_blocks)
        if local:
            await db.user_layouts.update_one(
                {"user_id": user.user_id, "scope": scope},
                {"$set": {
                    "user_id": user.user_id, "scope": scope, "blocks": local["blocks"],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
            return {"scope": scope, "blocks": local["blocks"], "explanation": local["explanation"] + " (mode local · Claude non configuré)", "instruction": payload.instruction, "mode": "local"}
        raise HTTPException(
            status_code=503,
            detail="Claude n'est pas configuré (ANTHROPIC_API_KEY manquant sur le serveur). Essaie une commande simple comme « ajoute le pipeline » ou contacte l'admin pour activer l'IA."
        )

    # Catalogue en texte pour le prompt
    catalog = "\n".join([f"  - `{t}` — {m['title']} : {m['description']}" for t, m in AVAILABLE_BLOCKS.items()])
    current_json = json.dumps(current_blocks, ensure_ascii=False)

    system_prompt = f"""Tu es l'assistant de configuration du dashboard d'un CRM.
L'utilisateur te donne une instruction en français pour modifier son dashboard.
Tu dois renvoyer le NOUVEAU layout complet via l'outil `set_dashboard_layout`.

SYSTÈME DE GRILLE :
- Le dashboard est une grille de 12 colonnes.
- Chaque bloc a une propriété `w` (largeur) entre 1 et 12.
- Valeurs typiques : 4 (1/3), 6 (1/2), 8 (2/3), 12 (pleine largeur).
- Les blocs s'affichent dans l'ordre du tableau, avec wrap automatique.

BLOCS DISPONIBLES (types autorisés uniquement) :
{catalog}

LAYOUT ACTUEL DE L'UTILISATEUR :
{current_json}

RÈGLES :
1. Ne jamais inventer de `type` hors de la liste ci-dessus.
2. Chaque bloc doit avoir un `id` unique (conserve les IDs existants quand tu les garde, et génère un ID court `{{type}}-{{random4}}` pour les nouveaux).
3. Préserve la cohérence : si l'utilisateur demande d'ajouter un bloc, ajoute-le SANS supprimer les autres sauf demande explicite.
4. La somme des `w` sur une ligne ne peut dépasser 12 (les blocs passent à la ligne automatiquement, donc pense aux visuels côte à côte).
5. Reformule en 1 phrase concise ce que tu as fait dans `explanation` (français, ton pro).
"""

    tool = {
        "name": "set_dashboard_layout",
        "description": "Applique un nouveau layout au dashboard de l'utilisateur.",
        "input_schema": {
            "type": "object",
            "properties": {
                "blocks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id":   {"type": "string"},
                            "type": {"type": "string", "enum": list(AVAILABLE_BLOCKS.keys())},
                            "w":    {"type": "integer", "minimum": 1, "maximum": 12},
                        },
                        "required": ["id", "type", "w"],
                    },
                },
                "explanation": {"type": "string", "description": "Résumé 1 phrase de la modification."},
            },
            "required": ["blocks", "explanation"],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 2000,
                    "system": system_prompt,
                    "tools": [tool],
                    "tool_choice": {"type": "tool", "name": "set_dashboard_layout"},
                    "messages": [{"role": "user", "content": payload.instruction}],
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Claude trop lent à répondre")

    if res.status_code != 200:
        logger.error(f"Claude layout command failed: {res.status_code} {res.text[:500]}")
        raise HTTPException(status_code=502, detail=f"Claude a refusé la requête ({res.status_code})")

    data = res.json()

    # Extraction de l'appel d'outil
    tool_blocks = None
    explanation = None
    for block in data.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "set_dashboard_layout":
            inp = block.get("input") or {}
            tool_blocks = inp.get("blocks")
            explanation = inp.get("explanation")
            break

    if not isinstance(tool_blocks, list):
        raise HTTPException(status_code=502, detail="Claude n'a pas renvoyé de layout valide")

    # Sanitize (comme PUT /layouts/{scope})
    cleaned = []
    for b in tool_blocks:
        if not isinstance(b, dict) or not b.get("type") or b["type"] not in AVAILABLE_BLOCKS:
            continue
        cleaned.append({
            "id":     str(b.get("id") or uuid.uuid4().hex[:8]),
            "type":   b["type"],
            "w":      max(1, min(12, int(b.get("w") or 12))),
            "config": b.get("config") or {},
        })

    if not cleaned:
        raise HTTPException(status_code=422, detail="Le layout produit est vide (aucun bloc valide)")

    # Persiste
    await db.user_layouts.update_one(
        {"user_id": user.user_id, "scope": scope},
        {"$set": {
            "user_id":    user.user_id,
            "scope":      scope,
            "blocks":     cleaned,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {
        "scope": scope,
        "blocks": cleaned,
        "explanation": explanation or "Mise à jour appliquée.",
        "instruction": payload.instruction,
    }


# ============= LIVE ACTIVITY FEED =============
# Agrège les événements récents à travers tout le CRM pour un feed temps réel.


@api_router.get("/activity/live")
async def get_live_activity(request: Request, limit: int = 20):
    """Feed des événements récents (leads créés, devis envoyés, factures payées, etc.)."""
    await require_auth(request)

    since = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

    # Leads récents
    leads = await db.leads.find(
        {"deleted_at": {"$exists": False}, "created_at": {"$gte": since}},
        {"_id": 0, "lead_id": 1, "name": 1, "service_type": 1, "created_at": 1, "status": 1, "source": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Devis récents
    quotes = await db.quotes.find(
        {"deleted_at": {"$exists": False}, "created_at": {"$gte": since}},
        {"_id": 0, "quote_id": 1, "quote_number": 1, "lead_name": 1, "amount": 1, "status": 1, "created_at": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Factures récentes
    invoices = await db.invoices.find(
        {"deleted_at": {"$exists": False}, "created_at": {"$gte": since}},
        {"_id": 0, "invoice_id": 1, "invoice_number": 1, "lead_name": 1, "amount_ttc": 1, "amount": 1, "status": 1, "created_at": 1, "paid_at": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)

    events = []
    for l in leads:
        events.append({
            "id": f"lead-{l['lead_id']}",
            "kind": "lead",
            "label": f"Nouveau lead : {l.get('name', '—')}",
            "sub": f"{l.get('service_type', '—')} · {l.get('source') or 'Direct'} · {l.get('status', 'nouveau')}",
            "at": l.get("created_at"),
            "link": f"/leads/{l['lead_id']}",
            "icon": "🎯",
        })
    for q in quotes:
        amt = q.get("amount") or 0
        events.append({
            "id": f"quote-{q['quote_id']}",
            "kind": "quote",
            "label": f"Devis {q.get('quote_number') or q['quote_id'][-8:]} — {q.get('lead_name', '—')}",
            "sub": f"{amt:,.0f} € · {q.get('status', 'brouillon')}".replace(',', ' '),
            "at": q.get("created_at"),
            "link": f"/quotes/{q['quote_id']}",
            "icon": "📄",
        })
    for i in invoices:
        amt = i.get("amount_ttc") or i.get("amount") or 0
        paid = i.get("status") in ("payée", "payee")
        events.append({
            "id": f"invoice-{i['invoice_id']}",
            "kind": "invoice",
            "label": f"Facture {i.get('invoice_number') or i['invoice_id'][-8:]} — {i.get('lead_name', '—')}",
            "sub": f"{amt:,.0f} € · {i.get('status', 'en_attente')}".replace(',', ' '),
            "at": i.get("paid_at") if paid else i.get("created_at"),
            "link": f"/invoices/{i['invoice_id']}",
            "icon": "✅" if paid else "💶",
        })

    events.sort(key=lambda e: e.get("at") or "", reverse=True)
    return {"items": events[:limit], "total": len(events)}


@api_router.get("/notifications/unread-count")
async def stub_unread_count(request: Request):
    await require_auth(request)
    return {"count": 0, "unread": 0}


@api_router.get("/notifications")
async def stub_notifications(request: Request, limit: int = 50):
    await require_auth(request)
    return {"items": [], "total": 0, "unread": 0}


@api_router.get("/bookings")
async def stub_bookings(request: Request):
    await require_auth(request)
    return {"items": [], "total": 0}


@api_router.get("/planning/bookings")
async def stub_planning_bookings(request: Request):
    await require_auth(request)
    return {"items": [], "total": 0}


@api_router.get("/analytics-data/overview")
async def stub_analytics_overview(request: Request, days: int = 30):
    await require_auth(request)
    return {"days": days, "visits": 0, "users": 0, "sources": [], "pages": []}


@api_router.get("/ga4/search-console")
async def stub_ga4_search_console(request: Request, days: int = 30):
    await require_auth(request)
    return {"days": days, "queries": [], "pages": [], "clicks": 0, "impressions": 0}


@api_router.get("/quotes/{quote_id}/pdf")
async def download_quote_pdf(quote_id: str, request: Request):
    """Génère et télécharge le PDF du devis."""
    await require_auth(request)
    quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    lead = await db.leads.find_one({"lead_id": quote.get("lead_id")}, {"_id": 0}) or {}
    try:
        from integrations import generate_quote_pdf
        pdf_buffer = generate_quote_pdf(quote, lead)
        pdf_data = pdf_buffer.read()
    except Exception as e:
        logger.error(f"PDF generation failed for quote {quote_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur génération PDF")

    filename = f"{quote.get('quote_number') or quote_id}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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

    interactions = await db.interactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

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

    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

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


@api_router.get("/tasks")
async def get_tasks(
    request: Request,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    include_deleted: bool = Query(default=False),
):
    """Get tasks with pagination."""
    await require_auth(request)

    query = {}
    if not include_deleted:
        query["deleted_at"] = {"$exists": False}
    if status:
        query["status"] = status

    total = await db.tasks.count_documents(query)
    skip = (page - 1) * page_size
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).skip(skip).limit(page_size).to_list(page_size)

    for task in tasks:
        if isinstance(task.get("created_at"), str):
            task["created_at"] = datetime.fromisoformat(task["created_at"])
        if task.get("due_date") and isinstance(task["due_date"], str):
            task["due_date"] = datetime.fromisoformat(task["due_date"])
        if task.get("completed_at") and isinstance(task["completed_at"], str):
            task["completed_at"] = datetime.fromisoformat(task["completed_at"])

    return {
        "items": [Task(**task) for task in tasks],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    """Soft-delete a task."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.update_one(
        {"task_id": task_id, "deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    await write_audit_log("task", task_id, "delete", user.user_id)
    return {"message": "Tâche supprimée"}


@api_router.post("/tasks/{task_id}/restore")
async def restore_task(task_id: str, request: Request):
    """Restore a soft-deleted task."""
    user = await require_auth(request)
    result = await db.tasks.update_one(
        {"task_id": task_id, "deleted_at": {"$exists": True}},
        {"$unset": {"deleted_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tâche introuvable ou non supprimée")
    await write_audit_log("task", task_id, "restore", user.user_id)
    return {"message": "Tâche restaurée"}


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

# ============= AUDIT LOG ENDPOINT =============


@api_router.get("/audit-log")
async def get_audit_log(
    request: Request,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Get audit log with filters."""
    await require_auth(request)

    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if user_id:
        query["user_id"] = user_id
    if date_from:
        query.setdefault("timestamp", {})["$gte"] = date_from
    if date_to:
        query.setdefault("timestamp", {})["$lte"] = date_to

    total = await db.audit_log.count_documents(query)
    skip = (page - 1) * page_size
    logs = await db.audit_log.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(page_size).to_list(page_size)

    return {
        "items": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
    }

# ============= GLOBAL SEARCH ENDPOINT =============


@api_router.get("/search")
async def global_search(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
):
    """Search across leads, quotes, invoices, and interventions."""
    await require_auth(request)

    if not q or len(q.strip()) < 1:
        raise HTTPException(status_code=400, detail="Paramètre q requis")

    q = q.strip()
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    results = {}

    # Search leads
    lead_query = {
        "deleted_at": {"$exists": False},
        "$or": [
            {"name": pattern},
            {"email": pattern},
            {"phone": pattern},
            {"address": pattern},
            {"message": pattern},
        ]
    }
    leads = await db.leads.find(lead_query, {"_id": 0, "lead_id": 1, "name": 1, "email": 1, "phone": 1, "service_type": 1, "status": 1, "created_at": 1}).limit(10).to_list(10)
    results["leads"] = [
        {
            "type": "lead",
            "id": l["lead_id"],
            "snippet": f"{l.get('name', '')} · {l.get('email', '')} · {l.get('service_type', '')} ({l.get('status', '')})",
            "data": l,
        }
        for l in leads
    ]

    # Search quotes
    quote_query = {
        "deleted_at": {"$exists": False},
        "$or": [
            {"details": pattern},
            {"service_type": pattern},
        ]
    }
    quotes = await db.quotes.find(quote_query, {"_id": 0, "quote_id": 1, "service_type": 1, "amount": 1, "status": 1, "created_at": 1}).limit(10).to_list(10)
    results["quotes"] = [
        {
            "type": "quote",
            "id": q_doc["quote_id"],
            "snippet": f"Devis {q_doc.get('service_type', '')} · {q_doc.get('amount', 0)}€ ({q_doc.get('status', '')})",
            "data": q_doc,
        }
        for q_doc in quotes
    ]

    # Search invoices
    invoice_query = {
        "deleted_at": {"$exists": False},
        "$or": [
            {"lead_name": pattern},
            {"lead_email": pattern},
            {"details": pattern},
        ]
    }
    invoices_found = await db.invoices.find(invoice_query, {"_id": 0, "invoice_id": 1, "lead_name": 1, "lead_email": 1, "amount_ttc": 1, "status": 1, "created_at": 1}).limit(10).to_list(10)
    results["invoices"] = [
        {
            "type": "invoice",
            "id": inv["invoice_id"],
            "snippet": f"Facture {inv.get('lead_name', '')} · {inv.get('amount_ttc', 0)}€ ({inv.get('status', '')})",
            "data": inv,
        }
        for inv in invoices_found
    ]

    # Search interventions
    intervention_query = {
        "deleted_at": {"$exists": False},
        "$or": [
            {"title": pattern},
            {"address": pattern},
            {"description": pattern},
        ]
    }
    interventions_found = await db.interventions.find(intervention_query, {"_id": 0, "intervention_id": 1, "title": 1, "address": 1, "status": 1, "scheduled_date": 1}).limit(10).to_list(10)
    results["interventions"] = [
        {
            "type": "intervention",
            "id": i["intervention_id"],
            "snippet": f"Intervention {i.get('title', '')} · {i.get('address', '')} ({i.get('status', '')})",
            "data": i,
        }
        for i in interventions_found
    ]

    total = sum(len(v) for v in results.values())
    return {"query": q, "total": total, "results": results}

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
        return {"status": "error", "message": "Tracking failed"}


@api_router.get("/tracking/visitor/{visitor_id}")
async def get_visitor_journey(visitor_id: str, request: Request):
    """Get complete journey of a visitor."""
    await require_auth(request)

    events = await db.tracking_events.find(
        {"visitor_id": visitor_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)

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


@api_router.get("/stats/dashboard/debug")
async def debug_dashboard_stats(request: Request):
    """Diagnostic : renvoie les comptes bruts par collection, sans filtres.
    À utiliser pour vérifier si la DB contient des leads alors que le dashboard
    affiche 0 — permet de détecter un problème de filtre."""
    await require_auth(request)
    now = datetime.now(timezone.utc)
    start_30d = (now - timedelta(days=30)).isoformat()

    # Sample du 1er lead pour voir le format exact de created_at / deleted_at
    sample = await db.leads.find_one({}, {"_id": 0, "lead_id": 1, "name": 1, "status": 1, "created_at": 1, "deleted_at": 1})

    return {
        "now": now.isoformat(),
        "start_30d": start_30d,
        "collections": {
            "leads": {
                "total_raw":          await db.leads.count_documents({}),
                "no_deleted_field":   await db.leads.count_documents({"deleted_at": {"$exists": False}}),
                "deleted_null":       await db.leads.count_documents({"deleted_at": None}),
                "not_deleted_all":    await db.leads.count_documents({"$or": [
                    {"deleted_at": {"$exists": False}},
                    {"deleted_at": {"$in": [None, False, ""]}},
                ]}),
                "in_30d":             await db.leads.count_documents({"created_at": {"$gte": start_30d}}),
                "sample":             sample,
                "by_status": {
                    s: await db.leads.count_documents({"status": s})
                    for s in ["nouveau", "contacté", "en_attente", "devis_envoyé", "gagné", "perdu"]
                },
            },
            "quotes":   {"total_raw": await db.quotes.count_documents({})},
            "invoices": {"total_raw": await db.invoices.count_documents({})},
            "tasks":    {"total_raw": await db.tasks.count_documents({})},
        },
    }


@api_router.get("/stats/dashboard")
async def get_dashboard_stats(request: Request, period: str = "30d"):
    """Get dashboard statistics."""
    await require_auth(request)

    now = datetime.now(timezone.utc)

    # Determine period
    days_map = {"1d": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 36500}
    start_date = now - timedelta(days=days_map.get(period, 30))
    start_iso = start_date.isoformat()

    # Filtre « non supprimé » ROBUSTE : matche à la fois les docs sans le champ
    # deleted_at (sortie normale) ET les docs avec deleted_at null/false/empty
    # (selon comment les leads ont été insérés en DB).
    not_deleted = {"deleted_at": {"$in": [None, False, ""]}}  # PLUS {"$exists": False}
    # Version encore plus permissive (si ça ne suffit pas) :
    not_deleted_or_missing = {"$or": [
        {"deleted_at": {"$exists": False}},
        {"deleted_at": {"$in": [None, False, ""]}},
    ]}
    in_period = {"created_at": {"$gte": start_iso}}

    def Q(*parts):
        out = {}
        for p in parts: out.update(p)
        return out

    # DIAGNOSTIC : compte brut sans aucun filtre (pour détecter les problèmes)
    raw_total_leads = await db.leads.count_documents({})
    raw_not_deleted_simple = await db.leads.count_documents(not_deleted_or_missing)

    logger.info(f"Dashboard[{period}]: raw_total={raw_total_leads}, not_deleted={raw_not_deleted_simple}")

    # Count leads dans la période
    total_leads = await db.leads.count_documents(Q(not_deleted_or_missing, in_period))
    new_leads = await db.leads.count_documents(Q(not_deleted_or_missing, in_period, {"status": "nouveau"}))
    contacted_leads = await db.leads.count_documents(Q(not_deleted_or_missing, in_period, {"status": "contacté"}))
    won_leads = await db.leads.count_documents(Q(not_deleted_or_missing, in_period, {"status": "gagné"}))

    # FALLBACK 1 : si période = 0 mais DB a des leads → utiliser all-time
    if total_leads == 0 and raw_not_deleted_simple > 0:
        logger.info(f"Dashboard: FALLBACK all-time (période vide, {raw_not_deleted_simple} leads en DB)")
        total_leads = raw_not_deleted_simple
        new_leads = await db.leads.count_documents(Q(not_deleted_or_missing, {"status": "nouveau"}))
        contacted_leads = await db.leads.count_documents(Q(not_deleted_or_missing, {"status": "contacté"}))
        won_leads = await db.leads.count_documents(Q(not_deleted_or_missing, {"status": "gagné"}))

    # FALLBACK 2 : si encore 0 mais raw_total > 0 → on ignore deleted_at aussi
    if total_leads == 0 and raw_total_leads > 0:
        logger.warning(f"Dashboard: FALLBACK RAW (deleted_at filter problématique, raw={raw_total_leads})")
        total_leads = raw_total_leads
        new_leads = await db.leads.count_documents({"status": "nouveau"})
        contacted_leads = await db.leads.count_documents({"status": "contacté"})
        won_leads = await db.leads.count_documents({"status": "gagné"})

    # Count quotes (même stratégie)
    total_quotes = await db.quotes.count_documents(Q(not_deleted_or_missing, in_period))
    sent_quotes = await db.quotes.count_documents(Q(not_deleted_or_missing, in_period, {"status": "envoyé"}))
    accepted_quotes = await db.quotes.count_documents(Q(not_deleted_or_missing, in_period, {"status": "accepté"}))

    if total_quotes == 0:
        total_q_all = await db.quotes.count_documents({})
        if total_q_all > 0:
            total_quotes = total_q_all
            sent_quotes = await db.quotes.count_documents({"status": "envoyé"})
            accepted_quotes = await db.quotes.count_documents({"status": "accepté"})

    # Conversion rates
    conversion_lead_to_quote = (total_quotes / total_leads * 100) if total_leads > 0 else 0
    conversion_quote_to_client = (accepted_quotes / total_quotes * 100) if total_quotes > 0 else 0

    # Leads by source + par service — récupère la liste une seule fois.
    # Si période vide → récupère tous les leads non supprimés pour garder
    # les charts significatifs.
    source_query = Q(not_deleted_or_missing, in_period)
    sample_count = await db.leads.count_documents(source_query)
    if sample_count == 0:
        source_query = {} if raw_not_deleted_simple == 0 else not_deleted_or_missing
    all_leads = await db.leads.find(source_query, {"_id": 0, "source": 1, "service_type": 1, "created_at": 1}).to_list(2000)

    leads_by_source = {}
    leads_by_service = {}
    for lead in all_leads:
        source = lead.get("source") or "Direct"
        leads_by_source[source] = leads_by_source.get(source, 0) + 1
        svc = lead.get("service_type") or "Autre"
        leads_by_service[svc] = leads_by_service.get(svc, 0) + 1

    # Leads by day — on cap à 90 jours max pour ne pas spammer Mongo
    leads_by_day = []
    n_days = min(days_map.get(period, 30), 90)
    for i in range(n_days):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.leads.count_documents({
            "deleted_at": {"$exists": False},
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
        })
        leads_by_day.append({"date": day_start.strftime("%Y-%m-%d"), "count": count})
    leads_by_day.reverse()

    # Tâches (toutes celles qui restent à faire)
    task_status_filter = {"status": {"$in": ["pending", "en_cours", "à_faire"]}}
    pending_tasks = await db.tasks.count_documents(task_status_filter)

    today_end = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    tasks_today = await db.tasks.count_documents({
        **task_status_filter,
        "due_date": {"$lte": today_end.isoformat()},
    })
    tasks_overdue = await db.tasks.count_documents({
        **task_status_filter,
        "due_date": {"$lt": now.isoformat()},
    })

    # Average lead score
    score_query = Q(not_deleted_or_missing, in_period)
    all_leads_full = await db.leads.find(score_query, {"_id": 0, "score": 1}).to_list(2000)
    if not all_leads_full:
        all_leads_full = await db.leads.find({}, {"_id": 0, "score": 1}).to_list(2000)
    avg_score = sum([lead.get("score", 50) for lead in all_leads_full]) / len(all_leads_full) if all_leads_full else 50

    # Top performing source (by conversion rate)
    source_performance = {}
    perf_query = Q(not_deleted_or_missing, in_period)
    perf_sample = await db.leads.count_documents(perf_query)
    if perf_sample == 0: perf_query = {}
    for lead in await db.leads.find(perf_query, {"_id": 0, "lead_id": 1, "source": 1, "status": 1}).to_list(2000):
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
        "tasks_today": tasks_today,
        "tasks_overdue": tasks_overdue,
        "avg_lead_score": round(avg_score, 1),
        "best_source": {
            "name": best_source[0],
            "conversion_rate": round(best_source[1]["conversion_rate"], 1),
            "revenue": best_source[1].get("estimated_revenue", 0)
        },
        "source_performance": source_performance
    }

@api_router.get("/director/dashboard")
async def get_director_dashboard(request: Request, range: str = "month"):
    """Dashboard consolidé pour la direction — données réelles agrégées."""
    await require_auth(request)

    now = datetime.now(timezone.utc)
    days_map = {"week": 7, "month": 30, "quarter": 90, "year": 365}
    days = days_map.get(range, 30)
    start = now - timedelta(days=days)
    prev_start = start - timedelta(days=days)
    start_iso, prev_start_iso = start.isoformat(), prev_start.isoformat()

    # Période courante
    total_leads = await db.leads.count_documents({
        "deleted_at": {"$exists": False},
        "created_at": {"$gte": start_iso},
    })
    qualified_leads = await db.leads.count_documents({
        "deleted_at": {"$exists": False},
        "created_at": {"$gte": start_iso},
        "status": {"$in": ["contacté", "en_attente", "devis_envoyé", "gagné"]},
    })
    won_leads = await db.leads.count_documents({
        "deleted_at": {"$exists": False},
        "created_at": {"$gte": start_iso},
        "status": "gagné",
    })
    quotes_sent = await db.quotes.count_documents({
        "created_at": {"$gte": start_iso},
        "status": {"$in": ["envoyé", "accepté"]},
    })
    active_projects = await db.invoices.count_documents({
        "status": {"$in": ["en_attente", "en_retard"]},
    })

    # Revenue (factures payées)
    paid_invoices = await db.invoices.find(
        {"status": {"$in": ["payée", "payee"]}, "created_at": {"$gte": start_iso}},
        {"_id": 0},
    ).to_list(10000)
    revenue_realized = sum(i.get("amount_ttc") or i.get("amount") or 0 for i in paid_invoices)

    # Période précédente (pour comparaison)
    prev_paid = await db.invoices.find(
        {"status": {"$in": ["payée", "payee"]}, "created_at": {"$gte": prev_start_iso, "$lt": start_iso}},
        {"_id": 0},
    ).to_list(10000)
    prev_revenue = sum(i.get("amount_ttc") or i.get("amount") or 0 for i in prev_paid)
    revenue_trend = round((revenue_realized - prev_revenue) / prev_revenue * 100, 1) if prev_revenue > 0 else 0

    prev_leads = await db.leads.count_documents({
        "deleted_at": {"$exists": False},
        "created_at": {"$gte": prev_start_iso, "$lt": start_iso},
    })
    prev_won = await db.leads.count_documents({
        "deleted_at": {"$exists": False},
        "created_at": {"$gte": prev_start_iso, "$lt": start_iso},
        "status": "gagné",
    })
    conversion_rate = round(won_leads / total_leads * 100, 1) if total_leads > 0 else 0
    prev_conversion = round(prev_won / prev_leads * 100, 1) if prev_leads > 0 else 0
    conversion_trend = round(conversion_rate - prev_conversion, 1)

    # Ticket moyen
    avg_ticket = round(revenue_realized / len(paid_invoices)) if paid_invoices else 0

    # Health score (synthétique à partir des indicateurs)
    health_score = min(100, round(
        (conversion_rate * 0.4) +
        (min(100, revenue_realized / 1000) * 0.3) +
        (min(100, quotes_sent * 2) * 0.3)
    ))

    # Funnel
    nouveau = await db.leads.count_documents({"status": "nouveau", "deleted_at": {"$exists": False}, "created_at": {"$gte": start_iso}})
    contacte = await db.leads.count_documents({"status": "contacté", "deleted_at": {"$exists": False}, "created_at": {"$gte": start_iso}})
    devis = await db.leads.count_documents({"status": "devis_envoyé", "deleted_at": {"$exists": False}, "created_at": {"$gte": start_iso}})
    gagne = won_leads

    return {
        "range": range,
        "conversion_rate": conversion_rate,
        "conversion_trend": conversion_trend,
        "revenue": revenue_realized,
        "revenueRealized": revenue_realized,
        "revenue_trend": revenue_trend,
        "health": health_score,
        "healthScore": health_score,
        "health_trend": 0,
        "qualified_leads": qualified_leads,
        "qualifiedLeads": qualified_leads,
        "quotes_sent": quotes_sent,
        "quotesSent": quotes_sent,
        "active_projects": active_projects,
        "activeProjects": active_projects,
        "avg_ticket": avg_ticket,
        "avgTicket": avg_ticket,
        "funnel": [
            {"label": "Nouveau", "count": nouveau},
            {"label": "Contacté", "count": contacte},
            {"label": "Devis envoyé", "count": devis},
            {"label": "Gagné", "count": gagne},
        ],
        "subscores": [],
        "financial_cells": [],
        "top_areas": [],
        "signals": [],
    }


# ============= INTEGRATION STATUS ENDPOINTS =============


@api_router.get("/integrations/status")
async def get_integration_status(request: Request):
    """Get status of all external integrations (legacy endpoint)."""
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

    stripe_status = {
        "configured": bool(os.environ.get("STRIPE_API_KEY", "")),
    }

    whatsapp_configured = bool(os.environ.get("WHATSAPP_NUMBER", ""))

    return {
        "gmail": gmail_status,
        "google_calendar": {"configured": gcal_configured()},
        "stripe": stripe_status,
        "whatsapp": {"configured": whatsapp_configured},
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
    "https://crm-global-clean-home-production.up.railway.app",
    "https://crm-global-clean-home.up.railway.app",
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
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Portal-Token,X-Requested-With,Accept,Origin"
            response.headers["Access-Control-Max-Age"] = "86400"
        return response

    try:
        response = await call_next(request)
    except Exception as e:
        from starlette.responses import JSONResponse
        logger.error(f"CORS middleware error: {type(e).__name__}: {str(e)[:200]}")
        response = JSONResponse({"detail": "Une erreur interne est survenue."}, status_code=500)

    if is_allowed and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Portal-Token,X-Requested-With,Accept,Origin"
        response.headers["Vary"] = "Origin"
    return response

# Force CORS headers on ALL responses including errors
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse

class ForceCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        origin = request.headers.get("origin", "")
        allowed = [
            "https://crm.globalcleanhome.com",
            "https://www.globalcleanhome.com", 
            "https://globalcleanhome.com",
            "https://crm-global-clean-home-production.up.railway.app",
            "http://localhost:3000",
            "http://localhost:5173",
        ]
        if request.method == "OPTIONS":
            response = StarletteResponse(status_code=200)
        else:
            try:
                response = await call_next(request)
            except Exception as e:
                response = StarletteResponse(status_code=500, content=str(e))
        
        if origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*, Authorization, Content-Type, X-Portal-Token"
        return response

app.add_middleware(ForceCORSMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crm.globalcleanhome.com",
        "https://www.globalcleanhome.com",
        "https://globalcleanhome.com",
        "https://crm-global-clean-home-production.up.railway.app",
        "https://crm-global-clean-home.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173"
    ],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_credentials=True,
    allow_headers=["*", "X-Portal-Token", "Content-Type", "Authorization", "Accept", "Origin"],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=86400,
)

# ── PURGE DATA ENDPOINTS (must be before include_router) ──
PURGE_CATEGORIES = {
    "leads": {"collections": ["leads"], "label": "Leads / Prospects"},
    "quotes": {"collections": ["quotes"], "label": "Devis"},
    "invoices": {"collections": ["invoices", "payment_transactions"], "label": "Factures & Paiements"},
    "tasks": {"collections": ["tasks"], "label": "Tâches"},
    "planning": {"collections": ["interventions", "bookings"], "label": "Planning & Réservations"},
    "contracts": {"collections": ["contracts"], "label": "Contrats"},
    "documents": {"collections": ["documents"], "label": "Documents"},
    "tickets": {"collections": ["tickets"], "label": "Tickets SAV"},
    "workflows": {"collections": ["workflows", "workflow_executions"], "label": "Workflows"},
    "communications": {"collections": ["emails", "sms_log", "notifications"], "label": "Emails, SMS & Notifications"},
    "interactions": {"collections": ["interactions", "events", "reviews"], "label": "Interactions & Avis"},
    "logs": {"collections": ["activity_logs", "audit_log", "tracking_events", "webhook_logs"], "label": "Logs & Journaux"},
    "templates": {"collections": ["templates"], "label": "Modèles / Templates"},
}


class PurgeRequest(BaseModel):
    confirm: str = Field(..., description="Must be 'SUPPRIMER' to confirm")
    collections: Optional[List[str]] = Field(None, description="Specific collections to purge, or null for all")


@api_router.get("/data/purge-info")
async def get_purge_info(request: Request):
    """Get counts per category for the purge UI."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Non autorisé")

    categories = {}
    for key, info in PURGE_CATEGORIES.items():
        total = 0
        for coll_name in info["collections"]:
            try:
                total += await db[coll_name].count_documents({})
            except Exception:
                pass
        categories[key] = {"label": info["label"], "count": total}

    return {"categories": categories}


@api_router.post("/data/purge")
async def purge_data(body: PurgeRequest, request: Request):
    """Purge selected or all business data. Keeps users & settings."""
    try:
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Non autorisé")

        if body.confirm != "SUPPRIMER":
            raise HTTPException(status_code=400, detail="Confirmation invalide.")

        # Déterminer les collections à purger
        if body.collections and len(body.collections) > 0:
            # Purge sélective
            colls_to_purge = set()
            for cat_key in body.collections:
                if cat_key in PURGE_CATEGORIES:
                    for c in PURGE_CATEGORIES[cat_key]["collections"]:
                        colls_to_purge.add(c)
                else:
                    raise HTTPException(status_code=400, detail=f"Catégorie inconnue: {cat_key}")
        else:
            # Purge totale
            colls_to_purge = set()
            for info in PURGE_CATEGORIES.values():
                for c in info["collections"]:
                    colls_to_purge.add(c)

        results = {}
        total_deleted = 0
        for coll_name in colls_to_purge:
            try:
                coll = db[coll_name]
                count = await coll.count_documents({})
                if count > 0:
                    await coll.delete_many({})
                    results[coll_name] = count
                    total_deleted += count
            except Exception as e:
                logger.error(f"Erreur purge collection {coll_name}: {str(e)}")
                results[coll_name] = f"erreur: {str(e)}"

        logger.warning(f"PURGE: User {user.get('email')} purged {total_deleted} docs from collections: {list(colls_to_purge)}")

        return {
            "status": "purged",
            "total_deleted": total_deleted,
            "details": results,
            "message": f"{total_deleted} éléments supprimés."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur purge_data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


@api_router.post("/data/purge-all")
async def purge_all_data(body: PurgeRequest, request: Request):
    body.collections = None
    return await purge_data(body, request)

# Include router
app.include_router(api_router)

# Include integrations router
from integrations import integrations_router
app.include_router(integrations_router)

# Include invoices/payments router
from invoices import invoices_router, init_invoices_db
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

# Include Bulk Operations router (Phase 8)
from bulk_operations import bulk_router
app.include_router(bulk_router)

# Include Google Calendar router
from google_calendar import gcal_router
app.include_router(gcal_router)

# Include Gmail router
from gmail_service import gmail_router
app.include_router(gmail_router)

from intervenant import intervenant_router, init_intervenant_db
app.include_router(intervenant_router)

from analytics_ga4 import analytics_router as ga4_router, init_analytics_db
app.include_router(ga4_router)

from ads_connect import ads_connect_router, init_ads_connect_db
app.include_router(ads_connect_router)

from ai_assistant import ai_assistant_router, init_ai_assistant_db
app.include_router(ai_assistant_router)

from contracts import contracts_router
app.include_router(contracts_router)

from satisfaction import satisfaction_router
app.include_router(satisfaction_router)

from booking import booking_router
app.include_router(booking_router)

# ── PHASE 4/5/7: Geo, SMS, Documents ──
from geo import geo_router
from sms_service import sms_router
from documents import documents_router
app.include_router(geo_router)
app.include_router(sms_router)
app.include_router(documents_router)

# Include settings router
from settings import settings_router, init_settings_db
app.include_router(settings_router)

# ── Module PREMIUM Comptabilité + Stocks ──
from accounting import accounting_router, init_db as init_accounting_db
app.include_router(accounting_router)

from accounting_enterprise import enterprise_router, create_enterprise_indexes, init_db as init_enterprise_db
app.include_router(enterprise_router)

from payroll import payroll_router
app.include_router(payroll_router)

from accounting_erp import erp_router, init_erp_indexes, init_erp_db
app.include_router(erp_router)

from payroll_rh import payroll_rh_router, init_payroll_rh_indexes
app.include_router(payroll_rh_router)

from accounting_premium_endpoints import premium_router, init_db as init_premium_db
app.include_router(premium_router)

# ── PURGE ALL TEST DATA ──


class PurgeRequest(BaseModel):
    confirm: str = Field(..., description="Must be 'SUPPRIMER' to confirm")
    collections: Optional[List[str]] = Field(None, description="Specific collections to purge, or null for all")

# (Purge endpoints moved before include_router)


@app.on_event("startup")
async def startup_db_indexes():
    """Create MongoDB indexes for performance."""
    # ── INDEX MONGODB COMPLETS ──
    # Leads
    await db.leads.create_index("lead_id", unique=True)
    await db.leads.create_index("status")
    await db.leads.create_index("created_at")
    await db.leads.create_index("email")
    await db.leads.create_index([("status", 1), ("created_at", -1)])
    await db.leads.create_index([("name", "text"), ("email", "text"), ("address", "text")])

    # Interventions
    await db.interventions.create_index("intervention_id", unique=True)
    await db.interventions.create_index("status")
    await db.interventions.create_index("scheduled_date")
    await db.interventions.create_index("assigned_agent_id")
    await db.interventions.create_index([("scheduled_date", 1), ("status", 1)])

    # Factures
    await db.invoices.create_index([("status", 1), ("created_at", -1)])
    await db.invoices.create_index("lead_id")

    # Devis
    await db.quotes.create_index("quote_id", unique=True)
    await db.quotes.create_index([("status", 1), ("created_at", -1)])

    # Emails
    await db.emails.create_index("lead_id")
    await db.emails.create_index("created_at")

    # Sessions
    await db.sessions.create_index("token", unique=True)
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)

    # Notifications
    await db.notifications.create_index([("read", 1), ("created_at", -1)])

    # Intervenants
    await db.intervenant_sessions.create_index("token", unique=True)
    await db.intervenant_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.intervenant_codes.create_index("expires_at", expireAfterSeconds=0)

    # Payroll
    await db.payslips.create_index("payslip_id", unique=True)
    await db.payslips.create_index("employee_name")
    await db.payslips.create_index([("period_year", -1), ("period_month", -1)])
    await db.payslips.create_index("status")
    await db.payslips.create_index("created_at")

    logger.info("MongoDB indexes created successfully")
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
    # Audit log indexes
    await db.audit_log.create_index("audit_id", unique=True)
    await db.audit_log.create_index("entity_type")
    await db.audit_log.create_index("entity_id")
    await db.audit_log.create_index("user_id")
    await db.audit_log.create_index("timestamp")
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("token_hash", unique=True, sparse=True)
    await db.email_verifications.create_index("email")
    await db.email_verifications.create_index("expires_at", expireAfterSeconds=900)  # Auto-cleanup after 15 min
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
    init_intervenant_db(db)
    init_erp_db(db)
    init_invoices_db(db)
    await init_erp_indexes()
    await init_payroll_rh_indexes()
    init_settings_db(db)
    try:
        from portal import init_portal_db
        init_portal_db(db)
    except Exception as e:
        logger.warning(f"Portal init: {e}")
    init_analytics_db(db)
    init_ads_connect_db(db)
    try:
        init_erp_db(db)
        init_invoices_db(db)
        init_accounting_db(db)
        init_premium_db(db)
        logger.info("✅ ERP DB initialized")
    except Exception as e:
        logger.warning(f"ERP DB init: {e}")
    init_ai_assistant_db(db)

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

    # Booking Widget (Phase 9)
    await db.bookings.create_index("booking_id", unique=True)
    await db.bookings.create_index("email")
    await db.bookings.create_index("status")
    await db.bookings.create_index("preferred_date")
    await db.bookings.create_index("created_at")

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
                pass  # check_followups_auto deprecated

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
    # Geo / SMS / Documents indexes
    await db.geocache.create_index("address", unique=True)
    await db.sms_log.create_index("sent_at")
    await db.sms_log.create_index([("to", 1), ("type", 1)])
    await db.sms_templates.create_index("id", unique=True)
    await db.documents.create_index("id", unique=True)
    await db.documents.create_index([("entity_type", 1), ("entity_id", 1)])
    await db.documents.create_index("deleted")
    # ── Module PREMIUM: Stock + Comptabilité ──
    await db.stock_items.create_index("item_id", unique=True)
    await db.stock_items.create_index("sku", unique=True)
    await db.stock_items.create_index("category")
    await db.stock_items.create_index("name")
    await db.stock_movements.create_index("movement_id", unique=True)
    await db.stock_movements.create_index("item_id")
    await db.stock_movements.create_index("created_at")
    await db.accounting_entries.create_index("entry_id", unique=True)
    await db.accounting_entries.create_index("entry_type")
    await db.accounting_entries.create_index("entry_date")
    await db.accounting_entries.create_index("reference_id")
    await db.accounting_entries.create_index("category")
    # _id is already unique by default, no need to create index
    logger.info("MongoDB indexes created successfully")

    # Enterprise accounting indexes
    try:
        init_enterprise_db(db)
        await create_enterprise_indexes()
    except Exception as e:
        logger.error(f"Enterprise indexes error: {e}")


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

# ── DEVIS PAR COMMANDE VOCALE ──


@app.post("/api/voice-quote/analyze")
async def analyze_voice_quote(request: Request):
    """Analyser un transcript vocal et générer les données du devis via IA."""
    user = await require_auth(request)
    body = await request.json()
    transcript = sanitize_string(body.get("transcript", ""), 1000)
    lead_id = body.get("lead_id")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript vide")

    # Tarifs de référence Global Clean Home
    TARIFS = {
        "Ménage domicile": {"prix_m2": 3.5, "min": 89},
        "Nettoyage canapé": {"prix_m2": None, "min": 79},
        "Nettoyage matelas": {"prix_m2": None, "min": 69},
        "Nettoyage bureaux": {"prix_m2": 4.0, "min": 150},
        "Nettoyage tapis": {"prix_m2": 8.0, "min": 49},
        "Nettoyage vitres": {"prix_m2": 5.0, "min": 59},
        "Grand nettoyage": {"prix_m2": 5.0, "min": 199},
    }

    # Essayer Claude API
    import httpx
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if anthropic_key:
        try:
            prompt = f"""Tu es un assistant pour Global Clean Home, entreprise de nettoyage à Paris.
Analyse ce transcript vocal et extrait les informations pour créer un devis.

Transcript: "{transcript}"

Services disponibles et tarifs:
{chr(10).join([f"- {k}: min {v['min']}€" + (f", {v['prix_m2']}€/m²" if v['prix_m2'] else "") for k, v in TARIFS.items()])}

Réponds UNIQUEMENT en JSON valide avec ces champs:
{{
  "service_type": "nom exact du service parmi la liste",
  "surface": null ou nombre en m²,
  "amount": montant TTC calculé,
  "client_name": "nom du client ou null",
  "address": "adresse complète ou null",
  "details": "description détaillée du service",
  "confidence": 0.0 à 1.0,
  "notes": "informations supplémentaires"
}}

Règles de calcul:
- Si surface mentionnée: montant = max(min, surface * prix_m2)
- Si prix mentionné: utiliser ce prix
- Sinon: utiliser le minimum
- Toujours arrondir au nombre entier"""

            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 500,
                        "messages": [{"role": "user", "content": prompt}]
                    },
                    timeout=15
                )
                if res.status_code == 200:
                    text = res.json()["content"][0]["text"]
                    import json, re
                    json_match = re.search(r'\{.*\}', text, re.DOTALL)
                    if json_match:
                        data = json.loads(json_match.group())
                        data["lead_id"] = lead_id
                        return data
        except Exception as e:
            logger.warning(f"Claude API error in voice-quote: {e}")

    # Fallback: analyse locale Python
    import re as re_module
    lower = transcript.lower()
    service = "Ménage domicile"
    amount = 89
    surface = None

    if "canapé" in lower or "canape" in lower: service, amount = "Nettoyage canapé", 79
    elif "matelas" in lower: service, amount = "Nettoyage matelas", 69
    elif "bureau" in lower: service, amount = "Nettoyage bureaux", 150
    elif "tapis" in lower: service, amount = "Nettoyage tapis", 49
    elif "vitre" in lower or "fenêtre" in lower: service, amount = "Nettoyage vitres", 59
    elif "grand" in lower and "nettoyage" in lower: service, amount = "Grand nettoyage", 199

    m2_match = re_module.search(r"(\d+)\s*m²", transcript)
    if m2_match:
        surface = float(m2_match.group(1))
        tarif = TARIFS.get(service, {})
        if tarif.get("prix_m2"):
            amount = max(tarif["min"], round(surface * tarif["prix_m2"]))

    prix_match = re_module.search(r"(\d+)\s*euros?", transcript, re_module.IGNORECASE)
    if prix_match: amount = float(prix_match.group(1))

    nom_match = re_module.search(r"(?:M\.|Mme|Madame|Monsieur|pour)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)?)", transcript)
    client_name = nom_match.group(1) if nom_match else None

    addr_match = re_module.search(r"(?:à|rue|avenue|bd|boulevard)\s+[^,\.]+", transcript, re_module.IGNORECASE)
    address = addr_match.group(0) if addr_match else None

    return {
        "service_type": service,
        "surface": surface,
        "amount": amount,
        "client_name": client_name,
        "address": address,
        "details": transcript,
        "confidence": 0.7,
        "notes": "",
        "lead_id": lead_id,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
