"""
SEO Advanced — Global Clean Home
Couche d'intelligence SEO au-dessus de GA4 + Search Console + Tracker :
- Score SEO par URL (0-100, multi-facteurs)
- Detection de cannibalisation (plusieurs pages rankent sur la meme query)
- Detection de pages orphelines (GA4 views mais 0 impressions GSC)
- Monitoring d'indexation (URL Inspection API GSC)
- Changelog quotidien (snapshots de positions/clics/CTR par URL)
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from fastapi import APIRouter, Request, HTTPException, Query

logger = logging.getLogger(__name__)
seo_advanced_router = APIRouter(prefix="/api/seo", tags=["seo-advanced"])
_db = None


def init_seo_advanced_db(database):
    global _db
    _db = database


async def _ensure_indexes():
    if _db is None:
        return
    try:
        await _db.seo_snapshots.create_index([("url", 1), ("date", -1)])
        await _db.seo_snapshots.create_index("date")
    except Exception as e:
        logger.warning(f"seo_snapshots index: {e}")


def _path_of(url: str) -> str:
    try:
        p = urlparse(url)
        return p.path or "/"
    except Exception:
        return url or "/"


async def _get_google_token():
    from gmail_service import _get_any_active_token
    token, _ = await _get_any_active_token()
    if not token:
        raise HTTPException(status_code=401, detail="Aucun token Google disponible. Reconnectez Gmail.")
    return token


async def _gsc_query(token: str, site: str, body: dict) -> dict:
    import httpx
    site_enc = site.replace("/", "%2F").replace(":", "%3A")
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{site_enc}/searchAnalytics/query"
    async with httpx.AsyncClient() as c:
        r = await c.post(url, headers={"Authorization": f"Bearer {token}"}, json=body, timeout=20)
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=f"GSC: {r.text[:200]}")
        return r.json()


# ───────────────────────── SCORE PAR URL ─────────────────────────
@seo_advanced_router.get("/score")
async def seo_score_for_url(request: Request, url: str = Query(...), days: int = 28):
    """Score SEO (0-100) decomposé en 5 facteurs pour une URL donnee.
    Facteurs : Performance (GSC), Contenu (CTR/position), Trafic (GA4),
    Engagement (durée/rebond), Conversion (leads/visites).
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass

    from analytics_ga4 import GSC_SITE_URL
    path = _path_of(url) if url.startswith("http") else url
    full_url = url if url.startswith("http") else (GSC_SITE_URL.rstrip("/") + (url if url.startswith("/") else "/" + url))

    token = await _get_google_token()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    # GSC par URL
    try:
        gsc = await _gsc_query(token, GSC_SITE_URL, {
            "startDate": start, "endDate": end,
            "dimensions": ["page"],
            "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "equals", "expression": full_url}]}],
            "rowLimit": 1,
        })
    except Exception:
        gsc = {}
    gsc_row = (gsc.get("rows") or [{}])[0] if gsc.get("rows") else {}
    clicks = int(gsc_row.get("clicks", 0) or 0)
    impressions = int(gsc_row.get("impressions", 0) or 0)
    ctr = (gsc_row.get("ctr", 0) or 0) * 100
    position = gsc_row.get("position", 0) or 0

    # GA4 par path
    ga4_views = 0
    ga4_duration = 0
    ga4_bounce = 0
    try:
        from analytics_ga4 import GA4_PROPERTY_ID
        import httpx
        url_ga = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
        async with httpx.AsyncClient() as c:
            r = await c.post(url_ga, headers={"Authorization": f"Bearer {token}"}, json={
                "dateRanges": [{"startDate": start, "endDate": end}],
                "dimensions": [{"name": "pagePath"}],
                "metrics": [{"name": "screenPageViews"}, {"name": "averageSessionDuration"}, {"name": "bounceRate"}],
                "dimensionFilter": {"filter": {"fieldName": "pagePath", "stringFilter": {"value": path}}},
                "limit": 1,
            }, timeout=15)
            if r.status_code == 200:
                rows = r.json().get("rows", [])
                if rows:
                    ga4_views = int(float(rows[0]["metricValues"][0]["value"]))
                    ga4_duration = float(rows[0]["metricValues"][1]["value"])
                    ga4_bounce = float(rows[0]["metricValues"][2]["value"]) * 100
    except Exception as e:
        logger.info(f"GA4 par URL fallback: {e}")

    # Tracker events sur cette URL
    events_count = 0
    leads_from_url = 0
    if _db is not None:
        last = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        events_count = await _db.tracking_events.count_documents({
            "page_url": {"$regex": path.replace("/", r"\/") + "(\\?|$|#)"},
            "timestamp": {"$gte": last},
        })
        # Leads issus de visites sur cette URL (via session_id matching)
        try:
            session_ids = await _db.tracking_events.distinct("session_id", {
                "page_url": {"$regex": path.replace("/", r"\/") + "(\\?|$|#)"},
                "timestamp": {"$gte": last},
            })
            if session_ids:
                leads_from_url = await _db.leads.count_documents({
                    "session_id": {"$in": session_ids},
                    "created_at": {"$gte": last},
                })
        except Exception:
            pass

    # ─ Calcul score ─
    # Performance (0-25) : fonction de position + CTR
    perf = 0
    if position > 0:
        perf = max(0, 25 - (position - 1) * 1.2)  # pos 1 = 25, pos 21+ = 0
    perf = min(25, perf + min(5, ctr))  # bonus CTR

    # Contenu (0-20) : impressions + CTR relatif
    contenu = 0
    if impressions > 0:
        contenu = min(20, (impressions / 500) * 10 + min(10, ctr * 2))

    # Trafic (0-20) : vues GA4
    trafic = min(20, (ga4_views / 500) * 20)

    # Engagement (0-20) : durée et bounce
    eng_dur = min(10, ga4_duration / 18)  # 180s = 10pts
    eng_bnc = max(0, 10 - (ga4_bounce / 10))  # 100% = 0
    engagement = eng_dur + eng_bnc

    # Conversion (0-15)
    conv = 0
    if ga4_views > 0 and leads_from_url > 0:
        conv = min(15, (leads_from_url / max(ga4_views, 1)) * 300)  # 5% = 15pts
    conv = max(conv, min(5, events_count / 50))

    total = round(perf + contenu + trafic + engagement + conv)
    tone = "excellent" if total >= 80 else "good" if total >= 60 else "average" if total >= 40 else "poor"

    return {
        "url": full_url,
        "path": path,
        "period_days": days,
        "score": total,
        "tone": tone,
        "factors": {
            "performance": {"value": round(perf, 1), "max": 25, "weight": 0.25,
                            "detail": f"Pos {position:.1f}, CTR {ctr:.2f}%"},
            "content":     {"value": round(contenu, 1), "max": 20, "weight": 0.20,
                            "detail": f"{impressions} impressions, {clicks} clics"},
            "traffic":     {"value": round(trafic, 1), "max": 20, "weight": 0.20,
                            "detail": f"{ga4_views} vues GA4"},
            "engagement":  {"value": round(engagement, 1), "max": 20, "weight": 0.20,
                            "detail": f"{int(ga4_duration)}s durée, {ga4_bounce:.0f}% rebond"},
            "conversion":  {"value": round(conv, 1), "max": 15, "weight": 0.15,
                            "detail": f"{leads_from_url} leads, {events_count} events tracker"},
        },
        "metrics": {
            "clicks": clicks, "impressions": impressions, "ctr": round(ctr, 2),
            "position": round(position, 1),
            "ga4_views": ga4_views, "ga4_duration_s": int(ga4_duration),
            "ga4_bounce_pct": round(ga4_bounce, 1),
            "tracker_events": events_count, "leads_attribued": leads_from_url,
        },
    }


