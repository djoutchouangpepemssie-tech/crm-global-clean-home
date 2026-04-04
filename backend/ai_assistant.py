"""
AI Assistant Module — Global Clean Home CRM
Phase 2: Advanced AI features (rule-based / statistical — no external AI API)

Endpoints:
  GET  /api/ai/lead-insights/{lead_id}   — Predictive lead score + next action
  GET  /api/ai/suggestions               — Smart action suggestions
  GET  /api/ai/dashboard-summary         — Rich AI dashboard summary
  POST /api/ai/compose-email             — Personalized email generation
  GET  /api/ai/anomalies                 — Anomaly / pattern detection
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging
import uuid

logger = logging.getLogger(__name__)

ai_assistant_router = APIRouter(prefix="/api/ai", tags=["ai-assistant"])

_db = None


def init_ai_assistant_db(database):
    global _db
    _db = database


# ─────────────────────────────────────────────────────────────
#  SHARED CONSTANTS
# ─────────────────────────────────────────────────────────────

SOURCE_QUALITY: Dict[str, int] = {
    "Google Ads": 25, "google_ads": 25, "google": 25,
    "SEO": 20, "seo": 20,
    "recommandation": 20, "Referral": 18,
    "Meta Ads": 12, "facebook": 12, "facebook_ads": 12,
    "site_web": 10, "Direct": 8,
    "réseaux-sociaux": 6, "reseaux-sociaux": 6,
}

SERVICE_DEMAND: Dict[str, int] = {
    "nettoyage-bureaux": 20, "Bureaux": 20,
    "menage-domicile": 16, "Ménage": 16, "Menage": 16,
    "nettoyage-canape": 12, "Canapé": 12, "Canape": 12,
    "nettoyage-matelas": 12, "Matelas": 12,
    "nettoyage-tapis": 10, "Tapis": 10,
}

# ─────────────────────────────────────────────────────────────
#  HELPER: safe datetime parsing
# ─────────────────────────────────────────────────────────────

def _parse_dt(value) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  2.1  LEAD INSIGHTS ENGINE
# ─────────────────────────────────────────────────────────────

def _compute_lead_insights(lead: dict, conversion_rates: Dict[str, float]) -> dict:
    """
    Compute a detailed predictive conversion score (0-100) with factor breakdown.
    All weights sum to 100 max base + bonus.
    """
    score = 0
    factors = []
    now = datetime.now(timezone.utc)

    # ── Factor 1: Source quality (0-25) ──
    src = lead.get("utm_source") or lead.get("source") or "Direct"
    src_pts = SOURCE_QUALITY.get(src, 5)
    score += src_pts
    factors.append({
        "factor": "source_quality",
        "label": f"Source: {src}",
        "points": src_pts,
        "max": 25,
        "impact": "positive" if src_pts >= 15 else "neutral",
    })

    # ── Factor 2: Response speed (0-20) ──
    created_dt = _parse_dt(lead.get("created_at"))
    response_pts = 0
    if created_dt:
        hours_old = (now - created_dt).total_seconds() / 3600
        if hours_old < 1:
            response_pts = 20
        elif hours_old < 4:
            response_pts = 15
        elif hours_old < 24:
            response_pts = 10
        elif hours_old < 72:
            response_pts = 5
        else:
            response_pts = max(0, 5 - int((hours_old - 72) / 24))
        score += response_pts
        factors.append({
            "factor": "response_speed",
            "label": f"Âge du lead: {round(hours_old, 1)}h",
            "points": response_pts,
            "max": 20,
            "impact": "positive" if response_pts >= 15 else ("neutral" if response_pts >= 8 else "negative"),
        })

    # ── Factor 3: Service type demand (0-20) ──
    svc = lead.get("service_type") or ""
    svc_pts = SERVICE_DEMAND.get(svc, 5)
    # Use historical conversion rate from DB if available (bonus up to +5)
    hist_rate = conversion_rates.get(svc, 0.0)
    svc_bonus = min(5, int(hist_rate * 10)) if hist_rate > 0 else 0
    svc_total = min(20, svc_pts + svc_bonus)
    score += svc_total
    factors.append({
        "factor": "service_demand",
        "label": f"Service: {svc}" + (f" (conv. hist. {round(hist_rate*100, 1)}%)" if hist_rate else ""),
        "points": svc_total,
        "max": 20,
        "impact": "positive" if svc_total >= 14 else "neutral",
    })

    # ── Factor 4: Surface / budget correlation (0-15) ──
    budget_pts = 0
    surface = lead.get("surface") or 0
    try:
        surface = float(surface)
    except Exception:
        surface = 0
    estimated_price = lead.get("estimated_price") or 0
    try:
        estimated_price = float(estimated_price)
    except Exception:
        estimated_price = 0

    if estimated_price >= 500:
        budget_pts = 15
    elif estimated_price >= 200:
        budget_pts = 10
    elif estimated_price > 0:
        budget_pts = 5
    elif surface >= 100:
        budget_pts = 12
    elif surface >= 50:
        budget_pts = 8
    elif surface > 0:
        budget_pts = 4

    score += budget_pts
    factors.append({
        "factor": "budget_surface",
        "label": f"Budget estimé: {estimated_price}€, Surface: {surface}m²",
        "points": budget_pts,
        "max": 15,
        "impact": "positive" if budget_pts >= 10 else "neutral",
    })

    # ── Factor 5: Lead completeness (0-20) ──
    completeness_pts = 0
    completeness_details = []
    if lead.get("address"):
        completeness_pts += 4; completeness_details.append("adresse")
    if lead.get("phone"):
        completeness_pts += 3; completeness_details.append("téléphone")
    if lead.get("email"):
        completeness_pts += 3; completeness_details.append("email")
    if surface > 0:
        completeness_pts += 4; completeness_details.append("surface")
    msg = str(lead.get("message") or "")
    if len(msg) > 50:
        completeness_pts += 3; completeness_details.append("message détaillé")
    services = lead.get("services") or []
    if isinstance(services, list) and len(services) > 1:
        completeness_pts += 3; completeness_details.append(f"{len(services)} services")

    score += completeness_pts
    factors.append({
        "factor": "completeness",
        "label": "Complétude: " + (", ".join(completeness_details) if completeness_details else "basique"),
        "points": completeness_pts,
        "max": 20,
        "impact": "positive" if completeness_pts >= 12 else "neutral",
    })

    # ── Urgency keyword bonus (0-10) ──
    urgency_keywords = ["urgent", "rapidement", "vite", "dès que", "asap", "cette semaine", "semaine prochaine"]
    if any(kw in msg.lower() for kw in urgency_keywords):
        score += 10
        factors.append({
            "factor": "urgency_signal",
            "label": "Signal d'urgence détecté dans le message",
            "points": 10,
            "max": 10,
            "impact": "positive",
        })

    # Clamp
    score = max(0, min(100, score))

    # Confidence: more data → higher confidence
    filled_fields = sum([
        bool(lead.get("source")), bool(lead.get("address")),
        bool(lead.get("surface")), bool(lead.get("phone")),
        bool(lead.get("email")), bool(lead.get("message")),
        bool(lead.get("service_type")),
    ])
    confidence = min(95, 50 + filled_fields * 6)

    # Next best action
    status = lead.get("status") or "nouveau"
    name = (lead.get("name") or "ce prospect").split()[0]

    if score >= 75:
        next_action = f"🔥 PRIORITÉ : Appelez {name} dans les 30 minutes. Envoyez un devis personnalisé immédiatement."
    elif score >= 55:
        if status in ("nouveau", "contacté"):
            next_action = f"📋 Envoyez un devis sous 2h avec une offre spéciale -10% valable 48h."
        elif status == "devis_envoyé":
            next_action = f"📞 Relancez {name} par téléphone — devis envoyé sans réponse."
        else:
            next_action = f"👀 Suivez ce lead de près, potentiel élevé."
    elif score >= 35:
        next_action = f"📧 Ajoutez {name} à une séquence email de nurturing. Relance sous 24h."
    else:
        next_action = f"🗂️ Lead froid — intégrez dans la newsletter mensuelle ou archivez si > 30 jours."

    # Insights
    insights = []
    if src_pts >= 20:
        insights.append(f"Source premium ({src}) — taux de conversion historiquement élevé")
    if response_pts <= 5 and created_dt:
        insights.append(f"Lead vieux de {round((now - created_dt).total_seconds()/3600, 0)}h — réactivité urgente requise")
    if completeness_pts >= 14:
        insights.append("Profil très complet — facilite la personnalisation de l'offre")
    if estimated_price >= 500:
        insights.append(f"Budget estimé élevé ({estimated_price}€) — opportunité haute valeur")
    if isinstance(services, list) and len(services) > 1:
        insights.append(f"Demande multi-services ({len(services)}) — potentiel de vente croisée")
    if hist_rate > 0.3:
        insights.append(f"Taux de conversion historique élevé pour {svc}: {round(hist_rate*100, 1)}%")
    if not insights:
        insights.append("Lead standard — suivez le processus habituel de qualification.")

    return {
        "score": score,
        "confidence": confidence,
        "factors": factors,
        "next_action": next_action,
        "insights": insights,
        "segment": "hot" if score >= 75 else "warm" if score >= 55 else "lukewarm" if score >= 35 else "cold",
        "segment_label": "🔥 Très chaud" if score >= 75 else "♨️ Chaud" if score >= 55 else "🌡️ Tiède" if score >= 35 else "❄️ Froid",
    }


@ai_assistant_router.get("/lead-insights/{lead_id}")
async def lead_insights(lead_id: str, request: Request):
    """Analyse complète d'un lead avec score prédictif, facteurs et recommandation."""
    from server import require_auth
    await require_auth(request)

    if _db is None:
        raise HTTPException(status_code=503, detail="DB non initialisée")

    lead = await _db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")

    # Compute historical conversion rates by service
    conversion_rates: Dict[str, float] = {}
    try:
        all_leads = await _db.leads.find({}, {"_id": 0, "service_type": 1, "status": 1}).to_list(5000)
        service_totals: Dict[str, int] = {}
        service_wins: Dict[str, int] = {}
        for l in all_leads:
            svc = l.get("service_type") or "Autre"
            service_totals[svc] = service_totals.get(svc, 0) + 1
            if l.get("status") == "gagné":
                service_wins[svc] = service_wins.get(svc, 0) + 1
        for svc, total in service_totals.items():
            if total >= 3:
                conversion_rates[svc] = service_wins.get(svc, 0) / total
    except Exception as e:
        logger.warning(f"Could not compute conversion rates: {e}")

    result = _compute_lead_insights(lead, conversion_rates)

    # Persist updated score
    try:
        await _db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"score": result["score"], "segment": result["segment"], "ai_insights": result}}
        )
    except Exception as e:
        logger.warning(f"Could not update lead score: {e}")

    return result


