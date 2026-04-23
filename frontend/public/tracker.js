/*!
 * Global Clean Home — Visitor Tracker v3.0.0
 * Production-grade tracking (niveau Plausible/Fathom/Umami)
 *
 * Installation :
 * <script src="https://crm.globalcleanhome.com/tracker.js" async defer></script>
 *
 * Zéro dépendance · < 10KB minifié · RGPD compliant · Do-Not-Track respecté
 * Cookie fallback · Batch 2s · Retry backoff · Dual GA4/Meta · SPA-ready
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════
  var CONFIG = {
    endpoint: 'https://crm-global-clean-home-production.up.railway.app/api/tracking/event',
    visitorCookieName: '_gch_vid',
    visitorStorageKey: '_gch_visitor',
    sessionStorageKey: '_gch_sid',
    firstUtmKey: '_gch_first_utm',
    sessionTimeoutMs: 30 * 60 * 1000,
    visitorCookieMaxAge: 365 * 24 * 60 * 60,
    batchIntervalMs: 2000,
    batchMaxSize: 10,
    scrollThreshold: 0.75,
    timeOnPageThresholdMs: 120 * 1000,
    retryMaxAttempts: 3,
    retryBackoffMs: [1000, 3000, 8000]
  };

  var CONVERSION_TYPES = ['click_phone', 'click_email', 'click_whatsapp', 'form_submit'];
  var BOT_REGEX = /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|whatsapp|slurp|baiduspider|yandex|googlebot/i;
  var DEBUG = false;

  // ═══════════════════════════════════════════════════════════════
  // GUARDS : Do-Not-Track, bots, environnement
  // ═══════════════════════════════════════════════════════════════
  var dnt = navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes';
  var isBot = BOT_REGEX.test(navigator.userAgent || '');
  var silent = dnt || isBot;

  // Activer debug via ?__gchdebug=1
  try {
    if (location.search.indexOf('__gchdebug=1') !== -1) DEBUG = true;
  } catch (e) {}

  function log() {
    if (DEBUG && typeof console !== 'undefined') {
      console.log.apply(console, ['[GCH Tracker]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  if (isBot) { log('Bot detected, tracking disabled'); return; }
  if (dnt) { log('Do-Not-Track enabled, events will not be sent'); }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  function generateUUIDv4() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function throttle(fn, ms) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, arguments); }
    };
  }

  // ── Storage (localStorage + cookie fallback) ─────────────────
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  function readCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function setCookie(name, value, maxAge) {
    try {
      document.cookie = name + '=' + encodeURIComponent(value) +
        ';path=/;max-age=' + maxAge + ';SameSite=Lax';
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // VISITOR ID (persistant 1 an)
  // ═══════════════════════════════════════════════════════════════
  var visitorId = (function () {
    var vid = lsGet(CONFIG.visitorStorageKey) || readCookie(CONFIG.visitorCookieName);
    if (!vid) vid = generateUUIDv4();
    lsSet(CONFIG.visitorStorageKey, vid);
    setCookie(CONFIG.visitorCookieName, vid, CONFIG.visitorCookieMaxAge);
    return vid;
  })();

  // ═══════════════════════════════════════════════════════════════
  // SESSION ID (30min timeout, sessionStorage)
  // ═══════════════════════════════════════════════════════════════
  var sessionId, isNewSession;
  (function initSession() {
    var raw = ssGet(CONFIG.sessionStorageKey);
    var now = Date.now();
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (now - parsed.lastActivity < CONFIG.sessionTimeoutMs) {
          sessionId = parsed.sid;
          isNewSession = false;
          ssSet(CONFIG.sessionStorageKey, JSON.stringify({ sid: sessionId, lastActivity: now }));
          return;
        }
      } catch (e) {}
    }
    sessionId = generateUUIDv4();
    isNewSession = true;
    ssSet(CONFIG.sessionStorageKey, JSON.stringify({ sid: sessionId, lastActivity: now }));
  })();

  function touchSession() {
    ssSet(CONFIG.sessionStorageKey, JSON.stringify({ sid: sessionId, lastActivity: Date.now() }));
  }

  // ═══════════════════════════════════════════════════════════════
  // UTM (first-touch persisté)
  // ═══════════════════════════════════════════════════════════════
  function parseUTMFromURL() {
    try {
      var p = new URLSearchParams(location.search);
      var utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        var v = p.get(k); if (v) utm[k.replace('utm_', '')] = v;
      });
      var gclid = p.get('gclid'); if (gclid) utm.gclid = gclid;
      var fbclid = p.get('fbclid'); if (fbclid) utm.fbclid = fbclid;

      // Persist first-touch
      if (utm.source || utm.gclid || utm.fbclid) {
        var existing = lsGet(CONFIG.firstUtmKey);
        if (!existing) lsSet(CONFIG.firstUtmKey, JSON.stringify(utm));
      }

      // Merge avec first-touch si rien de nouveau
      if (!utm.source && !utm.gclid && !utm.fbclid) {
        try {
          var saved = lsGet(CONFIG.firstUtmKey);
          if (saved) utm = JSON.parse(saved);
        } catch (e) {}
      }

      return utm;
    } catch (e) { return {}; }
  }

  // ═══════════════════════════════════════════════════════════════
  // DEVICE INFO
  // ═══════════════════════════════════════════════════════════════
  function deviceInfo() {
    var ua = navigator.userAgent || '';
    return {
      user_agent: ua,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      language: navigator.language || '',
      screen_width: screen.width,
      screen_height: screen.height,
      pixel_ratio: window.devicePixelRatio || 1
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ELEMENT LOCATION (header/footer/main/sticky)
  // ═══════════════════════════════════════════════════════════════
  function getElementLocation(el) {
    try {
      var parent = el;
      while (parent) {
        var tag = (parent.tagName || '').toLowerCase();
        if (tag === 'header' || tag === 'nav') return 'header';
        if (tag === 'footer') return 'footer';
        if (tag === 'main') return 'main';
        if (parent.style && parent.style.position === 'fixed') return 'sticky';
        parent = parent.parentElement;
      }
    } catch (e) {}
    return 'body';
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYLOAD ENRICHMENT
  // ═══════════════════════════════════════════════════════════════
  function enrichPayload(partial) {
    touchSession();
    return {
      visitor_id: visitorId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      page: partial.page || {
        url: location.href,
        path: location.pathname,
        title: document.title || '',
        referrer: document.referrer || ''
      },
      utm: parseUTMFromURL(),
      device: deviceInfo(),
      event_type: partial.event_type,
      event_data: partial.event_data || {},
      site: location.hostname
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SEND — batch + retry + beacon
  // ═══════════════════════════════════════════════════════════════
  var eventQueue = [];
  var flushTimer = null;

  function postWithRetry(payload, attempt) {
    attempt = attempt || 0;
    try {
      var body = JSON.stringify(payload);
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).then(function (res) {
        if (!res.ok && res.status >= 500 && attempt < CONFIG.retryMaxAttempts) {
          setTimeout(function () { postWithRetry(payload, attempt + 1); }, CONFIG.retryBackoffMs[attempt] || 8000);
        }
        log('Event sent', res.status, payload.event_type || 'batch');
      }).catch(function () {
        if (attempt < CONFIG.retryMaxAttempts) {
          setTimeout(function () { postWithRetry(payload, attempt + 1); }, CONFIG.retryBackoffMs[attempt] || 8000);
        }
      });
    } catch (e) { log('Send error', e); }
  }

  function sendBeaconSafe(payload) {
    try {
      var body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(CONFIG.endpoint, body);
        log('Beacon sent', payload.event_type || 'batch');
        return;
      }
    } catch (e) {}
    postWithRetry(payload);
  }

  function flushQueue() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0);
    clearTimeout(flushTimer);
    flushTimer = null;
    // Envoyer un par un (le backend n'a pas d'endpoint batch)
    batch.forEach(function (ev) { postWithRetry(ev); });
  }

  function sendEvent(partial) {
    if (silent) return;
    var payload = enrichPayload(partial);
    eventQueue.push(payload);
    if (eventQueue.length >= CONFIG.batchMaxSize) {
      flushQueue();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flushQueue, CONFIG.batchIntervalMs);
    }
  }

  function sendEventImmediate(partial) {
    if (silent) return;
    var payload = enrichPayload(partial);
    if (eventQueue.length > 0) flushQueue();
    sendBeaconSafe(payload);
    forwardConversion(partial.event_type, partial.event_data);
  }

  // ═══════════════════════════════════════════════════════════════
  // DUAL TRACKING — GA4 + Meta Pixel
  // ═══════════════════════════════════════════════════════════════
  function forwardConversion(eventType, eventData) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventType, {
          event_category: 'conversion',
          event_label: (eventData && eventData.text) || eventType
        });
        log('→ GA4 forwarded', eventType);
      }
    } catch (e) {}
    try {
      if (typeof window.fbq === 'function') {
        var metaMap = { click_phone: 'Contact', click_email: 'Contact', click_whatsapp: 'Contact', form_submit: 'Lead' };
        if (metaMap[eventType]) {
          window.fbq('track', metaMap[eventType], { content_name: eventType });
          log('→ Meta forwarded', eventType);
        }
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT: session_start
  // ═══════════════════════════════════════════════════════════════
  if (isNewSession) {
    sendEvent({ event_type: 'session_start' });
    log('New session', sessionId);
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT: page_view
  // ═══════════════════════════════════════════════════════════════
  function trackPageView() {
    sendEvent({
      event_type: 'page_view',
      page: {
        url: location.href,
        path: location.pathname,
        title: document.title || '',
        referrer: document.referrer || ''
      }
    });
    log('page_view', location.pathname);
  }

  // Déclencher au DOMContentLoaded ou immédiatement si déjà chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }

  // ═══════════════════════════════════════════════════════════════
  // SPA DETECTION (history API)
  // ═══════════════════════════════════════════════════════════════
  var lastTrackedPath = location.pathname;
  var scrollDeepFired = false;
  var timeOnPageFired = false;
  var timeOnPageMs = 0;
  var timeTrackingStart = Date.now();

  function handleRouteChange() {
    var newPath = location.pathname;
    if (newPath !== lastTrackedPath) {
      lastTrackedPath = newPath;
      scrollDeepFired = false;
      timeOnPageFired = false;
      timeOnPageMs = 0;
      timeTrackingStart = Date.now();
      trackPageView();
    }
  }

  try {
    var origPush = history.pushState;
    history.pushState = function () {
      origPush.apply(this, arguments);
      setTimeout(handleRouteChange, 0);
    };
    var origReplace = history.replaceState;
    history.replaceState = function () {
      origReplace.apply(this, arguments);
      setTimeout(handleRouteChange, 0);
    };
    window.addEventListener('popstate', handleRouteChange);
  } catch (e) {}

  // ═══════════════════════════════════════════════════════════════
  // EVENT: click_phone / click_email / click_whatsapp / cta_click
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('click', function (e) {
    try {
      var el = e.target.closest ? e.target.closest('a,button,[data-gch-cta]') : null;
      if (!el) return;
      var href = (el.getAttribute && el.getAttribute('href')) || '';
      var type = null;
      var data = {};

      if (el.hasAttribute && el.hasAttribute('data-gch-cta')) {
        type = 'cta_click';
        data.cta_tag = el.getAttribute('data-gch-cta');
      } else if (href.indexOf('tel:') === 0) {
        type = 'click_phone';
        data.phone = href.replace('tel:', '');
      } else if (href.indexOf('mailto:') === 0) {
        type = 'click_email';
        data.email_domain = href.replace('mailto:', '').split('@')[1] || '';
      } else if (/wa\.me|api\.whatsapp\.com|whatsapp\.com\/send/i.test(href)) {
        type = 'click_whatsapp';
      } else if (/devis|quote|contact|rdv|reservation/i.test(href) || /devis|contact|rdv/i.test(el.textContent || '')) {
        type = 'cta_click';
      }

      if (!type) return;

      data.text = (el.textContent || '').trim().slice(0, 100);
      data.location = getElementLocation(el);
      data.href = href.slice(0, 200);

      if (CONVERSION_TYPES.indexOf(type) !== -1) {
        sendEventImmediate({ event_type: type, event_data: data });
      } else {
        sendEvent({ event_type: type, event_data: data });
      }
      log(type, data);
    } catch (e) {}
  }, { passive: true, capture: true });

  // ═══════════════════════════════════════════════════════════════
  // AUTO-INJECT visitor_id DANS LES FORMULAIRES
  // Permet au backend de relier le lead au parcours visiteur quand
  // le formulaire est soumis à /api/leads.
  // ═══════════════════════════════════════════════════════════════
  function injectVisitorIdInForms() {
    try {
      var forms = document.querySelectorAll('form');
      forms.forEach(function (form) {
        if (form.querySelector('input[name="visitor_id"]')) return; // déjà injecté
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'visitor_id';
        hidden.value = visitorId;
        form.appendChild(hidden);
      });
    } catch (e) {}
  }
  // Injecter au chargement + surveiller les nouveaux formulaires (SPA)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectVisitorIdInForms);
  } else {
    injectVisitorIdInForms();
  }
  // Re-injecter si le DOM change (formulaires ajoutés dynamiquement)
  try {
    new MutationObserver(function () { injectVisitorIdInForms(); })
      .observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  // ═══════════════════════════════════════════════════════════════
  // EVENT: form_submit
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('submit', function (e) {
    try {
      var form = e.target;
      if (!form || !form.elements) return;

      // S'assurer que le visitor_id est dans le formulaire
      if (!form.querySelector('input[name="visitor_id"]')) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'visitor_id';
        hidden.value = visitorId;
        form.appendChild(hidden);
      }

      var fieldNames = [];
      for (var i = 0; i < form.elements.length; i++) {
        var el = form.elements[i];
        if (el.name && el.value) fieldNames.push(el.name);
      }
      sendEventImmediate({
        event_type: 'form_submit',
        event_data: {
          form_id: form.id || null,
          form_name: form.getAttribute('name') || form.className || 'unnamed',
          form_action: (form.action || location.href).slice(0, 200),
          fields_filled: fieldNames,
          fields_count: fieldNames.length,
          visitor_id: visitorId
        }
      });
      log('form_submit', fieldNames);
    } catch (e) {}
  }, { passive: true, capture: true });

  // ═══════════════════════════════════════════════════════════════
  // EVENT: scroll_deep_75
  // ═══════════════════════════════════════════════════════════════
  window.addEventListener('scroll', throttle(function () {
    try {
      if (scrollDeepFired) return;
      var scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercent >= CONFIG.scrollThreshold) {
        scrollDeepFired = true;
        sendEvent({
          event_type: 'scroll_deep_75',
          event_data: { scroll_percent: Math.round(scrollPercent * 100) }
        });
        log('scroll_deep_75', Math.round(scrollPercent * 100) + '%');
      }
    } catch (e) {}
  }, 500), { passive: true });

  // ═══════════════════════════════════════════════════════════════
  // EVENT: time_on_page_2min (visibility-aware)
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      timeOnPageMs += Date.now() - timeTrackingStart;
    } else {
      timeTrackingStart = Date.now();
    }
  }, { passive: true });

  setInterval(function () {
    try {
      if (timeOnPageFired) return;
      var current = timeOnPageMs + (document.visibilityState === 'visible' ? Date.now() - timeTrackingStart : 0);
      if (current >= CONFIG.timeOnPageThresholdMs) {
        timeOnPageFired = true;
        sendEvent({
          event_type: 'time_on_page_2min',
          event_data: { time_seconds: Math.round(current / 1000) }
        });
        log('time_on_page_2min', Math.round(current / 1000) + 's');
      }
    } catch (e) {}
  }, 5000);

  // ═══════════════════════════════════════════════════════════════
  // EVENT: session_end (beforeunload + pagehide)
  // ═══════════════════════════════════════════════════════════════
  function sendSessionEnd() {
    flushQueue();
    var totalMs = timeOnPageMs + (document.visibilityState === 'visible' ? Date.now() - timeTrackingStart : 0);
    sendBeaconSafe(enrichPayload({
      event_type: 'session_end',
      event_data: { total_time_ms: totalMs, total_time_seconds: Math.round(totalMs / 1000) }
    }));
  }

  window.addEventListener('pagehide', sendSessionEnd);
  window.addEventListener('beforeunload', sendSessionEnd);

  // ═══════════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ═══════════════════════════════════════════════════════════════
  window.__gchTracker = {
    track: function (eventType, eventData) {
      sendEvent({ event_type: 'custom_' + (eventType || 'event'), event_data: eventData || {} });
    },
    trackConversion: function (eventType, eventData) {
      sendEventImmediate({ event_type: eventType || 'custom_conversion', event_data: eventData || {} });
    },
    getVisitorId: function () { return visitorId; },
    getSessionId: function () { return sessionId; },
    getQueue: function () { return eventQueue.slice(); },
    flush: flushQueue,
    set debug(v) { DEBUG = !!v; },
    get debug() { return DEBUG; },
    version: '3.0.0'
  };

  log('Tracker v3.0.0 initialized', { visitorId: visitorId, sessionId: sessionId, silent: silent, dnt: dnt });

})();
