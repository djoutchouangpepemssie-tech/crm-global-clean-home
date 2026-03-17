from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os
import json

logger = logging.getLogger(__name__)
ai_router = APIRouter(prefix="/api/ai", tags=["ai"])

_db = None

def init_ai_db(database):
    global _db
    _db = database

# ============ PREDICTIVE SCORING ============

def predict_score(lead_data: dict, historical_data: list = []) -> dict:
    """Lead scoring predictif base sur les patterns de conversion."""
    score = 30
    factors = []
    
    # 1. Source quality (max +20)
    source_scores = {
        "Google Ads": 20, "google": 20, "google_ads": 20,
        "SEO": 18, "seo": 18,
        "recommandation": 18, "Referral": 16,
        "Meta Ads": 12, "facebook": 12, "facebook_ads": 12,
        "Direct": 8, "site_web": 10,
    }
    src = lead_data.get("utm_source") or lead_data.get("source", "")
    src_score = source_scores.get(src, 5)
    score += src_score
    if src_score >= 15:
        factors.append({"label": f"Source premium ({src})", "impact": "+", "points": src_score})
    
    # 2. Service value (max +15)
    service_scores = {
        "nettoyage-bureaux": 15, "Bureaux": 15,
        "menage-domicile": 12, "Menage": 12,
        "nettoyage-canape": 10, "Canape": 10,
        "nettoyage-matelas": 10, "Matelas": 10,
        "nettoyage-tapis": 8, "Tapis": 8,
    }
    svc = lead_data.get("service_type", "")
    svc_score = service_scores.get(svc, 5)
    score += svc_score
    factors.append({"label": f"Service: {svc}", "impact": "+", "points": svc_score})
    
    # 3. Profile completeness (max +15)
    profile = 0
    if lead_data.get("address"): profile += 4; factors.append({"label": "Adresse fournie", "impact": "+", "points": 4})
    if lead_data.get("surface"): profile += 5; factors.append({"label": "Surface renseignee", "impact": "+", "points": 5})
    if lead_data.get("phone"): profile += 3
    if lead_data.get("email"): profile += 3
    msg = str(lead_data.get("message", ""))
    if len(msg) > 50: profile += 4; factors.append({"label": "Message detaille", "impact": "+", "points": 4})
    score += profile
    
    # 4. Intent signals (max +15)
    intent = 0
    services = lead_data.get("services", [])
    if isinstance(services, list) and len(services) > 1:
        intent += min(10, len(services) * 4)
        factors.append({"label": f"Multi-services ({len(services)})", "impact": "+", "points": min(10, len(services) * 4)})
    
    urgency = ["urgent", "rapidement", "vite", "semaine", "asap"]
    if any(kw in msg.lower() for kw in urgency):
        intent += 8
        factors.append({"label": "Urgence detectee", "impact": "+", "points": 8})
    
    price = lead_data.get("estimated_price", 0) or 0
    if price >= 500: intent += 7; factors.append({"label": f"Budget eleve ({price}EUR)", "impact": "+", "points": 7})
    elif price >= 200: intent += 4
    
    surface = lead_data.get("surface") or 0
    try:
        surface = float(surface)
        if surface >= 100: intent += 5; factors.append({"label": "Grande surface", "impact": "+", "points": 5})
        elif surface >= 50: intent += 3
    except: pass
    
    score += min(15, intent)
    
    # 5. Time penalty (max -15)
    penalty = 0
    created = lead_data.get("created_at")
    if created:
        try:
            if isinstance(created, str):
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            hours = (datetime.now(timezone.utc) - created).total_seconds() / 3600
            if hours > 24: penalty = min(15, int((hours - 24) / 4)); factors.append({"label": f"Lead de {int(hours)}h", "impact": "-", "points": penalty})
        except: pass
    
    score = max(0, min(100, score - penalty))
    
    # Segment
    if score >= 75: segment = "hot"; segment_label = "🔥 Tres chaud"; color = "#f43f5e"
    elif score >= 55: segment = "warm"; segment_label = "♨️ Chaud"; color = "#f59e0b"
    elif score >= 35: segment = "lukewarm"; segment_label = "🌡️ Tiede"; color = "#a78bfa"
    else: segment = "cold"; segment_label = "❄️ Froid"; color = "#60a5fa"
    
    conversion_prob = round(score * 0.8, 1)
    
    return {
        "score": score,
        "segment": segment,
        "segment_label": segment_label,
        "color": color,
        "conversion_probability": conversion_prob,
        "top_factors": factors[:5],
        "recommendation": _get_recommendation(score, lead_data),
    }

