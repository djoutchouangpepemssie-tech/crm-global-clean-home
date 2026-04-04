"""
Global Clean Home CRM - NPS/CSAT Satisfaction Module (Phase 6)
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Any
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

satisfaction_router = APIRouter(prefix="/api/satisfaction")

# ── Models ──

class SurveyCreate(BaseModel):
    intervention_id: Optional[str] = None
    contract_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    type: str = "post_intervention"  # nps|csat|post_intervention
    score: Optional[float] = None    # 0-10 or None (pending)
    comment: Optional[str] = ""
    intervenant_id: Optional[str] = None
    google_review_requested: Optional[bool] = False
    google_review_left: Optional[bool] = False

class SurveyRespond(BaseModel):
    score: float          # 0-10
    comment: Optional[str] = ""
    google_review_left: Optional[bool] = False


# ── Routes ──

@satisfaction_router.post("/surveys", status_code=201)
async def create_survey(data: SurveyCreate):
    """Create a satisfaction survey (admin/system creates, client responds later)."""
    now = datetime.now(timezone.utc).isoformat()

    # Validate score range if provided
    if data.score is not None and not (0 <= data.score <= 10):
        raise HTTPException(status_code=400, detail="Le score doit être entre 0 et 10")

    survey = {
        "survey_id": str(uuid.uuid4()),
        **data.model_dump(),
        "status": "pending",
        "sent_at": now,
        "responded_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await _db.satisfaction_surveys.insert_one(survey)
    survey.pop("_id", None)
    return survey


@satisfaction_router.get("/surveys")
async def list_surveys(
    status: Optional[str] = None,
    type: Optional[str] = None,
    intervenant_id: Optional[str] = None,
    contract_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """List surveys with optional filters and pagination."""
    query: dict = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    if intervenant_id:
        query["intervenant_id"] = intervenant_id
    if contract_id:
        query["contract_id"] = contract_id

    skip = (page - 1) * limit
    total = await _db.satisfaction_surveys.count_documents(query)
    cursor = _db.satisfaction_surveys.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"total": total, "page": page, "limit": limit, "items": items}


@satisfaction_router.post("/surveys/{survey_id}/respond")
async def respond_to_survey(survey_id: str, data: SurveyRespond):
    """Public endpoint — client submits their NPS/CSAT response."""
    survey = await _db.satisfaction_surveys.find_one({"survey_id": survey_id})
    if not survey:
        raise HTTPException(status_code=404, detail="Enquête introuvable")
    if survey["status"] == "responded":
        raise HTTPException(status_code=400, detail="Cette enquête a déjà reçu une réponse")
    if survey["status"] == "expired":
        raise HTTPException(status_code=400, detail="Cette enquête a expiré")

    if not (0 <= data.score <= 10):
        raise HTTPException(status_code=400, detail="Le score doit être entre 0 et 10")

    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "score": data.score,
        "comment": data.comment,
        "status": "responded",
        "responded_at": now,
        "updated_at": now,
    }
    if data.google_review_left:
        updates["google_review_left"] = True

    await _db.satisfaction_surveys.update_one({"survey_id": survey_id}, {"$set": updates})
    updated = await _db.satisfaction_surveys.find_one({"survey_id": survey_id}, {"_id": 0})
    return updated


@satisfaction_router.get("/stats")
async def get_satisfaction_stats(
    days: int = Query(30, ge=1, le=365),
    intervenant_id: Optional[str] = None,
):
    """
    NPS score, average CSAT, per-intervenant breakdown, and trend over time.
    - NPS = % promoters (9-10) - % detractors (0-6)
    - CSAT = average score for responded surveys
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    query: dict = {"status": "responded", "responded_at": {"$gte": since}}
    if intervenant_id:
        query["intervenant_id"] = intervenant_id

    surveys = await _db.satisfaction_surveys.find(query, {"_id": 0}).to_list(length=5000)

    if not surveys:
        return {
            "period_days": days,
            "total_responses": 0,
            "nps_score": None,
            "avg_csat": None,
            "promoters": 0,
            "passives": 0,
            "detractors": 0,
            "per_intervenant": [],
            "trend": [],
        }

    scores = [s["score"] for s in surveys if s.get("score") is not None]
    promoters = sum(1 for s in scores if s >= 9)
    passives = sum(1 for s in scores if 7 <= s < 9)
    detractors = sum(1 for s in scores if s < 7)
    total = len(scores)

    nps_score = round(((promoters - detractors) / total) * 100, 1) if total > 0 else None
    avg_csat = round(sum(scores) / total, 2) if total > 0 else None

    # Per-intervenant breakdown
    intervenant_map: dict = {}
    for s in surveys:
        iid = s.get("intervenant_id") or "unknown"
        if iid not in intervenant_map:
            intervenant_map[iid] = {"intervenant_id": iid, "scores": [], "count": 0}
        if s.get("score") is not None:
            intervenant_map[iid]["scores"].append(s["score"])
            intervenant_map[iid]["count"] += 1

    per_intervenant = []
    for iid, v in intervenant_map.items():
        sc = v["scores"]
        pro = sum(1 for x in sc if x >= 9)
        det = sum(1 for x in sc if x < 7)
        n = len(sc)
        per_intervenant.append({
            "intervenant_id": iid,
            "count": n,
            "avg_score": round(sum(sc) / n, 2) if n > 0 else None,
            "nps": round(((pro - det) / n) * 100, 1) if n > 0 else None,
        })

    # Weekly trend
    trend_map: dict = {}
    for s in surveys:
        responded_at = s.get("responded_at", "")
        if responded_at:
            week = responded_at[:7]  # YYYY-MM
            if week not in trend_map:
                trend_map[week] = []
            if s.get("score") is not None:
                trend_map[week].append(s["score"])

    trend = [
        {
            "period": k,
            "count": len(v),
            "avg_score": round(sum(v) / len(v), 2) if v else None,
        }
        for k, v in sorted(trend_map.items())
    ]

    return {
        "period_days": days,
        "total_responses": total,
        "nps_score": nps_score,
        "avg_csat": avg_csat,
        "promoters": promoters,
        "passives": passives,
        "detractors": detractors,
        "per_intervenant": per_intervenant,
        "trend": trend,
    }


