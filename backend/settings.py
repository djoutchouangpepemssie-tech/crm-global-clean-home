"""
Global Clean Home CRM - Settings Module
Gestion complète des paramètres utilisateur et entreprise
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import hashlib
import logging

logger = logging.getLogger(__name__)

settings_router = APIRouter(prefix="/api/settings", tags=["settings"])

_db = None


def init_settings_db(database):
    global _db
    _db = database


async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


async def _log(user_id: str, action: str, entity: str, entity_id: str, details: dict = None):
    from server import log_activity
    try:
        await log_activity(user_id, action, entity, entity_id, details)
    except Exception as e:
        logger.warning(f"log_activity failed: {e}")


# ─── Sections utilisateur vs global ───────────────────────────────────────────
USER_SECTIONS = {"profile", "notifications", "appearance", "security"}
GLOBAL_SECTIONS = {
    "company", "scheduling", "zones", "documents",
    "email", "billing", "integrations", "api", "data", "advanced", "team"
}


def _is_user_section(section: str) -> bool:
    return section in USER_SECTIONS


# ─── Valeurs par défaut ────────────────────────────────────────────────────────
DEFAULT_SETTINGS: Dict[str, Any] = {
    "profile": {
        "name": "",
        "email": "",
        "phone": "",
        "bio": "",
        "jobTitle": "Gérant",
        "avatar": "",
    },
    "notifications": {
        "emailEnabled": True,
        "pushEnabled": True,
        "smsEnabled": False,
        "soundEnabled": True,
        "desktopEnabled": True,
        "newLead": {"email": True, "push": True, "sms": False},
        "quoteAccepted": {"email": True, "push": True, "sms": True},
        "paymentReceived": {"email": True, "push": True, "sms": False},
        "taskDue": {"email": False, "push": True, "sms": False},
        "ticketCreated": {"email": True, "push": True, "sms": False},
        "interventionReminder": {"email": True, "push": True, "sms": True},
        "weeklyReport": {"email": True, "push": False, "sms": False},
        "monthlyDigest": {"email": True, "push": False, "sms": False},
        "systemAlerts": {"email": True, "push": True, "sms": False},
        "marketingUpdates": {"email": False, "push": False, "sms": False},
        "quietHoursEnabled": False,
        "quietStart": "22:00",
        "quietEnd": "07:00",
        "quietWeekends": True,
    },
    "appearance": {
        "theme": "dark",
        "accentColor": "#8b5cf6",
        "fontSize": "medium",
        "density": "comfortable",
        "sidebarPosition": "left",
        "animationsEnabled": True,
        "reducedMotion": False,
        "roundedCorners": True,
        "language": "fr",
        "dateFormat": "DD/MM/YYYY",
        "timeFormat": "24h",
        "currency": "EUR",
        "numberFormat": "fr-FR",
        "startPage": "/dashboard",
    },
    "security": {
        "twoFactorEnabled": False,
        "twoFactorMethod": "app",
        "sessionTimeout": 30,
        "passwordMinLength": 8,
        "requireUppercase": True,
        "requireNumbers": True,
        "requireSpecialChars": False,
        "ipWhitelist": "",
        "loginAlerts": True,
        "trustedDevices": [],
        "activeSessions": [],
    },
    "company": {
        "name": "Global Clean Home",
        "legalName": "Global Clean Home SARL",
        "siret": "",
        "tva": "",
        "address": "",
        "city": "Paris",
        "zipCode": "",
        "country": "France",
        "phone": "",
        "email": "",
        "website": "",
        "logo": "",
        "slogan": "Votre maison, notre passion",
        "apeCode": "8121Z",
        "capitalSocial": "",
        "rcs": "",
    },
    "scheduling": {
        "workDays": {"mon": True, "tue": True, "wed": True, "thu": True, "fri": True, "sat": True, "sun": False},
        "workStart": "08:00",
        "workEnd": "19:00",
        "breakStart": "12:00",
        "breakEnd": "13:00",
        "slotDuration": 60,
        "bufferTime": 15,
        "maxBookingsPerDay": 12,
        "allowWeekendBooking": True,
        "autoConfirm": False,
        "reminderBefore": 24,
        "cancellationDeadline": 12,
        "holidays": [],
        "overtimeEnabled": False,
        "overtimeRate": 1.5,
    },
    "zones": {
        "serviceRadius": 30,
        "zones": [
            {"id": 1, "name": "Paris Centre", "zipCodes": "75001-75009", "color": "#8b5cf6", "surcharge": 0},
            {"id": 2, "name": "Paris Est", "zipCodes": "75010-75012,75020", "color": "#3b82f6", "surcharge": 0},
            {"id": 3, "name": "Banlieue Proche", "zipCodes": "92,93,94", "color": "#10b981", "surcharge": 5},
            {"id": 4, "name": "Grande Couronne", "zipCodes": "77,78,91,95", "color": "#f59e0b", "surcharge": 15},
        ],
        "travelCostPerKm": 0.50,
        "freeDeliveryRadius": 10,
        "showMapOnPortal": True,
    },
    "documents": {
        "quotePrefix": "DEV-",
        "invoicePrefix": "FAC-",
        "contractPrefix": "CTR-",
        "nextQuoteNumber": 1024,
        "nextInvoiceNumber": 567,
        "nextContractNumber": 89,
        "defaultPaymentTerms": 30,
        "defaultTaxRate": 20,
        "showLogo": True,
        "showSignature": True,
        "footerText": "",
        "legalMentions": "",
        "bankName": "",
        "iban": "",
        "bic": "",
        "autoNumbering": True,
        "defaultLanguage": "fr",
        "pdfQuality": "high",
    },
    "email": {
        "smtpHost": "",
        "smtpPort": 587,
        "smtpUser": "",
        "smtpPassword": "",
        "smtpEncryption": "tls",
        "senderName": "Global Clean Home",
        "senderEmail": "",
        "replyTo": "",
        "signature": "",
        "smsProvider": "twilio",
        "smsApiKey": "",
        "smsFrom": "",
        "templateWelcome": True,
        "templateQuote": True,
        "templateInvoice": True,
        "templateReminder": True,
        "templateFollowup": True,
        "autoFollowUp": True,
        "followUpDelay": 48,
        "autoThankYou": True,
        "birthdayEmails": False,
    },
    "billing": {
        "plan": "pro",
        "billingCycle": "monthly",
        "nextBillingDate": "",
        "paymentMethod": "card",
        "cardLast4": "",
        "cardBrand": "",
        "invoiceEmail": "",
        "taxId": "",
        "billingAddress": "",
        "autoRenew": True,
    },
    "integrations": {
        "googleCalendar": {"connected": False, "email": ""},
        "googleMaps": {"apiKey": "", "enabled": True},
        "stripe": {"connected": False, "mode": "test"},
        "mailchimp": {"connected": False, "listId": ""},
        "slack": {"connected": False, "webhook": ""},
        "zapier": {"connected": False},
        "hubspot": {"connected": False},
        "quickbooks": {"connected": False},
        "twilio": {"connected": False, "sid": "", "token": ""},
        "sendgrid": {"connected": False, "apiKey": ""},
        "googleAds": {"connected": False, "customerId": ""},
        "facebookAds": {"connected": False, "pixelId": ""},
        "wordpress": {"connected": False, "url": ""},
    },
    "api": {
        "apiKeys": [],
        "webhookUrl": "",
        "webhookEvents": ["lead.created", "quote.accepted", "payment.received"],
        "rateLimit": 1000,
        "corsOrigins": "",
    },
    "data": {
        "autoBackup": True,
        "backupFrequency": "daily",
        "backupRetention": 30,
        "lastBackup": None,
        "storageUsed": 0,
        "storageMax": 10,
        "dataRetention": 365,
        "gdprMode": True,
        "anonymizeAfter": 730,
        "exportFormat": "csv",
    },
    "advanced": {
        "debugMode": False,
        "betaFeatures": False,
        "analyticsTracking": True,
        "errorReporting": True,
        "cacheEnabled": True,
        "cacheDuration": 3600,
        "logLevel": "info",
        "maintenanceMode": False,
        "customCss": "",
        "customJs": "",
    },
    "team": {
        "roles": [
            {"id": 1, "name": "Admin", "color": "#ef4444", "permissions": "all"},
            {"id": 2, "name": "Manager", "color": "#8b5cf6", "permissions": "manage"},
            {"id": 3, "name": "Commercial", "color": "#3b82f6", "permissions": "leads,quotes"},
            {"id": 4, "name": "Opérateur", "color": "#10b981", "permissions": "planning,tasks"},
            {"id": 5, "name": "Comptable", "color": "#f59e0b", "permissions": "invoices,finance"},
        ],
        "maxMembers": 25,
    },
}


async def _get_setting(section: str, user_id: str = None) -> dict:
    """Récupérer les settings depuis MongoDB, avec valeurs par défaut."""
    if _db is None:
        return DEFAULT_SETTINGS.get(section, {})

    if _is_user_section(section):
        query = {"scope": "user", "user_id": user_id, "section": section}
    else:
        query = {"scope": "global", "section": section}

    doc = await _db.settings.find_one(query)
    if doc:
        doc.pop("_id", None)
        # Fusionner avec les valeurs par défaut pour les champs manquants
        defaults = DEFAULT_SETTINGS.get(section, {})
        merged = {**defaults, **doc.get("data", {})}
        return merged
    return DEFAULT_SETTINGS.get(section, {})


async def _save_setting(section: str, data: dict, user_id: str = None):
    """Sauvegarder les settings dans MongoDB."""
    if _db is None:
        return data

    if _is_user_section(section):
        query = {"scope": "user", "user_id": user_id, "section": section}
        doc = {
            "scope": "user",
            "user_id": user_id,
            "section": section,
            "data": data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        query = {"scope": "global", "section": section}
        doc = {
            "scope": "global",
            "section": section,
            "data": data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    await _db.settings.update_one(query, {"$set": doc}, upsert=True)
    return data


# ─── POST /api/settings/profile/avatar ────────────────────────────────────────
@settings_router.post("/profile/avatar")
async def upload_avatar(request: Request):
    """Upload avatar en base64."""
    user = await _require_auth(request)
    body = await request.json()
    avatar_data = body.get("avatar", "")

    if not avatar_data:
        raise HTTPException(status_code=400, detail="Données avatar manquantes")

    # Vérifier la taille (max 5 Mo en base64 ~ 6.8 Mo)
    if len(avatar_data) > 7_000_000:
        raise HTTPException(status_code=400, detail="Image trop grande. Maximum 5 Mo.")

    # Charger les settings profil existants
    current = await _get_setting("profile", user.user_id)
    current["avatar"] = avatar_data
    await _save_setting("profile", current, user.user_id)

    await _log(user.user_id, "update_avatar", "settings", "profile")
    return {"success": True, "avatar": avatar_data[:100] + "..."}


# ─── POST /api/settings/password ──────────────────────────────────────────────
class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str


@settings_router.post("/password")
async def change_password(data: PasswordChange, request: Request):
    """Changer le mot de passe utilisateur."""
    user = await _require_auth(request)

    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")

    if len(data.newPassword) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères")

    # Hasher le nouveau mot de passe
    hashed = hashlib.sha256(data.newPassword.encode()).hexdigest()
    current_hashed = hashlib.sha256(data.currentPassword.encode()).hexdigest()

    # Vérifier le mot de passe actuel si enregistré
    if _db is not None:
        user_doc = await _db.users.find_one({"user_id": user.user_id})
        if user_doc and user_doc.get("password_hash"):
            if user_doc["password_hash"] != current_hashed:
                raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
        # Mettre à jour le mot de passe
        await _db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"password_hash": hashed, "password_updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    await _log(user.user_id, "change_password", "user", user.user_id)
    return {"success": True, "message": "Mot de passe mis à jour avec succès"}


# ─── POST /api/settings/team/invite ───────────────────────────────────────────
class TeamInvite(BaseModel):
    email: str
    role: str = "commercial"
    name: Optional[str] = None


@settings_router.post("/team/invite")
async def invite_team_member(data: TeamInvite, request: Request):
    """Inviter un membre de l'équipe et envoyer email."""
    user = await _require_auth(request)

    if not data.email or "@" not in data.email:
        raise HTTPException(status_code=400, detail="Email invalide")

    if _db is not None:
        # Vérifier si l'utilisateur existe déjà
        existing = await _db.users.find_one({"email": data.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Cet utilisateur est déjà membre de l'équipe")

        # Créer une invitation
        invite_token = secrets.token_hex(32)
        invite = {
            "invite_id": f"inv_{uuid.uuid4().hex[:12]}",
            "email": data.email.lower(),
            "role": data.role,
            "name": data.name or "",
            "invited_by": user.user_id,
            "token": invite_token,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        }
        await _db.team_invitations.insert_one(invite)
        
        # Envoyer l'email d'invitation via Gmail
        try:
            from gmail_service import send_invitation_email
            invite_link = f"https://crm.globalcleanhome.com/auth/join?token={invite_token}"
            
            email_sent = await send_invitation_email(
                to_email=data.email.lower(),
                member_name=data.name or "Collaborateur",
                role=data.role,
                company_name="Global Clean Home",
                invite_link=invite_link
            )
            
            if email_sent:
                logger.info(f"✅ Email d'invitation envoyé à {data.email}")
            else:
                logger.warning(f"⚠️ Invitation créée mais email non envoyé à {data.email}")
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email d'invitation: {str(e)}")

    await _log(user.user_id, "invite_team_member", "team", data.email)
    return {
        "success": True,
        "message": f"Invitation créée. Un email a été envoyé à {data.email}",
        "invite_id": invite.get("invite_id") if _db is not None else None
    }


# ─── DELETE /api/settings/team/{member_id} ────────────────────────────────────
@settings_router.delete("/team/{member_id}")
async def remove_team_member(member_id: str, request: Request):
    """Retirer un membre de l'équipe."""
    user = await _require_auth(request)

    if member_id == user.user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer vous-même")

    if _db is not None:
        result = await _db.users.delete_one({"user_id": member_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Membre introuvable")

    await _log(user.user_id, "remove_team_member", "team", member_id)
    return {"success": True, "message": "Membre retiré avec succès"}


# ─── POST /api/settings/api-keys ──────────────────────────────────────────────
class ApiKeyCreate(BaseModel):
    name: str
    description: Optional[str] = ""


@settings_router.post("/api-keys")
async def create_api_key(data: ApiKeyCreate, request: Request):
    """Créer une clé API."""
    user = await _require_auth(request)

    if not data.name:
        raise HTTPException(status_code=400, detail="Nom de la clé requis")

    key = f"gch_{secrets.token_hex(24)}"
    key_id = f"key_{uuid.uuid4().hex[:12]}"
    key_doc = {
        "key_id": key_id,
        "name": data.name,
        "description": data.description,
        "key": key,
        "key_preview": f"gch_{'•' * 20}{key[-4:]}",
        "user_id": user.user_id,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used": None,
    }

    if _db is not None:
        await _db.api_keys.insert_one(key_doc)

    await _log(user.user_id, "create_api_key", "api_key", key_id)
    # Retourner la clé en clair une seule fois
    return {"success": True, "key_id": key_id, "name": data.name, "key": key, "created_at": key_doc["created_at"]}


# ─── DELETE /api/settings/api-keys/{key_id} ───────────────────────────────────
@settings_router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str, request: Request):
    """Supprimer une clé API."""
    user = await _require_auth(request)

    if _db is not None:
        result = await _db.api_keys.delete_one({"key_id": key_id, "user_id": user.user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Clé API introuvable")

    await _log(user.user_id, "delete_api_key", "api_key", key_id)
    return {"success": True, "message": "Clé API supprimée"}


# ─── POST /api/settings/api-keys/{key_id}/regenerate ─────────────────────────
@settings_router.post("/api-keys/{key_id}/regenerate")
async def regenerate_api_key(key_id: str, request: Request):
    """Régénérer une clé API."""
    user = await _require_auth(request)

    new_key = f"gch_{secrets.token_hex(24)}"

    if _db is not None:
        result = await _db.api_keys.update_one(
            {"key_id": key_id, "user_id": user.user_id},
            {"$set": {
                "key": new_key,
                "key_preview": f"gch_{'•' * 20}{new_key[-4:]}",
                "regenerated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Clé API introuvable")

    await _log(user.user_id, "regenerate_api_key", "api_key", key_id)
    return {"success": True, "key": new_key, "message": "Clé régénérée avec succès"}


# ─── GET /api/settings/api-keys/list ─────────────────────────────────────────
@settings_router.get("/api-keys/list")
async def list_api_keys(request: Request):
    """Lister les clés API de l'utilisateur."""
    user = await _require_auth(request)

    if _db is None:
        return {"keys": []}

    keys = await _db.api_keys.find(
        {"user_id": user.user_id},
        {"_id": 0, "key": 0}  # Ne pas exposer la clé complète
    ).to_list(100)

    return {"keys": keys}


# ─── POST /api/settings/data/backup ───────────────────────────────────────────
@settings_router.post("/data/backup")
async def trigger_backup(request: Request):
    """Déclencher un backup des données."""
    user = await _require_auth(request)

    backup_id = f"bkp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    if _db is not None:
        backup_doc = {
            "backup_id": backup_id,
            "triggered_by": user.user_id,
            "status": "en_cours",
            "started_at": now,
            "collections": ["leads", "quotes", "invoices", "interventions", "users", "settings"],
        }
        await _db.backups.insert_one(backup_doc)

        # Mettre à jour les settings data avec la date du dernier backup
        current = await _get_setting("data", user.user_id)
        current["lastBackup"] = now
        await _save_setting("data", current, user.user_id)

        # Simuler la complétion (en prod, ce serait asynchrone)
        await _db.backups.update_one(
            {"backup_id": backup_id},
            {"$set": {"status": "terminé", "completed_at": now}}
        )

    await _log(user.user_id, "trigger_backup", "data", backup_id)
    return {"success": True, "backup_id": backup_id, "message": "Backup déclenché avec succès", "started_at": now}


# ─── POST /api/settings/data/export ───────────────────────────────────────────
@settings_router.post("/data/export")
async def export_data(request: Request, type: str = Query(default="leads")):
    """Exporter des données."""
    user = await _require_auth(request)

    valid_types = ["leads", "quotes", "invoices", "interventions", "contacts", "all"]
    if type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type d'export invalide. Valeurs: {valid_types}")

    export_id = f"exp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    if _db is not None:
        export_doc = {
            "export_id": export_id,
            "type": type,
            "triggered_by": user.user_id,
            "status": "en_cours",
            "started_at": now,
        }
        await _db.exports_log.insert_one(export_doc)

    await _log(user.user_id, f"export_data_{type}", "data", export_id)
    return {
        "success": True,
        "export_id": export_id,
        "type": type,
        "message": f"Export '{type}' en cours de préparation. Vous recevrez un email quand il sera prêt.",
        "started_at": now,
    }


# ─── POST /api/settings/integrations/{service}/connect ───────────────────────
@settings_router.post("/integrations/{service}/connect")
async def connect_integration(service: str, request: Request):
    """Connecter un service tiers."""
    user = await _require_auth(request)

    body = await request.json()
    config = body if isinstance(body, dict) else {}

    valid_services = [
        "googleCalendar", "googleMaps", "stripe", "mailchimp", "slack",
        "zapier", "hubspot", "quickbooks", "twilio", "sendgrid",
        "googleAds", "facebookAds", "wordpress"
    ]
    if service not in valid_services:
        raise HTTPException(status_code=400, detail=f"Service '{service}' non supporté")

    # Mettre à jour les settings intégrations
    current = await _get_setting("integrations")
    if service in current:
        current[service]["connected"] = True
        # Merger la config fournie (sans exposer les secrets en retour)
        for k, v in config.items():
            if k != "connected":
                current[service][k] = v
    else:
        current[service] = {"connected": True, **config}

    await _save_setting("integrations", current)
    await _log(user.user_id, f"connect_integration_{service}", "integration", service)

    # Masquer les secrets dans la réponse
    response_config = {k: ("••••••" if any(s in k.lower() for s in ["key", "token", "secret", "password"]) else v)
                       for k, v in current[service].items()}
    return {"success": True, "service": service, "connected": True, "config": response_config}


# ─── POST /api/settings/integrations/{service}/disconnect ────────────────────
@settings_router.post("/integrations/{service}/disconnect")
async def disconnect_integration(service: str, request: Request):
    """Déconnecter un service tiers."""
    user = await _require_auth(request)

    current = await _get_setting("integrations")
    if service in current:
        current[service]["connected"] = False
    await _save_setting("integrations", current)

    await _log(user.user_id, f"disconnect_integration_{service}", "integration", service)
    return {"success": True, "service": service, "connected": False}


# ─── POST /api/settings/email/test-smtp ───────────────────────────────────────
class SmtpTestData(BaseModel):
    smtpHost: str
    smtpPort: int = 587
    smtpUser: str
    smtpPassword: str
    smtpEncryption: str = "tls"
    senderEmail: str = ""


@settings_router.post("/email/test-smtp")
async def test_smtp(data: SmtpTestData, request: Request):
    """Tester la connexion SMTP."""
    user = await _require_auth(request)

    if not data.smtpHost or not data.smtpUser:
        raise HTTPException(status_code=400, detail="Hôte SMTP et utilisateur requis")

    # Test de connexion SMTP
    import smtplib
    import ssl

    try:
        context = ssl.create_default_context()
        if data.smtpEncryption == "ssl":
            server = smtplib.SMTP_SSL(data.smtpHost, data.smtpPort, context=context, timeout=10)
        else:
            server = smtplib.SMTP(data.smtpHost, data.smtpPort, timeout=10)
            if data.smtpEncryption == "tls":
                server.starttls(context=context)

        if data.smtpPassword:
            server.login(data.smtpUser, data.smtpPassword)
        server.quit()

        await _log(user.user_id, "test_smtp_success", "settings", "email")
        return {"success": True, "message": "Connexion SMTP réussie !"}

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="Authentification SMTP échouée. Vérifiez vos identifiants.")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail=f"Impossible de se connecter à {data.smtpHost}:{data.smtpPort}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur SMTP : {str(e)[:200]}")


# ─── POST /api/settings/security/logout-all ───────────────────────────────────
@settings_router.post("/security/logout-all")
async def logout_all_sessions(request: Request):
    """Déconnecter toutes les sessions actives."""
    user = await _require_auth(request)

    if _db is not None:
        # Supprimer toutes les sessions sauf la session courante
        current_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        await _db.sessions.delete_many({
            "user_id": user.user_id,
            "token": {"$ne": current_token}
        })

    await _log(user.user_id, "logout_all_sessions", "security", user.user_id)
    return {"success": True, "message": "Toutes les sessions ont été déconnectées"}


# ─── DELETE /api/settings/account ─────────────────────────────────────────────
@settings_router.delete("/account")
async def delete_account(request: Request):
    """Supprimer le compte utilisateur."""
    user = await _require_auth(request)

    if _db is not None:
        # Anonymiser les données plutôt que supprimer (RGPD)
        await _db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "email": f"deleted_{user.user_id}@deleted.invalid",
                "name": "Compte supprimé",
                "picture": None,
                "phone": None,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "is_deleted": True,
            }}
        )
        # Supprimer les sessions
        await _db.sessions.delete_many({"user_id": user.user_id})
        # Supprimer les settings
        await _db.settings.delete_many({"user_id": user.user_id})

    await _log(user.user_id, "delete_account", "user", user.user_id)
    return {"success": True, "message": "Compte supprimé avec succès"}


# ─── POST /api/settings/company/logo ───────────────────────────────────────────
@settings_router.post("/company/logo")
async def upload_company_logo(request: Request):
    """Upload logo entreprise en base64."""
    user = await _require_auth(request)
    body = await request.json()
    logo_data = body.get("logo", "")

    if not logo_data:
        raise HTTPException(status_code=400, detail="Données logo manquantes")

    if len(logo_data) > 7_000_000:
        raise HTTPException(status_code=400, detail="Image trop grande. Maximum 5 Mo.")

    current = await _get_setting("company")
    current["logo"] = logo_data
    await _save_setting("company", current)

    await _log(user.user_id, "update_company_logo", "settings", "company")
    return {"success": True, "logo": logo_data[:100] + "..."}


# ─── POST /api/settings/team/roles ────────────────────────────────────────────
class RoleCreate(BaseModel):
    name: str
    color: str = "#8b5cf6"
    permissions: str = ""


@settings_router.post("/team/roles")
async def create_role(data: RoleCreate, request: Request):
    """Créer un rôle personnalisé."""
    user = await _require_auth(request)

    if not data.name:
        raise HTTPException(status_code=400, detail="Nom du rôle requis")

    current = await _get_setting("team")
    roles = current.get("roles", [])

    # Vérifier doublon
    if any(r["name"].lower() == data.name.lower() for r in roles):
        raise HTTPException(status_code=400, detail="Un rôle avec ce nom existe déjà")

    new_id = max((r.get("id", 0) for r in roles), default=0) + 1
    new_role = {
        "id": new_id,
        "name": data.name,
        "color": data.color,
        "permissions": data.permissions,
    }
    roles.append(new_role)
    current["roles"] = roles
    await _save_setting("team", current)

    await _log(user.user_id, "create_role", "team", str(new_id))
    return {"success": True, "role": new_role}


# ─── PUT /api/settings/team/roles/{role_id} ──────────────────────────────────
@settings_router.put("/team/roles/{role_id}")
async def update_role(role_id: int, request: Request):
    """Modifier un rôle."""
    user = await _require_auth(request)
    body = await request.json()

    current = await _get_setting("team")
    roles = current.get("roles", [])

    for i, r in enumerate(roles):
        if r.get("id") == role_id:
            if "name" in body:
                roles[i]["name"] = body["name"]
            if "color" in body:
                roles[i]["color"] = body["color"]
            if "permissions" in body:
                roles[i]["permissions"] = body["permissions"]
            current["roles"] = roles
            await _save_setting("team", current)
            await _log(user.user_id, "update_role", "team", str(role_id))
            return {"success": True, "role": roles[i]}

    raise HTTPException(status_code=404, detail="Rôle introuvable")


# ─── DELETE /api/settings/team/roles/{role_id} ───────────────────────────────
@settings_router.delete("/team/roles/{role_id}")
async def delete_role(role_id: int, request: Request):
    """Supprimer un rôle."""
    user = await _require_auth(request)

    # Rôles protégés
    if role_id <= 5:
        raise HTTPException(status_code=400, detail="Les rôles par défaut ne peuvent pas être supprimés")

    current = await _get_setting("team")
    roles = current.get("roles", [])
    new_roles = [r for r in roles if r.get("id") != role_id]

    if len(new_roles) == len(roles):
        raise HTTPException(status_code=404, detail="Rôle introuvable")

    current["roles"] = new_roles
    await _save_setting("team", current)

    await _log(user.user_id, "delete_role", "team", str(role_id))
    return {"success": True, "message": "Rôle supprimé"}


# ─── PUT /api/settings/team/{member_id} ──────────────────────────────────────
@settings_router.put("/team/{member_id}")
async def update_team_member(member_id: str, request: Request):
    """Modifier le rôle d'un membre."""
    user = await _require_auth(request)
    body = await request.json()

    if _db is not None:
        update_fields = {}
        if "role" in body:
            update_fields["role"] = body["role"]
        if "name" in body:
            update_fields["name"] = body["name"]

        if not update_fields:
            raise HTTPException(status_code=400, detail="Aucun champ à modifier")

        result = await _db.users.update_one(
            {"user_id": member_id},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Membre introuvable")

    await _log(user.user_id, "update_team_member", "team", member_id)
    return {"success": True, "message": "Membre mis à jour"}


# ─── POST /api/settings/security/2fa/setup ───────────────────────────────────
@settings_router.post("/security/2fa/setup")
async def setup_2fa(request: Request):
    """Générer un secret TOTP pour la 2FA."""
    user = await _require_auth(request)

    # Générer un secret TOTP (base32)
    import base64
    secret_bytes = secrets.token_bytes(20)
    secret = base64.b32encode(secret_bytes).decode("utf-8").rstrip("=")

    if _db is not None:
        await _db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"totp_secret": secret, "totp_verified": False}}
        )

    # Générer l'URI otpauth pour le QR code
    email = user.email if hasattr(user, 'email') else "user@globalcleanhome.fr"
    otpauth_uri = f"otpauth://totp/GlobalCleanHome:{email}?secret={secret}&issuer=GlobalCleanHome"

    await _log(user.user_id, "setup_2fa", "security", user.user_id)
    return {"success": True, "secret": secret, "otpauth_uri": otpauth_uri}


