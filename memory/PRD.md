# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 3.1  
**Date:** Mars 2026  
**Stack:** React 19 + FastAPI + MongoDB + Stripe (emergentintegrations) + ReportLab (PDF)

## Architecture

### Backend Modules
- `server.py` - Core: Auth, Leads, Quotes, Tasks, Interactions, Events, Stats
- `invoices.py` - Invoices, Stripe Checkout, Financial Stats
- `portal.py` - Magic-link Auth, Client Portal
- `planning.py` - Teams, Interventions, Calendar, Check-in/out
- `advanced.py` - Notifications, Lead Scoring, Roles, Retention
- `external_integrations.py` - Webhooks, iCal, WhatsApp, Tracking Widget
- `exports.py` - PDF generation (ReportLab) + CSV exports

### Frontend Pages
`/dashboard` `/kanban` `/leads` `/leads/new` `/leads/:id` `/quotes` `/quotes/new` `/invoices` `/invoices/:id/success` `/finance` `/planning` `/tasks` `/analytics` `/integrations` `/activity` `/portal`

### Collections MongoDB (20+)
users, user_sessions, leads, quotes, interactions, events, tasks, activity_logs, tracking_events, templates, invoices, payment_transactions, magic_links, portal_sessions, reviews, teams, interventions, notifications, webhooks, webhook_logs

## Phases Complètes

### Phase 1: CRM Core
Auth Google OAuth, Dashboard KPIs, Leads CRUD scoring, Kanban HTML5, Quotes, Tasks, Tracking, Activity log, Notifications polling

### Phase 2: Paiements & Facturation
Factures depuis devis (TVA 20%), Stripe Checkout, Dashboard financier, Webhook Stripe

### Phase 3: Portail Client Self-Service
Auth magic-link, Vue devis (accepter/refuser), Factures (payer), Avis (étoiles)

### Phase 4: Planning & Interventions
CRUD équipes/membres, Calendrier mensuel, Check-in/Check-out, Détection conflits

### Phase 5: Features Avancées
Notifications in-app, Scoring multi-critères, Rôles utilisateurs, Fidélisation client

### Phase 6: Intégrations Externes
Zapier/Make webhooks (12 events), Google Calendar iCal sync, WhatsApp click-to-chat + templates, Widget tracking JavaScript

### Phase 7: UX/Design + Exports PDF/CSV
- Login redesign (split layout, hero image Unsplash)
- Dashboard redesign (stagger animations, gradient charts, KPI cards)
- Sidebar polish (active indicators, portal link)
- Global CSS (fadeIn/slideIn animations, hover-lift, glass, custom scrollbar)
- PDF factures, devis, rapport financier (ReportLab, format français)
- CSV exports: factures, clients, interventions

## Tests Cumulés
- Phase 1: 22/22 (100%)
- Phase 2: 47/47 (100%)
- Phases 3-5: 62/62 (100%)
- Phase 6: 21/21 (100%)
- Phase 7: 27/27 (100%)

## Backlog
- SMS Twilio pour rappels automatiques
- ML prédictif pour scoring leads
- WhatsApp Business API complète (vs click-to-chat actuel)
- Multi-langue