# ───────────────────────── CANNIBALISATION ─────────────────────────
@seo_advanced_router.get("/cannibalization")
async def detect_cannibalization(request: Request, days: int = 28, min_impressions: int = 50):
    """Detecte les requetes ou plusieurs pages du site rankent simultanement.
    Cause classique : duplication de contenu, mauvais maillage.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass

    from analytics_ga4 import GSC_SITE_URL
    token = await _get_google_token()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        res = await _gsc_query(token, GSC_SITE_URL, {
            "startDate": start, "endDate": end,
            "dimensions": ["query", "page"],
            "orderBy": [{"fieldName": "impressions", "sortOrder": "DESCENDING"}],
            "rowLimit": 1000,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])

    # Agrege par query
    queries = {}
    for row in res.get("rows", []):
        keys = row.get("keys") or ["", ""]
        q, page = keys[0], keys[1]
        if not q or not page:
            continue
        queries.setdefault(q, []).append({
            "page": _path_of(page),
            "clicks": row.get("clicks", 0),
            "impressions": row.get("impressions", 0),
            "ctr": round((row.get("ctr") or 0) * 100, 2),
            "position": round(row.get("position") or 0, 1),
        })

    # Filtre les queries avec >=2 pages qui ont des impressions significatives
    conflicts = []
    for q, pages in queries.items():
        if len(pages) < 2:
            continue
        total_imp = sum(p["impressions"] for p in pages)
        if total_imp < min_impressions:
            continue
        # Trier par impressions desc
        pages_sorted = sorted(pages, key=lambda p: p["impressions"], reverse=True)
        winner = pages_sorted[0]
        cannibals = pages_sorted[1:]
        # Severité = rapport de compétition
        ratio = cannibals[0]["impressions"] / winner["impressions"] if winner["impressions"] > 0 else 0
        severity = "high" if ratio >= 0.5 else "medium" if ratio >= 0.2 else "low"
        conflicts.append({
            "query": q,
            "total_impressions": total_imp,
            "total_clicks": sum(p["clicks"] for p in pages),
            "page_count": len(pages),
            "severity": severity,
            "winner": winner,
            "cannibals": cannibals,
            "pages": pages_sorted,
        })

    conflicts.sort(key=lambda x: (x["severity"] == "high", x["total_impressions"]), reverse=True)
    return {
        "period_days": days,
        "total_conflicts": len(conflicts),
        "high_severity": len([c for c in conflicts if c["severity"] == "high"]),
        "medium_severity": len([c for c in conflicts if c["severity"] == "medium"]),
        "low_severity": len([c for c in conflicts if c["severity"] == "low"]),
        "conflicts": conflicts[:50],
    }


# ───────────────────────── PAGES ORPHELINES ─────────────────────────
@seo_advanced_router.get("/orphans")
async def detect_orphan_pages(request: Request, days: int = 28, min_views: int = 20):
    """Pages vues par GA4 mais sans impressions GSC (ou tres peu).
    Pages 'SEO-orphelines' : elles ont du trafic direct/referral mais ne sont
    pas indexees ou ne rankent sur aucune requete.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass

    from analytics_ga4 import GSC_SITE_URL, GA4_PROPERTY_ID
    import httpx
    token = await _get_google_token()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    # GA4 pages
    ga4_pages = []
    url_ga = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
    async with httpx.AsyncClient() as c:
        r = await c.post(url_ga, headers={"Authorization": f"Bearer {token}"}, json={
            "dateRanges": [{"startDate": start, "endDate": end}],
            "dimensions": [{"name": "pagePath"}],
            "metrics": [{"name": "screenPageViews"}, {"name": "averageSessionDuration"}],
            "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
            "limit": 200,
        }, timeout=20)
        if r.status_code == 200:
            for row in r.json().get("rows", []):
                ga4_pages.append({
                    "path": row["dimensionValues"][0]["value"],
                    "views": int(float(row["metricValues"][0]["value"])),
                    "duration": float(row["metricValues"][1]["value"]),
                })

    # GSC pages
    gsc_paths = set()
    gsc_impressions = {}
    try:
        gsc_res = await _gsc_query(token, GSC_SITE_URL, {
            "startDate": start, "endDate": end,
            "dimensions": ["page"], "rowLimit": 500,
        })
        for row in gsc_res.get("rows", []):
            p = _path_of(row.get("keys", [""])[0])
            gsc_paths.add(p)
            gsc_impressions[p] = row.get("impressions", 0)
    except Exception:
        pass

    # Orphelines = GA4 views >= seuil mais (pas dans GSC OR impressions < 10)
    orphans = []
    for p in ga4_pages:
        if p["views"] < min_views:
            continue
        impressions = gsc_impressions.get(p["path"], 0)
        if impressions < 10:
            orphans.append({
                "path": p["path"],
                "views": p["views"],
                "duration_s": round(p["duration"], 0),
                "gsc_impressions": impressions,
                "severity": "high" if impressions == 0 and p["views"] >= 100 else
                            "medium" if impressions == 0 else "low",
            })

    orphans.sort(key=lambda x: x["views"], reverse=True)
    return {
        "period_days": days,
        "min_views_threshold": min_views,
        "total_orphans": len(orphans),
        "high_severity": len([o for o in orphans if o["severity"] == "high"]),
        "orphans": orphans[:50],
    }


