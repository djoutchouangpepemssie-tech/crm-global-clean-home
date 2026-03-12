# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 3.0  
**Date:** Mars 2026  
**Stack:** React 19 + FastAPI + MongoDB + Stripe (emergentintegrations)

## Architecture

### Backend Modules
- `server.py` - Core: Auth, Leads, Quotes, Tasks, Interactions, Events, Stats
- `invoices.py` - Phase 2: Invoices, Stripe Checkout, Financial Stats
- `portal.py` - Phase 3: Magic-link Auth, Client Portal
- `planning.py` - Phase 4: Teams, Interventions, Calendar, Check-in/out
- `advanced.py` - Phase 5: Notifications, Lead Scoring, Roles, Retention
- `external_integrations.py` - Phase 6: Webhooks, iCal, WhatsApp, Tracking Widget

### Frontend Pages
- `/dashboard` - KPIs + charts
- `/kanban` - Pipeline drag-and-drop
- `/leads`, `/leads/new`, `/leads/:id` - Lead management + WhatsApp
- `/quotes`, `/quotes/new` - Quote management
- `/invoices`, `/invoices/:id/success` - Invoices + Stripe
- `/finance` - Financial dashboard
- `/planning` - Team calendar
- `/tasks` - Task management
- `/analytics` - Tracking analytics
- `/integrations` - Webhooks, Calendar, WhatsApp, Widget
- `/activity` - Activity log
- `/portal` - Client self-service (magic-link)

### Collections MongoDB
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

## Tests
- Phase 1: 22/22 (100%)
- Phase 2: 47/47 (100%)
- Phases 3-5: 62/62 (100%)
- Phase 6: 21/21 (100%)

## Backlog
- Export rapports PDF/CSV avancés
- SMS Twilio pour rappels
- ML prédictif pour scoring
- Multi-langue
- WhatsApp Business API complète (vs click-to-chat actuel)