# ─────────────────────────────────────────────────────────────
#  2.2  SMART SUGGESTIONS
# ─────────────────────────────────────────────────────────────

@ai_assistant_router.get("/suggestions")
async def smart_suggestions(request: Request):
    """Suggestions d'actions intelligentes basées sur l'état du CRM."""
    from server import require_auth
    await require_auth(request)

    if _db is None:
        raise HTTPException(status_code=503, detail="DB non initialisée")

    now = datetime.now(timezone.utc)
    suggestions = []

    # ── 1. Leads devis_envoyé > 3 jours sans réponse ──
    try:
        three_days_ago = (now - timedelta(days=3)).isoformat()
        stale_leads = await _db.leads.find(
            {"status": "devis_envoyé", "updated_at": {"$lte": three_days_ago}},
            {"_id": 0, "lead_id": 1, "name": 1, "service_type": 1, "updated_at": 1}
        ).to_list(50)

        for lead in stale_leads:
            updated = _parse_dt(lead.get("updated_at"))
            days_waiting = int((now - updated).total_seconds() / 86400) if updated else 3
            suggestions.append({
                "type": "follow_up",
                "priority": "high",
                "entity_type": "lead",
                "entity_id": lead["lead_id"],
                "message": f"Relancez {lead.get('name', 'ce prospect')} — devis envoyé il y a {days_waiting} jours sans réponse",
                "action_url": f"/leads/{lead['lead_id']}",
            })
    except Exception as e:
        logger.warning(f"Suggestions (stale leads): {e}")

    # ── 2. Leads score élevé (>=65) sans devis ──
    try:
        high_score_leads = await _db.leads.find(
            {"score": {"$gte": 65}, "status": {"$in": ["nouveau", "contacté", "qualifié"]}},
            {"_id": 0, "lead_id": 1, "name": 1, "service_type": 1, "score": 1}
        ).sort("score", -1).to_list(20)

        for lead in high_score_leads:
            # Check if quote already exists
            existing_quote = await _db.quotes.find_one({"lead_id": lead["lead_id"]})
            if not existing_quote:
                suggestions.append({
                    "type": "create_quote",
                    "priority": "high",
                    "entity_type": "lead",
                    "entity_id": lead["lead_id"],
                    "message": f"Lead chaud sans devis: {lead.get('name')} (score {lead.get('score')}/100) — créez un devis maintenant",
                    "action_url": f"/leads/{lead['lead_id']}",
                })
    except Exception as e:
        logger.warning(f"Suggestions (high score leads): {e}")

    # ── 3. Interventions terminées sans feedback ──
    try:
        two_days_ago = (now - timedelta(days=2)).isoformat()
        interventions = await _db.interventions.find(
            {"status": "terminée", "feedback_sent": {"$ne": True},
             "end_date": {"$lte": two_days_ago}},
            {"_id": 0, "intervention_id": 1, "lead_id": 1, "scheduled_date": 1}
        ).to_list(30)

        for inter in interventions:
            suggestions.append({
                "type": "satisfaction_survey",
                "priority": "medium",
                "entity_type": "intervention",
                "entity_id": inter["intervention_id"],
                "message": f"Intervention terminée sans feedback — envoyez une enquête de satisfaction",
                "action_url": f"/interventions/{inter['intervention_id']}",
            })
    except Exception as e:
        logger.warning(f"Suggestions (interventions): {e}")

    # ── 4. Factures en retard ──
    try:
        overdue_invoices = await _db.invoices.find(
            {"status": {"$in": ["en_retard", "en_attente"]}},
            {"_id": 0, "invoice_id": 1, "lead_id": 1, "lead_name": 1, "amount_ttc": 1, "due_date": 1}
        ).to_list(30)

        for inv in overdue_invoices:
            due = _parse_dt(inv.get("due_date"))
            is_overdue = due and due < now
            if is_overdue or inv.get("status") == "en_retard":
                days_overdue = int((now - due).total_seconds() / 86400) if due else 0
                suggestions.append({
                    "type": "payment_reminder",
                    "priority": "high" if days_overdue > 7 else "medium",
                    "entity_type": "invoice",
                    "entity_id": inv["invoice_id"],
                    "message": f"Facture en retard ({inv.get('amount_ttc', 0)}€) pour {inv.get('lead_name', 'client')} — {days_overdue} jours de retard",
                    "action_url": f"/invoices/{inv['invoice_id']}",
                })
    except Exception as e:
        logger.warning(f"Suggestions (invoices): {e}")

    # ── 5. Leads non assignés > 1h ──
    try:
        one_hour_ago = (now - timedelta(hours=1)).isoformat()
        unassigned = await _db.leads.find(
            {"status": "nouveau", "assigned_to": None,
             "created_at": {"$lte": one_hour_ago}},
            {"_id": 0, "lead_id": 1, "name": 1, "score": 1, "created_at": 1}
        ).sort("score", -1).to_list(10)

        for lead in unassigned:
            suggestions.append({
                "type": "assign_lead",
                "priority": "medium",
                "entity_type": "lead",
                "entity_id": lead["lead_id"],
                "message": f"Lead non assigné depuis plus d'1h: {lead.get('name')} (score {lead.get('score', 0)}/100)",
                "action_url": f"/leads/{lead['lead_id']}",
            })
    except Exception as e:
        logger.warning(f"Suggestions (unassigned leads): {e}")

    # Sort: high priority first
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))

    return {
        "suggestions": suggestions,
        "total": len(suggestions),
        "generated_at": now.isoformat(),
    }


