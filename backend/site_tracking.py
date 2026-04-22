"""
Site Tracking — Global Clean Home
Couche de tracking avancee au dessus de /api/tracking/event :
- Snippet JS servi pret a coller sur www.globalcleanhome.com
- Health check reel : GA4 + GSC + Tracker custom + Ads
- Funnel complet visite -> CTA -> form -> lead -> devis -> facture
- Feed live des derniers events (debug + ops)
- Attribution UTM par campagne
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import PlainTextResponse

logger = logging.getLogger(__name__)
tracker_router = APIRouter(prefix="/api/tracker", tags=["tracker"])
_db = None

SITE_URL = os.environ.get("SITE_URL", "https://www.globalcleanhome.com")
BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL", "https://crm-global-clean-home-production.up.railway.app").rstrip("/")


def init_site_tracking_db(database):
    global _db
    _db = database
    # Index sur le cache géoloc IP (pas de TTL — on garde les IPs pour toujours)
    try:
        import asyncio
        asyncio.get_event_loop().create_task(
            database.ip_geocache.create_index("ip", unique=True)
        )
    except Exception:
        pass  # Non-bloquant si l'index existe déjà


# ───────────────────────── SNIPPET JS SERVI ─────────────────────────
TRACKER_JS = r"""
/*! Global Clean Home — Site Tracker (auto) */
(function () {
  var ENDPOINT = "__BACKEND__/api/tracking/event";
  var SITE = "__SITE__";
  var VKEY = "gch_visitor_id";
  var SKEY = "gch_session_id";
  var STKEY = "gch_session_ts";
  var SESSION_TTL_MIN = 30;

  function uid() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  }
  function nowIso() { return new Date().toISOString(); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function visitorId() {
    var id = get(VKEY);
    if (!id) { id = "v_" + uid(); set(VKEY, id); }
    return id;
  }
  function sessionId() {
    var ts = parseInt(get(STKEY) || "0", 10);
    var now = Date.now();
    if (!get(SKEY) || (now - ts) > SESSION_TTL_MIN * 60 * 1000) {
      set(SKEY, "s_" + uid());
    }
    set(STKEY, String(now));
    return get(SKEY);
  }

  function utm() {
    try {
      var q = new URLSearchParams(window.location.search);
      var out = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"].forEach(function (k) {
        var v = q.get(k); if (v) out[k] = v;
      });
      // Stocke la premiere attribution
      if (Object.keys(out).length) {
        try { set("gch_utm", JSON.stringify(out)); } catch (e) {}
      } else {
        try { var saved = get("gch_utm"); if (saved) out = JSON.parse(saved); } catch (e) {}
      }
      return out;
    } catch (e) { return {}; }
  }

  function deviceInfo() {
    var ua = navigator.userAgent || "";
    var mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    return {
      device_type: mobile ? "mobile" : "desktop",
      user_agent: ua,
      lang: navigator.language,
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
      screen: (screen.width + "x" + screen.height),
      viewport: (window.innerWidth + "x" + window.innerHeight)
    };
  }

  function send(type, extra) {
    var body = Object.assign({
      event_type: type,
      timestamp: nowIso(),
      page_url: location.href,
      page_title: document.title || "",
      referrer: document.referrer || "",
      visitor_id: visitorId(),
      session_id: sessionId(),
      site: SITE,
      device_info: deviceInfo()
    }, utm(), extra || {});
    try {
      var blob = new Blob([JSON.stringify(body)], { type: "application/json" });
      if (navigator.sendBeacon) { navigator.sendBeacon(ENDPOINT, blob); return; }
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
        credentials: "omit"
      }).catch(function () {});
    } catch (e) {}
  }

  // Pageview
  send("page_view");

  // History (SPA)
  (function patch(ev) {
    var orig = history[ev];
    history[ev] = function () {
      var r = orig.apply(this, arguments);
      window.dispatchEvent(new Event("gch:locationchange"));
      return r;
    };
  })("pushState");
  window.addEventListener("popstate", function () { window.dispatchEvent(new Event("gch:locationchange")); });
  window.addEventListener("gch:locationchange", function () { setTimeout(function () { send("page_view"); }, 50); });

  // CTA clicks (phone / email / whatsapp / cta-tagged)
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("a,button,[data-gch-cta]") : null;
    if (!el) return;
    var type = null;
    var href = (el.getAttribute && el.getAttribute("href")) || "";
    if (el.hasAttribute && el.hasAttribute("data-gch-cta")) type = "cta_click";
    else if (href.indexOf("tel:") === 0) type = "phone_click";
    else if (href.indexOf("mailto:") === 0) type = "email_click";
    else if (/wa\.me|whatsapp/i.test(href)) type = "whatsapp_click";
    else if (/devis|quote|contact/i.test(href) || /devis|contact/i.test(el.textContent || "")) type = "cta_click";
    if (!type) return;
    send(type, {
      cta_label: (el.textContent || "").trim().slice(0, 80),
      cta_href: href,
      cta_id: el.id || null,
      cta_tag: el.getAttribute && el.getAttribute("data-gch-cta")
    });
  }, { passive: true });

  // Form submit -> try to capture lead fields
  document.addEventListener("submit", function (e) {
    try {
      var f = e.target;
      if (!f || !f.elements) return;
      var ld = {};
      for (var i = 0; i < f.elements.length; i++) {
        var x = f.elements[i]; if (!x.name) continue;
        var n = x.name.toLowerCase();
        if (/name|nom|prenom/.test(n) && !ld.name) ld.name = x.value;
        else if (/email|mail/.test(n) && !ld.email) ld.email = x.value;
        else if (/phone|tel|gsm/.test(n) && !ld.phone) ld.phone = x.value;
        else if (/message|msg|comment/.test(n) && !ld.message) ld.message = x.value;
        else if (/service/.test(n) && !ld.service_type) ld.service_type = x.value;
        else if (/surface|m2|metre/.test(n) && !ld.surface) ld.surface = x.value;
        else if (/address|adresse|ville|code/.test(n) && !ld.address) ld.address = x.value;
      }
      send("form_submit", {
        form_id: f.id || null,
        form_name: f.getAttribute("name") || null,
        form_action: f.action || null,
        lead_data: (ld.email || ld.phone || ld.name) ? ld : null
      });
    } catch (err) {}
  }, { passive: true });

  // Scroll depth: 25 / 50 / 75 / 100
  var scrollMarks = { 25: false, 50: false, 75: false, 100: false };
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    var pct = Math.min(100, Math.round((h.scrollTop / max) * 100));
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !scrollMarks[m]) { scrollMarks[m] = true; send("scroll_depth", { depth: m }); }
    });
  }, { passive: true });

  // Time on page (every 30s, max 10 min)
  var secs = 0, maxSecs = 600;
  var timer = setInterval(function () {
    secs += 30; if (secs > maxSecs) { clearInterval(timer); return; }
    send("time_on_page", { seconds: secs });
  }, 30000);

  // Visibility change -> heartbeat
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") send("page_leave");
    else if (document.visibilityState === "visible") send("page_visible");
  }, { passive: true });

  // Expose API minimaliste
  window.gchTrack = function (type, data) { send(type || "custom", data || {}); };
  window.gchSetLead = function (lead) { try { set("gch_lead", JSON.stringify(lead || {})); } catch (e) {} };
})();
"""


@tracker_router.get("/script.js")
async def serve_tracker_script():
    """Snippet JS a coller dans le <head> du site. Public, cache 10 min."""
    js = TRACKER_JS.replace("__BACKEND__", BACKEND_URL).replace("__SITE__", SITE_URL)
    return Response(
        content=js,
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "public, max-age=600"},
    )


@tracker_router.get("/snippet")
async def get_snippet_html():
    """HTML pret a copier pour integration site (dev + prod)."""
    src = f"{BACKEND_URL}/api/tracker/script.js"
    html = f'<script defer src="{src}"></script>'
    return {
        "html": html,
        "src": src,
        "instructions": [
            "Copier la balise ci-dessous.",
            "La coller juste avant </head> de toutes les pages de " + SITE_URL + ".",
            "Aucune conf supplementaire : visitor_id + session_id + UTM captures automatiquement.",
            "Tag un bouton avec data-gch-cta=\"devis\" pour le forcer en CTA.",
        ],
    }


# ───────────────────────── HEALTH ─────────────────────────
async def _check_ga4(token_fn):
    try:
        import httpx
        from analytics_ga4 import GA4_PROPERTY_ID
        token, _ = await token_fn()
        if not token:
            return {"status": "disconnected", "detail": "Aucun token Google"}
        url = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
        async with httpx.AsyncClient() as c:
            r = await c.post(url, headers={"Authorization": f"Bearer {token}"},
                             json={"dateRanges": [{"startDate": "yesterday", "endDate": "today"}],
                                   "metrics": [{"name": "sessions"}]}, timeout=10)
            if r.status_code == 200:
                val = 0
                try:
                    val = int(float(r.json()["rows"][0]["metricValues"][0]["value"]))
                except Exception:
                    pass
                return {"status": "ok", "sessions_last_48h": val, "property": GA4_PROPERTY_ID}
            return {"status": "error", "code": r.status_code, "detail": r.text[:140]}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:180]}


async def _check_gsc(token_fn):
    try:
        import httpx
        from analytics_ga4 import GSC_SITE_URL
        token, _ = await token_fn()
        if not token:
            return {"status": "disconnected", "detail": "Aucun token Google"}
        site_enc = GSC_SITE_URL.replace("/", "%2F").replace(":", "%3A")
        url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{site_enc}/searchAnalytics/query"
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        async with httpx.AsyncClient() as c:
            r = await c.post(url, headers={"Authorization": f"Bearer {token}"},
                             json={"startDate": start, "endDate": end, "dimensions": [], "rowLimit": 1}, timeout=10)
            if r.status_code == 200:
                rows = r.json().get("rows", [])
                clicks = int(rows[0].get("clicks", 0)) if rows else 0
                impressions = int(rows[0].get("impressions", 0)) if rows else 0
                return {"status": "ok", "site": GSC_SITE_URL, "clicks_7d": clicks, "impressions_7d": impressions}
            return {"status": "error", "code": r.status_code, "detail": r.text[:140]}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:180]}


async def _check_tracker():
    if _db is None:
        return {"status": "error", "detail": "db non initialisee"}
    try:
        now = datetime.now(timezone.utc)
        last24 = (now - timedelta(hours=24)).isoformat()
        last7d = (now - timedelta(days=7)).isoformat()
        events_24h = await _db.tracking_events.count_documents({"timestamp": {"$gte": last24}})
        events_7d = await _db.tracking_events.count_documents({"timestamp": {"$gte": last7d}})
        last_ev = await _db.tracking_events.find_one({}, sort=[("timestamp", -1)])
        last_ts = (last_ev or {}).get("timestamp") or (last_ev or {}).get("server_timestamp")
        visitors_24h = len(await _db.tracking_events.distinct("visitor_id", {"timestamp": {"$gte": last24}}))
        if events_24h == 0 and events_7d == 0:
            status = "disconnected"
            detail = "Aucun event recu. Installer le snippet sur " + SITE_URL
        elif events_24h == 0:
            status = "stale"
            detail = "Events presents sur 7j mais aucun dans les 24h."
        else:
            status = "ok"
            detail = None
        return {"status": status, "events_24h": events_24h, "events_7d": events_7d,
                "visitors_24h": visitors_24h, "last_event_at": last_ts, "detail": detail}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:180]}


async def _check_ads():
    if _db is None:
        return {"status": "error", "detail": "db non initialisee"}
    try:
        camps = await _db.ad_campaigns.count_documents({})
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        spends_30d = await _db.ad_spends.count_documents({"date": {"$gte": start}})
        if camps == 0 and spends_30d == 0:
            return {"status": "disconnected", "detail": "Aucune campagne ni depense enregistree."}
        return {"status": "ok", "campaigns": camps, "spends_entries_30d": spends_30d}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:180]}


@tracker_router.get("/health")
async def tracker_health(request: Request):
    """Etat temps reel de toutes les sources de donnees SEO/Analytics."""
    try:
        from server import require_auth
        await require_auth(request)
    except HTTPException:
        raise
    except Exception:
        pass

    async def _token():
        from gmail_service import _get_any_active_token
        return await _get_any_active_token()

    ga4 = await _check_ga4(_token)
    gsc = await _check_gsc(_token)
    tracker = await _check_tracker()
    ads = await _check_ads()

    items = [("ga4", ga4), ("gsc", gsc), ("tracker", tracker), ("ads", ads)]
    ok_count = sum(1 for _, x in items if x.get("status") == "ok")
    status = "ok" if ok_count == len(items) else ("partial" if ok_count > 0 else "down")

    return {
        "status": status,
        "ok_count": ok_count,
        "total": len(items),
        "site": SITE_URL,
        "backend": BACKEND_URL,
        "snippet_src": f"{BACKEND_URL}/api/tracker/script.js",
        "sources": {
            "ga4": ga4,
            "gsc": gsc,
            "tracker": tracker,
            "ads": ads,
        },
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


# ───────────────────────── LIVE FEED ─────────────────────────
@tracker_router.get("/recent")
async def tracker_recent(request: Request, limit: int = 50):
    """Derniers events recus (debug / ops)."""
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    limit = max(1, min(200, int(limit)))
    rows = await _db.tracking_events.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    # Normalise champs utiles
    out = []
    for r in rows:
        out.append({
            "event_type": r.get("event_type"),
            "timestamp": r.get("timestamp") or r.get("server_timestamp"),
            "page_url": r.get("page_url"),
            "page_title": r.get("page_title"),
            "visitor_id": r.get("visitor_id"),
            "session_id": r.get("session_id"),
            "utm_source": r.get("utm_source"),
            "utm_medium": r.get("utm_medium"),
            "utm_campaign": r.get("utm_campaign"),
            "referrer": r.get("referrer"),
            "device_type": (r.get("device_info") or {}).get("device_type"),
            "extra": {k: v for k, v in r.items() if k in ("cta_label", "cta_href", "depth", "seconds", "form_id", "lead_data")},
        })
    return {"count": len(out), "events": out}


# ───────────────────────── FUNNEL COMPLET ─────────────────────────
@tracker_router.get("/funnel")
async def tracker_funnel(request: Request, period: str = "30d"):
    """Funnel complet visite -> CTA -> form -> lead -> devis -> facture, UTM-attribue."""
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    days = {"1d": 1, "7d": 7, "14d": 14, "30d": 30, "90d": 90}.get(period, 30)
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()

    events = await _db.tracking_events.find(
        {"timestamp": {"$gte": start}},
        {"_id": 0, "event_type": 1, "visitor_id": 1, "session_id": 1, "page_url": 1,
         "utm_source": 1, "utm_medium": 1, "utm_campaign": 1, "referrer": 1, "timestamp": 1}
    ).to_list(50000)

    leads = await _db.leads.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "lead_id": 1, "visitor_id": 1, "session_id": 1, "status": 1,
         "utm_source": 1, "utm_medium": 1, "utm_campaign": 1, "source": 1, "created_at": 1}
    ).to_list(50000)

    quotes = await _db.quotes.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "lead_id": 1, "status": 1, "amount_ht": 1, "amount_ttc": 1, "created_at": 1}
    ).to_list(50000)

    invoices = await _db.invoices.find(
        {"created_at": {"$gte": start}},
        {"_id": 0, "lead_id": 1, "status": 1, "amount_ttc": 1, "created_at": 1}
    ).to_list(50000)

    # Niveaux du funnel
    visitors = set(e.get("visitor_id") for e in events if e.get("visitor_id"))
    pages = set(e.get("visitor_id") for e in events if e.get("event_type") == "page_view" and e.get("visitor_id"))
    engaged = set(e.get("visitor_id") for e in events
                  if e.get("event_type") in ("scroll_depth",) and e.get("visitor_id"))
    cta = set(e.get("visitor_id") for e in events
              if e.get("event_type") in ("cta_click", "phone_click", "email_click", "whatsapp_click")
              and e.get("visitor_id"))
    forms = set(e.get("visitor_id") for e in events if e.get("event_type") == "form_submit" and e.get("visitor_id"))

    # Lead matching par visitor_id OU session_id
    lead_visitors = set(l.get("visitor_id") for l in leads if l.get("visitor_id"))
    lead_by_id = {l.get("lead_id"): l for l in leads if l.get("lead_id")}
    won_leads = set(l.get("lead_id") for l in leads if l.get("status") in ("gagné", "gagne", "won"))
    quoted_leads = set(q.get("lead_id") for q in quotes if q.get("lead_id"))
    paid_leads = set(i.get("lead_id") for i in invoices if i.get("status") in ("payée", "payee", "paid"))

    revenue = sum(float(i.get("amount_ttc") or 0) for i in invoices if i.get("status") in ("payée", "payee", "paid"))
    pipeline = sum(float(q.get("amount_ttc") or q.get("amount_ht") or 0) for q in quotes if q.get("status") != "perdu")

    # Attribution par canal
    def channel(src, med):
        s = (src or "").lower()
        m = (med or "").lower()
        if "google" in s and ("cpc" in m or "paid" in m): return "Google Ads"
        if "google" in s: return "Google"
        if "facebook" in s or "fb" in s or "meta" in s: return "Meta Ads" if "cpc" in m or "paid" in m else "Facebook"
        if "instagram" in s or "ig" in s: return "Instagram"
        if "bing" in s: return "Bing"
        if "direct" in s or not s: return "Direct"
        return s.capitalize()

    channels = {}
    for l in leads:
        ch = channel(l.get("utm_source") or l.get("source"), l.get("utm_medium"))
        channels.setdefault(ch, {"channel": ch, "leads": 0, "won": 0, "revenue": 0.0})
        channels[ch]["leads"] += 1
        if l.get("lead_id") in won_leads:
            channels[ch]["won"] += 1
        if l.get("lead_id") in paid_leads:
            for i in invoices:
                if i.get("lead_id") == l.get("lead_id") and i.get("status") in ("payée", "payee", "paid"):
                    channels[ch]["revenue"] += float(i.get("amount_ttc") or 0)

    channels_list = sorted(channels.values(), key=lambda x: x["leads"], reverse=True)

    # Conversion rates
    def rate(a, b): return round((a / b * 100), 2) if b > 0 else 0

    return {
        "period": period,
        "funnel": [
            {"step": "Visiteurs", "value": len(visitors)},
            {"step": "Pages vues", "value": len(pages)},
            {"step": "Engages (scroll 25%+)", "value": len(engaged)},
            {"step": "CTA clic", "value": len(cta)},
            {"step": "Formulaires", "value": len(forms)},
            {"step": "Leads CRM", "value": len(leads)},
            {"step": "Devis envoyes", "value": len(quoted_leads)},
            {"step": "Leads gagnes", "value": len(won_leads)},
            {"step": "Factures payees", "value": len(paid_leads)},
        ],
        "rates": {
            "visit_to_cta": rate(len(cta), len(visitors)),
            "cta_to_form": rate(len(forms), len(cta)),
            "form_to_lead": rate(len(leads), len(forms)),
            "lead_to_quote": rate(len(quoted_leads), len(leads)),
            "quote_to_won": rate(len(won_leads), len(quoted_leads) or 1),
            "won_to_paid": rate(len(paid_leads), len(won_leads) or 1),
            "visit_to_lead": rate(len(leads), len(visitors)),
            "visit_to_paid": rate(len(paid_leads), len(visitors)),
        },
        "revenue": round(revenue, 2),
        "pipeline": round(pipeline, 2),
        "channels": channels_list,
        "linked_visitors_to_leads": len(lead_visitors),
    }


# ───────────────────────── KEYWORD RANK TRACKER ─────────────────────────
@tracker_router.get("/visitors")
async def list_visitors(request: Request, hours: int = 24, limit: int = 100, include_identified: bool = True):
    """Liste les visiteurs recents avec leur geoloc approximative et, si ils
    sont matches avec un lead CRM via visitor_id/session_id, leurs coordonnees.

    IMPORTANT (RGPD) : les coordonnees (nom/email/tel) ne sont retournees QUE
    pour les visiteurs qui ont REMPLI un formulaire sur le site. Les visiteurs
    anonymes ne peuvent pas etre identifies legalement.
    """
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    if _db is None:
        raise HTTPException(status_code=500, detail="DB non initialisee")

    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    # Pipeline aggregation : grouper par visitor_id, derniere activite
    pipeline = [
        {"$match": {"timestamp": {"$gte": since}, "visitor_id": {"$ne": None}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$visitor_id",
            "visitor_id": {"$first": "$visitor_id"},
            "session_id": {"$first": "$session_id"},
            "last_seen": {"$first": "$timestamp"},
            "first_seen": {"$last": "$timestamp"},
            "last_page": {"$first": "$page_url"},
            "last_title": {"$first": "$page_title"},
            "last_referrer": {"$first": "$referrer"},
            "utm_source": {"$first": "$utm_source"},
            "utm_medium": {"$first": "$utm_medium"},
            "utm_campaign": {"$first": "$utm_campaign"},
            "device_info": {"$first": "$device_info"},
            "ip": {"$first": "$ip"},
            "event_count": {"$sum": 1},
        }},
        {"$sort": {"last_seen": -1}},
        {"$limit": limit},
    ]
    visitors = await _db.tracking_events.aggregate(pipeline).to_list(limit)

    # Collecter les visitor_id/session_id pour joindre les leads
    visitor_ids = [v["visitor_id"] for v in visitors if v.get("visitor_id")]
    session_ids = [v["session_id"] for v in visitors if v.get("session_id")]

    leads_index = {}
    if include_identified and (visitor_ids or session_ids):
        leads_cursor = _db.leads.find({
            "$or": [
                {"visitor_id": {"$in": visitor_ids}},
                {"session_id": {"$in": session_ids}},
            ]
        }, {
            "_id": 0, "lead_id": 1, "name": 1, "email": 1, "phone": 1,
            "address": 1, "city": 1, "visitor_id": 1, "session_id": 1,
            "service_type": 1, "status": 1, "score": 1, "created_at": 1,
        })
        async for lead in leads_cursor:
            if lead.get("visitor_id"):
                leads_index[lead["visitor_id"]] = lead
            if lead.get("session_id"):
                leads_index.setdefault(lead["session_id"], lead)

    # Cache geoloc IP — persisté en MongoDB (collection ip_geocache, TTL 24h)
    # Au lieu de l'ancien dict en mémoire (perdu après chaque requête),
    # on cache dans Mongo → 0 appel ipapi.co pour les IPs déjà vues.
    # Résultat : chargement instantané pour les visiteurs récurrents.

    async def geoip(ip: str):
        if not ip or ip in ("unknown", "127.0.0.1", "localhost"):
            return None

        # 1. Chercher dans le cache MongoDB
        cached = await _db.ip_geocache.find_one({"ip": ip})
        if cached:
            loc = cached.get("location")
            return loc  # peut être None (IP non résolue → on re-tente pas avant TTL)

        # 2. Appel ipapi.co (seulement si pas en cache)
        loc = None
        try:
            import httpx
            async with httpx.AsyncClient() as c:
                r = await c.get(f"https://ipapi.co/{ip}/json/", timeout=4)
                if r.status_code == 200:
                    d = r.json()
                    if not d.get("error"):
                        loc = {
                            "city": d.get("city"),
                            "region": d.get("region"),
                            "country": d.get("country_name"),
                            "country_code": d.get("country_code"),
                            "lat": d.get("latitude"),
                            "lon": d.get("longitude"),
                            "timezone": d.get("timezone"),
                            "isp": d.get("org"),
                        }
        except Exception as e:
            logger.debug(f"geoip error for {ip[:8]}***: {e}")

        # 3. Persister dans le cache (même si None → évite de re-tenter)
        try:
            await _db.ip_geocache.update_one(
                {"ip": ip},
                {"$set": {"ip": ip, "location": loc, "cached_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
        except Exception:
            pass  # Non-bloquant

        return loc

    # Enrichir les visiteurs
    out = []
    identified_count = 0
    for v in visitors:
        lead = leads_index.get(v.get("visitor_id")) or leads_index.get(v.get("session_id"))
        loc = await geoip(v.get("ip", ""))
        is_identified = bool(lead)
        if is_identified:
            identified_count += 1
        out.append({
            "visitor_id": v.get("visitor_id"),
            "session_id": v.get("session_id"),
            "last_seen": v.get("last_seen"),
            "first_seen": v.get("first_seen"),
            "last_page": v.get("last_page"),
            "last_title": v.get("last_title"),
            "referrer": v.get("last_referrer"),
            "utm_source": v.get("utm_source"),
            "utm_campaign": v.get("utm_campaign"),
            "device": (v.get("device_info") or {}).get("device_type"),
            "user_agent": (v.get("device_info") or {}).get("user_agent", "")[:80],
            "event_count": v.get("event_count", 0),
            "identified": is_identified,
            "location": loc,  # Ville/pays approximatif via IP
            "lead": {
                "lead_id": lead.get("lead_id"),
                "name": lead.get("name"),
                "email": lead.get("email"),
                "phone": lead.get("phone"),
                "address": lead.get("address"),
                "city": lead.get("city"),
                "service_type": lead.get("service_type"),
                "status": lead.get("status"),
                "score": lead.get("score"),
                "created_at": lead.get("created_at"),
            } if lead else None,
        })

    return {
        "period_hours": hours,
        "total_visitors": len(out),
        "identified": identified_count,
        "anonymous": len(out) - identified_count,
        "identified_pct": round(identified_count / max(len(out), 1) * 100, 1),
        "visitors": out,
    }


@tracker_router.get("/keywords")
async def tracker_keywords(request: Request, days: int = 28, limit: int = 50):
    """Positions GSC par mot-cle, triees par impressions, avec delta."""
    try:
        from server import require_auth
        await require_auth(request)
    except Exception:
        pass
    try:
        import httpx
        from gmail_service import _get_any_active_token
        from analytics_ga4 import GSC_SITE_URL
        token, _ = await _get_any_active_token()
        if not token:
            raise HTTPException(status_code=401, detail="Aucun token Google. Reconnectez Gmail/Search Console.")
        site_enc = GSC_SITE_URL.replace("/", "%2F").replace(":", "%3A")
        url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{site_enc}/searchAnalytics/query"

        async def _q(start, end):
            async with httpx.AsyncClient() as c:
                r = await c.post(url, headers={"Authorization": f"Bearer {token}"},
                                 json={"startDate": start, "endDate": end, "dimensions": ["query"],
                                       "orderBy": [{"fieldName": "impressions", "sortOrder": "DESCENDING"}],
                                       "rowLimit": limit}, timeout=15)
                if r.status_code != 200:
                    raise HTTPException(status_code=r.status_code, detail=r.text[:200])
                return r.json().get("rows", [])

        today = datetime.now()
        curr = await _q((today - timedelta(days=days)).strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"))
        prev = await _q((today - timedelta(days=days * 2)).strftime("%Y-%m-%d"),
                        (today - timedelta(days=days + 1)).strftime("%Y-%m-%d"))

        prev_map = {(r.get("keys") or [""])[0]: r for r in prev}

        rows = []
        for r in curr:
            q = (r.get("keys") or [""])[0]
            pos = r.get("position", 0) or 0
            imp = int(r.get("impressions", 0) or 0)
            clk = int(r.get("clicks", 0) or 0)
            ctr = round((r.get("ctr") or 0) * 100, 2)
            p = prev_map.get(q, {})
            prev_pos = p.get("position", 0) or 0
            delta = round(prev_pos - pos, 1) if prev_pos else 0  # positif = on gagne des places
            rows.append({
                "query": q,
                "position": round(pos, 1),
                "prev_position": round(prev_pos, 1) if prev_pos else None,
                "delta": delta,
                "impressions": imp,
                "clicks": clk,
                "ctr": ctr,
                "bucket": "top3" if pos <= 3 else "top10" if pos <= 10 else "top20" if pos <= 20 else "top50" if pos <= 50 else "hors",
            })

        buckets = {"top3": 0, "top10": 0, "top20": 0, "top50": 0, "hors": 0}
        for r in rows:
            buckets[r["bucket"]] = buckets.get(r["bucket"], 0) + 1

        return {"period_days": days, "total": len(rows), "buckets": buckets, "keywords": rows}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"tracker/keywords: {e}")
        raise HTTPException(status_code=500, detail=str(e)[:200])
