# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 6.0  
**Date:** Mars 2026  
**Stack:** React 19 + FastAPI + MongoDB + Stripe + Gmail API + Google Calendar API + ReportLab (PDF)

## Architecture
### Backend Modules
- `server.py` - Core: Auth, Leads, Quotes, Tasks, Stats, Integration Status
- `gmail_service.py` - Gmail OAuth2, Send/Receive emails, Auto follow-ups
- `invoices.py` - Invoicing, Stripe Checkout, Financial Stats
- `portal.py` - Magic-link Auth, Client Portal
- `planning.py` - Teams, Interventions, Calendar, Check-in/out
- `advanced.py` - Notifications, Lead Scoring, Roles, Retention
- `external_integrations.py` - Webhooks, iCal, WhatsApp, Tracking Widget
- `exports.py` - PDF (ReportLab) + CSV exports
- `google_calendar.py` - Google Calendar OAuth2

### Frontend Pages
`/dashboard` `/kanban` `/leads` `/leads/new` `/leads/:id` `/quotes` `/quotes/new` `/invoices` `/invoices/:id/success` `/finance` `/planning` `/tasks` `/analytics` `/integrations` `/activity` `/portal` `/login`

## Completed Phases

### Phase 1-7: Core CRM + Features
All core CRM, payments, portal, planning, scoring, integrations, UX, PDF/CSV exports.

### Phase 8: Production Integrations
Google Calendar OAuth, Integration status dashboard, WhatsApp, Tracking widget.

### Phase 9: Responsive Design + Overflow Fix
- Global overflow prevention, mobile sidebar drawer, mobile planning list view
- Tables to cards on mobile, zero spinners, text overflow prevention

### Phase 10: Gmail Integration (Mars 2026)
- **Gmail OAuth 2.0**: Connect/disconnect Gmail via `/api/auth/google` flow
- **Email sending**: Quotes and invoices sent via Gmail API
- **Email sync**: Incoming emails matched to leads automatically
- **Auto follow-ups**: J+2 automatic follow-up for unanswered quotes
- **Email history**: Per-lead email history in LeadDetail page
- **Overview tab updated**: Shows Gmail instead of SendGrid
- **Mobile quote buttons fixed**: touch-manipulation, proper padding, active states

### Phase 11: Email Whitelist (Mars 2026)
- **ALLOWED_EMAILS** in `.env`: comma-separated whitelist of authorized emails
- Backend checks email against whitelist after Google OAuth, returns 403 if not authorized
- Frontend shows "Acces refuse" banner on `/login?error=not_authorized`
- Easy to extend: just add emails in `.env` separated by commas

### Phase 12: PWA + Mobile Tab Bar (Mars 2026)
- **PWA**: manifest.json, service-worker.js (offline cache), icons 192/512, meta tags
- **Mobile tab bar**: Bottom navigation bar with Dashboard, Leads, Devis, Menu
- **More menu**: Grid overlay with remaining nav items (Kanban, Factures, Finance, Planning, Taches, Analytics, Integrations, Journal)
- **Desktop sidebar**: Unchanged, hidden on mobile via `hidden lg:flex`
- **LeadDetail sticky footer**: Mobile-only action bar with Appeler, WhatsApp, Devis buttons
- **Form buttons**: min-h-[48px] for tap-friendly mobile experience
- **Content padding**: pb-16 on mobile to prevent tab bar overlap

## Key API Endpoints (Gmail)
- `GET /api/auth/google` - Start Gmail OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/gmail/status` - Connection status
- `POST /api/gmail/disconnect` - Disconnect Gmail
- `POST /api/emails/send` - Send email via Gmail
- `GET /api/gmail/sync` - Sync inbox emails
- `GET /api/automations/check-followups` - Auto follow-up check
- `GET /api/emails/lead/{lead_id}` - Email history for lead
- `GET /api/emails/stats` - Email statistics

## DB Schema (email_accounts)
`{ user_id, email, refresh_token (encrypted), access_token, token_expires_at, is_active, connected_at }`

## Tests
- Phase 8: 15/15 (100%)
- Phase 9 Responsive: 100%
- Phase 10 Gmail: 100% (10/10 backend, all frontend UI verified)

## Stripe Status
Currently using test key (sk_test_emergent). Awaiting production keys.

## Backlog (P1-P2)
- P1: Stripe production keys
- P1: Website tracking widget deployment instructions
- P2: Google Calendar full integration
- P2: Refactor server.py into sub-routers
- P2: SMS Twilio, WhatsApp Business API
- P2: ML predictif pour scoring leads
- P2: Multi-langue