@satisfaction_router.post("/auto-send")
async def auto_send_surveys():
    """
    Auto-create 'post_intervention' surveys for all completed interventions
    that don't yet have one. Marks them as 'sent'.
    """
    # Find completed interventions without a survey
    completed = await _db.interventions.find(
        {"status": "completed"}, {"_id": 0}
    ).to_list(length=2000)

    created_count = 0
    skipped_count = 0

    for intervention in completed:
        iid = intervention.get("intervention_id")
        if not iid:
            continue

        existing = await _db.satisfaction_surveys.find_one({"intervention_id": iid})
        if existing:
            skipped_count += 1
            continue

        now = datetime.now(timezone.utc).isoformat()
        survey = {
            "survey_id": str(uuid.uuid4()),
            "intervention_id": iid,
            "contract_id": intervention.get("contract_id"),
            "client_name": intervention.get("client_name"),
            "client_email": intervention.get("client_email"),
            "client_phone": intervention.get("client_phone"),
            "type": "post_intervention",
            "score": None,
            "comment": "",
            "intervenant_id": intervention.get("assigned_intervenant_id"),
            "status": "sent",
            "sent_at": now,
            "responded_at": None,
            "google_review_requested": False,
            "google_review_left": False,
            "created_at": now,
            "updated_at": now,
        }
        await _db.satisfaction_surveys.insert_one(survey)
        created_count += 1

    return {
        "created": created_count,
        "skipped_existing": skipped_count,
        "total_completed_interventions": len(completed),
    }


@satisfaction_router.get("/google-review-stats")
async def google_review_stats():
    """Track Google review requests vs completions."""
    total_surveys = await _db.satisfaction_surveys.count_documents({})
    requested = await _db.satisfaction_surveys.count_documents({"google_review_requested": True})
    completed = await _db.satisfaction_surveys.count_documents({"google_review_left": True})

    conversion_rate = round((completed / requested) * 100, 1) if requested > 0 else 0.0

    # Breakdown by intervenant
    pipeline = [
        {"$match": {"google_review_requested": True}},
        {"$group": {
            "_id": "$intervenant_id",
            "requested": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$google_review_left", True]}, 1, 0]}},
        }},
        {"$project": {
            "intervenant_id": "$_id",
            "requested": 1,
            "completed": 1,
            "conversion_rate": {
                "$cond": [
                    {"$gt": ["$requested", 0]},
                    {"$multiply": [{"$divide": ["$completed", "$requested"]}, 100]},
                    0
                ]
            },
            "_id": 0,
        }},
    ]
    per_intervenant = await _db.satisfaction_surveys.aggregate(pipeline).to_list(length=200)

    return {
        "total_surveys": total_surveys,
        "google_review_requested": requested,
        "google_review_left": completed,
        "conversion_rate_pct": conversion_rate,
        "per_intervenant": per_intervenant,
    }
