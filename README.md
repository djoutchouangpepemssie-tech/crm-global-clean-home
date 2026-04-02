# Global Clean Home — CRM Pro

CRM professionnel pour Global Clean Home, entreprise de nettoyage basée à Paris.

## Stack technique

- **Frontend** : React (Vite) → Vercel → `https://crm.globalcleanhome.com`
- **Backend** : Python/FastAPI → Railway → `https://crm-global-clean-home-production.up.railway.app`
- **Base de données** : MongoDB Atlas
- **Authentification** : Google OAuth2

## Fonctionnalités

- 📋 Gestion leads & pipeline commercial
- 📅 Planning interventions avec assignation agents
- 👷 Portail intervenant (check-in/out, checklist, messages)
- 👤 Portail client (suivi interventions, factures)
- 📧 Emails premium automatiques (devis, factures, notifications)
- 📊 Analytics GA4 + Search Console
- 📣 Publicités (Meta Ads connecté, Google Ads)
- 🤖 Workflows automatiques
- 🔔 Notifications temps réel

## Variables d'environnement (Railway)
```
MONGODB_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_SCOPES=
META_APP_ID=
META_APP_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
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

## Architecture
```
backend/
  server.py          — API principale FastAPI
  gmail_service.py   — Gmail OAuth + envoi emails
  planning.py        — Planning & interventions
  intervenant.py     — Portail intervenant
  invoices.py        — Factures & paiements
  analytics_ga4.py   — Google Analytics 4 + Search Console
  ads_connect.py     — Google Ads + Meta Ads
  
frontend/src/
  components/
    layout/          — Sidebar, navigation
    dashboard/       — Tableau de bord
    leads/           — Gestion leads
    planning/        — Planning & intervenants
    portal/          — Portails client & intervenant
    analytics/       — Analytics & SEO
    ads/             — Publicités
```
