"""
Global Clean Home CRM — Email Generator (IA)
Génère des emails personnalisés et uniques pour chaque client via Claude.
"""
import os
import httpx
import logging
import json
from typing import Optional, Dict

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

COMPANY_CONTEXT = """
Tu es Merylis, conseillère commerciale chez Global Clean Home, entreprise de nettoyage professionnel à Paris & Île-de-France.

INFORMATIONS ENTREPRISE :
- Nom : Global Clean Home
- Spécialité : Nettoyage professionnel (ménage, canapés, matelas, tapis, bureaux)
- Téléphone : 06 22 66 53 08
- Email : contact@globalcleanhome.com
- Site : www.globalcleanhome.com
- Adresse : Paris & Île-de-France
- Valeurs : Produits écologiques, service premium, transparence, ponctualité

TON STYLE :
- Tu écris comme une vraie personne, pas un robot
- Tu es chaleureuse, professionnelle mais accessible
- Tu tutoies PAS les clients (vouvoiement toujours)
- Tu signes toujours "Merylis" avec le numéro de téléphone
- Tu varies tes formulations à chaque email — JAMAIS le même texte
- Tu fais des phrases courtes et naturelles
- Tu utilises parfois des émojis (1-2 max, pas trop)
- Tu ne fais JAMAIS de promesses irréalistes
"""


async def generate_email(
    email_type: str,
    client_data: dict,
    extra_context: dict = None,
) -> Optional[dict]:
    """
    Génère un email personnalisé via Claude.

    Args:
        email_type: Type d'email (welcome, followup_personal, relance_douce, relance_finale,
                    devis_accompagnement, devis_relance, post_intervention, intervention_planifiee,
                    intervenant_planning, nurturing_tips, offre_speciale, hot_lead)
        client_data: {name, email, service_type, address, phone, message, score, status, created_at...}
        extra_context: Contexte supplémentaire selon le type

    Returns:
        {"subject": "...", "body_text": "...", "body_html": "..."} ou None si échec
    """
    if not ANTHROPIC_API_KEY:
        logger.warning("Pas de clé Anthropic — fallback template statique")
        return None

    prenom = (client_data.get("name", "") or "").split()[0] or "cher client"
    service = client_data.get("service_type", "nettoyage")

    type_instructions = _get_type_instructions(email_type, client_data, extra_context or {})

    prompt = f"""{COMPANY_CONTEXT}

DONNÉES CLIENT :
- Prénom : {prenom}
- Nom complet : {client_data.get("name", "Client")}
- Service demandé : {service}
- Adresse : {client_data.get("address", "Non renseignée")}
- Téléphone : {client_data.get("phone", "")}
- Message original : {(client_data.get("message", "") or "")[:200]}
- Score lead : {client_data.get("score", "?")}
- Date inscription : {client_data.get("created_at", "?")}

{type_instructions}

RÈGLES STRICTES :
1. L'email doit être UNIQUE — ne réutilise jamais exactement les mêmes phrases
2. Adapte le ton au contexte (premier contact = enthousiaste, relance = doux, post-intervention = reconnaissant)
3. Mentionne le service spécifique du client, pas "nos services" génériquement
4. Maximum 150 mots pour le corps de l'email (court et efficace)
5. Le sujet doit être accrocheur et naturel (pas de majuscules excessives)
6. Signe toujours : Merylis\\nGlobal Clean Home\\n📞 06 22 66 53 08

Réponds UNIQUEMENT en JSON valide :
{{"subject": "...", "body": "..."}}
"""

    try:
        async with httpx.AsyncClient(timeout=15) as client_http:
            resp = await client_http.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["content"][0]["text"].strip()

            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                return {
                    "subject": result.get("subject", "Global Clean Home"),
                    "body_text": result.get("body", ""),
                    "body_html": _text_to_html(result.get("body", ""), prenom, email_type),
                }
    except Exception as e:
        logger.error(f"Email generation error: {e}")

    return None


# ---------------------------------------------------------------------------
# Mapping template_key (workflows) → email_type (generator)
# ---------------------------------------------------------------------------
TEMPLATE_KEY_TO_EMAIL_TYPE = {
    "new_lead_welcome": "welcome",
    "merylis_followup": "followup_personal",
    "relance_24h": "relance_douce",
    "relance_48h": "relance_finale",
    "devis_envoye": "devis_accompagnement",
    "devis_relance": "devis_relance",
    "post_intervention": "post_intervention",
    "hot_lead_urgent": "hot_lead",
    "nurturing_semaine1": "nurturing_tips",
    "nurturing_semaine2": "offre_speciale",
}


