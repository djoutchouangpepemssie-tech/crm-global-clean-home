"""
Global Clean Home CRM - Online Booking Widget API (Phase 9)
Public-facing booking endpoints, no authentication required.
Rate-limited: 5 booking requests per IP per hour.
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from collections import defaultdict
import os
import uuid
import re
import html
import time
import logging
from datetime import datetime, timezone, timedelta, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]

booking_router = APIRouter(prefix="/api/booking", tags=["booking"])

# ─────────────────────────────────────────────
# RATE LIMITER — 5 booking requests / IP / hour
# ─────────────────────────────────────────────
_booking_rate_store: Dict[str, List[float]] = defaultdict(list)
BOOKING_RATE_LIMIT = 5
BOOKING_RATE_WINDOW = 3600  # 1 hour in seconds


def _check_booking_rate_limit(client_ip: str) -> None:
    now = time.time()
    _booking_rate_store[client_ip] = [
        t for t in _booking_rate_store[client_ip] if now - t < BOOKING_RATE_WINDOW
    ]
    if len(_booking_rate_store[client_ip]) >= BOOKING_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Trop de demandes. Maximum 5 réservations par heure depuis cette adresse IP."
        )
    _booking_rate_store[client_ip].append(now)


# ─────────────────────────────────────────────
# SERVICE CATALOG
# ─────────────────────────────────────────────
SERVICES = [
    {
        "service_id": "menage_domicile",
        "name": "Ménage à domicile",
        "unit": "heure",
        "unit_label": "h",
        "price_per_unit": 25.0,
        "currency": "EUR",
        "min_quantity": 2,
        "max_quantity": 8,
        "description": "Nettoyage complet de votre domicile par nos professionnels.",
        "available_options": ["repassage", "produits_bio", "urgence_48h"],
    },
    {
        "service_id": "canape",
        "name": "Nettoyage Canapé",
        "unit": "place",
        "unit_label": "place(s)",
        "price_per_unit": 59.0,
        "currency": "EUR",
        "min_quantity": 1,
        "max_quantity": 6,
        "description": "Nettoyage en profondeur de votre canapé.",
        "available_options": ["anti_acarien", "impermeabilisant", "desodorisant", "urgence_48h"],
    },
    {
        "service_id": "matelas",
        "name": "Nettoyage Matelas",
        "unit": "pièce",
        "unit_label": "pièce(s)",
        "price_per_unit": 49.0,
        "currency": "EUR",
        "min_quantity": 1,
        "max_quantity": 5,
        "description": "Nettoyage et assainissement de vos matelas.",
        "available_options": ["anti_acarien", "desodorisant", "urgence_48h"],
    },
    {
        "service_id": "tapis",
        "name": "Nettoyage Tapis",
        "unit": "m²",
        "unit_label": "m²",
        "price_per_unit": 8.0,
        "currency": "EUR",
        "min_quantity": 2,
        "max_quantity": 100,
        "description": "Nettoyage extraction pour tous types de tapis.",
        "available_options": ["anti_acarien", "impermeabilisant", "desodorisant", "urgence_48h"],
    },
    {
        "service_id": "bureaux",
        "name": "Nettoyage Bureaux",
        "unit": "m²",
        "unit_label": "m²",
        "price_per_unit": 15.0,
        "currency": "EUR",
        "min_quantity": 20,
        "max_quantity": 500,
        "description": "Entretien professionnel de vos locaux professionnels.",
        "available_options": ["produits_bio", "urgence_48h"],
    },
    {
        "service_id": "vitres",
        "name": "Nettoyage Vitres",
        "unit": "m²",
        "unit_label": "m²",
        "price_per_unit": 5.0,
        "currency": "EUR",
        "min_quantity": 5,
        "max_quantity": 100,
        "description": "Lavage de vitres intérieur et extérieur.",
        "available_options": ["urgence_48h"],
    },
    {
        "service_id": "fin_bail",
        "name": "Ménage fin de bail",
        "unit": "m²",
        "unit_label": "m²",
        "price_per_unit": 20.0,
        "currency": "EUR",
        "min_quantity": 20,
        "max_quantity": 200,
        "description": "Nettoyage complet pour restitution de logement.",
        "available_options": ["produits_bio", "urgence_48h"],
    },
]

SERVICES_BY_ID = {s["service_id"]: s for s in SERVICES}

# ─────────────────────────────────────────────
# OPTIONS PRICING
# ─────────────────────────────────────────────
OPTIONS_PRICING = {
    "anti_acarien":     {"label": "Traitement anti-acariens",  "price": 15.0, "unit": "forfait"},
    "impermeabilisant": {"label": "Imperméabilisant",           "price": 20.0, "unit": "forfait"},
    "desodorisant":     {"label": "Désodorisant",               "price": 10.0, "unit": "forfait"},
    "repassage":        {"label": "Repassage",                  "price": 8.0,  "unit": "par heure"},
    "produits_bio":     {"label": "Produits bio / éco-labels",  "price": 5.0,  "unit": "forfait"},
    "urgence_48h":      {"label": "Intervention urgence 48h",   "price": 30.0, "unit": "forfait"},
}

# ─────────────────────────────────────────────
# BUSINESS CONFIG
# ─────────────────────────────────────────────
BUSINESS_CONFIG = {
    "hours": {
        "open": "08:00",
        "close": "18:00",
        "days": ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    },
    "service_areas": [
        "Paris", "Boulogne-Billancourt", "Levallois-Perret", "Neuilly-sur-Seine",
        "Issy-les-Moulineaux", "Vincennes", "Saint-Mandé", "Charenton-le-Pont",
        "Île-de-France (sur devis)",
    ],
    "min_notice_hours": 24,
    "slot_duration_hours": 2,
    "currency": "EUR",
    "contact_email": "contact@globalcleanhome.fr",
    "contact_phone": "+33 1 XX XX XX XX",
}

# Time slots: 08:00 – 18:00, every 2h → ["08:00","10:00","12:00","14:00","16:00"]
ALL_SLOTS = [f"{h:02d}:00" for h in range(8, 18, 2)]

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _sanitize(value: str, max_length: int = 500) -> str:
    if not value:
        return value
    value = html.escape(str(value).strip())
    value = re.sub(r"<script[^>]*>.*?</script>", "", value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r"<(iframe|object|embed|form)[^>]*>.*?</\1>", "", value, flags=re.IGNORECASE | re.DOTALL)
    return value[:max_length]


def _sanitize_phone(phone: str) -> str:
    return re.sub(r"[^0-9+\-\s\(\)]", "", phone)[:20]


def _sanitize_email(email: str) -> str:
    email = email.lower().strip()[:254]
    if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", email):
        raise HTTPException(status_code=400, detail="Format email invalide.")
    return email


# ─────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────
class EstimateRequest(BaseModel):
    service_id: str
    quantity: float
    options: Optional[List[str]] = []

    @field_validator("service_id")
    @classmethod
    def validate_service_id(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in SERVICES_BY_ID:
            raise ValueError(f"Service inconnu: {v}")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La quantité doit être > 0")
        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str]) -> List[str]:
        invalid = [o for o in v if o not in OPTIONS_PRICING]
        if invalid:
            raise ValueError(f"Options inconnues: {invalid}")
        return v


class BookingRequest(BaseModel):
    client_name: str
    email: str
    phone: str
    service_id: str
    quantity: float
    options: Optional[List[str]] = []
    preferred_date: str   # YYYY-MM-DD
    preferred_time: str   # HH:MM
    address: str
    message: Optional[str] = ""

    @field_validator("service_id")
    @classmethod
    def validate_service_id(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in SERVICES_BY_ID:
            raise ValueError(f"Service inconnu: {v}")
        return v

    @field_validator("preferred_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Format de date invalide (attendu YYYY-MM-DD)")
        return v

    @field_validator("preferred_time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("Format d'heure invalide (attendu HH:MM)")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La quantité doit être > 0")
        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str]) -> List[str]:
        invalid = [o for o in v if o not in OPTIONS_PRICING]
        if invalid:
            raise ValueError(f"Options inconnues: {invalid}")
        return v


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@booking_router.get("/services")
async def list_services():
    """
    GET /api/booking/services
    Returns the full public service catalog with pricing.
    """
    return {
        "services": SERVICES,
        "options": OPTIONS_PRICING,
        "currency": "EUR",
    }


@booking_router.post("/estimate")
async def get_estimate(body: EstimateRequest):
    """
    POST /api/booking/estimate
    Returns instant price estimate for a service + options combination.
    """
    service = SERVICES_BY_ID[body.service_id]

    # Validate quantity bounds
    if body.quantity < service["min_quantity"] or body.quantity > service["max_quantity"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Quantité hors limites pour ce service. "
                f"Min: {service['min_quantity']} {service['unit_label']}, "
                f"Max: {service['max_quantity']} {service['unit_label']}."
            ),
        )

    # Validate options are allowed for this service
    allowed = service.get("available_options", [])
    forbidden = [o for o in body.options if o not in allowed]
    if forbidden:
        raise HTTPException(
            status_code=400,
            detail=f"Option(s) non disponible(s) pour ce service: {forbidden}. "
                   f"Options disponibles: {allowed}",
        )

    base_price = round(service["price_per_unit"] * body.quantity, 2)
    options_price = round(sum(OPTIONS_PRICING[o]["price"] for o in body.options), 2)
    total_estimate = round(base_price + options_price, 2)

    return {
        "service_id": body.service_id,
        "service_name": service["name"],
        "quantity": body.quantity,
        "unit": service["unit_label"],
        "base_price": base_price,
        "options": [
            {
                "option_id": o,
                "label": OPTIONS_PRICING[o]["label"],
                "price": OPTIONS_PRICING[o]["price"],
            }
            for o in body.options
        ],
        "options_price": options_price,
        "total_estimate": total_estimate,
        "currency": "EUR",
    }


@booking_router.get("/availability")
async def get_availability(
    date: str = Query(..., description="Date au format YYYY-MM-DD"),
    service_id: Optional[str] = Query(None, description="ID du service"),
):
    """
    GET /api/booking/availability?date=YYYY-MM-DD&service_id=xxx
    Returns available 2-hour time slots (08:00–18:00) for the given date.
    Checks existing interventions in DB to mark slots as unavailable.
    """
    # Validate date format
    try:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (attendu YYYY-MM-DD)")

    # Validate service_id if provided
    if service_id and service_id not in SERVICES_BY_ID:
        raise HTTPException(status_code=400, detail=f"Service inconnu: {service_id}")

    # Minimum notice: 24h
    now = datetime.now(timezone.utc)
    min_date = (now + timedelta(hours=BUSINESS_CONFIG["min_notice_hours"])).date()
    if query_date < min_date:
        # All slots unavailable for past/too-soon dates
        slots = [
            {
                "time": slot,
                "available": False,
                "reason": "Délai minimum de 24h requis",
            }
            for slot in ALL_SLOTS
        ]
        return {"date": date, "service_id": service_id, "slots": slots}

    # Sunday → closed
    if query_date.weekday() == 6:
        slots = [
            {"time": slot, "available": False, "reason": "Fermé le dimanche"}
            for slot in ALL_SLOTS
        ]
        return {"date": date, "service_id": service_id, "slots": slots}

    # Fetch interventions scheduled on this date
    day_start = datetime.combine(query_date, datetime.min.time()).isoformat()
    day_end = datetime.combine(query_date, datetime.max.time()).isoformat()

    booked_query: Dict[str, Any] = {
        "scheduled_date": {"$gte": day_start[:10], "$lte": day_end[:10]},
        "status": {"$nin": ["annulé", "cancelled"]},
    }
    if service_id:
        booked_query["service_type"] = service_id

    interventions = await _db.interventions.find(
        booked_query, {"_id": 0, "scheduled_time": 1, "duration_hours": 1}
    ).to_list(100)

    # Build set of occupied start hours
    occupied_starts: set = set()
    for intv in interventions:
        start_time = intv.get("scheduled_time", "09:00")
        try:
            h, m = map(int, start_time.split(":"))
            duration = float(intv.get("duration_hours", 2.0))
            # Mark all 2h slots that overlap
            for slot in ALL_SLOTS:
                sh, sm = map(int, slot.split(":"))
                slot_start = sh * 60 + sm
                slot_end = slot_start + 120  # 2h slots
                intv_start = h * 60 + m
                intv_end = intv_start + int(duration * 60)
                # Overlap check
                if not (slot_end <= intv_start or slot_start >= intv_end):
                    occupied_starts.add(slot)
        except Exception:
            continue

    slots = [
        {
            "time": slot,
            "available": slot not in occupied_starts,
            "reason": "Créneau déjà réservé" if slot in occupied_starts else None,
        }
        for slot in ALL_SLOTS
    ]

    return {
        "date": date,
        "service_id": service_id,
        "slots": slots,
        "timezone": "Europe/Paris",
    }


@booking_router.post("/request")
async def submit_booking(body: BookingRequest, request: Request):
    """
    POST /api/booking/request
    Submit a booking request. Rate-limited to 5 requests per IP per hour.
    Auto-creates a Lead (source="Booking Widget") and a pending Intervention.
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_booking_rate_limit(client_ip)

    # Sanitize all text inputs
    client_name = _sanitize(body.client_name, 150)
    email = _sanitize_email(body.email)
    phone = _sanitize_phone(body.phone)
    address = _sanitize(body.address, 300)
    message = _sanitize(body.message or "", 1000)

    service = SERVICES_BY_ID[body.service_id]

    # Validate quantity bounds
    if body.quantity < service["min_quantity"] or body.quantity > service["max_quantity"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Quantité hors limites. "
                f"Min: {service['min_quantity']}, Max: {service['max_quantity']} {service['unit_label']}."
            ),
        )

    # Validate options
    allowed = service.get("available_options", [])
    forbidden = [o for o in body.options if o not in allowed]
    if forbidden:
        raise HTTPException(
            status_code=400,
            detail=f"Option(s) non disponible(s) pour ce service: {forbidden}",
        )

    # Validate date is in the future (min notice 24h)
    try:
        preferred_date = datetime.strptime(body.preferred_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")

    now = datetime.now(timezone.utc)
    min_date = (now + timedelta(hours=BUSINESS_CONFIG["min_notice_hours"])).date()
    if preferred_date < min_date:
        raise HTTPException(
            status_code=400,
            detail=f"La date doit être au moins 24h à l'avance (à partir du {min_date.isoformat()})."
        )

    # Compute price estimate
    base_price = round(service["price_per_unit"] * body.quantity, 2)
    options_price = round(sum(OPTIONS_PRICING[o]["price"] for o in body.options), 2)
    total_estimate = round(base_price + options_price, 2)

    # IDs
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    intervention_id = f"intv_{uuid.uuid4().hex[:12]}"
    now_iso = now.isoformat()

    # ── Create Lead ──
    lead_doc = {
        "lead_id": lead_id,
        "name": client_name,
        "email": email,
        "phone": phone,
        "service_type": service["name"],
        "address": address,
        "message": message,
        "source": "Booking Widget",
        "status": "nouveau",
        "probability": 70,
        "score": 70,
        "tags": ["booking-widget"],
        "estimated_price": total_estimate,
        "service_details": {
            "service_id": body.service_id,
            "quantity": body.quantity,
            "unit": service["unit_label"],
            "options": body.options,
            "base_price": base_price,
            "options_price": options_price,
        },
        "date_preference": body.preferred_date,
        "created_at": now_iso,
        "updated_at": now_iso,
        "booking_id": booking_id,
    }

    # ── Create Intervention ──
    intervention_doc = {
        "intervention_id": intervention_id,
        "lead_id": lead_id,
        "booking_id": booking_id,
        "title": f"{service['name']} — {client_name}",
        "description": message,
        "service_type": service["name"],
        "service_id": body.service_id,
        "address": address,
        "scheduled_date": body.preferred_date,
        "scheduled_time": body.preferred_time,
        "duration_hours": max(2.0, body.quantity if service["unit"] == "heure" else 2.0),
        "status": "en_attente",
        "quantity": body.quantity,
        "options": body.options,
        "estimated_price": total_estimate,
        "client_name": client_name,
        "client_email": email,
        "client_phone": phone,
        "source": "Booking Widget",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    # ── Booking record (for status tracking) ──
    booking_doc = {
        "booking_id": booking_id,
        "lead_id": lead_id,
        "intervention_id": intervention_id,
        "status": "pending",
        "service_id": body.service_id,
        "service_name": service["name"],
        "client_name": client_name,
        "email": email,
        "phone": phone,
        "address": address,
        "quantity": body.quantity,
        "options": body.options,
        "preferred_date": body.preferred_date,
        "preferred_time": body.preferred_time,
        "estimated_price": total_estimate,
        "message": message,
        "ip_address": client_ip,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    # Insert to DB
    try:
        await _db.leads.insert_one(lead_doc)
        await _db.interventions.insert_one(intervention_doc)
        await _db.bookings.insert_one(booking_doc)
    except Exception as e:
        logger.error(f"Booking insert error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la création de la réservation.")

    logger.info(f"New booking: {booking_id} | service={body.service_id} | date={body.preferred_date} | ip={client_ip}")

    return {
        "booking_id": booking_id,
        "status": "pending",
        "message": (
            f"Votre demande de réservation a bien été enregistrée. "
            f"Notre équipe vous contactera dans les plus brefs délais pour confirmer le créneau du "
            f"{body.preferred_date} à {body.preferred_time}."
        ),
        "lead_id": lead_id,
        "intervention_id": intervention_id,
        "estimated_price": total_estimate,
        "currency": "EUR",
        "service": service["name"],
        "preferred_date": body.preferred_date,
        "preferred_time": body.preferred_time,
    }


@booking_router.get("/request/{booking_id}/status")
async def get_booking_status(booking_id: str):
    """
    GET /api/booking/request/{booking_id}/status
    Public endpoint to track the status of a booking request.
    """
    # Basic sanitization
    if not re.match(r"^booking_[a-f0-9]{12}$", booking_id):
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    booking = await _db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    # Fetch intervention status if it exists
    intervention_status = None
    if booking.get("intervention_id"):
        intv = await _db.interventions.find_one(
            {"intervention_id": booking["intervention_id"]},
            {"_id": 0, "status": 1, "scheduled_date": 1, "scheduled_time": 1},
        )
        if intv:
            intervention_status = intv.get("status")

    status_labels = {
        "pending":   "En attente de confirmation",
        "confirmed": "Confirmée",
        "scheduled": "Planifiée",
        "completed": "Terminée",
        "cancelled": "Annulée",
    }

    return {
        "booking_id": booking_id,
        "status": booking.get("status", "pending"),
        "status_label": status_labels.get(booking.get("status", "pending"), "En attente"),
        "service_name": booking.get("service_name"),
        "preferred_date": booking.get("preferred_date"),
        "preferred_time": booking.get("preferred_time"),
        "estimated_price": booking.get("estimated_price"),
        "currency": "EUR",
        "intervention_status": intervention_status,
        "created_at": booking.get("created_at"),
        "updated_at": booking.get("updated_at"),
    }


@booking_router.get("/config")
async def get_booking_config():
    """
    GET /api/booking/config
    Returns business configuration: hours, service areas, min notice, etc.
    """
    return BUSINESS_CONFIG
