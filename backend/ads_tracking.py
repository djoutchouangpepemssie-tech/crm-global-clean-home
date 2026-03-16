from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os

logger = logging.getLogger(__name__)
ads_router = APIRouter(prefix="/api/ads", tags=["ads"])

_db = None

def init_ads_db(database):
    global _db
    _db = database

# ============ MODELS ============

class AdCampaign(BaseModel):
    platform: str  # google_ads, facebook_ads, instagram
    campaign_name: str
    campaign_id: Optional[str] = None
    budget_daily: Optional[float] = None
    budget_total: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    objective: Optional[str] = None  # leads, traffic, conversions
    status: str = "active"

class AdSpend(BaseModel):
    platform: str
    campaign_name: str
    campaign_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    spend: float
    impressions: Optional[int] = 0
    clicks: Optional[int] = 0
    conversions: Optional[int] = 0

# ============ HELPERS ============

async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)

def _calc_metrics(spend: float, leads: int, conversions: int, revenue: float):
    cpl = round(spend / leads, 2) if leads > 0 else 0
    cpa = round(spend / conversions, 2) if conversions > 0 else 0
    roas = round(revenue / spend, 2) if spend > 0 else 0
    roi = round(((revenue - spend) / spend) * 100, 1) if spend > 0 else 0
    return {"cpl": cpl, "cpa": cpa, "roas": roas, "roi": roi}

# ============ ROUTES ============

@ads_router.get("/dashboard")
async def get_ads_dashboard(request: Request, period: str = "30d"):
    """Tableau de bord publicités avec ROI complet."""
    await _require_auth(request)
    
    now = datetime.now(timezone.utc)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    start = now - timedelta(days=days)
    
    # Récupérer les dépenses
    spends = await _db.ad_spends.find(
        {"date": {"$gte": start.strftime("%Y-%m-%d")}},
        {"_id": 0}
    ).to_list(10000)
    
    # Récupérer les leads avec UTM
    leads = await _db.leads.find(
        {"created_at": {"$gte": start.isoformat()}},
        {"_id": 0, "lead_id": 1, "utm_source": 1, "utm_medium": 1, 
         "utm_campaign": 1, "status": 1, "created_at": 1, "source": 1}
    ).to_list(10000)
    
    # Récupérer les devis acceptés pour calculer le revenue
    quotes = await _db.quotes.find(
        {"status": {"$in": ["accepté", "accepte"]},
         "created_at": {"$gte": start.isoformat()}},
        {"_id": 0, "lead_id": 1, "amount": 1}
    ).to_list(10000)
    
    won_lead_ids = {q["lead_id"] for q in quotes}
    
    # Calculer métriques par plateforme
    platforms = {}
    for spend in spends:
        p = spend["platform"]
        if p not in platforms:
            platforms[p] = {"spend": 0, "impressions": 0, "clicks": 0}
        platforms[p]["spend"] += spend.get("spend", 0)
        platforms[p]["impressions"] += spend.get("impressions", 0)
        platforms[p]["clicks"] += spend.get("clicks", 0)
    
    # Compter leads et revenue par plateforme
    platform_leads = {}
    for lead in leads:
        src = lead.get("utm_source") or lead.get("source", "organic")
        p = "google_ads" if "google" in str(src).lower() else \
            "facebook_ads" if "facebook" in str(src).lower() or "meta" in str(src).lower() or "fb" in str(src).lower() else \
            "instagram" if "instagram" in str(src).lower() else \
            src or "organic"
        if p not in platform_leads:
            platform_leads[p] = {"leads": 0, "conversions": 0, "revenue": 0}
        platform_leads[p]["leads"] += 1
        if lead["lead_id"] in won_lead_ids:
            platform_leads[p]["conversions"] += 1
            matching_quotes = [q for q in quotes if q["lead_id"] == lead["lead_id"]]
            platform_leads[p]["revenue"] += sum(q.get("amount", 0) for q in matching_quotes)
    
    # Assembler métriques complètes
    all_platforms = set(list(platforms.keys()) + list(platform_leads.keys()))
    platform_metrics = []
    for p in all_platforms:
        spend_data = platforms.get(p, {"spend": 0, "impressions": 0, "clicks": 0})
        lead_data = platform_leads.get(p, {"leads": 0, "conversions": 0, "revenue": 0})
        metrics = _calc_metrics(
            spend_data["spend"],
            lead_data["leads"],
            lead_data["conversions"],
            lead_data["revenue"]
        )
        ctr = round((spend_data["clicks"] / spend_data["impressions"] * 100), 2) if spend_data["impressions"] > 0 else 0
        platform_metrics.append({
            "platform": p,
            "spend": round(spend_data["spend"], 2),
            "impressions": spend_data["impressions"],
            "clicks": spend_data["clicks"],
            "ctr": ctr,
            "leads": lead_data["leads"],
            "conversions": lead_data["conversions"],
            "revenue": round(lead_data["revenue"], 2),
            **metrics
        })
    
    # Métriques globales
    total_spend = sum(p["spend"] for p in platform_metrics)
    total_leads = sum(p["leads"] for p in platform_metrics)
    total_conversions = sum(p["conversions"] for p in platform_metrics)
    total_revenue = sum(p["revenue"] for p in platform_metrics)
    global_metrics = _calc_metrics(total_spend, total_leads, total_conversions, total_revenue)
    
    # Campagnes détaillées
    campaigns = await _db.ad_campaigns.find({}, {"_id": 0}).to_list(100)
    
    # Evolution dépenses par jour
    spend_by_day = {}
    for spend in spends:
        d = spend["date"]
        if d not in spend_by_day:
            spend_by_day[d] = 0
        spend_by_day[d] += spend.get("spend", 0)
    
    spend_timeline = [{"date": k, "spend": round(v, 2)} 
                      for k, v in sorted(spend_by_day.items())]
    
    return {
        "period": period,
        "global": {
            "total_spend": round(total_spend, 2),
            "total_leads": total_leads,
            "total_conversions": total_conversions,
            "total_revenue": round(total_revenue, 2),
            **global_metrics
        },
        "platforms": sorted(platform_metrics, key=lambda x: x["spend"], reverse=True),
        "campaigns": campaigns,
        "spend_timeline": spend_timeline,
    }

