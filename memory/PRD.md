# CRM Global Clean Home - Product Requirements Document

## Vue d'ensemble

**Nom du projet:** CRM Global Clean Home  
**Version:** 1.1  
**Date:** Mars 2026  
**Objectif:** Application CRM complète pour gérer les leads et devis d'une entreprise de nettoyage professionnel

## Architecture technique

### Stack
- **Frontend:** React 19 + React Router + TailwindCSS + Shadcn/UI + Recharts
- **Backend:** FastAPI (Python) + Motor (async MongoDB driver)
- **Base de données:** MongoDB
- **Authentification:** Google OAuth (Emergent-managed)
- **Hosting:** Emergent Platform

### Collections MongoDB
1. **users** - user_id, email, name, picture, created_at
2. **user_sessions** - session_token, user_id, expires_at, created_at
3. **leads** - lead_id, name, email, phone, service_type, surface, address, message, source, campaign, utm_params, status, probability, score, tags, created_at, updated_at, assigned_to
4. **quotes** - quote_id, lead_id, service_type, surface, amount, details, status, sent_at, opened_at, responded_at, pdf_url, created_at, created_by
5. **interactions** - interaction_id, lead_id, type, content, created_by, created_at
6. **events** - event_id, lead_id, event_type, page_url, utm_params, device_info, created_at
7. **tasks** - task_id, lead_id, type, title, description, due_date, status, created_at, completed_at
8. **activity_logs** - log_id, user_id, action, entity_type, entity_id, details, created_at
9. **tracking_events** - visitor_id, session_id, event_type, page_url, utm_params, device_info, timestamp
10. **templates** - template_id, name, type, content, created_by, created_at

## Fonctionnalités implémentées

### 1. Authentification Google OAuth
- Login via Emergent Auth redirect
- Session cookies httpOnly (7 jours)
- Protection des routes authentifiées

### 2. Dashboard
- KPIs temps réel (leads totaux, nouveaux, gagnés, devis envoyés, taux conversion, tâches en attente, score moyen, meilleure source)
- Graphiques: leads par jour (30 jours), leads par service, sources de trafic
- Liste des 10 leads récents
- Sélecteur de période (1j, 7j, 30j)

### 3. Gestion des leads
- Liste avec pagination, filtres (statut, service, source, période), recherche
- Fiche détaillée avec interactions, devis, tracking
- Formulaire de création (/leads/new)
- Actions groupées (bulk update)
- Export CSV
- Scoring intelligent automatique (0-100)

### 4. Pipeline Kanban
- 6 colonnes (Nouveau, Contacté, En attente, Devis envoyé, Gagné, Perdu)
- Drag-and-drop natif HTML5
- Mise à jour optimiste avec rollback

### 5. Module devis
- Création avec calcul automatique (surface x tarif/service)
- Envoi (change statut lead + crée tâche relance 48h)
- Génération PDF (via integrations.py)

### 6. Système de tâches & relances
- Création automatique (rappel 2h, relance 48h)
- Filtres (en attente, complétées, toutes)
- Badge visuel tâches en retard

### 7. Tracking & Events
- API publique /api/events et /api/tracking/event
- Widget de tracking pour site externe
- Analytics visiteurs (funnel, sources, appareils)

### 8. Journal d'activité
- Logs complets de toutes les actions CRM
- Affichage avec détails JSON

### 9. Notifications temps réel
- Polling toutes les 30s pour nouveaux leads
- Toast notifications avec action "Voir"

### 10. Intégrations (backend/integrations.py)
- SMS Twilio
- WhatsApp Business
- PDF devis (ReportLab)
- Stripe paiements
- Google Calendar
- ML prediction scoring

## API Endpoints

### Publics (pas d'auth)
- POST /api/leads - Créer un lead
- POST /api/events - Tracker un event
- POST /api/tracking/event - Tracker un event (format libre)

### Authentifiés
- POST /api/auth/session - Échange session_id
- GET /api/auth/me - Utilisateur courant
- POST /api/auth/logout - Déconnexion
- GET /api/leads - Liste leads avec filtres
- GET /api/leads/recent - Leads récents (polling)
- GET /api/leads/export - Export CSV
- POST /api/leads/bulk - Mise à jour groupée
- GET /api/leads/{id} - Détail lead
- PATCH /api/leads/{id} - Mise à jour lead
- POST /api/quotes - Créer devis
- GET /api/quotes - Liste devis
- POST /api/quotes/{id}/send - Envoyer devis
- POST /api/tasks - Créer tâche
- GET /api/tasks - Liste tâches
- PATCH /api/tasks/{id}/complete - Compléter tâche
- POST /api/interactions - Créer interaction
- GET /api/interactions - Liste interactions
- GET /api/events - Liste events
- GET /api/stats/dashboard - Stats dashboard
- GET /api/tracking/stats - Stats tracking
- GET /api/tracking/visitor/{id} - Parcours visiteur
- GET /api/activity - Logs activité
- POST/GET /api/templates - Templates

## Design
- **Primary:** #7C3AED (Violet)
- **Secondary:** #E11D48 (Rose)
- **Typography:** Manrope (headings), Inter (body)
- **Layout:** Sidebar 264px fixe + contenu principal

## Roadmap future

### Phase 2 - Paiements & Facturation (P1)
- Facturation automatique depuis devis
- Intégration Stripe complète avec webhooks
- Rappels de paiement
- Dashboard financier

### Phase 3 - Portail Client Self-Service (P1)
- Authentification magic-link
- Vue/acceptation/rejet devis
- Suivi interventions
- Paiement en ligne
- Soumission avis

### Phase 4 - Planning & Interventions (P1)
- Calendrier équipe
- Gestion équipes/membres
- Détection conflits
- Check-in/out terrain

### Phase 5 - Features avancées (P2)
- Moteur scoring ML avancé
- Module fidélisation client
- Rapports CSV/PDF exportables
- Centre notifications in-app
- Système multi-rôles (super_admin, manager, commercial, technicien)

### Phase 6 - Intégrations externes (P2)
- Google Calendar bidirectionnel
- WhatsApp Business API
- Zapier/Make webhooks
- Widget tracking prospect JavaScript

## Status
- **MVP:** Complet et fonctionnel
- **Audit P0:** Terminé (corrections route ordering, indexes MongoDB, ESLint, navigation)
- **Tests:** Backend 100% (22/22) | Frontend 100%
