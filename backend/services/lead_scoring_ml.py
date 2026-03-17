import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
from datetime import datetime, timezone, timedelta
import os

class LeadScoringModel:
    def __init__(self, db):
        self.db = db
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.feature_names = [
            'days_since_created',
            'interactions_count',
            'email_opens',
            'quote_views',
            'response_time_hours',
            'source_quality',
            'service_demand',
            'surface_value',
        ]
        self.model_path = 'models/lead_scoring_model.pkl'
        self.scaler_path = 'models/lead_scoring_scaler.pkl'

    async def extract_features(self, lead_data: dict) -> np.array:
        """Extrait les features d'un lead"""
        features = []

        # 1. Jours depuis création
        created_at = lead_data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        elif created_at is None:
            created_at = datetime.now(timezone.utc)
        
        days_since = (datetime.now(timezone.utc) - created_at).days
        features.append(max(0, days_since))

        # 2. Nombre d'interactions
        interactions = await self.db.interactions.count_documents({'lead_id': lead_data['lead_id']})
        features.append(interactions)

        # 3. Ouvertures d'emails
        email_opens = lead_data.get('email_opens', 0)
        features.append(email_opens)

        # 4. Vues de devis
        quote_views = await self.db.quotes.count_documents({
            'lead_id': lead_data['lead_id'],
            'viewed_at': {'$exists': True, '$ne': None}
        })
        features.append(quote_views)

        # 5. Temps de réponse
        first_interaction = await self.db.interactions.find_one(
            {'lead_id': lead_data['lead_id']},
            sort=[('created_at', 1)]
        )
        if first_interaction:
            interaction_time = first_interaction.get('created_at')
            if isinstance(interaction_time, str):
                interaction_time = datetime.fromisoformat(interaction_time.replace('Z', '+00:00'))
            response_time = (interaction_time - created_at).total_seconds() / 3600
            features.append(max(0, min(999, response_time)))
        else:
            features.append(999)

        # 6. Qualité de la source
        source = lead_data.get('source', 'direct')
        source_won = await self.db.leads.count_documents({
            'source': source,
            'status': 'gagné'
        })
        features.append(source_won)

        # 7. Demande du service
        service_type = lead_data.get('service_type', 'Ménage')
        service_total = await self.db.leads.count_documents({
            'service_type': service_type
        })
        features.append(service_total)

        # 8. Surface
        surface = lead_data.get('surface') or 0
        if surface is None:
            surface = 0
        features.append(float(surface))

        return np.array(features).reshape(1, -1)

    async def train(self):
        """Entraîne le modèle sur l'historique"""
        # Récupérer les leads terminaux
        leads = await self.db.leads.find({
            'status': {'$in': ['gagné', 'perdu']}
        }).to_list(10000)

        if len(leads) < 20:
            raise ValueError(f"Pas assez de données (minimum 20, trouvé {len(leads)})")

        X = []
        y = []

        for lead in leads:
            try:
                features = await self.extract_features(lead)
                X.append(features[0])
                y.append(1 if lead['status'] == 'gagné' else 0)
            except Exception as e:
                print(f"Erreur feature extraction pour {lead.get('lead_id')}: {e}")
                continue

        if len(X) < 20:
            raise ValueError(f"Features valides insuffisantes (minimum 20, trouvé {len(X)})")

        X = np.array(X)
        y = np.array(y)

        # Normalisation
        X_scaled = self.scaler.fit_transform(X)

        # Entraînement
        self.model.fit(X_scaled, y)

        # Sauvegarde
        joblib.dump(self.model, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)

        # Métriques
        score = self.model.score(X_scaled, y)
        
        return {
            'accuracy': round(score, 3),
            'trained_on': len(leads),
            'features': self.feature_names,
            'positive_samples': int(sum(y)),
            'negative_samples': int(len(y) - sum(y))
        }

    def load_model(self):
        """Charge le modèle entraîné"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError("Modèle non entraîné")
        
        self.model = joblib.load(self.model_path)
        self.scaler = joblib.load(self.scaler_path)

    async def predict_score(self, lead_data: dict) -> dict:
        """Prédit le score d'un lead"""
        features = await self.extract_features(lead_data)
        features_scaled = self.scaler.transform(features)

        # Probabilité
        proba = self.model.predict_proba(features_scaled)[0][1]
        score = int(proba * 100)

        # Recommendations
        recommendations = []
        features_dict = dict(zip(self.feature_names, features[0]))

        if features_dict['interactions_count'] < 2:
            recommendations.append("Augmenter les interactions (appels, emails)")
        if features_dict['response_time_hours'] > 48:
            recommendations.append("Réduire le temps de réponse")
        if features_dict['quote_views'] == 0:
            recommendations.append("Envoyer un devis personnalisé")

        segment = self._get_segment(score)

        return {
            'score': score,
            'probability': round(proba, 3),
            'confidence': 'high' if proba > 0.7 or proba < 0.3 else 'medium',
            'segment': segment,
            'recommendations': recommendations,
        }

    def _get_segment(self, score: int) -> str:
        if score >= 80:
            return 'hot'
        elif score >= 60:
            return 'warm'
        elif score >= 40:
            return 'cold'
        else:
            return 'dead'
