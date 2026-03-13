# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 5.1  
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
All core CRM, payments, portal, planning, scoring, integrations, UX, PDF/CSV exports.

### Phase 8: Production Integrations
SendGrid, Google Calendar OAuth, Integration status dashboard, WhatsApp, Tracking widget.

### Phase 9: Responsive Design + Overflow Fix (Mars 2026)
- **Global overflow prevention**: html/body overflow-x:hidden, App.js w-0 overflow-x-hidden
- **Sidebar**: Mobile drawer (translate-x), hamburger menu, overlay close
- **Planning mobile**: List view groupee par jour au lieu du calendrier 7 colonnes
- **Tables mobile**: Cards layout pour Leads et Factures (md:hidden)
- **Zero spinners**: Tous animate-spin remplaces par texte simple ou animate-pulse
- **Text overflow**: truncate + break-words sur tous les textes
- **Modales**: max-h-[90vh] overflow-y-auto
- **Notifications**: Dropdown responsive w-[calc(100vw-2rem)] sm:w-96
- **Charts**: overflow-hidden, hauteur reduite, fontes 10px, axes compacts
- **KPI cards**: grid-cols-2 lg:grid-cols-4, valeurs tronquees

## Tests
- Phase 8: 15/15 (100%)
- Phase 9 Responsive: 100% (11 pages, 375px + 1280px, 0 overflow, 0 spinner)

## Awaiting User API Keys
- **SendGrid**: SENDGRID_API_KEY
- **Google Calendar**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **Stripe Production**: STRIPE_API_KEY (currently sk_test_emergent)

## Backlog
- SMS Twilio pour rappels automatiques
- ML predictif pour scoring leads
- WhatsApp Business API complete
- Multi-langue