def _get_type_instructions(email_type: str, client: dict, extra: dict) -> str:
    """Instructions spécifiques selon le type d'email."""
    service = client.get("service_type", "nettoyage")
    prenom = (client.get("name", "") or "").split()[0] or "cher client"

    instructions = {
        "welcome": (
            f"Écris un email de bienvenue chaleureux. Remercie pour la demande de {service}. "
            "Explique brièvement les prochaines étapes (analyse, devis sous 24h, appel). "
            "NE copie PAS un template, invente un texte frais."
        ),
        "followup_personal": (
            "Écris un message personnel de Merylis, 5 min après le premier email. "
            "Court, direct, comme si tu venais de voir la demande. "
            "Pose UNE question pertinente sur le besoin du client."
        ),
        "relance_douce": (
            f"Écris une relance douce J+1. Tu veux t'assurer que le client a bien reçu ton message. "
            f"Ajoute une info utile ou un conseil lié à {service}."
        ),
        "relance_finale": (
            "Dernière relance J+2. Pas de pression, juste un dernier coucou. "
            "Propose de rester disponible. Très court."
        ),
        "devis_accompagnement": (
            f"Tu accompagnes l'envoi du devis pour {service}. "
            f"Montant: {extra.get('montant', '—')}€. "
            "Explique un point fort du devis. Mentionne les produits écolos."
        ),
        "devis_relance": (
            "Relance douce du devis envoyé il y a 48h. "
            "Demande si des questions. Propose de réajuster si besoin."
        ),
        "post_intervention": (
            "Demande de retour après intervention. Demande si satisfait. "
            "Propose de laisser un avis Google (sans forcer). Remercie sincèrement."
        ),
        "intervention_planifiee": (
            f"Informe le client que son intervention est planifiée. "
            f"Date: {extra.get('date', '—')}, Heure: {extra.get('heure', '—')}, "
            f"Intervenant: {extra.get('intervenant', 'notre équipe')}. "
            "Rassure sur la qualité."
        ),
        "intervenant_planning": (
            f"Tu écris à l'intervenant {extra.get('intervenant_name', '')}. "
            f"Informe de sa nouvelle mission: {service} chez {extra.get('client_name', 'le client')}, "
            f"{extra.get('address', '')}, le {extra.get('date', '—')} à {extra.get('heure', '—')} "
            f"({extra.get('duration', '—')}h). "
            f"Donne le tel client: {extra.get('client_phone', '')}. "
            f"Lien portail: {extra.get('portal_url', 'https://crm.globalcleanhome.com/intervenant')}"
        ),
        "nurturing_tips": (
            f"Partage 2-3 astuces d'entretien liées au {service} du client. "
            "Contenu utile, pas commercial."
        ),
        "offre_speciale": (
            f"Propose une offre spéciale personnalisée. Mentionne le service {service} du client. "
            "Offre une remise ou un avantage concret."
        ),
        "hot_lead": (
            "Lead chaud (score > 70). Message urgent mais pas agressif. "
            "Propose un créneau cette semaine."
        ),
    }

    return "INSTRUCTIONS POUR CET EMAIL :\n" + instructions.get(
        email_type,
        f"Écris un email professionnel concernant {service}. Sois naturelle et concise.",
    )


# ---------------------------------------------------------------------------
# Couleurs de header par type d'email
# ---------------------------------------------------------------------------
_HEADER_COLORS = {
    "welcome": "linear-gradient(135deg, #1d4ed8, #2563eb)",
    "followup_personal": "linear-gradient(135deg, #7c3aed, #2563eb)",
    "relance_douce": "linear-gradient(135deg, #7c3aed, #a855f7)",
    "relance_finale": "linear-gradient(135deg, #6d28d9, #7c3aed)",
    "devis_accompagnement": "linear-gradient(135deg, #1d4ed8, #059669)",
    "devis_relance": "linear-gradient(135deg, #2563eb, #7c3aed)",
    "post_intervention": "linear-gradient(135deg, #ea580c, #f59e0b)",
    "intervention_planifiee": "linear-gradient(135deg, #059669, #10b981)",
    "intervenant_planning": "linear-gradient(135deg, #10b981, #059669)",
    "nurturing_tips": "linear-gradient(135deg, #0891b2, #06b6d4)",
    "offre_speciale": "linear-gradient(135deg, #dc2626, #f59e0b)",
    "hot_lead": "linear-gradient(135deg, #dc2626, #e11d48)",
}

_HEADER_EMOJI = {
    "welcome": "🏠",
    "followup_personal": "💬",
    "relance_douce": "👋",
    "relance_finale": "🤝",
    "devis_accompagnement": "📄",
    "devis_relance": "📋",
    "post_intervention": "⭐",
    "intervention_planifiee": "✅",
    "intervenant_planning": "📋",
    "nurturing_tips": "💡",
    "offre_speciale": "🎁",
    "hot_lead": "🔥",
}


def _text_to_html(text: str, prenom: str, email_type: str) -> str:
    """Convertit le texte brut en HTML email professionnel."""
    gradient = _HEADER_COLORS.get(email_type, "linear-gradient(135deg, #1e3a5f, #1d4ed8)")
    emoji = _HEADER_EMOJI.get(email_type, "🏠")

    # Convertir les sauts de ligne en paragraphes
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    body_html = "".join(f'<p style="color:#475569;font-size:15px;line-height:1.8;margin:0 0 14px;">{p}</p>' for p in paragraphs)

    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<style>
@media (prefers-color-scheme: dark) {{
  body {{ background-color: #1e1e2e !important; }}
  .email-body {{ background-color: #2d2d3f !important; color: #e2e8f0 !important; }}
  .email-body p {{ color: #cbd5e1 !important; }}
}}
</style>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:24px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:{gradient};padding:32px 28px;text-align:center;">
    <div style="font-size:40px;margin-bottom:8px;">{emoji}</div>
    <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">Global Clean Home</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;">Nettoyage Professionnel · Paris &amp; Île-de-France</p>
  </div>

  <!-- BODY -->
  <div class="email-body" style="padding:32px 28px;">
    {body_html}
  </div>

  <!-- CONTACT -->
  <div style="padding:0 28px 28px;">
    <div style="background:{gradient};border-radius:12px;padding:20px;text-align:center;">
      <a href="tel:+33622665308" style="color:white;text-decoration:none;font-weight:800;font-size:16px;display:block;margin-bottom:8px;">📞 06 22 66 53 08</a>
      <a href="mailto:contact@globalcleanhome.com" style="color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;">📧 contact@globalcleanhome.com</a>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#1e293b;padding:16px 28px;text-align:center;">
    <p style="color:white;font-weight:700;margin:0 0 3px;font-size:13px;">Global Clean Home</p>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">www.globalcleanhome.com · 06 22 66 53 08</p>
  </div>

</div>
</body></html>"""
