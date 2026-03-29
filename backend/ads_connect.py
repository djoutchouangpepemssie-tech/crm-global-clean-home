"""
Connexion Google Ads + Meta Ads — Global Clean Home
"""
import os, logging, httpx, uuid
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
ads_connect_router = APIRouter(prefix="/api/ads-connect", tags=["ads-connect"])
_db = None

GOOGLE_ADS_CUSTOMER_ID = "2825899307"
GOOGLE_ADS_DEVELOPER_TOKEN = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN", "")
META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
META_AD_ACCOUNT_ID = "act_1456980709277771"
META_REDIRECT_URI = os.environ.get("META_REDIRECT_URI", "https://crm-global-clean-home-production.up.railway.app/api/ads-connect/meta/callback")

def init_ads_connect_db(database):
    global _db
    _db = database

@ads_connect_router.get("/summary")
async def get_ads_summary():
    meta_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    from gmail_service import _get_any_active_token
    token, _ = await _get_any_active_token()
    return {
        "google_ads": {
            "connected": bool(token),
            "customer_id": GOOGLE_ADS_CUSTOMER_ID,
            "needs_developer_token": not bool(GOOGLE_ADS_DEVELOPER_TOKEN),
        },
        "meta_ads": {
            "connected": bool(meta_doc),
            "account_id": META_AD_ACCOUNT_ID,
            "connected_at": meta_doc.get("connected_at") if meta_doc else None,
        },
    }

@ads_connect_router.get("/google/campaigns")
async def get_google_campaigns():
    from gmail_service import _get_any_active_token
    token, _ = await _get_any_active_token()
    if not token or not GOOGLE_ADS_DEVELOPER_TOKEN:
        return {"campaigns": [], "message": "Developer token requis"}
    try:
        query = """SELECT campaign.id, campaign.name, campaign.status,
            metrics.impressions, metrics.clicks, metrics.cost_micros,
            metrics.conversions, metrics.ctr, metrics.average_cpc
            FROM campaign WHERE segments.date DURING LAST_30_DAYS
            AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 20"""
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://googleads.googleapis.com/v17/customers/{GOOGLE_ADS_CUSTOMER_ID}/googleAds:searchStream",
                json={"query": query},
                headers={"Authorization": f"Bearer {token}", "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN, "login-customer-id": GOOGLE_ADS_CUSTOMER_ID},
                timeout=15
            )
            if res.status_code != 200:
                return {"campaigns": [], "error": res.text[:200]}
            data = res.json()
            campaigns = []
            for batch in data:
                for row in batch.get("results", []):
                    c = row.get("campaign", {})
                    m = row.get("metrics", {})
                    campaigns.append({
                        "campaign_id": f"gads_{c.get('id','')}",
                        "platform": "google_ads",
                        "name": c.get("name",""),
                        "status": c.get("status","").lower(),
                        "impressions": int(m.get("impressions",0)),
                        "clicks": int(m.get("clicks",0)),
                        "cost": round(int(m.get("costMicros",0))/1_000_000, 2),
                        "conversions": round(float(m.get("conversions",0)), 1),
                        "ctr": round(float(m.get("ctr",0))*100, 2),
                        "avg_cpc": round(int(m.get("averageCpc",0))/1_000_000, 2),
                        "source": "google_ads_api",
                    })
            return {"campaigns": campaigns}
    except Exception as e:
        return {"campaigns": [], "error": str(e)}

@ads_connect_router.get("/meta/auth")
async def meta_auth(request: Request):
    if not META_APP_ID:
        raise HTTPException(status_code=400, detail="META_APP_ID non configure sur Railway")
    state = uuid.uuid4().hex
    await _db.oauth_states.insert_one({"state": state, "type": "meta_ads", "created_at": datetime.now(timezone.utc).isoformat()})
    scopes = "ads_read,ads_management,business_management"
    url = f"https://www.facebook.com/v19.0/dialog/oauth?client_id={META_APP_ID}&redirect_uri={META_REDIRECT_URI}&scope={scopes}&state={state}&response_type=code"
    return {"authorization_url": url}