# ─────────────────────────────────────────────────────────────
#  2.3  AI DASHBOARD SUMMARY
# ─────────────────────────────────────────────────────────────

@ai_assistant_router.get("/dashboard-summary")
async def dashboard_summary(request: Request):
    """Résumé IA enrichi du tableau de bord avec prédictions et alertes."""
    from server import require_auth
    await require_auth(request)

    if _db is None:
        raise HTTPException(status_code=503, detail="DB non initialisée")

    now = datetime.now(timezone.utc)

    # ── Week ranges ──
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    last_week_start = week_start - timedelta(weeks=1)
    last_week_end = week_start

    # ── Month ranges ──
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 1:
        last_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        last_month_start = month_start.replace(month=month_start.month - 1)
    last_month_end = month_start

    # ── Leads this week vs last week ──
    leads_this_week = await _db.leads.count_documents({"created_at": {"$gte": week_start.isoformat()}})
    leads_last_week = await _db.leads.count_documents({
        "created_at": {"$gte": last_week_start.isoformat(), "$lt": last_week_end.isoformat()}
    })
    leads_week_change = (
        round(((leads_this_week - leads_last_week) / leads_last_week) * 100, 1)
        if leads_last_week > 0 else (100.0 if leads_this_week > 0 else 0.0)
    )

    # ── Revenue this month vs last month ──
    async def _revenue(start: datetime, end: Optional[datetime] = None) -> float:
        q: Dict[str, Any] = {"status": {"$in": ["payée", "payee"]}, "created_at": {"$gte": start.isoformat()}}
        if end:
            q["created_at"]["$lt"] = end.isoformat()
        invoices = await _db.invoices.find(q, {"_id": 0, "amount_ttc": 1}).to_list(10000)
        return sum(i.get("amount_ttc", 0) for i in invoices)

    revenue_this_month = await _revenue(month_start)
    revenue_last_month = await _revenue(last_month_start, last_month_end)
    revenue_change = (
        round(((revenue_this_month - revenue_last_month) / revenue_last_month) * 100, 1)
        if revenue_last_month > 0 else (100.0 if revenue_this_month > 0 else 0.0)
    )

    # ── Conversion rate trend (this month vs last) ──
    async def _conv_rate(start: datetime, end: Optional[datetime] = None) -> float:
        q: Dict[str, Any] = {"created_at": {"$gte": start.isoformat()}}
        if end:
            q["created_at"]["$lt"] = end.isoformat()
        total = await _db.leads.count_documents(q)
        won_q = {**q, "status": "gagné"}
        won = await _db.leads.count_documents(won_q)
        return round(won / total * 100, 1) if total > 0 else 0.0

    conv_this = await _conv_rate(month_start)
    conv_last = await _conv_rate(last_month_start, last_month_end)

    # ── Top performing source (by conversion rate, min 3 leads) ──
    all_leads_src = await _db.leads.find({}, {"_id": 0, "source": 1, "status": 1}).to_list(5000)
    src_totals: Dict[str, int] = {}
    src_wins: Dict[str, int] = {}
    for l in all_leads_src:
        src = l.get("source") or "Direct"
        src_totals[src] = src_totals.get(src, 0) + 1
        if l.get("status") == "gagné":
            src_wins[src] = src_wins.get(src, 0) + 1
    top_source = max(
        [(s, src_wins.get(s, 0) / t) for s, t in src_totals.items() if t >= 3],
        key=lambda x: x[1],
        default=("N/A", 0.0)
    )

    # ── Top performing service ──
    all_leads_svc = await _db.leads.find({}, {"_id": 0, "service_type": 1, "status": 1}).to_list(5000)
    svc_totals: Dict[str, int] = {}
    svc_wins: Dict[str, int] = {}
    for l in all_leads_svc:
        svc = l.get("service_type") or "Autre"
        svc_totals[svc] = svc_totals.get(svc, 0) + 1
        if l.get("status") == "gagné":
            svc_wins[svc] = svc_wins.get(svc, 0) + 1
    top_service = max(
        [(s, svc_wins.get(s, 0) / t) for s, t in svc_totals.items() if t >= 3],
        key=lambda x: x[1],
        default=("N/A", 0.0)
    )

    # ── Predicted end-of-month revenue (linear projection) ──
    days_elapsed = (now - month_start).days + 1
    days_in_month = (month_start.replace(month=month_start.month % 12 + 1, day=1)
                     if month_start.month < 12
                     else month_start.replace(year=month_start.year + 1, month=1, day=1)
                     ) - month_start
    days_total = days_in_month.days
    predicted_month_revenue = round((revenue_this_month / days_elapsed) * days_total, 2) if days_elapsed > 0 else 0

    # ── Alerts ──
    alerts = []

    # Expiring quotes (expire in <= 3 days, still open)
    three_days_future = (now + timedelta(days=3)).isoformat()
    try:
        expiring_quotes = await _db.quotes.count_documents({
            "status": {"$in": ["envoyé", "brouillon"]},
            "expires_at": {"$lte": three_days_future, "$gte": now.isoformat()}
        })
        if expiring_quotes > 0:
            alerts.append({
                "type": "expiring_quotes",
                "severity": "warning",
                "message": f"{expiring_quotes} devis expirent dans les 3 prochains jours",
                "count": expiring_quotes,
            })
    except Exception:
        pass

    # Overdue invoices
    try:
        overdue_count = await _db.invoices.count_documents({"status": "en_retard"})
        overdue_amount_docs = await _db.invoices.find(
            {"status": "en_retard"}, {"_id": 0, "amount_ttc": 1}
        ).to_list(1000)
        overdue_amount = sum(d.get("amount_ttc", 0) for d in overdue_amount_docs)
        if overdue_count > 0:
            alerts.append({
                "type": "overdue_invoices",
                "severity": "error",
                "message": f"{overdue_count} factures en retard pour un total de {overdue_amount:.2f}€",
                "count": overdue_count,
                "amount": overdue_amount,
            })
    except Exception:
        pass

    # Unassigned leads > 2h
    try:
        two_hours_ago = (now - timedelta(hours=2)).isoformat()
        unassigned_count = await _db.leads.count_documents({
            "status": "nouveau",
            "assigned_to": None,
            "created_at": {"$lte": two_hours_ago}
        })
        if unassigned_count > 0:
            alerts.append({
                "type": "unassigned_leads",
                "severity": "warning",
                "message": f"{unassigned_count} lead(s) non assigné(s) depuis plus de 2h",
                "count": unassigned_count,
            })
    except Exception:
        pass

    # Hot leads with no follow-up task
    try:
        hot_leads = await _db.leads.find(
            {"score": {"$gte": 70}, "status": {"$in": ["nouveau", "contacté"]}},
            {"_id": 0, "lead_id": 1}
        ).to_list(100)
        hot_no_task = 0
        for hl in hot_leads:
            pending = await _db.tasks.count_documents({
                "lead_id": hl["lead_id"], "status": "pending"
            })
            if pending == 0:
                hot_no_task += 1
        if hot_no_task > 0:
            alerts.append({
                "type": "hot_leads_no_task",
                "severity": "warning",
                "message": f"{hot_no_task} lead(s) chaud(s) sans tâche de suivi planifiée",
                "count": hot_no_task,
            })
    except Exception:
        pass

    return {
        "generated_at": now.isoformat(),
        "leads": {
            "this_week": leads_this_week,
            "last_week": leads_last_week,
            "week_change_pct": leads_week_change,
            "trend": "up" if leads_week_change > 0 else "down" if leads_week_change < 0 else "stable",
        },
        "revenue": {
            "this_month": revenue_this_month,
            "last_month": revenue_last_month,
            "change_pct": revenue_change,
            "trend": "up" if revenue_change > 0 else "down" if revenue_change < 0 else "stable",
            "predicted_end_of_month": predicted_month_revenue,
            "days_elapsed": days_elapsed,
            "days_total": days_total,
        },
        "conversion": {
            "this_month_pct": conv_this,
            "last_month_pct": conv_last,
            "trend": "up" if conv_this > conv_last else "down" if conv_this < conv_last else "stable",
        },
        "top_source": {
            "name": top_source[0],
            "conversion_rate_pct": round(top_source[1] * 100, 1),
        },
        "top_service": {
            "name": top_service[0],
            "conversion_rate_pct": round(top_service[1] * 100, 1),
        },
        "alerts": alerts,
        "alerts_count": len(alerts),
    }


