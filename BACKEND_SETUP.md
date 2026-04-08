# Configuration du Backend - Global Clean Home CRM

## Problème
Le backend Python nécessite une connexion MongoDB pour fonctionner. Sans elle, uvicorn se bloque au démarrage.

## Solution : MongoDB Atlas (Cloud)

### 1. Créer un compte gratuit
- Aller sur https://www.mongodb.com/cloud/atlas
- Cliquer "Try Free" (cluster gratuit M0)
- Se connecter avec email

### 2. Créer un cluster
- Create Deployment → Free Tier (M0)
- Région: Europe (Ireland recommended for EU)
- Laisser les défauts pour les autres paramètres
- Cliquer "Create"

### 3. Obtenir la string de connexion
- Une fois le cluster créé, cliquer "Connect"
- Choisir "Drivers"
- Copier la connection string (commence par `mongodb+srv://`)
- Remplacer `<username>` et `<password>` par vos identifiants

### 4. Mettre à jour `.env`
```bash
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=crm_global_clean_home
```

### 5. Relancer le backend
```bash
cd backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
```

## Alternative locale (avancé)
Si tu veux MongoDB localement sans Docker:
```bash
brew install mongodb-community  # macOS
# ou
apt-get install mongodb        # Linux
mongod --dbpath ~/mongo_data
```

## Tests
Une fois le serveur démarré:
```bash
curl -H "Authorization: Bearer test" http://localhost:8000/api/data/purge-info
```

Doit retourner:
```json
{
  "categories": {
    "leads": {"label": "Leads / Prospects", "count": 0},
    ...
  }
}
```
