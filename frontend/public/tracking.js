/**
 * Global Clean Home - Widget de Tracking
 * À intégrer sur globalcleanhome.com
 * 
 * Installation :
 * <script src="https://clean-home-hub-3.preview.emergentagent.com/tracking.js"></script>
 * <script>GCHTracker.init({ apiKey: 'YOUR_API_KEY' });</script>
 */

(function(window) {
  'use strict';

  const GCHTracker = {
    config: {
      apiUrl: 'https://clean-home-hub-3.preview.emergentagent.com/api',
      apiKey: null,
      sessionId: null,
      visitorId: null
    },

    init: function(options) {
      this.config.apiKey = options.apiKey;
      this.config.visitorId = this.getOrCreateVisitorId();
      this.config.sessionId = this.getOrCreateSessionId();
      
      // Track page view
      this.trackPageView();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Track time on page
      this.trackTimeOnPage();
      
      // Track scroll depth
      this.trackScrollDepth();
      
      console.log('🎯 Global Clean Home Tracker initialized');
    },

    getOrCreateVisitorId: function() {
      let visitorId = localStorage.getItem('gch_visitor_id');
      if (!visitorId) {
        visitorId = 'visitor_' + this.generateUUID();
        localStorage.setItem('gch_visitor_id', visitorId);
      }
      return visitorId;
    },

    getOrCreateSessionId: function() {
      let sessionId = sessionStorage.getItem('gch_session_id');
      if (!sessionId) {
        sessionId = 'session_' + this.generateUUID();
        sessionStorage.setItem('gch_session_id', sessionId);
      }
      return sessionId;
    },

    generateUUID: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    getUTMParams: function() {
      const params = new URLSearchParams(window.location.search);
      return {
        utm_source: params.get('utm_source') || localStorage.getItem('gch_utm_source'),
        utm_medium: params.get('utm_medium') || localStorage.getItem('gch_utm_medium'),
        utm_campaign: params.get('utm_campaign') || localStorage.getItem('gch_utm_campaign'),
        utm_term: params.get('utm_term'),
        utm_content: params.get('utm_content')
      };
    },

    saveUTMParams: function() {
      const params = this.getUTMParams();
      if (params.utm_source) localStorage.setItem('gch_utm_source', params.utm_source);
      if (params.utm_medium) localStorage.setItem('gch_utm_medium', params.utm_medium);
      if (params.utm_campaign) localStorage.setItem('gch_utm_campaign', params.utm_campaign);
    },

    getDeviceInfo: function() {
      const ua = navigator.userAgent;
      let device = 'desktop';
      if (/Mobile|Android|iPhone/i.test(ua)) device = 'mobile';
      else if (/iPad|Tablet/i.test(ua)) device = 'tablet';
      
      return {
        device_type: device,
        user_agent: ua,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    },

    getReferrer: function() {
      return document.referrer || 'direct';
    },

    trackPageView: function() {
      this.saveUTMParams();
      
      const data = {
        event_type: 'page_view',
        visitor_id: this.config.visitorId,
        session_id: this.config.sessionId,
        page_url: window.location.href,
        page_title: document.title,
        referrer: this.getReferrer(),
        ...this.getUTMParams(),
        device_info: this.getDeviceInfo(),
        timestamp: new Date().toISOString()
      };

      this.sendEvent(data);
    },

    trackEvent: function(eventType, eventData = {}) {
      const data = {
        event_type: eventType,
        visitor_id: this.config.visitorId,
        session_id: this.config.sessionId,
        page_url: window.location.href,
        ...eventData,
        ...this.getUTMParams(),
        timestamp: new Date().toISOString()
      };

      this.sendEvent(data);
    },

    setupEventListeners: function() {
      const self = this;
      
      // Track all button clicks
      document.addEventListener('click', function(e) {
        const target = e.target.closest('button, a[href], [role="button"]');
        if (target) {
          const text = target.textContent.trim();
          const href = target.getAttribute('href');
          
          self.trackEvent('button_click', {
            button_text: text,
            button_href: href,
            button_class: target.className,
            button_id: target.id
          });

          // Special tracking for CTA buttons
          if (text.toLowerCase().includes('devis') || 
              text.toLowerCase().includes('réserver') ||
              text.toLowerCase().includes('appeler')) {
            self.trackEvent('cta_click', {
              cta_type: text.toLowerCase().includes('devis') ? 'quote' : 
                        text.toLowerCase().includes('réserver') ? 'booking' : 'call',
              cta_text: text
            });
          }
        }
      });

      // Track form submissions
      document.addEventListener('submit', function(e) {
        const form = e.target;
        const formData = new FormData(form);
        const formFields = {};
        
        for (let [key, value] of formData.entries()) {
          // Don't send sensitive data, just field names
          formFields[key] = value ? 'filled' : 'empty';
        }

        self.trackEvent('form_submit', {
          form_id: form.id,
          form_action: form.action,
          form_fields: formFields
        });
      });

      // Track phone number clicks (tel: links)
      document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A' && e.target.href.startsWith('tel:')) {
          self.trackEvent('phone_click', {
            phone_number: e.target.href.replace('tel:', '')
          });
        }
      });
    },

    trackTimeOnPage: function() {
      const self = this;
      const startTime = Date.now();

      window.addEventListener('beforeunload', function() {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        self.trackEvent('time_on_page', {
          seconds: timeSpent,
          minutes: Math.floor(timeSpent / 60)
        });
      });

      // Also track every 30 seconds (for users who keep tab open)
      setInterval(function() {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        if (timeSpent % 30 === 0 && timeSpent > 0) {
          self.trackEvent('heartbeat', {
            seconds_on_page: timeSpent
          });
        }
      }, 30000);
    },

    trackScrollDepth: function() {
      const self = this;
      let maxScroll = 0;
      const milestones = [25, 50, 75, 100];
      const reached = [];

      window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = Math.floor((scrollTop / docHeight) * 100);

        if (scrollPercent > maxScroll) {
          maxScroll = scrollPercent;

          milestones.forEach(milestone => {
            if (scrollPercent >= milestone && !reached.includes(milestone)) {
              reached.push(milestone);
              self.trackEvent('scroll_depth', {
                depth_percent: milestone
              });
            }
          });
        }
      });
    },

    sendEvent: function(data) {
      // Send to CRM API
      fetch(this.config.apiUrl + '/tracking/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify(data)
      }).catch(err => {
        console.error('Tracking error:', err);
      });
    },

    // Public API methods
    trackCustomEvent: function(eventName, data) {
      this.trackEvent('custom_' + eventName, data);
    },

    identifyVisitor: function(userData) {
      this.trackEvent('visitor_identified', {
        user_data: userData
      });
    }
  };

  // Expose to window
  window.GCHTracker = GCHTracker;

})(window);