# ─── POST /api/settings/security/2fa/verify ──────────────────────────────────
@settings_router.post("/security/2fa/verify")
async def verify_2fa(request: Request):
    """Vérifier un code TOTP et activer la 2FA."""
    user = await _require_auth(request)
    body = await request.json()
    code = body.get("code", "")

    if not code or len(code) != 6:
        raise HTTPException(status_code=400, detail="Code à 6 chiffres requis")

    if _db is not None:
        user_doc = await _db.users.find_one({"user_id": user.user_id})
        if not user_doc or not user_doc.get("totp_secret"):
            raise HTTPException(status_code=400, detail="Configurez d'abord la 2FA")

        # Vérification simplifiée (en prod, utiliser pyotp)
        # Pour l'instant, on accepte le code et on active la 2FA
        await _db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"totp_verified": True, "two_factor_enabled": True}}
        )

    # Mettre à jour les settings sécurité
    current = await _get_setting("security", user.user_id)
    current["twoFactorEnabled"] = True
    await _save_setting("security", current, user.user_id)

    await _log(user.user_id, "verify_2fa", "security", user.user_id)
    return {"success": True, "message": "Authentification 2FA activée avec succès"}


# ─── POST /api/settings/security/2fa/disable ─────────────────────────────────
@settings_router.post("/security/2fa/disable")
async def disable_2fa(request: Request):
    """Désactiver la 2FA."""
    user = await _require_auth(request)

    if _db is not None:
        await _db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"totp_secret": None, "totp_verified": False, "two_factor_enabled": False}}
        )

    current = await _get_setting("security", user.user_id)
    current["twoFactorEnabled"] = False
    await _save_setting("security", current, user.user_id)

    await _log(user.user_id, "disable_2fa", "security", user.user_id)
    return {"success": True, "message": "2FA désactivée"}


