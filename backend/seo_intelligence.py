"""
SEO Intelligence — Global Clean Home (Phase 3)
- Intent Matcher : requetes ↔ pages optimales (détection de mismatch)
- Content Gap : mots-cles avec volume mais sans page dediee
- Internal Links : graphe de maillage interne derive des sessions trackees
- Action Library : CRUD de la bibliotheque d'actions SEO reutilisables
"""
import os
import logging
import uuid
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger(__name__)
seo_intel_router = APIRouter(prefix="/api/seo", tags=["seo-intel"])
_db = None


def init_seo_intel_db(database):
    global _db
    _db = database


async def _ensure_intel_indexes():
    if _db is None:
        return
    try:
        await _db.seo_actions.create_index([("status", 1), ("priority", 1)])
        await _db.seo_actions.create_index("created_at")
        await _db.seo_actions.create_index([("url", 1), ("status", 1)])
    except Exception as e:
        logger.warning(f"seo_actions index: {e}")


# ───────────────────────── HELPERS ─────────────────────────
def _path_of(url: str) -> str:
    try:
        p = urlparse(url)
        return p.path or "/"
    except Exception:
        return url or "/"


def _normalize(text: str) -> str:
    """Normalisation pour comparaison : lowercase + sans accents + sans ponctuation."""
    if not text:
        return ""
    t = unicodedata.normalize("NFD", text)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = t.lower()
    t = re.sub(r"[^a-z0-9\s-]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _tokens(text: str) -> set:
    """Tokens pertinents (mots de longueur >= 3, sans stop-words basiques)."""
    stop = {"les", "des", "pour", "avec", "sans", "dans", "vers", "une", "aux", "chez", "sur", "par", "qui", "que"}
    return {w for w in _normalize(text).split() if len(w) >= 3 and w not in stop}


async def _get_google_token():
    from gmail_service import _get_any_active_token
    token, _ = await _get_any_active_token()
    if not token:
        raise HTTPException(status_code=401, detail="Aucun token Google. Reconnectez Gmail.")
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


# ───────────────────────── INTENT MATCHER ─────────────────────────
@seo_intel_router.get("/intent-match")
async def intent_match(request: Request, days: int = 28, min_impressions: int = 50):
    """Pour chaque requete GSC top, compare les tokens avec le path de l'URL
    qui ranke. Retourne les mismatches : requetes ou aucune page ne matche
    vraiment, donc Google choisit 'au hasard' → mauvais signal pour le SEO.
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

    matches = []
    for row in res.get("rows", []):
        keys = row.get("keys") or ["", ""]
        q, page = keys[0], keys[1]
        imp = row.get("impressions", 0)
        if not q or not page or imp < min_impressions:
            continue

        q_tokens = _tokens(q)
        path_tokens = _tokens(_path_of(page).replace("-", " ").replace("/", " "))
        if not q_tokens:
            continue
        overlap = q_tokens & path_tokens
        score = len(overlap) / max(len(q_tokens), 1)

        verdict = "perfect" if score >= 0.7 else "good" if score >= 0.4 else "partial" if score > 0 else "mismatch"
        matches.append({
            "query": q,
            "page": _path_of(page),
            "position": round(row.get("position") or 0, 1),
            "impressions": imp,
            "clicks": row.get("clicks", 0),
            "ctr": round((row.get("ctr") or 0) * 100, 2),
            "match_score": round(score, 2),
            "verdict": verdict,
            "matched_tokens": sorted(overlap),
            "missing_from_url": sorted(q_tokens - path_tokens),
        })

    # Trier : mismatches en premier (ils sont les plus problematiques avec impressions elevees)
    priority_order = {"mismatch": 0, "partial": 1, "good": 2, "perfect": 3}
    matches.sort(key=lambda m: (priority_order[m["verdict"]], -m["impressions"]))

    return {
        "period_days": days,
        "total_analyzed": len(matches),
        "mismatches": len([m for m in matches if m["verdict"] == "mismatch"]),
        "partial": len([m for m in matches if m["verdict"] == "partial"]),
        "good": len([m for m in matches if m["verdict"] == "good"]),
        "perfect": len([m for m in matches if m["verdict"] == "perfect"]),
        "matches": matches[:80],
    }


# ───────────────────────── CONTENT GAP ─────────────────────────
@seo_intel_router.get("/content-gap")
async def content_gap(request: Request, days: int = 28, min_impressions: int = 100):
    """Requetes qui ont du volume mais ou ton site est mal positionne (>20)
    ET aucune page n'a de tokens matching forts = besoin d'une nouvelle page.
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

    # Agrege par query : impressions totales et best position
    by_query = {}
    for row in res.get("rows", []):
        keys = row.get("keys") or ["", ""]
        q, page = keys[0], keys[1]
        if not q:
            continue
        by_query.setdefault(q, {
            "query": q, "impressions": 0, "clicks": 0, "best_position": 999, "best_page": "", "pages": [],
        })
        entry = by_query[q]
        entry["impressions"] += row.get("impressions", 0)
        entry["clicks"] += row.get("clicks", 0)
        pos = row.get("position") or 999
        if pos < entry["best_position"]:
            entry["best_position"] = pos
            entry["best_page"] = _path_of(page) if page else ""
        entry["pages"].append(_path_of(page) if page else "")

    gaps = []
    for q, data in by_query.items():
        if data["impressions"] < min_impressions:
            continue
        # Critere gap : best_position > 15 (hors page 1) + best_page a une correspondance faible
        if data["best_position"] > 15:
            q_tokens = _tokens(q)
            best_path_tokens = _tokens(data["best_page"].replace("-", " ").replace("/", " "))
            overlap_score = len(q_tokens & best_path_tokens) / max(len(q_tokens), 1)
            # Plus overlap faible ET impressions haute => gap plus critique
            gap_score = round(data["impressions"] * (1 - overlap_score), 0)
            # Estimation : si on crée une page dédiée, 3% CTR en moyenne
            potential_monthly_clicks = int(data["impressions"] * 0.03)
            gaps.append({
                "query": q,
                "impressions": data["impressions"],
                "current_clicks": data["clicks"],
                "best_position": round(data["best_position"], 1),
                "best_page": data["best_page"],
                "match_score": round(overlap_score, 2),
                "gap_score": gap_score,
                "suggested_url": "/" + re.sub(r"[^a-z0-9]+", "-", _normalize(q)).strip("-") + "/",
                "potential_monthly_clicks": potential_monthly_clicks,
                "severity": "high" if gap_score > 200 else "medium" if gap_score > 50 else "low",
            })

    gaps.sort(key=lambda g: g["gap_score"], reverse=True)
    return {
        "period_days": days,
        "total_gaps": len(gaps),
        "high_severity": len([g for g in gaps if g["severity"] == "high"]),
        "gaps": gaps[:40],
    }


# ───────────────────────── INTERNAL LINKS (via tracker sessions) ─────────────────────────
@seo_intel_router.get("/internal-links")
async def internal_links_graph(request: Request, days: int = 7):
    """Analyse le maillage interne effectif : pour chaque session tracker,
    regarde les pages visitees consecutivement et extrait les paires
    (from_path -> to_path). Construit un graphe des flux.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")

    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    events = await _db.tracking_events.find(
        {"timestamp": {"$gte": since}, "event_type": "page_view"},
        {"_id": 0, "session_id": 1, "page_url": 1, "timestamp": 1},
    ).sort([("session_id", 1), ("timestamp", 1)]).to_list(20000)

    # Grouper par session_id et extraire les paires consecutives
    sessions = {}
    for e in events:
        sid = e.get("session_id")
        if not sid:
            continue
        sessions.setdefault(sid, []).append(e.get("page_url") or "")

    transitions = {}  # (from, to) -> count
    pages_seen = {}  # path -> visits count (nb sessions ayant vu cette page)
    for sid, urls in sessions.items():
        paths = [_path_of(u) for u in urls if u]
        unique_in_session = set(paths)
        for p in unique_in_session:
            pages_seen[p] = pages_seen.get(p, 0) + 1
        for i in range(len(paths) - 1):
            a, b = paths[i], paths[i + 1]
            if a == b:
                continue
            key = f"{a}||{b}"
            transitions[key] = transitions.get(key, 0) + 1

    # Top links
    edges = []
    for key, count in transitions.items():
        a, b = key.split("||", 1)
        edges.append({"from": a, "to": b, "count": count})
    edges.sort(key=lambda x: x["count"], reverse=True)

    # Pages sans lien sortant vers d'autres (cul-de-sac)
    pages_with_outbound = set(e["from"] for e in edges)
    dead_ends = [p for p in pages_seen.keys() if p not in pages_with_outbound]
    # Pages sans lien entrant (orphelines de maillage)
    pages_with_inbound = set(e["to"] for e in edges)
    no_inbound = [p for p in pages_seen.keys() if p not in pages_with_inbound]

    return {
        "period_days": days,
        "total_sessions": len(sessions),
        "total_pages": len(pages_seen),
        "total_transitions": sum(transitions.values()),
        "unique_edges": len(edges),
        "edges": edges[:100],
        "hubs": sorted(
            [{"path": p, "inbound": sum(1 for e in edges if e["to"] == p),
              "outbound": sum(1 for e in edges if e["from"] == p)}
             for p in pages_seen.keys()],
            key=lambda x: x["inbound"] + x["outbound"], reverse=True
        )[:15],
        "dead_ends": dead_ends[:20],
        "no_inbound": no_inbound[:20],
    }


# ───────────────────────── ACTION LIBRARY (CRUD) ─────────────────────────
class SeoAction(BaseModel):
    title: str
    description: Optional[str] = ""
    type: str = "content"  # content | technical | ux | performance | conversion | link_building
    priority: str = "medium"  # low | medium | high | critical
    url: Optional[str] = None
    query: Optional[str] = None
    impact_estimate: Optional[str] = None
    impact_clicks: Optional[int] = 0
    status: str = "todo"  # todo | in_progress | done | dropped
    notes: Optional[str] = ""
    tags: List[str] = []


class SeoActionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    url: Optional[str] = None
    query: Optional[str] = None
    impact_estimate: Optional[str] = None
    impact_clicks: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


@seo_intel_router.post("/actions")
async def create_action(action: SeoAction, request: Request):
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")
    doc = {
        "action_id": f"sa_{uuid.uuid4().hex[:12]}",
        **action.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    await _db.seo_actions.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "action": doc}


@seo_intel_router.get("/actions")
async def list_actions(request: Request, status: Optional[str] = None, priority: Optional[str] = None,
                       type: Optional[str] = None, limit: int = 200):
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")
    q = {}
    if status: q["status"] = status
    if priority: q["priority"] = priority
    if type: q["type"] = type
    items = await _db.seo_actions.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    stats = {
        "total": await _db.seo_actions.count_documents({}),
        "todo": await _db.seo_actions.count_documents({"status": "todo"}),
        "in_progress": await _db.seo_actions.count_documents({"status": "in_progress"}),
        "done": await _db.seo_actions.count_documents({"status": "done"}),
        "dropped": await _db.seo_actions.count_documents({"status": "dropped"}),
    }
    return {"count": len(items), "stats": stats, "actions": items}


@seo_intel_router.put("/actions/{action_id}")
async def update_action(action_id: str, patch: SeoActionUpdate, request: Request):
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")
    update = {k: v for k, v in patch.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update.get("status") == "done":
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    result = await _db.seo_actions.update_one({"action_id": action_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Action introuvable")
    doc = await _db.seo_actions.find_one({"action_id": action_id}, {"_id": 0})
    return {"success": True, "action": doc}


@seo_intel_router.delete("/actions/{action_id}")
async def delete_action(action_id: str, request: Request):
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")
    result = await _db.seo_actions.delete_one({"action_id": action_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Action introuvable")
    return {"success": True}


@seo_intel_router.post("/actions/seed-from-opportunities")
async def seed_from_opportunities(request: Request, days: int = 28):
    """Cree automatiquement des actions dans la library a partir des
    opportunites detectees par /api/seo/opportunities (striking distance
    et low CTR page 1). Evite les doublons via le champ query+url.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")

    # Appel direct de la logique d'opportunities
    from seo_advanced import find_opportunities
    data = await find_opportunities(request, days=days)
    opps = data.get("opportunities", [])

    created = 0
    skipped = 0
    for o in opps[:15]:  # top 15 seulement pour ne pas inonder
        exists = await _db.seo_actions.find_one({
            "query": o["query"], "url": o["page"],
            "status": {"$in": ["todo", "in_progress"]},
        })
        if exists:
            skipped += 1
            continue
        action = {
            "action_id": f"sa_{uuid.uuid4().hex[:12]}",
            "title": f"{'Passer page 1' if o['type'] == 'striking_distance' else 'Optimiser meta'} — « {o['query']} »",
            "description": o.get("action", ""),
            "type": "content" if o["type"] == "striking_distance" else "ux",
            "priority": "high" if o["priority_score"] > 100 else "medium" if o["priority_score"] > 30 else "low",
            "url": o["page"], "query": o["query"],
            "impact_estimate": f"+{o['potential_gain_clicks']} clics/mois",
            "impact_clicks": o["potential_gain_clicks"],
            "status": "todo",
            "notes": f"Pos actuelle #{o['current_position']} · CTR {o['ctr']}% · {o['impressions']} impressions",
            "tags": [o["type"], "auto-generated"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
        }
        await _db.seo_actions.insert_one(action)
        created += 1

    return {"success": True, "created": created, "skipped_duplicates": skipped}
