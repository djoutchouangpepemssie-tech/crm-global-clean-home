# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 5.0  
**Date:** Mars 2026  
**Stack:** React 19 + FastAPI + MongoDB + Stripe + SendGrid + Google Calendar API + ReportLab (PDF)

## Architecture
### Backend Modules
- `server.py` - Core: Auth, Leads, Quotes, Tasks, Stats, Integration Status
- `invoices.py` - Invoicing, Stripe Checkout, Financial Stats
- `portal.py` - Magic-link Auth (+ SendGrid email), Client Portal
- `planning.py` - Teams, Interventions, Calendar, Check-in/out
- `advanced.py` - Notifications, Lead Scoring, Roles, Retention
- `external_integrations.py` - Webhooks, iCal, WhatsApp, Tracking Widget
- `exports.py` - PDF (ReportLab) + CSV exports
- `email_service.py` - SendGrid email service
- `google_calendar.py` - Google Calendar OAuth2
- `integrations.py` - Legacy module

### Frontend Pages
`/dashboard` `/kanban` `/leads` `/leads/new` `/leads/:id` `/quotes` `/quotes/new` `/invoices` `/invoices/:id/success` `/finance` `/planning` `/tasks` `/analytics` `/integrations` `/activity` `/portal` `/login`

## Completed Phases

### Phase 1-7: Core CRM + Features
All core CRM features, payments, client portal, planning, scoring, integrations, UX overhaul, PDF/CSV exports.

### Phase 8: Production Integrations (Mars 2026)
- SendGrid email service
- Google Calendar OAuth
- Integration status dashboard
- WhatsApp number (0622665308)
- Tracking widget for globalcleanhome.com

### Phase 9: Full Responsive Design (Mars 2026)
- **Sidebar**: Mobile drawer with hamburger menu, overlay on < 1024px
- **App.js**: MobileHeader component, `lg:ml-64` layout
- **All pages**: `p-4 md:p-6 lg:p-8` responsive padding
- **Leads/Invoices**: Mobile card layouts replacing tables on < 768px
- **Kanban**: Horizontal scroll with negative margin pattern
- **Planning calendar**: min-w-[640px] wrapper for horizontal scroll
- **Headers**: Responsive text sizes, stacked layouts on mobile
- **Login**: Mobile logo, hidden hero image
- **Buttons**: Hidden text labels on small screens, flex-wrap
- **Grids**: sm/md/lg breakpoints for proper column collapse

## Tests
- Phase 8: 15/15 (100%)
- Phase 9 Responsiveness: 100% all viewports (375px, 768px, 1024px, 1280px)

## Awaiting User API Keys
- **SendGrid**: SENDGRID_API_KEY
- **Google Calendar**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **Stripe Production**: STRIPE_API_KEY (currently sk_test_emergent)

## Backlog
- SMS Twilio pour rappels automatiques
- ML predictif pour scoring leads
- WhatsApp Business API complete
- Multi-langue