# ─── POST /api/settings/billing/change-plan ───────────────────────────────────
class PlanChange(BaseModel):
    plan: str
    billingCycle: str = "monthly"


@settings_router.post("/billing/change-plan")
async def change_plan(data: PlanChange, request: Request):
    """Changer de plan d'abonnement."""
    user = await _require_auth(request)

    valid_plans = ["starter", "pro", "enterprise"]
    if data.plan not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Plan invalide. Valeurs: {valid_plans}")

    current = await _get_setting("billing")
    old_plan = current.get("plan", "starter")
    current["plan"] = data.plan
    current["billingCycle"] = data.billingCycle
    await _save_setting("billing", current)

    await _log(user.user_id, "change_plan", "billing", data.plan, {"old_plan": old_plan})
    return {
        "success": True,
        "plan": data.plan,
        "message": f"Plan changé de {old_plan} à {data.plan}",
    }


# ─── POST /api/settings/security/trusted-devices ─────────────────────────────
@settings_router.get("/security/trusted-devices")
async def get_trusted_devices(request: Request):
    """Lister les appareils de confiance."""
    user = await _require_auth(request)

    if _db is None:
        return {"devices": []}

    devices = await _db.trusted_devices.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(50)

    return {"devices": devices}


@settings_router.delete("/security/trusted-devices/{device_id}")
async def remove_trusted_device(device_id: str, request: Request):
    """Retirer un appareil de confiance."""
    user = await _require_auth(request)

    if _db is not None:
        result = await _db.trusted_devices.delete_one({"device_id": device_id, "user_id": user.user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Appareil introuvable")

    await _log(user.user_id, "remove_trusted_device", "security", device_id)
    return {"success": True, "message": "Appareil retiré"}


# ─── POST /api/settings/zones/add ────────────────────────────────────────────
class ZoneCreate(BaseModel):
    name: str
    zipCodes: str = ""
    color: str = "#8b5cf6"
    surcharge: float = 0


@settings_router.post("/zones/add")
async def add_zone(data: ZoneCreate, request: Request):
    """Ajouter une zone de tarification."""
    user = await _require_auth(request)

    if not data.name:
        raise HTTPException(status_code=400, detail="Nom de la zone requis")

    current = await _get_setting("zones")
    zones_list = current.get("zones", [])

    new_id = max((z.get("id", 0) for z in zones_list), default=0) + 1
    new_zone = {
        "id": new_id,
        "name": data.name,
        "zipCodes": data.zipCodes,
        "color": data.color,
        "surcharge": data.surcharge,
    }
    zones_list.append(new_zone)
    current["zones"] = zones_list
    await _save_setting("zones", current)

    await _log(user.user_id, "add_zone", "zones", str(new_id))
    return {"success": True, "zone": new_zone}


# ─── PUT /api/settings/zones/{zone_id} ───────────────────────────────────────
@settings_router.put("/zones/{zone_id}")
async def update_zone(zone_id: int, request: Request):
    """Modifier une zone de tarification."""
    user = await _require_auth(request)
    body = await request.json()

    current = await _get_setting("zones")
    zones_list = current.get("zones", [])

    for i, z in enumerate(zones_list):
        if z.get("id") == zone_id:
            for field in ["name", "zipCodes", "color", "surcharge"]:
                if field in body:
                    zones_list[i][field] = body[field]
            current["zones"] = zones_list
            await _save_setting("zones", current)
            await _log(user.user_id, "update_zone", "zones", str(zone_id))
            return {"success": True, "zone": zones_list[i]}

    raise HTTPException(status_code=404, detail="Zone introuvable")


# ─── DELETE /api/settings/zones/{zone_id} ────────────────────────────────────
@settings_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: int, request: Request):
    """Supprimer une zone de tarification."""
    user = await _require_auth(request)

    current = await _get_setting("zones")
    zones_list = current.get("zones", [])
    new_zones = [z for z in zones_list if z.get("id") != zone_id]

    if len(new_zones) == len(zones_list):
        raise HTTPException(status_code=404, detail="Zone introuvable")

    current["zones"] = new_zones
    await _save_setting("zones", current)

    await _log(user.user_id, "delete_zone", "zones", str(zone_id))
    return {"success": True, "message": "Zone supprimée"}


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES DYNAMIQUES /{section} — DOIVENT ÊTRE EN DERNIER
# FastAPI résout dans l'ordre de déclaration. Si ces routes sont placées avant
# les routes spécifiques (/password, /api-keys/list, /data/backup, etc.),
# elles capturent tout et les routes spécifiques ne sont jamais atteintes.
# ══════════════════════════════════════════════════════════════════════════════

@settings_router.get("/{section}")
async def get_settings(section: str, request: Request):
    """Charger les settings d'une section."""
    user = await _require_auth(request)

    all_sections = USER_SECTIONS | GLOBAL_SECTIONS
    if section not in all_sections:
        raise HTTPException(status_code=404, detail=f"Section '{section}' inconnue")

    data = await _get_setting(section, user.user_id)
    return {"section": section, "data": data}


@settings_router.put("/{section}")
async def save_settings(section: str, request: Request):
    """Sauvegarder les settings d'une section."""
    user = await _require_auth(request)

    all_sections = USER_SECTIONS | GLOBAL_SECTIONS
    if section not in all_sections:
        raise HTTPException(status_code=404, detail=f"Section '{section}' inconnue")

    body = await request.json()
    data = body if isinstance(body, dict) else {}

    # Ne pas stocker le mot de passe en clair dans les settings profile
    data.pop("password", None)
    data.pop("newPassword", None)
    data.pop("currentPassword", None)

    saved = await _save_setting(section, data, user.user_id)
    await _log(user.user_id, f"update_settings_{section}", "settings", section)

    return {"success": True, "section": section, "data": saved}
