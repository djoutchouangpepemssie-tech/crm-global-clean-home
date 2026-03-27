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
