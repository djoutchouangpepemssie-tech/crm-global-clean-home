"""
Global Clean Home CRM - Google Calendar Integration
Real OAuth2 flow for syncing interventions to Google Calendar.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import logging
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")

SCOPES = ["https://www.googleapis.com/auth/calendar"]

gcal_router = APIRouter(prefix="/api/gcal")


def _is_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def _get_flow() -> Flow:
    if not _is_configured():
        raise HTTPException(status_code=500, detail="Google Calendar non configure. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.")
    
    redirect_uri = GOOGLE_REDIRECT_URI
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="GOOGLE_REDIRECT_URI non configure.")
    
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


async def _require_auth(request: Request):
    from server import require_auth
    return await require_auth(request)


# ============= STATUS =============

@gcal_router.get("/status")
async def gcal_status(request: Request):
    """Check Google Calendar integration status for current user."""
    user = await _require_auth(request)
    
    if not _is_configured():
        return {"connected": False, "configured": False, "message": "Google Calendar non configure (cles API manquantes)"}
    
    user_doc = await _db.users.find_one({"user_id": user.user_id}, {"_id": 0, "google_tokens": 1})
    has_tokens = bool(user_doc and user_doc.get("google_tokens"))
    
    return {
        "connected": has_tokens,
        "configured": True,
        "message": "Connecte a Google Calendar" if has_tokens else "Non connecte",
    }


# ============= OAUTH FLOW =============

@gcal_router.get("/auth/login")
async def gcal_login(request: Request):
    """Start Google Calendar OAuth flow."""
    user = await _require_auth(request)
    
    flow = _get_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=user.user_id,
    )
    
    # Store state for validation
    await _db.oauth_states.insert_one({
        "state": state,
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"authorization_url": authorization_url}


@gcal_router.get("/auth/callback")
async def gcal_callback(request: Request, code: str, state: str):
    """Handle Google Calendar OAuth callback."""
    # Validate state
    state_doc = await _db.oauth_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="State invalide")
    
    user_id = state_doc["user_id"]
    await _db.oauth_states.delete_one({"state": state})
    
    # Exchange code for tokens
    import requests as http_requests
    token_resp = http_requests.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }).json()
    
    if "error" in token_resp:
        logger.error(f"Google token exchange error: {token_resp}")
        raise HTTPException(status_code=400, detail=f"Erreur Google: {token_resp.get('error_description', token_resp['error'])}")
    
    # Save tokens to user
    await _db.users.update_one(
        {"user_id": user_id},
        {"$set": {"google_tokens": token_resp}},
    )
    
    logger.info(f"Google Calendar connected for user {user_id}")
    
    # Redirect to integrations page
    frontend_url = os.environ.get("FRONTEND_URL", "")
    if not frontend_url:
        return {"message": "Google Calendar connecte avec succes", "tokens_saved": True}
    
    return RedirectResponse(f"{frontend_url}/integrations?gcal=connected")


@gcal_router.post("/disconnect")
async def gcal_disconnect(request: Request):
    """Disconnect Google Calendar."""
    user = await _require_auth(request)
    
    await _db.users.update_one(
        {"user_id": user.user_id},
        {"$unset": {"google_tokens": ""}},
    )
    
    return {"message": "Google Calendar deconnecte"}


# ============= CREDENTIALS HELPER =============

async def _get_credentials(user_id: str) -> Optional[Credentials]:
    """Get valid Google credentials for a user, auto-refreshing if needed."""
    user_doc = await _db.users.find_one({"user_id": user_id}, {"_id": 0, "google_tokens": 1})
    if not user_doc or not user_doc.get("google_tokens"):
        return None
    
    tokens = user_doc["google_tokens"]
    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )
    
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            await _db.users.update_one(
                {"user_id": user_id},
                {"$set": {"google_tokens.access_token": creds.token}},
            )
        except Exception as e:
            logger.error(f"Failed to refresh Google token for user {user_id}: {e}")
            return None
    
    return creds


# ============= CALENDAR OPERATIONS =============

@gcal_router.get("/events")
async def list_events(request: Request, days: int = 30):
    """List upcoming Google Calendar events."""
    user = await _require_auth(request)
    creds = await _get_credentials(user.user_id)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar non connecte. Connectez-vous d'abord.")
    
    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    result = service.events().list(
        calendarId="primary",
        timeMin=now,
        timeMax=end,
        maxResults=100,
        singleEvents=True,
        orderBy="startTime",
    ).execute()
    
    events = result.get("items", [])
    return {"events": events, "count": len(events)}


@gcal_router.post("/sync-intervention/{intervention_id}")
async def sync_intervention(intervention_id: str, request: Request):
    """Sync a single intervention to Google Calendar."""
    user = await _require_auth(request)
    creds = await _get_credentials(user.user_id)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar non connecte")
    
    intv = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
    if not intv:
        raise HTTPException(status_code=404, detail="Intervention introuvable")
    
    service = build("calendar", "v3", credentials=creds)
    
    # Parse date/time
    date_str = intv.get("scheduled_date", "")
    time_str = intv.get("scheduled_time", "09:00")
    duration = intv.get("duration_hours", 2) or 2
    
    try:
        parts = date_str.split("-")
        t_parts = time_str.split(":")
        start_dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]), int(t_parts[0]), int(t_parts[1]) if len(t_parts) > 1 else 0)
        end_dt = start_dt + timedelta(hours=duration)
    except Exception:
        raise HTTPException(status_code=400, detail="Format de date invalide pour l'intervention")
    
    event_body = {
        "summary": intv.get("title", "Intervention Global Clean Home"),
        "location": intv.get("address", ""),
        "description": (
            f"Client: {intv.get('lead_name', '')}\n"
            f"Tel: {intv.get('lead_phone', '')}\n"
            f"Service: {intv.get('service_type', '')}\n"
            f"Statut: {intv.get('status', '')}\n"
            f"{intv.get('description', '')}"
        ),
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Paris"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Paris"},
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 60},
                {"method": "popup", "minutes": 15},
            ],
        },
    }
    
    # Check if already synced
    google_event_id = intv.get("google_event_id")
    
    if google_event_id:
        # Update existing event
        try:
            event = service.events().update(
                calendarId="primary",
                eventId=google_event_id,
                body=event_body,
            ).execute()
        except Exception:
            # Event may have been deleted, create new
            event = service.events().insert(calendarId="primary", body=event_body).execute()
    else:
        event = service.events().insert(calendarId="primary", body=event_body).execute()
    
    # Save Google event ID
    await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$set": {"google_event_id": event["id"], "google_synced_at": datetime.now(timezone.utc).isoformat()}},
    )
    
    return {
        "message": "Intervention synchronisee avec Google Calendar",
        "google_event_id": event["id"],
        "html_link": event.get("htmlLink", ""),
    }


@gcal_router.post("/sync-all")
async def sync_all_interventions(request: Request):
    """Sync all upcoming interventions to Google Calendar."""
    user = await _require_auth(request)
    creds = await _get_credentials(user.user_id)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar non connecte")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    interventions = await _db.interventions.find(
        {"scheduled_date": {"$gte": today}, "status": {"$ne": "annulee"}},
        {"_id": 0},
    ).to_list(500)
    
    synced = 0
    errors = 0
    
    service = build("calendar", "v3", credentials=creds)
    
    for intv in interventions:
        try:
            date_str = intv.get("scheduled_date", "")
            time_str = intv.get("scheduled_time", "09:00")
            duration = intv.get("duration_hours", 2) or 2
            
            parts = date_str.split("-")
            t_parts = time_str.split(":")
            start_dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]), int(t_parts[0]), int(t_parts[1]) if len(t_parts) > 1 else 0)
            end_dt = start_dt + timedelta(hours=duration)
            
            event_body = {
                "summary": intv.get("title", "Intervention Global Clean Home"),
                "location": intv.get("address", ""),
                "description": f"Client: {intv.get('lead_name', '')}\nService: {intv.get('service_type', '')}",
                "start": {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Paris"},
                "end": {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Paris"},
            }
            
            google_event_id = intv.get("google_event_id")
            if google_event_id:
                try:
                    event = service.events().update(calendarId="primary", eventId=google_event_id, body=event_body).execute()
                except Exception:
                    event = service.events().insert(calendarId="primary", body=event_body).execute()
            else:
                event = service.events().insert(calendarId="primary", body=event_body).execute()
            
            await _db.interventions.update_one(
                {"intervention_id": intv["intervention_id"]},
                {"$set": {"google_event_id": event["id"], "google_synced_at": datetime.now(timezone.utc).isoformat()}},
            )
            synced += 1
        except Exception as e:
            logger.error(f"Failed to sync intervention {intv.get('intervention_id')}: {e}")
            errors += 1
    
    return {
        "message": f"{synced} interventions synchronisees",
        "synced": synced,
        "errors": errors,
        "total": len(interventions),
    }


@gcal_router.delete("/event/{intervention_id}")
async def delete_calendar_event(intervention_id: str, request: Request):
    """Delete a Google Calendar event for an intervention."""
    user = await _require_auth(request)
    creds = await _get_credentials(user.user_id)
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar non connecte")
    
    intv = await _db.interventions.find_one({"intervention_id": intervention_id}, {"_id": 0})
    if not intv or not intv.get("google_event_id"):
        raise HTTPException(status_code=404, detail="Evenement Google Calendar introuvable")
    
    service = build("calendar", "v3", credentials=creds)
    
    try:
        service.events().delete(calendarId="primary", eventId=intv["google_event_id"]).execute()
    except Exception as e:
        logger.warning(f"Failed to delete Google Calendar event: {e}")
    
    await _db.interventions.update_one(
        {"intervention_id": intervention_id},
        {"$unset": {"google_event_id": "", "google_synced_at": ""}},
    )
    
    return {"message": "Evenement supprime de Google Calendar"}
