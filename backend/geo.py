"""
geo.py — Geolocation & Route Optimization
Phase 4: Geocoding via Nominatim (OSM) + map data + route optimization
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import uuid
import asyncio
import math
import httpx
from datetime import datetime, timezone

# Import shared db from server
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = _client[os.environ['DB_NAME']]

geo_router = APIRouter(prefix="/api/geo", tags=["geo"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "GlobalCleanHomeCRM/1.0 (contact@globalcleanhome.fr)"}
_nominatim_lock = asyncio.Lock()
_last_nominatim_call = 0.0


# ── MODELS ──

class GeocodeRequest(BaseModel):
    address: str

class OptimizeRouteRequest(BaseModel):
    intervenant_id: str
    date: str  # YYYY-MM-DD
    start_address: str


# ── HELPERS ──

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance in km between two points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def _nominatim_geocode(address: str) -> Optional[dict]:
    """Call Nominatim with 1 req/sec rate limiting."""
    global _last_nominatim_call
    async with _nominatim_lock:
        now = asyncio.get_event_loop().time()
        wait = 1.0 - (now - _last_nominatim_call)
        if wait > 0:
            await asyncio.sleep(wait)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": address, "format": "json", "limit": 1},
                headers=NOMINATIM_HEADERS,
            )
        _last_nominatim_call = asyncio.get_event_loop().time()
    if resp.status_code != 200:
        return None
    data = resp.json()
    if not data:
        return None
    hit = data[0]
    return {
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "formatted_address": hit.get("display_name", address),
    }


async def geocode_address(address: str) -> Optional[dict]:
    """Geocode with MongoDB cache."""
    cached = await db.geocache.find_one({"address": address}, {"_id": 0})
    if cached:
        return {"lat": cached["lat"], "lng": cached["lng"], "formatted_address": cached["formatted_address"]}

    result = await _nominatim_geocode(address)
    if result:
        await db.geocache.update_one(
            {"address": address},
            {"$set": {**result, "address": address, "cached_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    return result


def nearest_neighbor_route(points: list, start: dict) -> list:
    """
    Simple nearest-neighbor TSP heuristic.
    points: list of dicts with lat, lng, + arbitrary fields
    start: dict with lat, lng
    Returns ordered list of points.
    """
    remaining = list(points)
    ordered = []
    current = start
    while remaining:
        nearest = min(remaining, key=lambda p: haversine_km(current["lat"], current["lng"], p["lat"], p["lng"]))
        ordered.append(nearest)
        current = nearest
        remaining.remove(nearest)
    return ordered


def build_google_maps_url(waypoints: list) -> str:
    """Build a Google Maps directions URL from ordered waypoints."""
    if not waypoints:
        return ""
    base = "https://www.google.com/maps/dir/"
    parts = [f"{w['lat']},{w['lng']}" for w in waypoints]
    return base + "/".join(parts)


# ── ENDPOINTS ──

@geo_router.post("/geocode")
async def geocode(req: GeocodeRequest):
    """Convert address to lat/lng using Nominatim with MongoDB cache."""
    if not req.address.strip():
        raise HTTPException(status_code=400, detail="Adresse vide.")
    result = await geocode_address(req.address.strip())
    if not result:
        raise HTTPException(status_code=404, detail=f"Adresse introuvable: {req.address}")
    return result


@geo_router.get("/interventions-map")
async def interventions_map(date: str = Query(..., description="YYYY-MM-DD")):
    """Get all interventions for a date with geocoded coordinates."""
    cursor = db.interventions.find({"date": date}, {"_id": 0})
    interventions_raw = await cursor.to_list(length=500)

    result = []
    for interv in interventions_raw:
        address = interv.get("address") or interv.get("client_address") or ""
        coords = None
        if address:
            coords = await geocode_address(address)

        # Try to resolve client name
        client_name = interv.get("client_name") or interv.get("client_id") or "—"
        if interv.get("client_id") and not interv.get("client_name"):
            client_doc = await db.clients.find_one({"id": interv["client_id"]}, {"_id": 0, "name": 1, "address": 1})
            if client_doc:
                client_name = client_doc.get("name", client_name)
                if not address:
                    address = client_doc.get("address", "")
                    coords = await geocode_address(address) if address else None

        entry = {
            "id": interv.get("id"),
            "client_name": client_name,
            "address": address,
            "lat": coords["lat"] if coords else None,
            "lng": coords["lng"] if coords else None,
            "status": interv.get("status"),
            "time": interv.get("time") or interv.get("start_time"),
            "intervenant": interv.get("intervenant_id") or interv.get("intervenant"),
        }
        result.append(entry)

    return {"date": date, "interventions": result, "total": len(result)}


@geo_router.post("/optimize-route")
async def optimize_route(req: OptimizeRouteRequest):
    """Calculate optimal route for an intervenant on a given date."""
    # Get all interventions for this intervenant on this date
    cursor = db.interventions.find(
        {"date": req.date, "$or": [{"intervenant_id": req.intervenant_id}, {"intervenant": req.intervenant_id}]},
        {"_id": 0},
    )
    interventions = await cursor.to_list(length=200)

    if not interventions:
        raise HTTPException(status_code=404, detail="Aucune intervention trouvée pour cet intervenant à cette date.")

    # Geocode start address
    start_coords = await geocode_address(req.start_address)
    if not start_coords:
        raise HTTPException(status_code=400, detail=f"Adresse de départ introuvable: {req.start_address}")

    # Geocode all intervention addresses
    points = []
    for interv in interventions:
        address = interv.get("address") or interv.get("client_address") or ""
        if not address and interv.get("client_id"):
            client_doc = await db.clients.find_one({"id": interv["client_id"]}, {"_id": 0, "address": 1, "name": 1})
            if client_doc:
                address = client_doc.get("address", "")
                interv["client_name"] = client_doc.get("name")

        coords = await geocode_address(address) if address else None
        if coords:
            points.append({**interv, "lat": coords["lat"], "lng": coords["lng"], "address": address})
        else:
            points.append({**interv, "lat": None, "lng": None, "address": address})

    # Separate geolocated vs not
    geolocated = [p for p in points if p["lat"] is not None]
    not_geolocated = [p for p in points if p["lat"] is None]

    ordered = nearest_neighbor_route(geolocated, start_coords) + not_geolocated

    # Calculate total distance
    total_km = 0.0
    prev = start_coords
    for p in geolocated:
        total_km += haversine_km(prev["lat"], prev["lng"], p["lat"], p["lng"])
        prev = p

    # Estimate time: 30 min/intervention + 15 min/km driving (avg 60 km/h city)
    driving_min = (total_km / 60) * 60
    service_min = len(ordered) * 30  # rough estimate
    estimated_time_min = round(driving_min + service_min)

    waypoints = [start_coords] + [{"lat": p["lat"], "lng": p["lng"]} for p in geolocated]
    google_maps_url = build_google_maps_url(waypoints)

    return {
        "intervenant_id": req.intervenant_id,
        "date": req.date,
        "start_address": req.start_address,
        "optimized_order": [
            {
                "id": p.get("id"),
                "client_name": p.get("client_name") or p.get("client_id"),
                "address": p.get("address"),
                "lat": p.get("lat"),
                "lng": p.get("lng"),
                "time": p.get("time") or p.get("start_time"),
                "status": p.get("status"),
            }
            for p in ordered
        ],
        "total_distance_km": round(total_km, 2),
        "estimated_time_min": estimated_time_min,
        "google_maps_url": google_maps_url,
        "not_geolocated_count": len(not_geolocated),
    }


@geo_router.get("/zones-stats")
async def zones_stats():
    """Stats by geographic zone (arrondissement/city)."""

    def extract_zone(address: str) -> str:
        if not address:
            return "Inconnu"
        parts = [p.strip() for p in address.split(",")]
        # Try to find city/arrondissement
        for part in reversed(parts):
            if any(char.isdigit() for char in part) and len(part) <= 10:
                continue  # Skip postal codes
            if len(part) > 2:
                return part
        return parts[-1] if parts else "Inconnu"

    # Aggregate leads by zone
    leads = await db.leads.find({}, {"_id": 0, "address": 1, "status": 1, "converted": 1}).to_list(length=2000)
    interventions = await db.interventions.find({}, {"_id": 0, "address": 1, "status": 1, "price": 1, "client_id": 1}).to_list(length=2000)

    zones: dict = {}

    for lead in leads:
        zone = extract_zone(lead.get("address", ""))
        if zone not in zones:
            zones[zone] = {"zone": zone, "lead_count": 0, "intervention_count": 0, "revenue": 0.0, "converted": 0}
        zones[zone]["lead_count"] += 1
        if lead.get("converted") or lead.get("status") == "converted":
            zones[zone]["converted"] += 1

    for interv in interventions:
        address = interv.get("address", "")
        if not address and interv.get("client_id"):
            client_doc = await db.clients.find_one({"id": interv["client_id"]}, {"_id": 0, "address": 1})
            if client_doc:
                address = client_doc.get("address", "")
        zone = extract_zone(address)
        if zone not in zones:
            zones[zone] = {"zone": zone, "lead_count": 0, "intervention_count": 0, "revenue": 0.0, "converted": 0}
        zones[zone]["intervention_count"] += 1
        try:
            zones[zone]["revenue"] += float(interv.get("price") or 0)
        except (ValueError, TypeError):
            pass

    result = []
    for z in zones.values():
        z["conversion_rate"] = (
            round(z["converted"] / z["lead_count"] * 100, 1) if z["lead_count"] > 0 else 0.0
        )
        result.append(z)

    result.sort(key=lambda x: x["revenue"], reverse=True)
    return {"zones": result, "total_zones": len(result)}