# ───────────────────────── MONITORING INDEXATION ─────────────────────────
@seo_advanced_router.get("/indexation")
async def check_indexation(request: Request, url: str = Query(...)):
    """Appelle GSC URL Inspection API pour verifier l'etat d'indexation.
    Retourne : indexed?, canonical, last crawl, mobile-friendly, schema.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass

    from analytics_ga4 import GSC_SITE_URL
    token = await _get_google_token()
    full_url = url if url.startswith("http") else (GSC_SITE_URL.rstrip("/") + (url if url.startswith("/") else "/" + url))

    import httpx
    api_url = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
    async with httpx.AsyncClient() as c:
        r = await c.post(api_url, headers={"Authorization": f"Bearer {token}"}, json={
            "inspectionUrl": full_url,
            "siteUrl": GSC_SITE_URL,
            "languageCode": "fr",
        }, timeout=20)
        if r.status_code == 403:
            raise HTTPException(status_code=403, detail="URL Inspection API : acces refusé. Verifiez les permissions GSC.")
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=f"GSC Inspection: {r.text[:200]}")
        data = r.json()

    inspection = data.get("inspectionResult", {})
    index_status = inspection.get("indexStatusResult", {})
    mobile = inspection.get("mobileUsabilityResult", {})
    crawl = index_status.get("lastCrawlTime", "")
    verdict = index_status.get("verdict", "UNKNOWN")

    return {
        "url": full_url,
        "verdict": verdict,  # PASS | PARTIAL | FAIL | NEUTRAL
        "is_indexed": verdict == "PASS",
        "coverage": index_status.get("coverageState", ""),
        "indexing_state": index_status.get("indexingState", ""),
        "canonical_google": index_status.get("googleCanonical", ""),
        "canonical_user": index_status.get("userCanonical", ""),
        "last_crawl": crawl,
        "crawl_as": index_status.get("crawledAs", ""),
        "fetch_state": index_status.get("pageFetchState", ""),
        "robots_state": index_status.get("robotsTxtState", ""),
        "sitemap": index_status.get("sitemap", []),
        "referring_urls": index_status.get("referringUrls", []),
        "mobile_verdict": mobile.get("verdict", ""),
        "mobile_issues": mobile.get("issues", []),
    }


# ───────────────────────── CHANGELOG (SNAPSHOTS) ─────────────────────────
@seo_advanced_router.post("/snapshot")
async def take_snapshot(request: Request, days: int = 1, limit: int = 200):
    """Prend un snapshot des top URLs GSC et les stocke en DB pour
    pouvoir calculer les deltas jour apres jour. A appeler une fois par jour.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")

    from analytics_ga4 import GSC_SITE_URL
    token = await _get_google_token()
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        res = await _gsc_query(token, GSC_SITE_URL, {
            "startDate": yesterday, "endDate": yesterday,
            "dimensions": ["page"], "rowLimit": limit,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])

    inserted = 0
    for row in res.get("rows", []):
        page = row.get("keys", [""])[0]
        doc = {
            "url": page,
            "path": _path_of(page),
            "date": yesterday,
            "clicks": row.get("clicks", 0),
            "impressions": row.get("impressions", 0),
            "ctr": round((row.get("ctr") or 0) * 100, 2),
            "position": round(row.get("position") or 0, 1),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await _db.seo_snapshots.update_one(
            {"url": page, "date": yesterday},
            {"$set": doc}, upsert=True
        )
        inserted += 1
    return {"date": yesterday, "urls_snapshotted": inserted}


@seo_advanced_router.get("/changelog")
async def get_changelog(request: Request, days: int = 7, top: int = 30):
    """Delta KPIs par URL sur N jours. Pour chaque URL, retourne les
    valeurs J-{days}, J-1 et les deltas absolus/relatifs.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")

    end_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days + 1)).strftime("%Y-%m-%d")

    pipeline = [
        {"$match": {"date": {"$gte": start_date, "$lte": end_date}}},
        {"$sort": {"url": 1, "date": 1}},
        {"$group": {
            "_id": "$url",
            "path": {"$last": "$path"},
            "first_date": {"$first": "$date"},
            "last_date": {"$last": "$date"},
            "first_clicks": {"$first": "$clicks"},
            "last_clicks": {"$last": "$clicks"},
            "first_impressions": {"$first": "$impressions"},
            "last_impressions": {"$last": "$impressions"},
            "first_position": {"$first": "$position"},
            "last_position": {"$last": "$position"},
            "first_ctr": {"$first": "$ctr"},
            "last_ctr": {"$last": "$ctr"},
            "snapshots": {"$sum": 1},
        }},
        {"$match": {"snapshots": {"$gte": 2}}},
    ]

    rows = await _db.seo_snapshots.aggregate(pipeline).to_list(500)

    changes = []
    for r in rows:
        d_clicks = r["last_clicks"] - r["first_clicks"]
        d_imp = r["last_impressions"] - r["first_impressions"]
        d_pos = r["first_position"] - r["last_position"]  # gain = position baisse
        d_ctr = r["last_ctr"] - r["first_ctr"]
        impact = abs(d_clicks) + abs(d_imp) / 10 + abs(d_pos) * 5
        changes.append({
            "url": r["_id"],
            "path": r.get("path", ""),
            "first_date": r["first_date"],
            "last_date": r["last_date"],
            "delta": {
                "clicks": d_clicks,
                "impressions": d_imp,
                "position": round(d_pos, 1),
                "ctr": round(d_ctr, 2),
            },
            "current": {
                "clicks": r["last_clicks"],
                "impressions": r["last_impressions"],
                "position": r["last_position"],
                "ctr": r["last_ctr"],
            },
            "impact": round(impact, 1),
            "direction": "up" if (d_clicks > 0 or d_pos > 0.3) else "down" if (d_clicks < 0 or d_pos < -0.3) else "flat",
        })

    changes.sort(key=lambda x: x["impact"], reverse=True)

    snapshots_count = await _db.seo_snapshots.count_documents({})
    return {
        "period_days": days,
        "total_tracked_urls": len(changes),
        "total_snapshots_in_db": snapshots_count,
        "changes": changes[:top],
    }


# ───────────────────────── OPPORTUNITIES ─────────────────────────
@seo_advanced_router.get("/pagespeed")
async def pagespeed_insights(request: Request, url: str = Query(...), strategy: str = "mobile"):
    """Core Web Vitals via Google PageSpeed Insights API (publique, sans token requis
    mais avec quota plus genereux si GOOGLE_PAGESPEED_API_KEY est defini).
    Retourne LCP, INP, CLS, FCP, TTFB + scores Lighthouse 4 axes.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass

    import httpx
    from analytics_ga4 import GSC_SITE_URL
    full_url = url if url.startswith("http") else (GSC_SITE_URL.rstrip("/") + (url if url.startswith("/") else "/" + url))
    api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    api_key = os.environ.get("GOOGLE_PAGESPEED_API_KEY", "")

    params = [("url", full_url), ("strategy", strategy)]
    for cat in ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]:
        params.append(("category", cat))
    if api_key:
        params.append(("key", api_key))

    async with httpx.AsyncClient() as c:
        r = await c.get(api, params=params, timeout=60)
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=f"PageSpeed: {r.text[:200]}")
        data = r.json()

    lr = data.get("lighthouseResult", {})
    audits = lr.get("audits", {})
    categories = lr.get("categories", {})

    def metric(key):
        a = audits.get(key, {})
        return {
            "value": a.get("numericValue", 0),
            "display": a.get("displayValue", "—"),
            "score": a.get("score", 0),
        }

    return {
        "url": full_url,
        "strategy": strategy,
        "scores": {
            "performance":    int((categories.get("performance", {}).get("score") or 0) * 100),
            "seo":            int((categories.get("seo", {}).get("score") or 0) * 100),
            "accessibility":  int((categories.get("accessibility", {}).get("score") or 0) * 100),
            "best_practices": int((categories.get("best-practices", {}).get("score") or 0) * 100),
        },
        "core_web_vitals": {
            "lcp":  metric("largest-contentful-paint"),
            "cls":  metric("cumulative-layout-shift"),
            "inp":  metric("interaction-to-next-paint"),
            "fcp":  metric("first-contentful-paint"),
            "ttfb": metric("server-response-time"),
        },
        "opportunities": [
            {
                "id": k,
                "title": v.get("title", ""),
                "description": (v.get("description", "") or "")[:200],
                "saving_ms": v.get("details", {}).get("overallSavingsMs", 0),
            }
            for k, v in audits.items()
            if v.get("details", {}).get("type") == "opportunity"
               and v.get("details", {}).get("overallSavingsMs", 0) > 100
        ][:10],
    }