# ─────────────────────────────────────────────────────────────
#  2.4  AI EMAIL GENERATOR  (enriched, 15+ templates)
# ─────────────────────────────────────────────────────────────

class ComposeEmailRequest(BaseModel):
    lead_id: str
    email_type: str  # follow_up | quote_reminder | thank_you | reactivation | welcome | survey | promo | no_show | reschedule | upgrade | referral | anniversary | win_back | quote_accepted | invoice_reminder
    tone: str = "friendly"  # formal | friendly | urgent


# ── Template definitions ──

_EMAIL_TEMPLATES: Dict[str, Dict[str, Dict[str, str]]] = {

    # 1. Follow-up
    "follow_up": {
        "formal": {
            "subject": "Relance — Votre demande de {service}",
            "body": """Bonjour {first_name},

Je me permets de revenir vers vous suite à votre demande concernant notre service de {service}.

Nous avons étudié votre demande avec attention et sommes prêts à vous proposer une intervention adaptée à vos besoins.

Pourriez-vous me confirmer vos disponibilités afin que nous puissions planifier la suite ?

Cordialement,
L'équipe Global Clean Home
📞 06 22 66 53 08""",
        },
        "friendly": {
            "subject": "Alors {first_name}, on fait équipe ? 😊",
            "body": """Bonjour {first_name} !

On n'a pas oublié votre demande pour le {service} ! On voulait juste s'assurer que vous avez tout ce qu'il vous faut.

On est disponibles dès la semaine prochaine, et on s'occupe de tout. Aucune contrainte de votre côté 🙌

On attend votre signe !
L'équipe GCH ✨
📱 06 22 66 53 08""",
        },
        "urgent": {
            "subject": "⏰ Rappel urgent — votre demande {service}",
            "body": """Bonjour {first_name},

Votre demande pour {service} est toujours en attente. Nos créneaux se remplissent vite en ce moment.

👉 Confirmez maintenant pour sécuriser votre date.
📞 Appelez-nous : 06 22 66 53 08

À très vite,
L'équipe Global Clean Home""",
        },
    },

    # 2. Quote reminder
    "quote_reminder": {
        "formal": {
            "subject": "Rappel — Votre devis {service} en attente de validation",
            "body": """Bonjour {first_name},

Nous vous avons adressé un devis pour {service} il y a quelques jours. Ce devis est toujours disponible et en attente de votre validation.

Souhaitez-vous que nous ajustions la proposition ou avez-vous des questions ?

N'hésitez pas à nous contacter au 06 22 66 53 08.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Votre devis attend votre feu vert 🟢",
            "body": """Bonjour {first_name} !

Votre devis pour {service} est toujours disponible ! Des questions ? On est là 😊

On peut aussi ajuster la prestation si vous le souhaitez — c'est sans engagement.

À bientôt !
L'équipe GCH
📱 06 22 66 53 08""",
        },
        "urgent": {
            "subject": "⚠️ Votre devis expire bientôt — {service}",
            "body": """Bonjour {first_name},

IMPORTANT : Votre devis pour {service} arrive à expiration.

Pour bénéficier de nos tarifs actuels, confirmez avant la fin de semaine.

📞 06 22 66 53 08 — on répond immédiatement.

L'équipe Global Clean Home""",
        },
    },

    # 3. Thank you
    "thank_you": {
        "formal": {
            "subject": "Merci pour votre confiance — Global Clean Home",
            "body": """Bonjour {first_name},

Nous vous remercions sincèrement de nous avoir fait confiance pour votre {service}.

Nous espérons que notre intervention a pleinement répondu à vos attentes. N'hésitez pas à nous faire part de tout retour.

À votre service,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Merci {first_name} ! C'était un plaisir 🙏",
            "body": """Bonjour {first_name} !

Un grand merci de votre confiance pour votre {service} ! On espère que vous êtes ravi(e) du résultat ✨

Si vous avez des amis qui cherchent un service de nettoyage, on a un super programme de parrainage : 20€ offerts pour vous et votre ami !

À très bientôt,
L'équipe GCH 🌟""",
        },
        "urgent": {
            "subject": "Votre satisfaction est notre priorité — {service}",
            "body": """Bonjour {first_name},

Suite à notre intervention pour {service}, votre satisfaction est notre priorité absolue.

Si quoi que ce soit n'est pas à votre goût, contactez-nous IMMÉDIATEMENT : 06 22 66 53 08.

Nous interviendrons gratuitement sous 48h pour corriger tout problème.

L'équipe Global Clean Home""",
        },
    },

    # 4. Reactivation
    "reactivation": {
        "formal": {
            "subject": "On espère avoir de vos nouvelles — Global Clean Home",
            "body": """Bonjour {first_name},

Nous n'avons plus eu de nouvelles depuis votre demande de {service}. Nous espérons que tout va bien.

Si votre projet est toujours d'actualité, nous serions ravis de vous accompagner. Nos tarifs et disponibilités restent les mêmes.

Cordialement,
L'équipe Global Clean Home
📞 06 22 66 53 08""",
        },
        "friendly": {
            "subject": "On pense à vous {first_name} ! 👋",
            "body": """Bonjour {first_name} !

Ça fait un moment ! On espère que vous allez bien 😊

Votre projet de {service} est toujours ouvert de notre côté. Et en ce moment, on a un créneau parfait pour vous !

On vous fait une remise de 10% pour votre retour. C'est notre façon de vous dire qu'on est contents de vous revoir 🎉

L'équipe GCH
📱 06 22 66 53 08""",
        },
        "urgent": {
            "subject": "Dernière chance — offre spéciale réactivation {service}",
            "body": """Bonjour {first_name},

Offre LIMITÉE pour votre retour : -15% sur votre prochaine prestation de {service}.

Cette offre est valable jusqu'à vendredi. Au-delà, les tarifs normaux s'appliquent.

📞 06 22 66 53 08 — réservez maintenant !

L'équipe Global Clean Home""",
        },
    },

    # 5. Welcome
    "welcome": {
        "formal": {
            "subject": "Bienvenue chez Global Clean Home — votre demande est reçue",
            "body": """Bonjour {first_name},

Nous avons bien reçu votre demande concernant notre service de {service} et vous en remercions.

Un membre de notre équipe vous contactera dans les prochaines heures pour établir un devis personnalisé.

En attendant, n'hésitez pas à nous joindre au 06 22 66 53 08.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Bienvenue {first_name} ! On s'occupe de tout 🌟",
            "body": """Bonjour {first_name} !

Super, on a bien reçu votre demande pour le {service} !

On vous rappelle très vite (généralement sous 2h) pour préparer votre devis personnalisé 😊

D'ici là, si vous avez des questions : 06 22 66 53 08

À très vite !
L'équipe GCH ✨""",
        },
        "urgent": {
            "subject": "Demande reçue — on vous rappelle sous 30 min !",
            "body": """Bonjour {first_name},

Demande reçue ! Notre équipe vous contacte dans les 30 prochaines minutes.

Pour aller plus vite : 📞 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 6. Satisfaction survey
    "survey": {
        "formal": {
            "subject": "Votre avis compte — intervention {service}",
            "body": """Bonjour {first_name},

Suite à notre intervention pour votre {service}, nous aimerions connaître votre avis.

Votre retour nous aide à maintenir la qualité de nos prestations.

Pourriez-vous nous noter de 1 à 5 en répondant simplement à cet email ?

Merci pour votre temps,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Comment s'est passé votre {service} ? ⭐",
            "body": """Bonjour {first_name} !

On espère que vous êtes super content(e) de votre {service} !

Dites-nous comment ça s'est passé en répondant à cet email avec une note de 1 à 5 ⭐

Votre avis nous aide vraiment à nous améliorer. Et si vous êtes satisfait(e), un petit avis Google serait fantastique ! 🙏

Merci !
L'équipe GCH""",
        },
        "urgent": {
            "subject": "Un problème avec votre prestation ? On intervient !",
            "body": """Bonjour {first_name},

Nous n'avons pas encore reçu votre retour sur votre {service}.

Si quelque chose n'était pas à votre satisfaction, contactez-nous IMMÉDIATEMENT :
📞 06 22 66 53 08

Nous corrigerons gratuitement sous 48h. C'est notre garantie.

L'équipe Global Clean Home""",
        },
    },

    # 7. Promotional offer
    "promo": {
        "formal": {
            "subject": "Offre spéciale — {service} à tarif préférentiel",
            "body": """Bonjour {first_name},

Dans le cadre de notre promotion de saison, nous vous proposons une réduction de 15% sur notre service de {service}.

Cette offre est valable jusqu'à la fin du mois. Pour en profiter, contactez-nous au 06 22 66 53 08.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "🎁 Offre exclusive pour vous {first_name} !",
            "body": """Bonjour {first_name} !

On a une bonne nouvelle pour vous ! On vous offre -15% sur votre prochain {service} 🎉

Offre valable jusqu'à fin du mois — c'est maintenant ou jamais !

📱 06 22 66 53 08 pour réserver

L'équipe GCH ✨""",
        },
        "urgent": {
            "subject": "⏰ Offre -15% expire vendredi — {service}",
            "body": """Bonjour {first_name},

DERNIÈRE CHANCE : -15% sur {service} jusqu'à vendredi.

📞 Réservez maintenant : 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 8. No-show
    "no_show": {
        "formal": {
            "subject": "Rendez-vous manqué — {service}",
            "body": """Bonjour {first_name},

Nous avons constaté que vous n'étiez pas disponible lors de notre rendez-vous prévu pour {service}.

Nous comprenons que des imprévus puissent survenir. Souhaitez-vous reprogrammer une nouvelle intervention ?

Contactez-nous au 06 22 66 53 08.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "On a essayé de vous joindre {first_name} 😊",
            "body": """Bonjour {first_name} !

On était là pour votre {service} mais on a dû se manquer ! Pas de souci, ça arrive 😊

On peut facilement reprogrammer une nouvelle date. Dites-nous quand ça vous convient !

📱 06 22 66 53 08

L'équipe GCH""",
        },
        "urgent": {
            "subject": "⚠️ Rendez-vous {service} manqué — action requise",
            "body": """Bonjour {first_name},

Notre équipe s'est déplacée pour votre {service} mais n'a pas pu intervenir.

Des frais de déplacement peuvent s'appliquer selon nos conditions. Contactez-nous rapidement pour régulariser.

📞 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 9. Reschedule
    "reschedule": {
        "formal": {
            "subject": "Modification de votre intervention — {service}",
            "body": """Bonjour {first_name},

Suite à des contraintes opérationnelles, nous devons vous proposer une nouvelle date pour votre {service}.

Nous vous contacterons dans les plus brefs délais pour convenir d'un nouveau créneau qui vous convienne.

Nous vous présentons toutes nos excuses pour ce désagrément.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "On doit reprogrammer votre {service} — désolé {first_name} !",
            "body": """Bonjour {first_name},

On est vraiment désolés ! On doit vous proposer une nouvelle date pour votre {service}.

On vous appellera sous 24h pour trouver un créneau qui vous convient parfaitement. Et pour se faire pardonner : -10% sur votre prochaine prestation 🙏

L'équipe GCH
📱 06 22 66 53 08""",
        },
        "urgent": {
            "subject": "IMPORTANT — Report de votre intervention {service}",
            "body": """Bonjour {first_name},

URGENT : Votre intervention {service} doit être reportée.

Appelez-nous dès que possible pour reprogrammer : 📞 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 10. Upgrade / upsell
    "upgrade": {
        "formal": {
            "subject": "Complétez votre prestation — services additionnels",
            "body": """Bonjour {first_name},

Suite à votre {service}, nous souhaitons vous informer de nos prestations complémentaires qui pourraient vous intéresser.

Nous proposons notamment le nettoyage de canapés, matelas et tapis à des tarifs préférentiels pour nos clients fidèles.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Et si on en faisait un peu plus {first_name} ? ✨",
            "body": """Bonjour {first_name} !

Vous avez adoré votre {service} ? Et si on profitait du même passage pour s'occuper de vos canapés ou matelas ? 😊

On peut tout faire en une seule visite, c'est plus pratique et moins cher pour vous !

📱 06 22 66 53 08 pour en discuter

L'équipe GCH""",
        },
        "urgent": {
            "subject": "Offre bundle limitée — {service} + nettoyage canapé",
            "body": """Bonjour {first_name},

CETTE SEMAINE SEULEMENT : {service} + nettoyage canapé à -20% en pack.

📞 06 22 66 53 08 — disponibilités limitées !

L'équipe Global Clean Home""",
        },
    },

    # 11. Referral
    "referral": {
        "formal": {
            "subject": "Programme de parrainage — Global Clean Home",
            "body": """Bonjour {first_name},

Nous serions honorés que vous recommandiez nos services à votre entourage.

En tant que client fidèle, vous bénéficiez de notre programme de parrainage : 20€ de réduction sur votre prochaine prestation pour chaque nouveau client que vous nous adressez.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Parrainez vos amis et gagnez 20€ ! 🎉",
            "body": """Bonjour {first_name} !

Vous aimez notre service de {service} ? Partagez la bonne nouvelle ! 😊

Pour chaque ami que vous nous envoyez : 20€ de remise pour vous ET pour votre ami. Tout le monde y gagne !

Code parrainage : GCH-{lead_id_short}

L'équipe GCH ✨""",
        },
        "urgent": {
            "subject": "🎁 Offre parrainage — encore 3 places disponibles !",
            "body": """Bonjour {first_name},

Notre offre de parrainage touche à sa fin ! Il ne reste que 3 places.

Recommandez Global Clean Home maintenant et gagnez 20€.

📞 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 12. Anniversary / loyalty
    "anniversary": {
        "formal": {
            "subject": "Merci pour votre fidélité — Global Clean Home",
            "body": """Bonjour {first_name},

Cela fait maintenant un an que vous nous faites confiance pour votre {service}. Nous tenons à vous en remercier chaleureusement.

En gage de notre gratitude, nous vous offrons une remise exclusive de 20% sur votre prochaine intervention.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Joyeux anniversaire {first_name} ! 🎂",
            "body": """Bonjour {first_name} !

Ça fait déjà un an qu'on travaille ensemble sur votre {service} ! Le temps passe vite 😊

Pour fêter ça, on vous offre -20% sur votre prochaine prestation. Parce que les clients fidèles, ça se chouchoute !

📱 06 22 66 53 08

L'équipe GCH avec tout notre ❤️""",
        },
        "urgent": {
            "subject": "Votre offre fidélité expire dans 7 jours !",
            "body": """Bonjour {first_name},

Votre offre anniversaire (-20% sur {service}) expire dans 7 jours.

📞 Réservez maintenant : 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 13. Win-back (lost lead)
    "win_back": {
        "formal": {
            "subject": "Nous aurions aimé vous accompagner — {service}",
            "body": """Bonjour {first_name},

Nous avons noté que vous n'avez pas donné suite à votre demande de {service}. Nous le regrettons.

Si vous souhaitez reconsidérer notre offre ou si nous pouvons améliorer notre proposition, nous restons à votre écoute.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "On peut faire mieux pour vous {first_name} 🙏",
            "body": """Bonjour {first_name} !

On a vu que votre projet de {service} ne s'est pas concrétisé avec nous. On en est vraiment désolés !

Si c'était une question de prix ou de disponibilité, dites-le nous — on peut sûrement trouver une solution 😊

L'équipe GCH
📱 06 22 66 53 08""",
        },
        "urgent": {
            "subject": "Offre exceptionnelle pour votre retour — {service}",
            "body": """Bonjour {first_name},

On vous propose une offre unique pour vous revoir : -25% sur {service}.

Cette offre est strictement personnelle et valable 48h.

📞 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },

    # 14. Quote accepted
    "quote_accepted": {
        "formal": {
            "subject": "Confirmation de votre devis — {service}",
            "body": """Bonjour {first_name},

Nous avons bien reçu votre acceptation pour le devis de {service}. Nous vous en remercions.

Notre équipe vous contactera dans les 24 heures pour planifier l'intervention et vous communiquer tous les détails pratiques.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "C'est parti {first_name} ! 🚀 On prépare tout !",
            "body": """Bonjour {first_name} !

Votre devis est accepté — super nouvelle ! On est vraiment ravis de travailler avec vous 🎉

On vous appelle dans les 24h pour tout organiser. Vous n'avez rien à faire de votre côté !

À très vite !
L'équipe GCH ✨""",
        },
        "urgent": {
            "subject": "✅ Devis confirmé — intervention planifiée sous 48h",
            "body": """Bonjour {first_name},

Devis confirmé ! Notre équipe interviendra pour votre {service} sous 48h.

Nous vous enverrons une confirmation de créneau très prochainement.

📞 06 22 66 53 08 si besoin.

L'équipe Global Clean Home""",
        },
    },

    # 15. Invoice reminder
    "invoice_reminder": {
        "formal": {
            "subject": "Rappel de paiement — facture {service}",
            "body": """Bonjour {first_name},

Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de votre facture pour {service}.

Nous vous serions reconnaissants de bien vouloir procéder au paiement dans les meilleurs délais.

Pour toute question, contactez-nous au 06 22 66 53 08.

Cordialement,
L'équipe Global Clean Home""",
        },
        "friendly": {
            "subject": "Petit rappel de paiement {first_name} 😊",
            "body": """Bonjour {first_name} !

On pense que vous avez peut-être oublié le règlement de votre {service} — ça arrive à tout le monde !

Pouvez-vous régulariser dès que possible ? Merci beaucoup 🙏

📱 06 22 66 53 08 si vous avez des questions.

L'équipe GCH""",
        },
        "urgent": {
            "subject": "⚠️ URGENT — Facture {service} en retard",
            "body": """Bonjour {first_name},

Votre facture pour {service} est en retard de paiement.

Sans règlement sous 48h, des frais de retard pourront s'appliquer.

📞 Contactez-nous immédiatement : 06 22 66 53 08

L'équipe Global Clean Home""",
        },
    },
}