@ads_router.post("/campaigns")
async def create_campaign(campaign: AdCampaign, request: Request):
    """Créer une campagne publicitaire."""
    await _require_auth(request)
    now = datetime.now(timezone.utc)
    doc = {
        "campaign_id": f"camp_{uuid.uuid4().hex[:10]}",
        **campaign.model_dump(),
        "created_at": now.isoformat(),
    }
    await _db.ad_campaigns.insert_one(doc)
    return {"success": True, "campaign_id": doc["campaign_id"]}

@ads_router.post("/spend")
async def add_spend(spend: AdSpend, request: Request):
    """Enregistrer des dépenses publicitaires."""
    await _require_auth(request)
    doc = {
        "spend_id": f"spend_{uuid.uuid4().hex[:10]}",
        **spend.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.ad_spends.insert_one(doc)
    return {"success": True}

@ads_router.get("/campaigns")
async def get_campaigns(request: Request):
    """Lister les campagnes."""
    await _require_auth(request)
    campaigns = await _db.ad_campaigns.find({}, {"_id": 0}).to_list(100)
    return campaigns

@ads_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: dict, request: Request):
    """Mettre à jour une campagne."""
    await _require_auth(request)
    await _db.ad_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@ads_router.get("/attribution")
async def get_attribution(request: Request, period: str = "30d"):
    """Attribution des leads par campagne UTM."""
    await _require_auth(request)
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    start = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    leads = await _db.leads.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "lead_id": 1, "name": 1, "utm_source": 1, "utm_medium": 1,
         "utm_campaign": 1, "utm_content": 1, "status": 1, "score": 1, "created_at": 1}
    ).to_list(10000)
    
    # Grouper par campagne
    by_campaign = {}
    for lead in leads:
        camp = lead.get("utm_campaign") or "direct"
        if camp not in by_campaign:
            by_campaign[camp] = {
                "campaign": camp,
                "source": lead.get("utm_source", ""),
                "medium": lead.get("utm_medium", ""),
                "leads": 0,
                "avg_score": 0,
                "scores": []
            }
        by_campaign[camp]["leads"] += 1
        if lead.get("score"):
            by_campaign[camp]["scores"].append(lead["score"])
    
    result = []
    for k, v in by_campaign.items():
        v["avg_score"] = round(sum(v["scores"]) / len(v["scores"]), 0) if v["scores"] else 0
        del v["scores"]
        result.append(v)
    
    return sorted(result, key=lambda x: x["leads"], reverse=True)