@seo_advanced_router.get("/opportunities")
async def find_opportunities(request: Request, days: int = 28):
    """Moteur d'opportunites priorisees : queries en page 2 pres du top10,
    pages a fort CTR latent, pages a faible position mais fort engagement.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass

    from analytics_ga4 import GSC_SITE_URL
    token = await _get_google_token()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        res = await _gsc_query(token, GSC_SITE_URL, {
            "startDate": start, "endDate": end,
            "dimensions": ["query", "page"],
            "orderBy": [{"fieldName": "impressions", "sortOrder": "DESCENDING"}],
            "rowLimit": 500,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])

    opportunities = []
    for row in res.get("rows", []):
        keys = row.get("keys") or ["", ""]
        q, page = keys[0], keys[1]
        if not q or not page:
            continue
        pos = row.get("position") or 99
        imp = row.get("impressions", 0)
        clk = row.get("clicks", 0)
        ctr = (row.get("ctr") or 0) * 100

        # Type 1 : striking distance (position 11-20, on peut pousser en page 1)
        if 10.5 <= pos <= 20 and imp >= 100:
            expected_ctr = 5  # approx CTR page 1
            potential_clicks = int(imp * expected_ctr / 100)
            gain = potential_clicks - clk
            opportunities.append({
                "type": "striking_distance",
                "query": q, "page": _path_of(page),
                "current_position": round(pos, 1),
                "current_clicks": clk, "impressions": imp, "ctr": round(ctr, 2),
                "potential_gain_clicks": gain,
                "priority_score": gain,
                "action": "Optimiser le contenu + meta description pour passer page 1",
            })

        # Type 2 : bad CTR (page 1 mais CTR < 1%)
        elif pos <= 10 and imp >= 200 and ctr < 1.5:
            expected_ctr = 3
            potential_clicks = int(imp * expected_ctr / 100)
            gain = potential_clicks - clk
            if gain > 0:
                opportunities.append({
                    "type": "low_ctr_page1",
                    "query": q, "page": _path_of(page),
                    "current_position": round(pos, 1),
                    "current_clicks": clk, "impressions": imp, "ctr": round(ctr, 2),
                    "potential_gain_clicks": gain,
                    "priority_score": gain * 1.5,
                    "action": "Reecrire title + meta description pour attirer + de clics",
                })

    opportunities.sort(key=lambda x: x["priority_score"], reverse=True)
    return {
        "period_days": days,
        "total_opportunities": len(opportunities),
        "striking_distance": len([o for o in opportunities if o["type"] == "striking_distance"]),
        "low_ctr_page1": len([o for o in opportunities if o["type"] == "low_ctr_page1"]),
        "opportunities": opportunities[:30],
    }