def _render_email(template: Dict[str, str], lead: dict) -> Dict[str, str]:
    """Replace template variables with lead data."""
    name = lead.get("name") or "cher client"
    first_name = name.split()[0]
    service = lead.get("service_type") or "nettoyage"
    lead_id = lead.get("lead_id") or ""
    lead_id_short = lead_id[-6:] if lead_id else "000000"

    def fill(text: str) -> str:
        return (text
                .replace("{first_name}", first_name)
                .replace("{name}", name)
                .replace("{service}", service)
                .replace("{lead_id}", lead_id)
                .replace("{lead_id_short}", lead_id_short))

    subject = fill(template["subject"])
    body_text = fill(template["body"])

    # Generate HTML version
    body_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f8fafc;">
  <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:24px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:white;margin:0;font-size:20px;">Global Clean Home</h2>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0 0;font-size:13px;">Service de nettoyage professionnel</p>
  </div>
  <div style="background:white;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <p style="color:#1e293b;line-height:1.8;white-space:pre-line;margin:0;">{body_text}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      © Global Clean Home · Paris<br>
      Pour vous désinscrire, répondez "désinscription" à cet email.
    </p>
  </div>
</body>
</html>"""

    return {"subject": subject, "body_html": body_html, "body_text": body_text}


@ai_assistant_router.post("/compose-email")
async def compose_email(req: ComposeEmailRequest, request: Request):
    """Génère un email personnalisé basé sur les données du lead."""
    from server import require_auth
    await require_auth(request)

    if _db is None:
        raise HTTPException(status_code=503, detail="DB non initialisée")

    lead = await _db.leads.find_one({"lead_id": req.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")

    email_type = req.email_type
    tone = req.tone if req.tone in ("formal", "friendly", "urgent") else "friendly"

    type_map = _EMAIL_TEMPLATES
    if email_type not in type_map:
        # Fallback to follow_up
        email_type = "follow_up"

    tone_tpl = type_map[email_type].get(tone) or type_map[email_type].get("friendly")
    rendered = _render_email(tone_tpl, lead)

    # Persist to history
    try:
        await _db.ai_emails.insert_one({
            "email_id": f"aie_{uuid.uuid4().hex[:10]}",
            "lead_id": req.lead_id,
            "email_type": email_type,
            "tone": tone,
            "subject": rendered["subject"],
            "body_text": rendered["body_text"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "draft",
        })
    except Exception as e:
        logger.warning(f"Could not persist email draft: {e}")

    return {
        "subject": rendered["subject"],
        "body_html": rendered["body_html"],
        "body_text": rendered["body_text"],
        "email_type": email_type,
        "tone": tone,
        "lead_name": lead.get("name"),
        "service": lead.get("service_type"),
    }


# ─────────────────────────────────────────────────────────────
#  2.5  ANOMALY DETECTION
# ─────────────────────────────────────────────────────────────

@ai_assistant_router.get("/anomalies")
async def detect_anomalies(request: Request):
    """Détecte les anomalies et patterns inhabituels dans les données CRM."""
    from server import require_auth
    await require_auth(request)

    if _db is None:
        raise HTTPException(status_code=503, detail="DB non initialisée")

    now = datetime.now(timezone.utc)
    anomalies = []

    # ── Helper ──
    def _deviation(actual: float, expected: float) -> float:
        if expected == 0:
            return 100.0 if actual > 0 else 0.0
        return round(((actual - expected) / expected) * 100, 1)

    # ── 1. Lead volume spike / drop (vs 4-week average) ──
    try:
        week_starts = [(now - timedelta(weeks=i)).replace(
            hour=0, minute=0, second=0, microsecond=0) -
            timedelta(days=(now - timedelta(weeks=i)).weekday())
            for i in range(1, 5)]

        historical_counts = []
        for ws in week_starts:
            we = ws + timedelta(weeks=1)
            cnt = await _db.leads.count_documents({
                "created_at": {"$gte": ws.isoformat(), "$lt": we.isoformat()}
            })
            historical_counts.append(cnt)

        current_week_start = now.replace(
            hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
        current_week_leads = await _db.leads.count_documents({
            "created_at": {"$gte": current_week_start.isoformat()}
        })

        avg_weekly = sum(historical_counts) / len(historical_counts) if historical_counts else 0
        if avg_weekly > 0:
            dev = _deviation(current_week_leads, avg_weekly)
            if abs(dev) >= 30:
                anomalies.append({
                    "type": "lead_volume",
                    "severity": "high" if abs(dev) >= 50 else "medium",
                    "description": (
                        f"Volume de leads {'en hausse' if dev > 0 else 'en baisse'} cette semaine: "
                        f"{current_week_leads} vs moyenne {round(avg_weekly, 1)}/semaine"
                    ),
                    "metric": "leads_per_week",
                    "expected": round(avg_weekly, 1),
                    "actual": current_week_leads,
                    "deviation_pct": dev,
                })
    except Exception as e:
        logger.warning(f"Anomaly (lead volume): {e}")

    # ── 2. Conversion rate change (this month vs last 3 months avg) ──
    try:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        async def _conv(start: datetime, end: Optional[datetime] = None) -> float:
            q: Dict[str, Any] = {"created_at": {"$gte": start.isoformat()}}
            if end:
                q["created_at"]["$lt"] = end.isoformat()
            total = await _db.leads.count_documents(q)
            won = await _db.leads.count_documents({**q, "status": "gagné"})
            return (won / total * 100) if total >= 5 else -1

        conv_current = await _conv(month_start)

        # Last 3 months avg
        hist_convs = []
        for i in range(1, 4):
            if month_start.month - i <= 0:
                y = month_start.year - 1
                m = 12 + month_start.month - i
            else:
                y = month_start.year
                m = month_start.month - i
            ms = month_start.replace(year=y, month=m)
            me = month_start.replace(
                year=month_start.year if m < month_start.month else month_start.year - 1,
                month=m + 1 if m < 12 else 1
            )
            c = await _conv(ms, me)
            if c >= 0:
                hist_convs.append(c)

        if hist_convs and conv_current >= 0:
            avg_conv = sum(hist_convs) / len(hist_convs)
            dev = _deviation(conv_current, avg_conv)
            if abs(dev) >= 25:
                anomalies.append({
                    "type": "conversion_rate",
                    "severity": "high" if abs(dev) >= 40 else "medium",
                    "description": (
                        f"Taux de conversion {'en hausse' if dev > 0 else 'en baisse'}: "
                        f"{round(conv_current, 1)}% vs moyenne historique {round(avg_conv, 1)}%"
                    ),
                    "metric": "conversion_rate_pct",
                    "expected": round(avg_conv, 1),
                    "actual": round(conv_current, 1),
                    "deviation_pct": dev,
                })
    except Exception as e:
        logger.warning(f"Anomaly (conversion rate): {e}")

    # ── 3. Revenue anomaly (this month daily avg vs last month) ──
    try:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_elapsed = max(1, (now - month_start).days + 1)

        if month_start.month == 1:
            last_month_start = month_start.replace(year=month_start.year - 1, month=12)
        else:
            last_month_start = month_start.replace(month=month_start.month - 1)
        last_month_end = month_start

        async def _rev(start: datetime, end: Optional[datetime] = None) -> float:
            q: Dict[str, Any] = {"status": {"$in": ["payée", "payee"]}, "created_at": {"$gte": start.isoformat()}}
            if end:
                q["created_at"]["$lt"] = end.isoformat()
            docs = await _db.invoices.find(q, {"_id": 0, "amount_ttc": 1}).to_list(10000)
            return sum(d.get("amount_ttc", 0) for d in docs)

        rev_current = await _rev(month_start)
        rev_last = await _rev(last_month_start, last_month_end)

        # days in last month
        import calendar
        days_last = calendar.monthrange(last_month_start.year, last_month_start.month)[1]
        daily_current = rev_current / days_elapsed if days_elapsed > 0 else 0
        daily_last = rev_last / days_last if days_last > 0 else 0

        if daily_last > 0:
            dev = _deviation(daily_current, daily_last)
            if abs(dev) >= 30:
                anomalies.append({
                    "type": "revenue_anomaly",
                    "severity": "high" if abs(dev) >= 50 else "medium",
                    "description": (
                        f"Revenu journalier moyen {'en hausse' if dev > 0 else 'en baisse'}: "
                        f"{round(daily_current, 2)}€/j vs {round(daily_last, 2)}€/j le mois dernier"
                    ),
                    "metric": "daily_revenue_eur",
                    "expected": round(daily_last, 2),
                    "actual": round(daily_current, 2),
                    "deviation_pct": dev,
                })
    except Exception as e:
        logger.warning(f"Anomaly (revenue): {e}")

    # ── 4. Unusual source distribution ──
    try:
        # Get source distribution last 30 days vs prior 30 days
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        sixty_days_ago = (now - timedelta(days=60)).isoformat()

        recent_leads = await _db.leads.find(
            {"created_at": {"$gte": thirty_days_ago}},
            {"_id": 0, "source": 1}
        ).to_list(5000)
        prior_leads = await _db.leads.find(
            {"created_at": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}},
            {"_id": 0, "source": 1}
        ).to_list(5000)

        def _src_dist(leads: list) -> Dict[str, float]:
            counts: Dict[str, int] = {}
            for l in leads:
                s = l.get("source") or "Direct"
                counts[s] = counts.get(s, 0) + 1
            total = len(leads)
            return {s: c / total for s, c in counts.items()} if total > 0 else {}

        recent_dist = _src_dist(recent_leads)
        prior_dist = _src_dist(prior_leads)

        for source, recent_pct in recent_dist.items():
            prior_pct = prior_dist.get(source, 0)
            if prior_pct > 0:
                dev = _deviation(recent_pct, prior_pct)
                if abs(dev) >= 40 and len(recent_leads) >= 10:
                    anomalies.append({
                        "type": "source_distribution",
                        "severity": "low",
                        "description": (
                            f"Source '{source}' {'en forte hausse' if dev > 0 else 'en forte baisse'}: "
                            f"{round(recent_pct*100, 1)}% vs {round(prior_pct*100, 1)}% précédemment"
                        ),
                        "metric": f"source_share_{source}",
                        "expected": round(prior_pct * 100, 1),
                        "actual": round(recent_pct * 100, 1),
                        "deviation_pct": dev,
                    })
    except Exception as e:
        logger.warning(f"Anomaly (source distribution): {e}")

    # Sort by severity
    sev_order = {"high": 0, "medium": 1, "low": 2}
    anomalies.sort(key=lambda x: sev_order.get(x.get("severity", "low"), 2))

    return {
        "anomalies": anomalies,
        "total": len(anomalies),
        "has_critical": any(a["severity"] == "high" for a in anomalies),
        "generated_at": now.isoformat(),
    }
