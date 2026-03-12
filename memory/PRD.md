# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 4.0  
**Date:** Mars 2026  
**Stack:** React 19 + FastAPI + MongoDB + Stripe (emergentintegrations) + SendGrid + Google Calendar API + ReportLab (PDF)

## Architecture

### Backend Modules
- `server.py` - Core: Auth, Leads, Quotes, Tasks, Interactions, Events, Stats, Integration Status
- `invoices.py` - Invoices, Stripe Checkout, Financial Stats
- `portal.py` - Magic-link Auth (with SendGrid email), Client Portal
- `planning.py` - Teams, Interventions, Calendar, Check-in/out
- `advanced.py` - Notifications, Lead Scoring, Roles, Retention
- `external_integrations.py` - Webhooks, iCal, WhatsApp (0622665308), Tracking Widget
- `exports.py` - PDF generation (ReportLab) + CSV exports
- `email_service.py` - SendGrid email service (magic links, quotes, invoices, reminders, notifications)
- `google_calendar.py` - Google Calendar OAuth2, sync interventions, CRUD events
- `integrations.py` - Legacy: Twilio SMS, Stripe, PDF, Multi-users, ML prediction

### Frontend Pages
`/dashboard` `/kanban` `/leads` `/leads/new` `/leads/:id` `/quotes` `/quotes/new` `/invoices` `/invoices/:id/success` `/finance` `/planning` `/tasks` `/analytics` `/integrations` `/activity` `/portal`

### Collections MongoDB (20+)
users, user_sessions, leads, quotes, interactions, events, tasks, activity_logs, tracking_events, templates, invoices, payment_transactions, magic_links, portal_sessions, reviews, teams, interventions, notifications, webhooks, webhook_logs, oauth_states, calendar_events

## Phases Completes

### Phase 1: CRM Core
Auth Google OAuth, Dashboard KPIs, Leads CRUD scoring, Kanban HTML5, Quotes, Tasks, Tracking, Activity log, Notifications polling

### Phase 2: Paiements & Facturation
Factures depuis devis (TVA 20%), Stripe Checkout, Dashboard financier, Webhook Stripe

### Phase 3: Portail Client Self-Service
Auth magic-link, Vue devis (accepter/refuser), Factures (payer), Avis (etoiles)

### Phase 4: Planning & Interventions
CRUD equipes/membres, Calendrier mensuel, Check-in/Check-out, Detection conflits

### Phase 5: Features Avancees
Notifications in-app, Scoring multi-criteres, Roles utilisateurs, Fidelisation client

### Phase 6: Integrations Externes
Zapier/Make webhooks (12 events), Google Calendar iCal sync, WhatsApp click-to-chat + templates, Widget tracking JavaScript

### Phase 7: UX/Design + Exports PDF/CSV
- Login redesign (split layout, hero image Unsplash)
- Dashboard redesign (stagger animations, gradient charts, KPI cards)
- Sidebar polish (active indicators, portal link)
- Global CSS (fadeIn/slideIn animations, hover-lift, glass, custom scrollbar)
- PDF factures, devis, rapport financier (ReportLab, format francais)
- CSV exports: factures, clients, interventions

### Phase 8: Production Integrations (NEW - Mars 2026)
- **SendGrid Email Service** (`email_service.py`): Full email templates (magic links, quotes, invoices, reminders, notifications). Graceful fallback when not configured.
- **Google Calendar OAuth** (`google_calendar.py`): OAuth2 flow, sync interventions, create/update/delete events, auto-refresh tokens. Endpoints: `/api/gcal/*`
- **Integration Status Dashboard**: `/api/settings/integrations` endpoint + Overview tab on frontend
- **WhatsApp number update**: 0622665308, French phone normalization (0-prefix -> +33)
- **Tracking widget**: Ready for globalcleanhome.com installation
- **Frontend Integrations page**: 6 tabs (Overview, Emails, Google Calendar, WhatsApp, Webhooks, Widget Tracking)

## Tests Cumules
- Phase 1: 22/22 (100%)
- Phase 2: 47/47 (100%)
- Phases 3-5: 62/62 (100%)
- Phase 6: 21/21 (100%)
- Phase 7: 27/27 (100%)
- Phase 8: 15/15 (100%)

## Awaiting User API Keys
- **SendGrid**: SENDGRID_API_KEY (empty) - emails logged but not sent
- **Google Calendar**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (empty) - OAuth unavailable
- **Stripe Production**: STRIPE_API_KEY currently sk_test_emergent - need production keys

## Backlog
- SMS Twilio pour rappels automatiques
- ML predictif pour scoring leads
- WhatsApp Business API complete (vs click-to-chat actuel)
- Multi-langue
