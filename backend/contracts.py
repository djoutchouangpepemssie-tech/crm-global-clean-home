"""
Global Clean Home CRM - Recurring Contracts Module (Phase 3)
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime, timezone, date, timedelta
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

contracts_router = APIRouter(prefix="/api")

# ── French public holidays 2026 ──
FRENCH_HOLIDAYS_2026 = {
    date(2026, 1, 1),   # Jour de l'An
    date(2026, 4, 6),   # Lundi de Pâques
    date(2026, 5, 1),   # Fête du Travail
    date(2026, 5, 8),   # Victoire 1945
    date(2026, 5, 14),  # Ascension
    date(2026, 5, 25),  # Lundi de Pentecôte
    date(2026, 7, 14),  # Fête Nationale
    date(2026, 8, 15),  # Assomption
    date(2026, 11, 1),  # Toussaint
    date(2026, 11, 11), # Armistice
    date(2026, 12, 25), # Noël
}

# ── Models ──

class ContractCreate(BaseModel):
    client_lead_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_type: str
    frequency: str  # weekly|biweekly|monthly|quarterly
    day_of_week: Optional[int] = None   # 0=Monday..6=Sunday
    day_of_month: Optional[int] = None  # 1-28
    preferred_time: Optional[str] = "09:00"
    duration_hours: Optional[float] = 2.0
    address: Optional[str] = None
    price_per_intervention: Optional[float] = 0.0
    start_date: str  # ISO date
    end_date: Optional[str] = None
    auto_renew: Optional[bool] = False
    notice_days: Optional[int] = 30
    assigned_intervenant_id: Optional[str] = None
    notes: Optional[str] = ""

class ContractUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_type: Optional[str] = None
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    preferred_time: Optional[str] = None
    duration_hours: Optional[float] = None
    address: Optional[str] = None
    price_per_intervention: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_renew: Optional[bool] = None
    notice_days: Optional[int] = None
    assigned_intervenant_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class CancelRequest(BaseModel):
    reason: Optional[str] = ""

class GenerateInterventionsRequest(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None  # 1-12; defaults to next month

# ── Helpers ──

def _next_occurrences_in_month(contract: dict, year: int, month: int) -> List[date]:
    """Return all dates for a contract's occurrences within the given month."""
    freq = contract.get("frequency", "monthly")
    occurrences = []

    # First and last day of target month
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)

    contract_start = date.fromisoformat(contract["start_date"])
    contract_end = date.fromisoformat(contract["end_date"]) if contract.get("end_date") else None

    if freq in ("weekly", "biweekly"):
        dow = contract.get("day_of_week", 0)  # 0=Monday
        step = 7 if freq == "weekly" else 14
        # Find first occurrence >= first_day
        current = first_day
        # Move to correct weekday
        days_ahead = (dow - current.weekday()) % 7
        current = current + timedelta(days=days_ahead)
        while current <= last_day:
            if current >= contract_start:
                if contract_end is None or current <= contract_end:
                    occurrences.append(current)
            current += timedelta(days=step)

    elif freq == "monthly":
        dom = contract.get("day_of_month", 1)
        dom = min(dom, 28)
        try:
            d = date(year, month, dom)
        except ValueError:
            d = date(year, month, 28)
        if first_day <= d <= last_day and d >= contract_start:
            if contract_end is None or d <= contract_end:
                occurrences.append(d)

    elif freq == "quarterly":
        # Every 3 months from start date
        dom = contract.get("day_of_month") or contract_start.day
        dom = min(dom, 28)
        # Check if this month is in the quarterly cycle
        months_since_start = (year - contract_start.year) * 12 + (month - contract_start.month)
        if months_since_start >= 0 and months_since_start % 3 == 0:
            try:
                d = date(year, month, dom)
            except ValueError:
                d = date(year, month, 28)
            if first_day <= d <= last_day and d >= contract_start:
                if contract_end is None or d <= contract_end:
                    occurrences.append(d)

    # Filter holidays
    return [d for d in occurrences if d not in FRENCH_HOLIDAYS_2026]


# ── Routes ──

