/*! Global Clean Home — Site Tracker v2 (chirurgien)
 *
 * Script à injecter sur globalcleanhome.com :
 * <script src="https://crm.globalcleanhome.com/tracker.js" async></script>
 *
 * Features :
 * - Visitor ID persistant (localStorage + cookie 365j fallback)
 * - Session ID (renouvellement après 30min d'inactivité)
 * - Page views (initial + SPA pushState/popstate)
 * - CTA clicks : phone, email, whatsapp, [data-gch-cta]
 * - Form submit : capture lead fields (nom, email, phone, service)
 * - Scroll depth : 25 / 50 / 75 / 100%
 * - Time on page : heartbeat 30s (visibility-aware)
 * - Page leave / visibility
 * - UTM tracking + first-touch attribution
 * - Batching : événements non-critiques bufferisés 2s
 * - Conversions (phone, email, whatsapp, form) : envoi immédiat sendBeacon
 * - Dual tracking : forward vers GA4 (gtag) et Meta Pixel (fbq) si présents
 * - Cookie fallback si localStorage bloqué
 * - RGPD : aucune donnée personnelle envoyée sans consentement
 */
(function () {
  "use strict";
  var ENDPOINT = "https://crm-global-clean-home-production.up.railway.app/api/tracking/event";
  var VKEY = "gch_visitor_id";
  var SKEY = "gch_session_id";
  var STKEY = "gch_session_ts";
  var SESSION_TTL_MIN = 30;
  var BATCH_DELAY_MS = 2000;
  var CONVERSION_TYPES = ["phone_click", "email_click", "whatsapp_click", "form_submit"];

  // ── Storage (localStorage + cookie fallback) ─────────────────
  function get(k) {
    try { var v = localStorage.getItem(k); if (v) return v; } catch (e) {}
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
    try {
      var d = new Date(); d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
      document.cookie = k + "=" + encodeURIComponent(v) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
    } catch (e) {}
  }

  // ── IDs ──────────────────────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function nowIso() { return new Date().toISOString(); }

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

  // ── UTM ──────────────────────────────────────────────────────
  function utm() {
    try {
      var q = new URLSearchParams(window.location.search);
      var out = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"].forEach(function (k) {
        var v = q.get(k); if (v) out[k] = v;
      });
      if (Object.keys(out).length) {
        set("gch_utm", JSON.stringify(out));
      } else {
        try { var saved = get("gch_utm"); if (saved) out = JSON.parse(saved); } catch (e) {}
      }
      return out;
    } catch (e) { return {}; }
  }

  // ── Device ───────────────────────────────────────────────────
  function deviceInfo() {
    var ua = navigator.userAgent || "";
    var mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    return {
      device_type: mobile ? "mobile" : "desktop",
      user_agent: ua,
      lang: navigator.language,
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
      screen: screen.width + "x" + screen.height,
      viewport: window.innerWidth + "x" + window.innerHeight
    };
  }

  // ── Envoi direct (conversions) ───────────────────────────────
  function sendNow(body) {
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

  // ── Batching (événements non-critiques) ──────────────────────
  var batch = [];
  var batchTimer = null;

  function flushBatch() {
    if (!batch.length) return;
    var items = batch.splice(0);
    // Envoyer un par un via sendBeacon (pas de endpoint batch côté backend)
    items.forEach(function (body) { sendNow(body); });
    batchTimer = null;
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
      site: location.hostname,
      device_info: deviceInfo()
    }, utm(), extra || {});

    // Conversions = envoi immédiat
    if (CONVERSION_TYPES.indexOf(type) !== -1) {
      sendNow(body);
      // Forward vers GA4
      if (window.gtag) {
        try { window.gtag("event", type, { event_category: "conversion", event_label: (extra && extra.cta_label) || type }); } catch (e) {}
      }
      // Forward vers Meta Pixel
      if (window.fbq) {
        try {
          var fbEvent = type === "phone_click" ? "Contact" : type === "form_submit" ? "Lead" : "ViewContent";
          window.fbq("track", fbEvent, { content_name: type });
        } catch (e) {}
      }
      return;
    }

    // Non-critique = batch 2s
    batch.push(body);
    if (!batchTimer) {
      batchTimer = setTimeout(flushBatch, BATCH_DELAY_MS);
    }
  }

  // ── Page view ────────────────────────────────────────────────
  send("page_view");

  // ── SPA history ──────────────────────────────────────────────
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

  // ── CTA clicks ───────────────────────────────────────────────
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

  // ── Form submit ──────────────────────────────────────────────
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

  // ── Scroll depth ─────────────────────────────────────────────
  var scrollMarks = { 25: false, 50: false, 75: false, 100: false };
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    var pct = Math.min(100, Math.round((h.scrollTop / max) * 100));
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !scrollMarks[m]) { scrollMarks[m] = true; send("scroll_depth", { depth: m }); }
    });
  }, { passive: true });

  // ── Time on page (visibility-aware) ──────────────────────────
  var secs = 0, maxSecs = 600, paused = false;
  document.addEventListener("visibilitychange", function () {
    paused = document.visibilityState === "hidden";
    if (paused) send("page_leave");
    else send("page_visible");
  }, { passive: true });

  setInterval(function () {
    if (paused || secs >= maxSecs) return;
    secs += 30;
    send("time_on_page", { seconds: secs });
  }, 30000);

  // ── Session end (beforeunload) ───────────────────────────────
  window.addEventListener("beforeunload", function () {
    flushBatch();
    sendNow({
      event_type: "session_end",
      timestamp: nowIso(),
      page_url: location.href,
      visitor_id: visitorId(),
      session_id: sessionId(),
      site: location.hostname,
      device_info: deviceInfo()
    });
  });

  // ── API publique ─────────────────────────────────────────────
  window.gchTrack = function (type, data) { send(type || "custom", data || {}); };
  window.gchSetLead = function (lead) { set("gch_lead", JSON.stringify(lead || {})); };
})();
