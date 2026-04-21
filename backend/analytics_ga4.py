"""
Analytics GA4 + Search Console — Global Clean Home
Données réelles via OAuth2 existant
"""
import os, logging, httpx
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
analytics_router = APIRouter(prefix="/api/analytics-data", tags=["analytics"])
_db = None

GA4_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "521330220")
GA4_MEASUREMENT_ID = os.environ.get("GA4_MEASUREMENT_ID", "G-E68TG6NK0S")
GSC_SITE_URL = os.environ.get("GSC_SITE_URL", "https://www.globalcleanhome.com/")

def init_analytics_db(database):
    global _db
    _db = database

async def _get_token():
    from gmail_service import _get_any_active_token
    token, user_id = await _get_any_active_token()
    if not token:
        raise HTTPException(status_code=401, detail="Aucun token Google disponible. Reconnectez Gmail.")
    return token

async def _ga4_query(token: str, body: dict) -> dict:
    """Appel API GA4 Data."""
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=body, headers={"Authorization": f"Bearer {token}"}, timeout=15)
        if res.status_code == 403:
            raise HTTPException(status_code=403, detail="Accès GA4 refusé. Ajoutez le compte Google au property GA4.")
        if res.status_code != 200:
            logger.error(f"GA4 error: {res.status_code} {res.text}")
            raise HTTPException(status_code=res.status_code, detail=f"Erreur GA4: {res.text[:200]}")
        return res.json()

async def _gsc_query(token: str, endpoint: str, body: dict = None) -> dict:
    """Appel API Search Console."""
    base = "https://searchconsole.googleapis.com/webmasters/v3"
    url = f"{base}/{endpoint}"
    async with httpx.AsyncClient() as client:
        if body:
            res = await client.post(url, json=body, headers={"Authorization": f"Bearer {token}"}, timeout=15)
        else:
            res = await client.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=15)
        if res.status_code == 403:
            raise HTTPException(status_code=403, detail="Accès Search Console refusé.")
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=f"Erreur GSC: {res.text[:200]}")
        return res.json()