@contracts_router.post("/contracts", status_code=201)
async def create_contract(data: ContractCreate):
    """Create a new recurring service contract."""
    now = datetime.now(timezone.utc).isoformat()
    contract = {
        "contract_id": str(uuid.uuid4()),
        **data.model_dump(),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await _db.contracts.insert_one(contract)
    contract.pop("_id", None)
    return contract


@contracts_router.get("/contracts")
async def list_contracts(
    status: Optional[str] = None,
    client: Optional[str] = None,
    service_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """List contracts with optional filters and pagination."""
    query: dict = {}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if client:
        query["$or"] = [
            {"client_name": {"$regex": client, "$options": "i"}},
            {"client_email": {"$regex": client, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await _db.contracts.count_documents(query)
    cursor = _db.contracts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"total": total, "page": page, "limit": limit, "items": items}


@contracts_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str):
    """Get contract detail with intervention history."""
    contract = await _db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat introuvable")

    # Attach linked interventions
    interventions = await _db.interventions.find(
        {"contract_id": contract_id}, {"_id": 0}
    ).sort("scheduled_date", -1).to_list(length=200)
    contract["interventions"] = interventions
    return contract


@contracts_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, data: ContractUpdate):
    """Update a contract."""
    contract = await _db.contracts.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat introuvable")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.contracts.update_one({"contract_id": contract_id}, {"$set": updates})
    updated = await _db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    return updated


@contracts_router.post("/contracts/{contract_id}/pause")
async def pause_contract(contract_id: str):
    """Pause an active contract."""
    contract = await _db.contracts.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat introuvable")
    if contract["status"] != "active":
        raise HTTPException(status_code=400, detail="Seul un contrat actif peut être mis en pause")

    now = datetime.now(timezone.utc).isoformat()
    await _db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {"status": "paused", "updated_at": now}}
    )
    return {"contract_id": contract_id, "status": "paused", "updated_at": now}


@contracts_router.post("/contracts/{contract_id}/resume")
async def resume_contract(contract_id: str):
    """Resume a paused contract."""
    contract = await _db.contracts.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat introuvable")
    if contract["status"] != "paused":
        raise HTTPException(status_code=400, detail="Seul un contrat en pause peut être repris")

    now = datetime.now(timezone.utc).isoformat()
    await _db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {"status": "active", "updated_at": now}}
    )
    return {"contract_id": contract_id, "status": "active", "updated_at": now}


@contracts_router.post("/contracts/{contract_id}/cancel")
async def cancel_contract(contract_id: str, body: CancelRequest):
    """Cancel a contract with an optional reason."""
    contract = await _db.contracts.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat introuvable")
    if contract["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Contrat déjà annulé")

    now = datetime.now(timezone.utc).isoformat()
    await _db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {"status": "cancelled", "cancel_reason": body.reason, "updated_at": now}}
    )
    return {"contract_id": contract_id, "status": "cancelled", "reason": body.reason, "updated_at": now}


@contracts_router.post("/contracts/generate-interventions")
async def generate_interventions(body: GenerateInterventionsRequest):
    """
    Generate next month's interventions from all active contracts.
    Skips French public holidays. Auto-assigns the contract's intervenant.
    """
    now_dt = datetime.now(timezone.utc)
    if body.year and body.month:
        target_year = body.year
        target_month = body.month
    else:
        # Default: next month
        if now_dt.month == 12:
            target_year = now_dt.year + 1
            target_month = 1
        else:
            target_year = now_dt.year
            target_month = now_dt.month + 1

    active_contracts = await _db.contracts.find({"status": "active"}, {"_id": 0}).to_list(length=1000)

    created_count = 0
    created_ids = []

    for contract in active_contracts:
        occurrences = _next_occurrences_in_month(contract, target_year, target_month)
        for occ_date in occurrences:
            # Check if intervention already exists for this contract + date
            existing = await _db.interventions.find_one({
                "contract_id": contract["contract_id"],
                "scheduled_date": occ_date.isoformat(),
            })
            if existing:
                continue

            intervention_id = str(uuid.uuid4())
            now_iso = datetime.now(timezone.utc).isoformat()
            intervention = {
                "intervention_id": intervention_id,
                "contract_id": contract["contract_id"],
                "lead_id": contract.get("client_lead_id"),
                "title": f"{contract['service_type']} - {contract['client_name']}",
                "description": f"Intervention récurrente ({contract['frequency']})",
                "service_type": contract.get("service_type"),
                "address": contract.get("address"),
                "client_name": contract.get("client_name"),
                "client_email": contract.get("client_email"),
                "client_phone": contract.get("client_phone"),
                "scheduled_date": occ_date.isoformat(),
                "scheduled_time": contract.get("preferred_time", "09:00"),
                "duration_hours": contract.get("duration_hours", 2.0),
                "assigned_intervenant_id": contract.get("assigned_intervenant_id"),
                "price": contract.get("price_per_intervention", 0.0),
                "status": "planned",
                "auto_generated": True,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            await _db.interventions.insert_one(intervention)
            created_count += 1
            created_ids.append(intervention_id)

    return {
        "generated_for": f"{target_year}-{target_month:02d}",
        "created": created_count,
        "intervention_ids": created_ids,
    }