@ads_connect_router.get("/meta/callback")
async def meta_callback(code: str = None, state: str = None, error: str = None):
    if error or not code:
        return RedirectResponse(f"https://crm.globalcleanhome.com/ads?error={error or 'no_code'}")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get("https://graph.facebook.com/v19.0/oauth/access_token",
                params={"client_id": META_APP_ID, "client_secret": META_APP_SECRET, "redirect_uri": META_REDIRECT_URI, "code": code}, timeout=15)
            token = res.json().get("access_token")
            if not token:
                return RedirectResponse("https://crm.globalcleanhome.com/ads?error=no_token")
            ll_res = await client.get("https://graph.facebook.com/v19.0/oauth/access_token",
                params={"grant_type": "fb_exchange_token", "client_id": META_APP_ID, "client_secret": META_APP_SECRET, "fb_exchange_token": token}, timeout=15)
            final_token = ll_res.json().get("access_token", token)
            await _db.meta_tokens.update_one({"account_id": META_AD_ACCOUNT_ID},
                {"$set": {"access_token": final_token, "account_id": META_AD_ACCOUNT_ID, "connected_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
            return RedirectResponse("https://crm.globalcleanhome.com/ads?meta_connected=1")
    except Exception as e:
        return RedirectResponse(f"https://crm.globalcleanhome.com/ads?error={str(e)[:50]}")

@ads_connect_router.get("/meta/status")
async def meta_status():
    token_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    if not token_doc:
        return {"connected": False}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get("https://graph.facebook.com/v19.0/me",
                params={"access_token": token_doc["access_token"], "fields": "name,email"}, timeout=10)
            if res.status_code == 200:
                return {"connected": True, "account": res.json()}
            return {"connected": False, "message": "Token expire"}
    except:
        return {"connected": False}

@ads_connect_router.get("/meta/campaigns")
async def get_meta_campaigns():
    token_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    if not token_doc:
        return {"campaigns": [], "connected": False}
    token = token_doc["access_token"]
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/campaigns",
                params={"access_token": token, "fields": "id,name,status,objective,daily_budget,insights{impressions,clicks,spend,actions,ctr,cpc}", "date_preset": "last_30d", "limit": 20},
                timeout=15)
            if res.status_code != 200:
                return {"campaigns": [], "error": res.text[:200]}
            campaigns = []
            for c in res.json().get("data", []):
                insights = c.get("insights", {}).get("data", [{}])[0] if c.get("insights") else {}
                actions = insights.get("actions", [])
                conversions = sum(int(a.get("value",0)) for a in actions if a.get("action_type") in ["lead","purchase","complete_registration"])
                campaigns.append({
                    "campaign_id": f"meta_{c.get('id','')}",
                    "platform": "facebook_ads",
                    "name": c.get("name",""),
                    "status": c.get("status","").lower(),
                    "objective": c.get("objective",""),
                    "impressions": int(insights.get("impressions",0)),
                    "clicks": int(insights.get("clicks",0)),
                    "cost": round(float(insights.get("spend",0)), 2),
                    "conversions": conversions,
                    "ctr": round(float(insights.get("ctr",0)), 2),
                    "avg_cpc": round(float(insights.get("cpc",0)), 2),
                    "daily_budget": round(int(c.get("daily_budget",0))/100, 2),
                    "source": "meta_api",
                })
            return {"campaigns": campaigns, "connected": True}
    except Exception as e:
        return {"campaigns": [], "error": str(e)}

@ads_connect_router.get("/meta/disconnect")
async def meta_disconnect():
    await _db.meta_tokens.delete_many({"account_id": META_AD_ACCOUNT_ID})
    return {"success": True}


# ── CRÉER CAMPAGNE META COMPLÈTE ──
@ads_connect_router.post("/meta/campaigns/create-full")
async def create_full_meta_campaign(request: Request):
    """Créer une campagne Meta complète avec adset et annonce."""
    token_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    if not token_doc:
        raise HTTPException(status_code=401, detail="Meta Ads non connecté")
    
    body = await request.json()
    token = token_doc["access_token"]
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Créer la campagne
            camp_res = await client.post(
                f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/campaigns",
                params={"access_token": token},
                json={
                    "name": body.get("campaign_name"),
                    "objective": body.get("objective", "OUTCOME_LEADS"),
                    "status": body.get("status", "PAUSED"),
                    "special_ad_categories": [],
                },
                timeout=15
            )
            if camp_res.status_code not in [200, 201]:
                raise HTTPException(status_code=400, detail=f"Erreur campagne: {camp_res.text[:200]}")
            
            campaign_id = camp_res.json().get("id")
            
            # 2. Créer l'adset (ensemble de publicités)
            targeting = {
                "geo_locations": {"countries": ["FR"], "cities": body.get("cities", [{"key": "542609", "name": "Paris", "region": "Île-de-France", "country": "FR"}])},
                "age_min": body.get("age_min", 25),
                "age_max": body.get("age_max", 65),
                "genders": body.get("genders", []),
                "interests": [{"id": i} for i in body.get("interest_ids", [])],
            }
            
            adset_res = await client.post(
                f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/adsets",
                params={"access_token": token},
                json={
                    "name": body.get("adset_name", f"{body.get('campaign_name')} - Ensemble"),
                    "campaign_id": campaign_id,
                    "billing_event": "IMPRESSIONS",
                    "optimization_goal": body.get("optimization_goal", "LEAD_GENERATION"),
                    "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
                    "daily_budget": int(float(body.get("daily_budget", 10)) * 100),
                    "targeting": targeting,
                    "start_time": body.get("start_date"),
                    "end_time": body.get("end_date"),
                    "status": "PAUSED",
                },
                timeout=15
            )
            
            adset_id = adset_res.json().get("id") if adset_res.status_code in [200,201] else None
            
            # 3. Sauvegarder en DB
            await _db.meta_campaigns_full.insert_one({
                "campaign_id": campaign_id,
                "adset_id": adset_id,
                "name": body.get("campaign_name"),
                "objective": body.get("objective"),
                "daily_budget": body.get("daily_budget"),
                "budget_alert": body.get("budget_alert", 0),
                "cpa_alert": body.get("cpa_alert", 0),
                "ab_test": body.get("ab_test", False),
                "ad_creative": body.get("creative", {}),
                "targeting": targeting,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "PAUSED",
            })
            
            return {
                "success": True,
                "campaign_id": campaign_id,
                "adset_id": adset_id,
                "message": "Campagne créée avec succès (en pause)"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── ALERTES BUDGET ──
@ads_connect_router.get("/alerts")
async def get_alerts():
    """Récupérer les alertes de budget et performance."""
    alerts = []
    token_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    
    if token_doc:
        campaigns = await _db.meta_campaigns_full.find({}, {"_id":0}).to_list(100)
        for camp in campaigns:
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"https://graph.facebook.com/v19.0/{camp['campaign_id']}/insights",
                        params={
                            "access_token": token_doc["access_token"],
                            "fields": "spend,cpa,impressions,clicks",
                            "date_preset": "today",
                        },
                        timeout=10
                    )
                    if res.status_code == 200:
                        data = res.json().get("data", [{}])
                        if data:
                            spend = float(data[0].get("spend", 0))
                            cpa = float(data[0].get("cpa", 0))
                            
                            if camp.get("budget_alert") and spend >= float(camp["budget_alert"]):
                                alerts.append({
                                    "type": "budget",
                                    "severity": "high",
                                    "campaign": camp["name"],
                                    "message": f"Budget alerte atteint ! Dépenses aujourd'hui : {spend:.2f}€ / Alerte : {camp['budget_alert']}€",
                                    "value": spend,
                                    "threshold": camp["budget_alert"],
                                })
                            
                            if camp.get("cpa_alert") and cpa > float(camp["cpa_alert"]) and cpa > 0:
                                alerts.append({
                                    "type": "cpa",
                                    "severity": "medium",
                                    "campaign": camp["name"],
                                    "message": f"CPA trop élevé : {cpa:.2f}€ / Alerte : {camp['cpa_alert']}€",
                                    "value": cpa,
                                    "threshold": camp["cpa_alert"],
                                })
            except:
                pass
    
    # Alertes manuelles depuis les campagnes DB
    manual_camps = await _db.ad_campaigns.find({}, {"_id":0}).to_list(100)
    for camp in manual_camps:
        if camp.get("budget_alert") and float(camp.get("cost",0)) >= float(camp["budget_alert"]):
            alerts.append({
                "type": "budget",
                "severity": "high",
                "campaign": camp.get("name",""),
                "message": f"Budget dépassé : {camp.get('cost',0)}€ / Alerte : {camp['budget_alert']}€",
                "value": float(camp.get("cost",0)),
                "threshold": float(camp["budget_alert"]),
            })
    
    return {"alerts": alerts, "count": len(alerts)}


# ── RAPPORT PERFORMANCE ──
@ads_connect_router.get("/report/weekly")
async def get_weekly_report():
    """Générer un rapport de performance hebdomadaire."""
    token_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    report = {
        "period": "7 derniers jours",
        "meta": {},
        "google": {},
        "summary": {},
    }
    
    if token_doc:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/insights",
                    params={
                        "access_token": token_doc["access_token"],
                        "fields": "impressions,clicks,spend,actions,ctr,cpc,reach",
                        "date_preset": "last_7d",
                        "level": "account",
                    },
                    timeout=15
                )
                if res.status_code == 200:
                    data = res.json().get("data", [{}])
                    if data:
                        d = data[0]
                        actions = d.get("actions", [])
                        conversions = sum(int(a.get("value",0)) for a in actions if a.get("action_type") in ["lead","purchase"])
                        report["meta"] = {
                            "impressions": int(d.get("impressions",0)),
                            "clicks": int(d.get("clicks",0)),
                            "spend": float(d.get("spend",0)),
                            "ctr": float(d.get("ctr",0)),
                            "cpc": float(d.get("cpc",0)),
                            "reach": int(d.get("reach",0)),
                            "conversions": conversions,
                            "cpa": float(d.get("spend",0))/max(conversions,1),
                        }
        except Exception as e:
            logger.warning(f"Weekly report Meta error: {e}")
    
    # Summary global
    report["summary"] = {
        "total_spend": report["meta"].get("spend",0) + report["google"].get("spend",0),
        "total_conversions": report["meta"].get("conversions",0) + report["google"].get("conversions",0),
        "total_clicks": report["meta"].get("clicks",0) + report["google"].get("clicks",0),
    }
    
    return report


# ── INTERESTS META (pour ciblage) ──
@ads_connect_router.get("/meta/interests")
async def search_interests(q: str = "nettoyage"):
    """Rechercher des intérêts Meta pour le ciblage."""
    token_doc = await _db.meta_tokens.find_one({"account_id": META_AD_ACCOUNT_ID}, {"_id":0})
    if not token_doc:
        return {"interests": []}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://graph.facebook.com/v19.0/search",
                params={
                    "access_token": token_doc["access_token"],
                    "type": "adinterest",
                    "q": q,
                    "limit": 10,
                    "locale": "fr_FR",
                },
                timeout=10
            )
            if res.status_code == 200:
                return {"interests": res.json().get("data", [])}
    except:
        pass
    return {"interests": []}
