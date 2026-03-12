# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble
**Nom:** CRM Global Clean Home  
**Version:** 2.0  
**Date:** Mars 2026  
**Stack:** React 19 + FastAPI + MongoDB + Stripe (emergentintegrations)

## Architecture

### Backend Modules
- `server.py` - Core: Auth, Leads CRUD, Quotes, Tasks, Interactions, Events, Stats
- `invoices.py` - Phase 2: Invoices, Stripe Checkout, Financial Stats
- `portal.py` - Phase 3: Magic-link Auth, Client Portal (quotes/invoices/reviews)
- `planning.py` - Phase 4: Teams, Interventions, Calendar, Check-in/out
- `advanced.py` - Phase 5: Notifications, Lead Scoring, User Roles, Client Retention
- `integrations.py` - Placeholder: SMS, WhatsApp, PDF, Calendar, ML

### Frontend Structure
- `/dashboard` - KPIs, charts, recent leads
- `/kanban` - Pipeline drag-and-drop
- `/leads`, `/leads/new`, `/leads/:id` - Lead management
- `/quotes`, `/quotes/new` - Quote management
- `/invoices`, `/invoices/:id/success` - Invoice + Stripe payment
- `/finance` - Financial dashboard (revenue, charts)
- `/planning` - Team calendar with interventions
- `/tasks` - Task management
- `/analytics` - Tracking analytics + funnel
- `/activity` - Activity log
- `/portal` - Client self-service portal (magic-link)

### Collections MongoDB
users, user_sessions, leads, quotes, interactions, events, tasks, activity_logs, tracking_events, templates, invoices, payment_transactions, magic_links, portal_sessions, reviews, teams, interventions, notifications

## Fonctionnalités implémentées

### Phase 1: CRM Core (Complet)
- Auth Google OAuth, Dashboard KPIs, Leads CRUD avec scoring
- Pipeline Kanban HTML5, Quotes + envoi, Tasks + relances
- Tracking events, Activity log, Notifications temps réel (polling)

### Phase 2: Paiements & Facturation (Complet)
- Génération factures depuis devis (TVA 20%)
- Stripe Checkout (emergentintegrations)
- Suivi paiements: en_attente, payée, en_retard
- Dashboard financier: revenus, graphiques, transactions
- Webhook Stripe pour confirmations asynchrones

### Phase 3: Portail Client Self-Service (Complet)
- Auth magic-link (token email)
- Vue client: devis (accepter/refuser), factures (payer)
- Soumission d'avis (1-5 étoiles + commentaire)
- Session portal_token (7 jours)

### Phase 4: Planning & Interventions (Complet)
- CRUD équipes avec membres
- Calendrier mensuel avec navigation
- Création interventions liées aux leads
- Check-in/Check-out terrain
- Détection conflits planning

### Phase 5: Features Avancées (Complet)
- Centre de notifications in-app (polling 30s)
- Scoring avancé multi-critères (source, service, surface, contact)
- Recalcul scoring global
- Gestion rôles utilisateurs (super_admin, manager, commercial, technicien)
- Module fidélisation client (historique complet)

## Tests
- Phase 1: 22/22 (100%)
- Phase 2: 47/47 (100%)
- Phases 3-5: 62/62 (100%)

## Roadmap restante

### Phase 6: Intégrations Externes (P2)
- Google Calendar bidirectionnel
- WhatsApp Business API
- Zapier/Make webhooks
- Widget tracking JavaScript pour site externe

### Backlog
- Export rapports PDF/CSV avancés
- SMS Twilio pour rappels
- ML prédictif pour scoring
- Multi-langue