def _get_recommendation(score: int, lead_data: dict) -> str:
    svc = lead_data.get("service_type", "")
    name = lead_data.get("name", "ce prospect")
    if score >= 75:
        return f"PRIORITE ABSOLUE : Appelez {name} dans les 30 minutes. Envoyez un devis personnalise avec photos avant/apres pour {svc}."
    elif score >= 55:
        return f"Envoyez un devis dans les 2h avec une offre speciale -10% valable 48h. Relancez par SMS si pas de reponse."
    elif score >= 35:
        return f"Envoyez un email de presentation avec vos avis clients. Proposez un rappel sous 24h."
    else:
        return f"Ajoutez ce lead a une sequence email automatique de nurturing sur 7 jours."

# ============ AI EMAIL GENERATION ============

class EmailGenerationRequest(BaseModel):
    lead_id: str
    context: str  # relance, devis_envoye, confirmation, suivi, promo
    tone: str = "professionnel"  # professionnel, amical, urgent
    custom_instructions: Optional[str] = None

def generate_email_content(lead: dict, context: str, tone: str, custom_instructions: str = "") -> dict:
    """Genere du contenu email personnalise base sur le contexte."""
    name = lead.get("name", "").split()[0] if lead.get("name") else "cher client"
    service = lead.get("service_type", "nettoyage")
    score = lead.get("score", 50)
    
    templates = {
        "relance": {
            "professionnel": {
                "subject": f"Suite a votre demande de devis - {service}",
                "body": f"""Bonjour {name},

Je me permets de revenir vers vous suite a votre demande de devis pour notre service de {service}.

Nous avons bien recu votre demande et nous sommes prets a intervenir rapidement. Notre equipe est disponible pour repondre a toutes vos questions.

Pour faciliter l'etablissement de votre devis definitif, pourriez-vous nous confirmer :
- La date souhaitee pour l'intervention
- L'adresse exacte du lieu
- Toute information complementaire utile

N'hesitez pas a nous contacter directement au 06 22 66 53 08.

Cordialement,
L'equipe Global Clean Home"""
            },
            "amical": {
                "subject": f"On n'a pas oublie ! Votre devis {service} 😊",
                "body": f"""Bonjour {name} !

On voulait juste prendre de vos nouvelles et s'assurer que vous avez bien recu notre devis pour le {service}.

On sait que vous etes occupe, alors on a voulu vous faciliter la vie : on peut intervenir des la semaine prochaine, et on s'occupe de tout !

Des questions ? On est la ! 📱 06 22 66 53 08

A tres bientot,
L'equipe GCH"""
            },
            "urgent": {
                "subject": f"DERNIER RAPPEL - Votre devis expire bientot",
                "body": f"""Bonjour {name},

IMPORTANT : Votre devis pour {service} expire dans 48 heures.

Pour beneficier de nos tarifs actuels, confirmez votre reservation avant ce delai.

👉 Appelez-nous : 06 22 66 53 08
👉 Repondez directement a cet email

Au-dela de ce delai, une nouvelle estimation sera necessaire.

L'equipe Global Clean Home"""
            }
        },
        "devis_envoye": {
            "professionnel": {
                "subject": f"Votre devis {service} - Global Clean Home",
                "body": f"""Bonjour {name},

Veuillez trouver ci-joint votre devis personnalise pour notre service de {service}.

Notre proposition inclut :
✓ Intervention par des professionnels certifies
✓ Produits eco-responsables fournis
✓ Satisfaction garantie ou re-intervention gratuite
✓ Assurance RC Pro incluse

Ce devis est valable 30 jours. Pour toute question, notre equipe est disponible au 06 22 66 53 08.

Dans l'attente de votre retour,
L'equipe Global Clean Home"""
            },
            "amical": {
                "subject": f"Voici votre devis ! 🌟",
                "body": f"""Bonjour {name} !

Super nouvelle : votre devis personnalise est pret !

On a mis le paquet pour vous proposer le meilleur service de {service} a Paris. Et devinez quoi ? On garantit le resultat ou on revient gratuitement !

Des questions ? Appelez-nous au 06 22 66 53 08, on repond super vite !

Bonne journee !
L'equipe GCH ✨"""
            },
            "urgent": {
                "subject": f"ACTION REQUISE : Devis {service} en attente de validation",
                "body": f"""Bonjour {name},

Votre devis pour {service} est pret et en attente de votre validation.

Pour confirmer votre intervention, repondez a cet email ou appelez le 06 22 66 53 08.

OFFRE LIMITEE : -10% si vous confirmez avant ce vendredi.

Ne laissez pas passer cette opportunite !
L'equipe Global Clean Home"""
            }
        },
        "suivi": {
            "professionnel": {
                "subject": f"Comment s'est passee votre intervention ? - Global Clean Home",
                "body": f"""Bonjour {name},

Nous esperons que notre intervention pour le {service} a repondu a vos attentes.

Votre avis est precieux pour nous. Pourriez-vous nous accorder 2 minutes pour nous faire part de votre experience ?

Si vous avez le moindre commentaire ou si quelque chose n'etait pas a votre satisfaction, n'hesitez pas a nous contacter directement.

Merci de votre confiance,
L'equipe Global Clean Home"""
            },
            "amical": {
                "subject": f"Alors, ca brille ? ✨",
                "body": f"""Bonjour {name} !

On espere que vous etes super content(e) de votre {service} !

Si vous avez 2 secondes, votre avis nous ferait vraiment plaisir et aiderait d'autres personnes a nous trouver.

Et si vous avez des amis qui ont besoin d'un coup de propre, on a un super programme de parrainage : 20EUR de remise pour vous ET votre ami !

Merci d'etre avec nous 🙏
L'equipe GCH"""
            },
            "urgent": {
                "subject": f"Votre satisfaction est notre priorite",
                "body": f"""Bonjour {name},

Suite a notre intervention pour {service}, nous souhaitons nous assurer de votre complete satisfaction.

Si la moindre chose n'est pas a votre gout, contactez-nous IMMEDIATEMENT au 06 22 66 53 08.

Nous interviendrons gratuitement dans les 48h pour corriger tout probleme.

La satisfaction de nos clients est non-negociable.
L'equipe Global Clean Home"""
            }
        }
    }
    
    template = templates.get(context, templates["relance"])
    tone_template = template.get(tone, template.get("professionnel"))
    
    return {
        "subject": tone_template["subject"],
        "body": tone_template["body"],
        "context": context,
        "tone": tone,
        "lead_name": name,
        "service": service,
    }

