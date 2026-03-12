# 🚀 Global Clean Home CRM - Guide Complet v2.0

## 📊 Widget de Tracking Visiteurs

### Installation sur votre site globalcleanhome.com

Ajoutez ce code avant `</body>` sur toutes les pages :

```html
<script src="https://clean-business-hub.preview.emergentagent.com/tracking.js"></script>
<script>
  GCHTracker.init({ apiKey: 'gch_YOUR_API_KEY' });
</script>
```

### Ce qui est tracké automatiquement :

✅ **Pages visitées** - Parcours complet du visiteur  
✅ **Temps passé** - Durée sur chaque page  
✅ **Clics trackés** - Tous boutons, liens, CTAs  
✅ **Source attribution** - UTM params, referrer, campagne  
✅ **Device info** - Mobile/desktop/tablet, résolution  
✅ **Scroll depth** - À 25%, 50%, 75%, 100%  
✅ **Formulaires** - Soumissions automatiquement liées aux leads  
✅ **Localisation** - Via IP (timezone, langue)

### Événements spéciaux trackés :

- **cta_click** : Clics sur "Devis gratuit", "Réserver", "Appeler"
- **phone_click** : Clics sur numéros de téléphone
- **form_submit** : Soumissions de formulaires
- **button_click** : Tous les clics de boutons
- **heartbeat** : Activité toutes les 30s

### API Tracking personnalisée :

```javascript
// Tracker un événement personnalisé
GCHTracker.trackCustomEvent('video_play', {
  video_title: 'Présentation services'
});

// Identifier un visiteur
GCHTracker.identifyVisitor({
  name: 'Jean Dupont',
  email: 'jean@example.com'
});
```

---

## 📈 Page Analytics (Nouvelle !)

Accédez à **Analytics** dans le menu pour voir :

### KPIs Visiteurs :
- **Visiteurs uniques** - Comptage par visitor_id unique
- **Pages vues** - Total des pages consultées
- **Clics CTA** - Interactions avec boutons d'action
- **Formulaires soumis** - Conversions réelles
- **Taux de conversion** - % visiteurs → leads
- **Sessions** - Nombre de visites

### Visualisations :
- **Entonnoir de conversion** - Visiteurs → Clics → Formulaires
- **Sources de trafic** - Google, Facebook, Direct, etc.
- **Appareils** - Desktop vs Mobile vs Tablet
- **Top 10 pages** - Pages les plus visitées avec nombre de vues

### Filtres :
- Aujourd'hui / 7 jours / 30 jours

---

## 🎯 Tableau Kanban (Nouvelle !)

### Visualisation du Pipeline

Accédez à **Kanban** pour voir vos leads organisés en colonnes :

**Colonnes disponibles :**
1. 🆕 **Nouveau** (bleu)
2. 📞 **Contacté** (jaune)
3. ⏳ **En attente** (orange)
4. 📄 **Devis envoyé** (violet)
5. ✅ **Gagné** (vert)
6. ❌ **Perdu** (rouge)

### Fonctionnalités :
- **Drag & Drop** - Glissez un lead d'une colonne à l'autre
- **Mise à jour automatique** - Le statut change dans la base de données
- **Compteur** - Nombre de leads par colonne
- **Cards détaillées** - Avatar, nom, service, email, téléphone, score
- **Responsive** - Scroll horizontal sur petits écrans

### Utilisation :
```
1. Cliquez et maintenez sur une card
2. Déplacez vers la colonne souhaitée
3. Relâchez - Le statut est mis à jour automatiquement
4. Toast de confirmation apparaît
```

---

## 🎯 Score Intelligent de Lead (Amélioré)

### Algorithme de Scoring (0-100)

**Base : 50 points**

**+ Source (+5 à +15):**
- Google Ads : +15
- SEO : +12
- Meta Ads : +10
- Direct : +8
- Referral : +10

**+ Service (+8 à +15):**
- Bureaux : +15 (contrats + gros)
- Ménage : +12
- Canapé : +10
- Matelas : +10
- Tapis : +8

**+ Complétude (+0 à +25):**
- Surface renseignée : +10
- Adresse complète : +5
- Message > 20 caractères : +10

**- Pénalité Temps (après 2h) :**
- -2 points par heure écoulée (max -20)

### Badges Visuels :