# ── ENDPOINT PRINCIPAL ANALYTICS ──
@analytics_router.get("/overview")
async def get_analytics_overview(request: Request, days: int = 30):
    """Données GA4 complètes — sessions, users, conversions."""
    token = await _get_token()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        # 1. Vue d'ensemble
        overview = await _ga4_query(token, {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "metrics": [
                {"name": "sessions"},
                {"name": "activeUsers"},
                {"name": "newUsers"},
                {"name": "bounceRate"},
                {"name": "averageSessionDuration"},
                {"name": "screenPageViews"},
                {"name": "conversions"},
            ]
        })

        # 2. Sessions par jour
        daily = await _ga4_query(token, {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "date"}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "conversions"}],
            "orderBys": [{"dimension": {"dimensionName": "date"}}]
        })

        # 3. Top pages
        pages = await _ga4_query(token, {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "pagePath"}],
            "metrics": [{"name": "screenPageViews"}, {"name": "averageSessionDuration"}, {"name": "bounceRate"}],
            "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
            "limit": 10
        })

        # 4. Sources de trafic
        sources = await _ga4_query(token, {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "sessionDefaultChannelGroup"}],
            "metrics": [{"name": "sessions"}, {"name": "conversions"}],
            "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}]
        })

        # 5. Appareils
        devices = await _ga4_query(token, {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "deviceCategory"}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"}]
        })

        # 6. Villes
        cities = await _ga4_query(token, {
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "city"}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
            "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
            "limit": 10
        })

        # 7. Comparaison période précédente
        prev_start = (datetime.now() - timedelta(days=days*2)).strftime("%Y-%m-%d")
        prev_end = (datetime.now() - timedelta(days=days+1)).strftime("%Y-%m-%d")
        prev = await _ga4_query(token, {
            "dateRanges": [{"startDate": prev_start, "endDate": prev_end}],
            "metrics": [{"name": "sessions"}, {"name": "activeUsers"}, {"name": "conversions"}]
        })

        def get_metric(data, index):
            try:
                return float(data["rows"][0]["metricValues"][index]["value"])
            except: return 0

        def parse_rows(data, dim_count=1):
            rows = []
            for row in data.get("rows", []):
                dims = [row["dimensionValues"][i]["value"] for i in range(dim_count)]
                mets = [row["metricValues"][i]["value"] for i in range(len(row["metricValues"]))]
                rows.append({"dims": dims, "metrics": mets})
            return rows

        ov = overview
        sessions     = get_metric(ov, 0)
        users        = get_metric(ov, 1)
        new_users    = get_metric(ov, 2)
        bounce_rate  = get_metric(ov, 3)
        avg_duration = get_metric(ov, 4)
        pageviews    = get_metric(ov, 5)
        conversions  = get_metric(ov, 6)

        prev_sessions = get_metric(prev, 0)
        prev_users    = get_metric(prev, 1)
        prev_convs    = get_metric(prev, 2)

        def pct_change(curr, prev):
            if prev == 0: return 0
            return round(((curr - prev) / prev) * 100, 1)

        return {
            "period": {"start": start, "end": end, "days": days},
            "kpis": {
                "sessions":     {"value": int(sessions),     "change": pct_change(sessions, prev_sessions)},
                "users":        {"value": int(users),        "change": pct_change(users, prev_users)},
                "new_users":    {"value": int(new_users),    "change": 0},
                "pageviews":    {"value": int(pageviews),    "change": 0},
                "bounce_rate":  {"value": round(bounce_rate*100, 1), "change": 0},
                "avg_duration": {"value": round(avg_duration, 0), "change": 0},
                "conversions":  {"value": int(conversions),  "change": pct_change(conversions, prev_convs)},
            },
            "daily": [
                {
                    "date": r["dims"][0],
                    "sessions": int(r["metrics"][0]),
                    "users": int(r["metrics"][1]),
                    "conversions": int(r["metrics"][2]),
                }
                for r in parse_rows(daily)
            ],
            "pages": [
                {
                    "path": r["dims"][0],
                    "views": int(r["metrics"][0]),
                    "avg_duration": round(float(r["metrics"][1]), 0),
                    "bounce_rate": round(float(r["metrics"][2])*100, 1),
                }
                for r in parse_rows(pages)
            ],
            "sources": [
                {
                    "channel": r["dims"][0],
                    "sessions": int(r["metrics"][0]),
                    "conversions": int(r["metrics"][1]),
                }
                for r in parse_rows(sources)
            ],
            "devices": [
                {
                    "device": r["dims"][0],
                    "sessions": int(r["metrics"][0]),
                    "users": int(r["metrics"][1]),
                }
                for r in parse_rows(devices)
            ],
            "cities": [
                {
                    "city": r["dims"][0],
                    "sessions": int(r["metrics"][0]),
                    "users": int(r["metrics"][1]),
                }
                for r in parse_rows(cities)
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GA4 overview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── SEO — SEARCH CONSOLE ──
@analytics_router.get("/seo")
async def get_seo_data(request: Request, days: int = 28):
    """Données Search Console réelles."""
    token = await _get_token()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    site = GSC_SITE_URL

    try:
        # 1. Vue d'ensemble
        overview = await _gsc_query(token,
            f"sites/{site.replace('/', '%2F').replace(':', '%3A')}/searchAnalytics/query",
            {"startDate": start, "endDate": end, "dimensions": [], "rowLimit": 1}
        )

        # 2. Top mots-clés
        keywords = await _gsc_query(token,
            f"sites/{site.replace('/', '%2F').replace(':', '%3A')}/searchAnalytics/query",
            {
                "startDate": start, "endDate": end,
                "dimensions": ["query"],
                "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
                "rowLimit": 20
            }
        )

        # 3. Top pages
        pages = await _gsc_query(token,
            f"sites/{site.replace('/', '%2F').replace(':', '%3A')}/searchAnalytics/query",
            {
                "startDate": start, "endDate": end,
                "dimensions": ["page"],
                "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
                "rowLimit": 10
            }
        )

        # 4. Évolution par jour
        daily = await _gsc_query(token,
            f"sites/{site.replace('/', '%2F').replace(':', '%3A')}/searchAnalytics/query",
            {
                "startDate": start, "endDate": end,
                "dimensions": ["date"],
                "orderBy": [{"fieldName": "date", "sortOrder": "ASCENDING"}],
                "rowLimit": 90
            }
        )

        # 5. Devices
        devices = await _gsc_query(token,
            f"sites/{site.replace('/', '%2F').replace(':', '%3A')}/searchAnalytics/query",
            {"startDate": start, "endDate": end, "dimensions": ["device"], "rowLimit": 5}
        )

        # 6. Pays
        countries = await _gsc_query(token,
            f"sites/{site.replace('/', '%2F').replace(':', '%3A')}/searchAnalytics/query",
            {
                "startDate": start, "endDate": end,
                "dimensions": ["country"],
                "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
                "rowLimit": 10
            }
        )

        total_clicks     = sum(r.get("clicks",0) for r in overview.get("rows",[]))
        total_impressions = sum(r.get("impressions",0) for r in overview.get("rows",[]))
        avg_ctr          = overview["rows"][0].get("ctr",0)*100 if overview.get("rows") else 0
        avg_position     = overview["rows"][0].get("position",0) if overview.get("rows") else 0

        return {
            "period": {"start": start, "end": end},
            "overview": {
                "clicks":      total_clicks,
                "impressions": total_impressions,
                "ctr":         round(avg_ctr, 2),
                "position":    round(avg_position, 1),
            },
            "keywords": [
                {
                    "query":       r.get("keys",[""])[0],
                    "clicks":      r.get("clicks",0),
                    "impressions": r.get("impressions",0),
                    "ctr":         round(r.get("ctr",0)*100, 2),
                    "position":    round(r.get("position",0), 1),
                }
                for r in keywords.get("rows",[])
            ],
            "pages": [
                {
                    "page":        r.get("keys",[""])[0].replace(GSC_SITE_URL,""),
                    "clicks":      r.get("clicks",0),
                    "impressions": r.get("impressions",0),
                    "ctr":         round(r.get("ctr",0)*100, 2),
                    "position":    round(r.get("position",0), 1),
                }
                for r in pages.get("rows",[])
            ],
            "daily": [
                {
                    "date":        r.get("keys",[""])[0],
                    "clicks":      r.get("clicks",0),
                    "impressions": r.get("impressions",0),
                    "ctr":         round(r.get("ctr",0)*100, 2),
                    "position":    round(r.get("position",0), 1),
                }
                for r in daily.get("rows",[])
            ],
            "devices": [
                {
                    "device":      r.get("keys",[""])[0],
                    "clicks":      r.get("clicks",0),
                    "impressions": r.get("impressions",0),
                }
                for r in devices.get("rows",[])
            ],
            "countries": [
                {
                    "country":     r.get("keys",[""])[0],
                    "clicks":      r.get("clicks",0),
                    "impressions": r.get("impressions",0),
                }
                for r in countries.get("rows",[])
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GSC error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Debug endpoint removed for security

# ── REALTIME ──
@analytics_router.get("/realtime")
async def get_realtime(request: Request):
    """Utilisateurs actifs en temps réel."""
    token = await _get_token()
    try:
        url = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runRealtimeReport"
        async with httpx.AsyncClient() as client:
            res = await client.post(url,
                json={
                    "metrics": [{"name": "activeUsers"}],
                    "dimensions": [{"name": "city"}, {"name": "deviceCategory"}, {"name": "unifiedScreenName"}],
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            if res.status_code != 200:
                return {"active_users": 0, "details": []}
            data = res.json()
            total = sum(int(r["metricValues"][0]["value"]) for r in data.get("rows",[]))
            details = [
                {
                    "city": r["dimensionValues"][0]["value"],
                    "device": r["dimensionValues"][1]["value"],
                    "page": r["dimensionValues"][2]["value"],
                    "users": int(r["metricValues"][0]["value"]),
                }
                for r in data.get("rows",[])
            ]
            return {"active_users": total, "details": details}
    except Exception as e:
        return {"active_users": 0, "details": [], "error": str(e)}

@analytics_router.get("/crm-stats")
async def get_crm_stats(request: Request):
    """Statistiques CRM réelles - leads, devis, factures, interventions."""
    from server import require_auth
    try:
        await require_auth(request)
    except:
        pass
    
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    
    # Derniers 30 jours
    start_30 = (now - timedelta(days=30)).isoformat()
    start_7  = (now - timedelta(days=7)).isoformat()
    prev_start = (now - timedelta(days=60)).isoformat()
    prev_end   = (now - timedelta(days=30)).isoformat()

    leads       = await _db.leads.find({}, {"_id":0,"created_at":1,"status":1,"service_type":1,"source":1}).to_list(10000)
    quotes      = await _db.quotes.find({}, {"_id":0,"created_at":1,"status":1,"amount_ht":1}).to_list(10000)
    invoices    = await _db.invoices.find({}, {"_id":0,"created_at":1,"status":1,"amount_ttc":1}).to_list(10000)
    interventions = await _db.interventions.find({}, {"_id":0,"scheduled_date":1,"status":1,"service_type":1}).to_list(10000)

    def in_period(item, start, end=None):
        d = item.get("created_at") or item.get("scheduled_date") or ""
        if not d: return False
        return d >= start and (not end or d <= end)

    # KPIs 30 jours
    leads_30    = [l for l in leads    if in_period(l, start_30)]
    quotes_30   = [q for q in quotes   if in_period(q, start_30)]
    invoices_30 = [i for i in invoices if in_period(i, start_30)]
    intv_30     = [i for i in interventions if in_period(i, start_30)]

    # KPIs période précédente
    leads_prev  = [l for l in leads if in_period(l, prev_start, prev_end)]
    quotes_prev = [q for q in quotes if in_period(q, prev_start, prev_end)]

    def pct(curr, prev):
        if prev == 0: return 0
        return round(((curr-prev)/prev)*100, 1)

    # CA
    ca_30   = sum(float(i.get("amount_ttc",0) or 0) for i in invoices_30 if i.get("status")=="payée")
    ca_total= sum(float(i.get("amount_ttc",0) or 0) for i in invoices if i.get("status")=="payée")

    # Taux conversion
    conv_rate = round((len(quotes_30)/max(len(leads_30),1))*100, 1)

    # Par service
    services = {}
    for l in leads:
        s = l.get("service_type","Autre") or "Autre"
        services[s] = services.get(s,0)+1

    # Par source
    sources = {}
    for l in leads:
        s = l.get("source","Direct") or "Direct"
        sources[s] = sources.get(s,0)+1

    # Evolution par semaine (12 semaines)
    weekly = []
    for w in range(11,-1,-1):
        ws = (now - timedelta(weeks=w+1)).isoformat()
        we = (now - timedelta(weeks=w)).isoformat()
        weekly.append({
            "week": (now - timedelta(weeks=w)).strftime("S%W"),
            "leads":   len([l for l in leads    if in_period(l, ws, we)]),
            "quotes":  len([q for q in quotes   if in_period(q, ws, we)]),
            "invoices":len([i for i in invoices if in_period(i, ws, we)]),
            "ca":      round(sum(float(i.get("amount_ttc",0) or 0) for i in invoices if in_period(i, ws, we) and i.get("status")=="payée"), 2),
        })

    return {
        "kpis": {
            "leads":         {"value": len(leads_30),    "change": pct(len(leads_30), len(leads_prev)), "total": len(leads)},
            "quotes":        {"value": len(quotes_30),   "change": pct(len(quotes_30), len(quotes_prev)), "total": len(quotes)},
            "interventions": {"value": len(intv_30),     "total": len(interventions)},
            "ca_30":         {"value": round(ca_30, 2),  "total": round(ca_total, 2)},
            "conv_rate":     {"value": conv_rate},
            "invoices_paid": {"value": len([i for i in invoices_30 if i.get("status")=="payée"])},
        },
        "services": [{"name":k,"value":v} for k,v in sorted(services.items(), key=lambda x:-x[1])[:8]],
        "sources":  [{"name":k,"value":v} for k,v in sorted(sources.items(),  key=lambda x:-x[1])[:6]],
        "weekly":   weekly,
        "funnel": {
            "leads":     len(leads),
            "quotes":    len(quotes),
            "invoices":  len(invoices),
            "paid":      len([i for i in invoices if i.get("status")=="payée"]),
        }
    }
