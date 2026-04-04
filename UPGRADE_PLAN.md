# 🚀 CRM MEGA UPGRADE PLAN — Global Clean Home

**Date:** 2026-04-04
**Objectif:** Transformer le CRM en une plateforme de niveau Salesforce/HubSpot/Jobber, taillée pour le nettoyage pro
**Principe:** Améliorer sans casser l'existant — chaque phase est un commit testable

---

## 📊 GAP ANALYSIS — Ce qui manque vs le marché

### VS HubSpot/Salesforce
| Feature | Ton CRM | HubSpot/Salesforce | Action |
|---------|---------|-------------------|--------|
| AI Assistant | ❌ | ✅ Breeze/Einstein | AJOUTER |
| Lead Scoring ML | ⚠️ Basique | ✅ Prédictif | AMÉLIORER |
| Blueprints/Pipelines multiples | ❌ | ✅ | AJOUTER |
| Bulk Operations | ❌ | ✅ | AJOUTER |
| Email Sequences | ⚠️ Follow-up J+2 | ✅ Multi-step | AMÉLIORER |
| NPS/CSAT Surveys | ❌ | ✅ | AJOUTER |
| Activity Timeline | ⚠️ Basique | ✅ 360° | AMÉLIORER |

### VS Jobber/Housecall Pro (spécifique nettoyage)
| Feature | Ton CRM | Jobber/HCP | Action |
|---------|---------|------------|--------|
| Recurring Services/Contrats | ❌ | ✅ | AJOUTER |
| Route Optimization/Map | ❌ | ✅ | AJOUTER |
| GPS Tracking intervenants | ❌ | ✅ | AJOUTER |
| Online Booking Widget | ❌ | ✅ | AJOUTER |
| Before/After Photos | ❌ | ✅ | AJOUTER |
| Checklist interventions | ⚠️ | ✅ | AMÉLIORER |
| Client Reviews | ❌ | ✅ | AJOUTER |
| SMS Notifications | ❌ | ✅ | AJOUTER |

### Points critiques audit à fixer
| Bug | Status | Action |
|-----|--------|--------|
| Enum validation | ✅ Partiellement fixé | COMPLÉTER |
| State machine | ✅ Fait | OK |
| Surface négative | ❌ | FIXER |
| Race conditions | ⚠️ Verrous basiques | AMÉLIORER |
| Pagination | ⚠️ Partiel | COMPLÉTER |
| CORS strict | ✅ Fait | OK |
| Rate limiting | ✅ Fait | OK |

---

## 🔧 PHASE 1 — BACKEND HARDENING & CORE FIXES
**Impact:** Stabilité, sécurité, performance
**Fichiers:** `backend/server.py` + modules

### 1.1 Validation complète Pydantic
- field_validators sur surface, montants, dates
- Enum classes pour tous les statuts
- Validation emails jetables

### 1.2 Pagination universelle
- Tous les endpoints GET avec skip/limit/total
- Cursor-based pagination pour gros datasets

### 1.3 Soft Delete universel
- Champ `deleted_at` sur toutes les collections
- Endpoint restore
- Filtre auto dans toutes les queries

### 1.4 Audit Trail
- Collection `audit_log` — qui a fait quoi, quand
- Middleware automatique pour toutes les mutations

---

## 🤖 PHASE 2 — AI ASSISTANT MODULE
**Impact:** Différenciateur massif — aucun CRM nettoyage n'a ça
**Fichiers:** `backend/ai_engine.py` (refonte), `frontend/src/components/ai/`

### 2.1 AI Lead Insights
- Analyse automatique de chaque lead
- Score prédictif basé sur historique conversions
- Suggestion "next best action"
- Détection leads chauds/froids

### 2.2 AI Email Writer
- Génération automatique d'emails personnalisés
- Ton adaptatif (formel/amical selon client)
- Suggestions de relance intelligentes

### 2.3 AI Dashboard Insights
- Résumé quotidien automatique
- Alertes intelligentes ("3 devis expirent demain")
- Prédictions revenue mensuel
- Anomaly detection

### 2.4 AI Chat Assistant
- Chatbot interne pour l'équipe
- "Combien de leads ce mois ?", "Quel intervenant est dispo mardi ?"
- Recherche en langage naturel

---

## 📅 PHASE 3 — RECURRING SERVICES & CONTRACTS
**Impact:** Essentiel pour entreprise nettoyage
**Fichiers:** `backend/contracts.py` (nouveau), `frontend/src/components/contracts/`

### 3.1 Gestion Contrats
- Contrats récurrents (hebdo, bi-hebdo, mensuel)
- Durée, renouvellement auto, préavis
- Prix fixe ou variable
- Historique modifications

### 3.2 Auto-génération Interventions
- Création automatique des interventions récurrentes
- Assignation auto aux mêmes intervenants
- Gestion exceptions (jours fériés, vacances)

### 3.3 Facturation récurrente
- Factures automatiques selon contrat
- Prélèvement auto (Stripe recurring)

---

## 🗺️ PHASE 4 — MAP VIEW & GEOLOCATION
**Impact:** Visuel puissant, optimisation terrain
**Fichiers:** `backend/geo.py` (nouveau), `frontend/src/components/map/`