| Score | Badge | Couleur | Priorité |
|-------|-------|---------|----------|
| 80-100 | Excellent | Vert | URGENT |
| 60-79 | Bon | Bleu | Haute |
| 40-59 | Moyen | Jaune | Normale |
| 0-39 | Faible | Rouge | Basse |

**Où voir le score :**
- Dashboard (liste leads récents)
- Liste leads (colonne dédiée)
- Kanban (sur chaque card)
- Fiche détaillée lead

---

## 💬 Templates de Réponses Rapides

### Créer un Template

1. Allez dans **Paramètres** → Templates
2. Cliquez "Nouveau template"
3. Remplissez :
   - Nom du template
   - Type (Note, Email, Relance)
   - Contenu avec variables

### Variables disponibles :

```
{{nom}} - Nom du lead
{{service}} - Type de service
{{date}} - Date du jour
{{montant}} - Montant du devis
```

### Exemples de Templates :

**Email de confirmation :**
```
Bonjour {{nom}},

Merci pour votre demande de devis pour le service {{service}}.

Nous reviendrons vers vous dans les 2 heures avec une proposition personnalisée.

Cordialement,
L'équipe Global Clean Home
```

**Relance 48h :**
```
Bonjour {{nom}},

Je me permets de revenir vers vous concernant votre demande de {{service}}.

Avez-vous eu le temps de consulter notre devis de {{montant}}€ ?

Je reste à votre disposition pour toute question.

Bien à vous,
Global Clean Home
```

### Utilisation :
1. Dans la fiche lead, section Interactions
2. Cliquez sur l'icône "Copier" du template souhaité
3. Le texte est copié dans le presse-papier
4. Collez-le dans le champ d'interaction

---

## ⚡ Actions Groupées (Bulk Actions)

### Utilisation :

1. **Sélectionner les leads** - Cochez les cases dans la liste
2. **Barre d'actions apparaît** - En haut de la liste
3. **Choisir l'action** - Dans le menu déroulant
4. **Cliquer "Appliquer"**

