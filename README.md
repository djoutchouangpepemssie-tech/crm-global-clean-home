# Global Clean Home — CRM Pro

CRM professionnel pour Global Clean Home, entreprise de nettoyage basée à Paris.

## Stack technique

| Couche | Technologie | Déploiement |
|--------|-------------|-------------|
| **Frontend** | React 18 + React Query + Tailwind + Radix/Shadcn | Vercel |
| **Backend** | Python 3 + FastAPI + Motor (MongoDB async) | Railway |
| **Base de données** | MongoDB Atlas | Managed |
| **Auth** | Google OAuth 2.0 + sessions JWT + 2FA | — |
| **Notifications** | Firebase Cloud Messaging | GCP |
| **CI/CD** | GitHub Actions (4 jobs) | Auto-deploy |

## Architecture frontend

```
frontend/src/
├── components/          # 38 pages + sous-composants
│   ├── leads/           # LeadsList, LeadDetail, LeadForm
│   ├── quotes/          # QuotesList, QuoteForm, VoiceQuote
│   ├── invoices/        # InvoicesList, InvoiceForm, FinancialDashboard
│   ├── tasks/           # TasksList
│   ├── planning/        # PlanningCalendar, IntervenantsManager
│   ├── kanban/          # KanbanBoard
│   ├── dashboard/       # Dashboard, DirectorDashboard
│   ├── accounting/      # AccountingERP, Enterprise (12 sous-modules)
│   ├── ads/             # AdsDashboard (Google + Meta)
│   ├── settings/        # SettingsPage, PurgePanel, shared.jsx
│   ├── shared/          # PageHeader, EmptyState, ConfirmDialog, StatusBadge
│   ├── ui/              # 46 primitives Shadcn/Radix
│   └── ...              # tickets, contracts, documents, portal, etc.
├── hooks/api/           # 15 fichiers de hooks React Query
│   ├── useLeads.js      # CRUD leads + optimistic updates
│   ├── useQuotes.js     # CRUD devis + envoi email
│   ├── useInvoices.js   # CRUD factures + paiements
│   ├── useTasks.js      # CRUD tâches + complétion
│   ├── useDashboard.js  # Stats + financial
│   ├── usePlanning.js   # Interventions + équipes
│   └── ...              # Analytics, Tickets, Contracts, Documents, Ads
├── lib/
│   ├── api.js           # Instance axios centralisée + queryKeys
│   ├── queryClient.js   # Config React Query globale
│   ├── leadStatus.js    # State machine des statuts de lead
│   └── dates.js         # Helpers date-fns/fr
└── design/
    └── tokens.js        # Design tokens exportables
```

### Invalidation croisée React Query

Toutes les mutations (créer un lead, accepter un devis, enregistrer un paiement...)
invalident automatiquement les caches dépendants. Le Dashboard, le Kanban, les listes
et les détails se mettent à jour en temps réel sans reload.

## Fonctionnalités

- **Leads** : pipeline commercial, scoring intelligent, state machine des statuts, détection doublons, favoris
- **Devis** : création multi-lignes avec calcul HT/TVA/TTC, dictée vocale, envoi par email
- **Factures** : création, paiements partiels, détection retards, conversion devis→facture
- **Planning** : calendrier drag-drop, 5 vues (semaine/mois/timeline/liste/zones), récurrence, check-in/out géolocalisé
- **Tâches** : regroupement chronologique, bulk actions, modale de création avec sélection lead
- **Comptabilité** : ERP complet (journaux, TVA, clôture), comptabilité entreprise (12 modules)
- **Intervenants** : gestion équipes, portail intervenant avec auth sans mot de passe, chat temps réel
- **Analytics** : CRM stats + SEO/GA4 + rentabilité
- **Publicité** : Google Ads + Meta Ads (création campagnes, KPIs)
- **IA** : scoring ML, suggestions, génération d'emails, chatbot interne
- **Workflows** : automatisations conditionnelles (emails, tâches, relances)
- **Portails** : portail client + portail intervenant (publics)
- **Notifications** : push (FCM) + email (Gmail API) + SMS (Twilio)
- **Documents** : upload, avant/après, gestion documentaire
- **Paramètres** : 15 sections (profil, entreprise, sécurité, équipe, facturation, intégrations, API, données...)

## CI/CD (GitHub Actions)

4 jobs exécutés sur chaque push vers `main` :

```
✅ backend-lint      (flake8, config dans backend/.flake8)
✅ backend-test      (pytest, MongoDB 7 en service)
✅ frontend-lint     (ESLint 9 flat config)
✅ frontend-build    (React build)
```

## Scripts frontend

```bash
npm start          # Dev server
npm run build      # Build production
npm run lint       # ESLint (0 erreurs)
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier write
npm run format:check  # Prettier check
```

## Variables d'environnement (Railway)

```
MONGO_URL=mongodb+srv://...
DB_NAME=crm_globalcleanhome
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
OPENAI_API_KEY=
ENVIRONMENT=production
FRONTEND_URL=https://crm.globalcleanhome.com
```

## Démarrage local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

# Frontend
cd frontend
npm install
npm start
```