# ============ API ROUTES ============

@ai_router.post("/score/{lead_id}")
async def score_lead(lead_id: str, request: Request):
    """Calculer le score predictif d'un lead."""
    from server import require_auth
    await require_auth(request)
    
    lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    
    result = predict_score(lead)
    
    # Mettre a jour le score dans la DB
    await _db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"score": result["score"], "segment": result["segment"], "ai_analysis": result}}
    )
    
    return result

@ai_router.post("/score-batch")
async def score_all_leads(request: Request):
    """Recalculer le score de tous les leads."""
    from server import require_auth
    await require_auth(request)
    
    leads = await _db.leads.find({}, {"_id": 0}).to_list(10000)
    updated = 0
    
    for lead in leads:
        result = predict_score(lead)
        await _db.leads.update_one(
            {"lead_id": lead["lead_id"]},
            {"$set": {"score": result["score"], "segment": result["segment"]}}
        )
        updated += 1
    
    return {"updated": updated, "message": f"{updated} leads re-scores"}

@ai_router.post("/generate-email")
async def generate_email(req: EmailGenerationRequest, request: Request):
    """Generer un email personnalise avec IA."""
    from server import require_auth
    await require_auth(request)
    
    lead = await _db.leads.find_one({"lead_id": req.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    
    email_content = generate_email_content(lead, req.context, req.tone, req.custom_instructions or "")
    
    # Sauvegarder dans l'historique
    await _db.ai_emails.insert_one({
        "email_id": f"aie_{uuid.uuid4().hex[:10]}",
        "lead_id": req.lead_id,
        "subject": email_content["subject"],
        "body": email_content["body"],
        "context": req.context,
        "tone": req.tone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "draft"
    })
    
    return email_content

@ai_router.post("/send-email/{lead_id}")
async def send_ai_email(lead_id: str, request: Request):
    """Envoyer un email genere."""
    from server import require_auth
    user = await require_auth(request)
    
    body = await request.json()
    lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead or not lead.get("email"):
        raise HTTPException(status_code=404, detail="Lead ou email introuvable")
    
    try:
        from gmail_service import _get_any_active_token, _send_gmail_message
        token, uid = await _get_any_active_token()
        if token:
            html = f"""<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:20px;border-radius:12px 12px 0 0;">
                <h2 style="color:white;margin:0;">Global Clean Home</h2>
            </div>
            <div style="background:#1e293b;padding:24px;border-radius:0 0 12px 12px;">
                <p style="color:#e2e8f0;white-space:pre-line;line-height:1.8;">{body.get('body','')}</p>
            </div>
            </body></html>"""
            await _send_gmail_message(token, lead["email"], body.get("subject", ""), html)
            
            # Log interaction
            await _db.interactions.insert_one({
                "interaction_id": f"int_{uuid.uuid4().hex[:10]}",
                "lead_id": lead_id,
                "type": "email_sent",
                "content": f"Email IA envoye: {body.get('subject', '')}",
                "user_id": user.user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_router.get("/insights")
async def get_ai_insights(request: Request):
    """Insights IA globaux sur les leads."""
    from server import require_auth
    await require_auth(request)
    
    leads = await _db.leads.find({}, {"_id": 0}).to_list(10000)
    
    hot = [l for l in leads if (l.get("score") or 0) >= 75]
    warm = [l for l in leads if 55 <= (l.get("score") or 0) < 75]
    cold = [l for l in leads if (l.get("score") or 0) < 35]
    
    # Leads sans devis depuis > 24h
    now = datetime.now(timezone.utc)
    urgent_leads = []
    for lead in hot:
        created = lead.get("created_at", "")
        try:
            if isinstance(created, str):
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
                hours = (now - dt).total_seconds() / 3600
                if hours > 2 and lead.get("status") in ["nouveau", "contacte"]:
                    urgent_leads.append({"lead_id": lead["lead_id"], "name": lead.get("name"), "hours": round(hours, 1), "score": lead.get("score")})
        except: pass
    
    return {
        "segments": {
            "hot": {"count": len(hot), "avg_score": round(sum(l.get("score",0) for l in hot)/len(hot), 1) if hot else 0},
            "warm": {"count": len(warm), "avg_score": round(sum(l.get("score",0) for l in warm)/len(warm), 1) if warm else 0},
            "cold": {"count": len(cold), "avg_score": round(sum(l.get("score",0) for l in cold)/len(cold), 1) if cold else 0},
        },
        "urgent_leads": urgent_leads[:5],
        "total_leads": len(leads),
        "avg_score": round(sum(l.get("score",0) for l in leads)/len(leads), 1) if leads else 0,
    }