### Actions disponibles :
- Marquer contacté
- Marquer en attente
- Marquer perdu
- (Plus d'actions à venir)

### Use Cases :
- Nettoyer les leads perdus en masse
- Marquer plusieurs leads contactés après une session d'appels
- Réorganiser le pipeline rapidement

---

## 📥 Export CSV

### Comment exporter :

1. Allez dans **Leads**
2. Appliquez vos filtres (statut, service, source)
3. Cliquez **"Exporter CSV"** en haut à droite
4. Le fichier se télécharge automatiquement

### Colonnes exportées :
- lead_id
- name
- email
- phone
- service_type
- surface
- address
- source
- status
- **score** (nouveau !)
- created_at
- updated_at

### Analyse externe :
- Ouvrez dans Excel/Google Sheets
- Créez des tableaux croisés dynamiques
- Partagez avec votre équipe
- Importez dans d'autres outils

---

## 🔔 Notifications Temps Réel

### Fonctionnement :

**Polling automatique toutes les 30 secondes** pour détecter nouveaux leads.

### Ce qui se passe :
1. Nouveau lead créé (via formulaire site ou API)
2. **Toast notification** apparaît en haut à droite
3. **Son de notification** joué (volume 30%)
4. **Bouton "Voir"** pour accès direct au lead
5. **Badge compteur** mis à jour dans l'interface

### Notifications affichées :
```
🎯 Nouveau lead: Jean Dupont
Ménage - jean@example.com
[Voir]
```

### Configuration :
- Autorisez les notifications du navigateur
- Gardez un onglet CRM ouvert
- Le polling fonctionne en arrière-plan
- Ne consomme quasiment pas de ressources

---

## 📊 Statistiques Avancées

### Nouveaux KPIs Dashboard :

**Score moyen leads** - Indicateur qualité globale  
**Meilleure source** - Source avec meilleur taux de conversion + CA  
**ROI par source** - Tableau détaillé performance/source  

### Calculs automatiques :

**Conversion Lead → Devis :**
```
(Nombre devis envoyés / Nombre leads) × 100
```

**Conversion Devis → Client :**
```
(Nombre devis acceptés / Nombre devis envoyés) × 100
```

**CA estimé par source :**
```
Nombre leads gagnés × 500€ (valeur moyenne deal)
```

---

## 🔗 API Publique pour Intégrations

### Créer un Lead depuis votre site :

```javascript
fetch('https://clean-business-hub.preview.emergentagent.com/api/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Jean Dupont",
    email: "jean@example.com",
    phone: "+33612345678",
    service_type: "Ménage",
    surface: 80,
    address: "15 rue de Paris, 75001 Paris",
    message: "Je souhaite un devis pour un ménage complet",
    source: "Google Ads",
    campaign: "Campagne Ménage Automne 2026",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "menage_automne_2026"
  })
})
.then(res => res.json())
.then(data => console.log('Lead créé:', data.lead_id));
```

### Réponse :
```json
{
  "lead_id": "lead_abc123def456",
  "score": 78,
  "status": "nouveau",
  "created_at": "2026-03-12T16:45:00Z"
}
```

---

## 🎯 Webhooks (À venir)

### Configuration Zapier/Make :

**URL du Webhook :**
```
https://clean-business-hub.preview.emergentagent.com/api/webhooks/zapier
```

**Événements disponibles :**
- `lead.created` - Nouveau lead
- `lead.updated` - Lead modifié
- `quote.sent` - Devis envoyé
- `quote.accepted` - Devis accepté
- `task.due` - Tâche échue

### Use Cases :
- Envoyer SMS via Twilio quand lead créé
- Créer deal Pipedrive automatiquement
- Ajouter contact dans Mailchimp
- Créer événement Google Calendar
- Notifier Slack du nouveau lead

---

## 📱 Responsive & Mobile

### Optimisations Mobile :

✅ **Navigation adaptative** - Menu hamburger sur mobile  
✅ **Cards optimisées** - Touch-friendly  
✅ **Tableaux scrollables** - Horizontal scroll  
✅ **Kanban swipeable** - Gestes tactiles  
✅ **Forms adaptés** - Inputs grandes tailles  

### Recommandation :
Utilisez l'application sur **desktop pour productivité maximale**, mobile pour **consultation rapide**.

---

## 🔐 Sécurité & RGPD

### Mesures en place :

✅ **Auth OAuth Google** - Connexion sécurisée  
✅ **Cookies httpOnly** - Protection XSS  
✅ **Sessions 7 jours** - Expiration automatique  
✅ **Logs complets** - Traçabilité audit  
✅ **API sécurisée** - CORS configuré  

### Conformité RGPD :

- **Consentement tracking** - Ajoutez banner cookies
- **Droit à l'oubli** - Suppression leads possible
- **Portabilité** - Export CSV disponible
- **Transparence** - Logs accessibles

---

## 🚀 Prochaines Fonctionnalités

### Phase 3 (En cours) :

- [ ] SMS Twilio - Relances par SMS
- [ ] WhatsApp Business - Messages WhatsApp
- [ ] Rapports PDF - Génération automatique
- [ ] Multi-utilisateurs - Rôles & permissions
- [ ] Stripe - Paiements intégrés

### Phase 4 (Planifié) :

- [ ] IA Prédictive - ML scoring avancé
- [ ] Google Calendar - Sync interventions
- [ ] Mobile App - iOS/Android native
- [ ] Heatmaps - Visualisation comportement
- [ ] A/B Testing - Optimisation conversion

---

## 📞 Support & Questions

Pour toute question sur l'utilisation du CRM :

1. Consultez ce guide complet
2. Regardez les tooltips dans l'interface
3. Testez avec des données de démo
4. Contactez le support technique

**Astuce Pro :** Passez 30 minutes à explorer chaque section du CRM pour maîtriser toutes les fonctionnalités !

---

## 🎓 Formation Rapide (10 min)

### Jour 1 - Bases :
1. Créer un lead manuellement
2. Changer son statut
3. Créer et envoyer un devis
4. Voir le dashboard

### Jour 2 - Intermédiaire :
1. Utiliser les filtres
2. Exporter en CSV
3. Utiliser le Kanban
4. Créer des templates

### Jour 3 - Avancé :
1. Installer le widget tracking
2. Analyser les visiteurs
3. Actions groupées
4. Optimiser le scoring

---

**Version :** 2.0.0  
**Dernière mise à jour :** 12 Mars 2026  
**Plateforme :** Global Clean Home CRM