### 4.1 Vue Carte interventions
- Map avec toutes les interventions du jour
- Couleurs par statut (planifiée, en cours, terminée)
- Clustering par zone

### 4.2 Geocoding adresses
- Conversion auto adresses → coordonnées
- Recherche par zone géographique

### 4.3 Optimisation routes
- Calcul meilleur ordre interventions
- Temps trajet estimé entre interventions
- Export itinéraire Google Maps

---

## 📱 PHASE 5 — SMS & NOTIFICATIONS AVANCÉES
**Impact:** Communication omnicanale
**Fichiers:** `backend/sms_service.py` (nouveau), `backend/notifications.py` (refonte)

### 5.1 SMS Twilio
- Confirmation RDV par SMS
- Rappel J-1 automatique
- "L'intervenant est en route" 
- Notification fin intervention

### 5.2 Centre de Notifications
- Préférences par utilisateur (email, SMS, push, in-app)
- Templates multi-canal
- Historique toutes notifications

### 5.3 Alertes Intelligentes
- Lead sans réponse > 24h
- Devis expiration J-2
- Intervention annulée
- Paiement en retard

---

## ⭐ PHASE 6 — NPS/CSAT & REVIEWS
**Impact:** Satisfaction client mesurable
**Fichiers:** `backend/satisfaction.py` (nouveau), `frontend/src/components/satisfaction/`

### 6.1 Enquêtes satisfaction
- Envoi auto post-intervention (email + SMS)
- Score NPS (0-10) + commentaire
- Dashboard NPS global + par intervenant

### 6.2 Demande avis Google
- Lien direct Google My Business
- Suivi qui a laissé un avis
- Relance automatique si pas d'avis

---

## 📸 PHASE 7 — PHOTOS & DOCUMENTS
**Impact:** Preuve de travail, professionnalisme
**Fichiers:** `backend/documents.py` (nouveau), `frontend/src/components/documents/`

### 7.1 Photos Before/After
- Upload photos depuis portail intervenant
- Galerie par intervention
- Envoi auto au client

### 7.2 Gestion Documents
- Pièces jointes sur leads, devis, factures
- Stockage S3/Cloudinary
- Aperçu inline

---

## 🔄 PHASE 8 — BULK OPERATIONS & ADVANCED FILTERS
**Impact:** Productivité x10
**Fichiers:** Backend endpoints + Frontend composants

### 8.1 Actions en masse
- Sélection multiple leads
- Changement statut en bulk
- Email en masse
- Export sélection
- Suppression en masse

### 8.2 Filtres avancés & Vues sauvegardées
- Filtres combinables (statut + source + date + montant + tag)
- Sauvegarde filtres comme "vues"
- Vue par défaut personnalisable

### 8.3 Recherche globale
- Recherche full-text sur tout le CRM
- Résultats groupés (leads, devis, factures, interventions)
- Suggestions auto-complétion

---

## 🌐 PHASE 9 — ONLINE BOOKING WIDGET
**Impact:** Acquisition leads 24/7
**Fichiers:** `backend/booking.py` (nouveau), widget embeddable

### 9.1 Widget de réservation
- Formulaire embeddable sur site web
- Choix service, créneau, adresse
- Estimation prix instantanée
- Création lead + intervention automatique

### 9.2 Calendrier disponibilités
- Créneaux dispos en temps réel
- Blocage auto si complet
- Confirmation par email + SMS

---

## 📊 PHASE 10 — DASHBOARD V2 ULTRA
**Impact:** Vision 360° instantanée
**Fichiers:** `frontend/src/components/dashboard/` (refonte)

### 10.1 KPIs Temps Réel
- Revenue du jour/semaine/mois (live)
- Leads en pipeline par étape
- Taux conversion dynamique
- Prévision fin de mois (AI)

### 10.2 Comparaisons
- Mois vs mois précédent (%)
- Performance par source lead
- Performance par intervenant
- Performance par service

### 10.3 Widgets Personnalisables
- Drag & drop dashboard builder
- Widgets: graphiques, compteurs, listes, calendrier
- Sauvegarde layout par utilisateur

---

## ORDRE D'EXÉCUTION

| Phase | Priorité | Dépendances | Estimation |
|-------|----------|-------------|-----------|
| Phase 1 | 🔴 CRITIQUE | Aucune | 2h |
| Phase 2 | 🔴 HAUTE | Phase 1 | 3h |
| Phase 8 | 🔴 HAUTE | Phase 1 | 2h |
| Phase 3 | 🟠 HAUTE | Phase 1 | 3h |
| Phase 5 | 🟠 HAUTE | Phase 1 | 2h |
| Phase 10 | 🟠 HAUTE | Phase 1 | 3h |
| Phase 4 | 🟡 MOYENNE | Phase 3 | 2h |
| Phase 6 | 🟡 MOYENNE | Phase 5 | 2h |
| Phase 7 | 🟡 MOYENNE | Phase 1 | 2h |
| Phase 9 | 🟡 MOYENNE | Phase 3,4 | 3h |
