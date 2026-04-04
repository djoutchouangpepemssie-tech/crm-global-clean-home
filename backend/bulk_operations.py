"""
Global Clean Home CRM - Bulk Operations, Advanced Filters, Saved Views & Global Search
Phase 8 Backend Module
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone
import os
import uuid
import logging
import csv
import io
import re

logger = logging.getLogger(__name__)

# MongoDB connection (same pattern as server.py)
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

bulk_router = APIRouter(prefix="/api")

# ── CONSTANTS ──
MAX_BULK_ITEMS = 500

VALID_STATUSES = ["nouveau", "contacté", "en_attente", "devis_envoyé", "gagné", "perdu"]

# Allowed state transitions (None = any source state allowed)
STATUS_TRANSITIONS: Dict[str, Optional[List[str]]] = {
    "nouveau":       None,           # can come from anywhere
    "contacté":      ["nouveau", "en_attente"],
    "en_attente":    ["nouveau", "contacté"],
    "devis_envoyé":  ["contacté", "en_attente"],
    "gagné":         ["devis_envoyé", "contacté"],
    "perdu":         None,           # can come from anywhere
}

ALLOWED_FILTER_FIELDS = {
    "status", "source", "service_type", "score", "tags",
    "created_at", "updated_at", "assigned_to", "surface",
    "name", "email", "phone", "address", "city", "notes",
}

ALLOWED_OPERATORS = {"eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "contains", "between", "regex"}

DEFAULT_EXPORT_FIELDS = ["name", "email", "phone", "status", "service_type", "created_at"]
ALLOWED_EXPORT_FIELDS = {
    "name", "email", "phone", "status", "service_type", "created_at",
    "source", "score", "address", "city", "notes", "assigned_to", "tags",
}


# ── PYDANTIC MODELS ──

class BulkLeadIds(BaseModel):
    lead_ids: List[str] = Field(..., min_length=1)

    def validate_count(self):
        if len(self.lead_ids) > MAX_BULK_ITEMS:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_ITEMS} items per bulk request")


class BulkUpdateStatusRequest(BulkLeadIds):
    new_status: str

    def model_post_init(self, __context):
        if self.new_status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs acceptées: {VALID_STATUSES}")


class BulkAssignRequest(BulkLeadIds):
    assigned_to: str = Field(..., min_length=1)


class BulkTagRequest(BulkLeadIds):
    add_tags: List[str] = Field(default_factory=list)
    remove_tags: List[str] = Field(default_factory=list)


class BulkExportRequest(BulkLeadIds):
    fields: List[str] = Field(default_factory=lambda: list(DEFAULT_EXPORT_FIELDS))


class BulkEmailRequest(BulkLeadIds):
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    template_id: Optional[str] = None


class FilterCondition(BaseModel):
    field: str
    op: str
    value: Any


class AdvancedFilterRequest(BaseModel):
    filters: List[FilterCondition] = Field(default_factory=list)
    sort_by: str = "created_at"
    sort_order: str = "desc"  # "asc" | "desc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


class SavedViewCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    entity_type: str = Field(default="leads")
    filters: List[Dict[str, Any]] = Field(default_factory=list)
    sort_by: str = "created_at"
    sort_order: str = "desc"
    is_default: bool = False


class SavedViewUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    filters: Optional[List[Dict[str, Any]]] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    is_default: Optional[bool] = None


# ── HELPERS ──

def _serialize(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-serializable dict."""
    if doc is None:
        return {}
    doc["id"] = str(doc.pop("_id", ""))
    return doc


def _build_mongo_condition(field: str, op: str, value: Any) -> Dict[str, Any]:
    """Translate a FilterCondition into a MongoDB query fragment."""
    if field not in ALLOWED_FILTER_FIELDS:
        raise HTTPException(status_code=400, detail=f"Champ filtrable inconnu: {field}")
    if op not in ALLOWED_OPERATORS:
        raise HTTPException(status_code=400, detail=f"Opérateur inconnu: {op}")

    # Date fields: convert ISO string to datetime for proper comparison
    if field in ("created_at", "updated_at") and isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            pass  # keep as string and let MongoDB handle it

    op_map = {
        "eq":  lambda f, v: {f: v},
        "ne":  lambda f, v: {f: {"$ne": v}},
        "gt":  lambda f, v: {f: {"$gt": v}},
        "gte": lambda f, v: {f: {"$gte": v}},
        "lt":  lambda f, v: {f: {"$lt": v}},
        "lte": lambda f, v: {f: {"$lte": v}},
        "in":  lambda f, v: {f: {"$in": v if isinstance(v, list) else [v]}},
        "nin": lambda f, v: {f: {"$nin": v if isinstance(v, list) else [v]}},
        "contains": lambda f, v: {f: {"$regex": re.escape(str(v)), "$options": "i"}},
        "between": lambda f, v: {f: {"$gte": v[0], "$lte": v[1]}} if isinstance(v, list) and len(v) == 2 else (_ for _ in ()).throw(HTTPException(status_code=400, detail=f"'between' requires [min, max] array for field {f}")),
        "regex": lambda f, v: {f: {"$regex": str(v), "$options": "i"}},
    }

    if op == "between":
        if not isinstance(value, list) or len(value) != 2:
            raise HTTPException(status_code=400, detail=f"'between' nécessite [min, max] pour le champ {field}")
        return {field: {"$gte": value[0], "$lte": value[1]}}

    return op_map[op](field, value)


def _build_mongo_query(filters: List[FilterCondition]) -> Dict[str, Any]:
    """Build full MongoDB $and query from list of FilterCondition."""
    if not filters:
        return {}
    conditions = [_build_mongo_condition(f.field, f.op, f.value) for f in filters]
    return {"$and": conditions} if len(conditions) > 1 else conditions[0]


# ── 8.1 BULK OPERATIONS ──

@bulk_router.post("/bulk/leads/update-status")
async def bulk_update_status(req: BulkUpdateStatusRequest):
    """Bulk status change with state transition validation."""
    req.validate_count()
    new_status = req.new_status

    updated = 0
    failed = []

    for lead_id in req.lead_ids:
        try:
            lead = await db.leads.find_one({"id": lead_id}, {"status": 1, "deleted_at": 1})
            if not lead:
                failed.append({"id": lead_id, "reason": "Lead introuvable"})
                continue
            if lead.get("deleted_at"):
                failed.append({"id": lead_id, "reason": "Lead supprimé"})
                continue

            current_status = lead.get("status", "nouveau")
            allowed_from = STATUS_TRANSITIONS.get(new_status)
            if allowed_from is not None and current_status not in allowed_from:
                failed.append({
                    "id": lead_id,
                    "reason": f"Transition invalide: {current_status} → {new_status}"
                })
                continue

            result = await db.leads.update_one(
                {"id": lead_id},
                {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            if result.modified_count:
                updated += 1
            else:
                failed.append({"id": lead_id, "reason": "Mise à jour échouée"})

        except Exception as e:
            logger.error(f"bulk_update_status error for {lead_id}: {e}")
            failed.append({"id": lead_id, "reason": "Erreur interne"})

    return {"updated": updated, "failed": failed}


@bulk_router.post("/bulk/leads/assign")
async def bulk_assign_leads(req: BulkAssignRequest):
    """Bulk assign leads to a user."""
    req.validate_count()

    # Verify the user exists
    user = await db.users.find_one({"id": req.assigned_to})
    if not user:
        raise HTTPException(status_code=404, detail=f"Utilisateur {req.assigned_to} introuvable")

    updated = 0
    failed = []

    for lead_id in req.lead_ids:
        try:
            result = await db.leads.update_one(
                {"id": lead_id, "deleted_at": {"$exists": False}},
                {"$set": {
                    "assigned_to": req.assigned_to,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            if result.matched_count == 0:
                failed.append({"id": lead_id, "reason": "Lead introuvable ou supprimé"})
            elif result.modified_count:
                updated += 1
            else:
                # Already assigned to same user — count as success
                updated += 1
        except Exception as e:
            logger.error(f"bulk_assign error for {lead_id}: {e}")
            failed.append({"id": lead_id, "reason": "Erreur interne"})

    return {"updated": updated, "failed": failed}


@bulk_router.post("/bulk/leads/tag")
async def bulk_tag_leads(req: BulkTagRequest):
    """Bulk add/remove tags on leads."""
    req.validate_count()
    if not req.add_tags and not req.remove_tags:
        raise HTTPException(status_code=400, detail="Aucune opération de tag spécifiée")

    updated = 0
    failed = []

    update_ops: Dict[str, Any] = {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    if req.add_tags:
        update_ops["$addToSet"] = {"tags": {"$each": req.add_tags}}
    if req.remove_tags:
        update_ops["$pull"] = {"tags": {"$in": req.remove_tags}}

    for lead_id in req.lead_ids:
        try:
            result = await db.leads.update_one(
                {"id": lead_id, "deleted_at": {"$exists": False}},
                update_ops
            )
            if result.matched_count == 0:
                failed.append({"id": lead_id, "reason": "Lead introuvable ou supprimé"})
            else:
                updated += 1
        except Exception as e:
            logger.error(f"bulk_tag error for {lead_id}: {e}")
            failed.append({"id": lead_id, "reason": "Erreur interne"})

    return {"updated": updated, "failed": failed}


@bulk_router.post("/bulk/leads/delete")
async def bulk_delete_leads(req: BulkLeadIds):
    """Bulk soft delete leads (sets deleted_at)."""
    req.validate_count()

    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    failed = []

    for lead_id in req.lead_ids:
        try:
            result = await db.leads.update_one(
                {"id": lead_id, "deleted_at": {"$exists": False}},
                {"$set": {"deleted_at": now, "updated_at": now}}
            )
            if result.matched_count == 0:
                failed.append({"id": lead_id, "reason": "Lead introuvable ou déjà supprimé"})
            else:
                updated += 1
        except Exception as e:
            logger.error(f"bulk_delete error for {lead_id}: {e}")
            failed.append({"id": lead_id, "reason": "Erreur interne"})

    return {"deleted": updated, "failed": failed}


@bulk_router.post("/bulk/leads/export")
async def bulk_export_leads(req: BulkExportRequest):
    """Export selected leads to CSV (downloadable)."""
    req.validate_count()

    # Validate requested fields
    invalid_fields = set(req.fields) - ALLOWED_EXPORT_FIELDS
    if invalid_fields:
        raise HTTPException(status_code=400, detail=f"Champs invalides: {invalid_fields}")

    fields = req.fields if req.fields else list(DEFAULT_EXPORT_FIELDS)

    leads = await db.leads.find(
        {"id": {"$in": req.lead_ids}},
        {f: 1 for f in fields} | {"id": 1}
    ).to_list(MAX_BULK_ITEMS)

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()

    for lead in leads:
        row = {}
        for field in fields:
            val = lead.get(field, "")
            if isinstance(val, list):
                val = ", ".join(str(v) for v in val)
            row[field] = val if val is not None else ""
        writer.writerow(row)

    output.seek(0)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"leads_export_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@bulk_router.post("/bulk/email")
async def bulk_send_email(req: BulkEmailRequest):
    """Send email to multiple leads."""
    req.validate_count()

    # Fetch leads
    leads = await db.leads.find(
        {"id": {"$in": req.lead_ids}, "deleted_at": {"$exists": False}},
        {"id": 1, "name": 1, "email": 1}
    ).to_list(MAX_BULK_ITEMS)

    sent = 0
    failed = []
    skipped = []

    lead_map = {lead["id"]: lead for lead in leads}

    # Import email service
    try:
        from email_service import send_custom_email
        has_email_service = True
    except (ImportError, AttributeError):
        has_email_service = False
        logger.warning("email_service.send_custom_email not available; logging emails only")

    for lead_id in req.lead_ids:
        lead = lead_map.get(lead_id)
        if not lead:
            failed.append({"id": lead_id, "reason": "Lead introuvable ou supprimé"})
            continue

        recipient_email = lead.get("email")
        if not recipient_email:
            skipped.append({"id": lead_id, "reason": "Pas d'email"})
            continue

        recipient_name = lead.get("name", "Client")

        try:
            if has_email_service:
                await send_custom_email(
                    to_email=recipient_email,
                    to_name=recipient_name,
                    subject=req.subject,
                    body=req.body,
                    template_id=req.template_id,
                )
            else:
                # Log the email for audit trail
                await db.email_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "lead_id": lead_id,
                    "to": recipient_email,
                    "subject": req.subject,
                    "body": req.body,
                    "template_id": req.template_id,
                    "status": "queued",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

            # Record communication in lead timeline
            await db.lead_communications.insert_one({
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "type": "email",
                "subject": req.subject,
                "body": req.body[:500],  # truncate for storage
                "template_id": req.template_id,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            })
            sent += 1

        except Exception as e:
            logger.error(f"bulk_email error for {lead_id}: {e}")
            failed.append({"id": lead_id, "reason": "Erreur d'envoi"})

    return {"sent": sent, "skipped": skipped, "failed": failed}


# ── 8.2 ADVANCED FILTERS ──

@bulk_router.post("/leads/advanced-filter")
async def advanced_filter_leads(req: AdvancedFilterRequest):
    """Complex dynamic filtering with pagination."""
    # Validate sort_order
    if req.sort_order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="sort_order doit être 'asc' ou 'desc'")

    # Always exclude soft-deleted leads
    base_query: Dict[str, Any] = {"deleted_at": {"$exists": False}}

    if req.filters:
        filter_query = _build_mongo_query(req.filters)
        if filter_query:
            if "$and" in filter_query:
                base_query = {"$and": [base_query] + filter_query["$and"]}
            else:
                base_query = {"$and": [base_query, filter_query]}

    sort_direction = 1 if req.sort_order == "asc" else -1
    skip = (req.page - 1) * req.page_size

    total = await db.leads.count_documents(base_query)
    cursor = db.leads.find(base_query).sort(req.sort_by, sort_direction).skip(skip).limit(req.page_size)
    leads = await cursor.to_list(req.page_size)

    results = []
    for lead in leads:
        lead["id"] = str(lead.pop("_id", lead.get("id", "")))
        results.append(lead)

    import math
    return {
        "results": results,
        "total": total,
        "page": req.page,
        "page_size": req.page_size,
        "total_pages": math.ceil(total / req.page_size) if req.page_size else 1,
    }


# ── 8.3 SAVED VIEWS ──

@bulk_router.post("/views")
async def create_saved_view(view: SavedViewCreate):
    """Save a filter configuration as a named view."""
    now = datetime.now(timezone.utc).isoformat()

    # If is_default, unset other defaults for this entity_type
    if view.is_default:
        await db.saved_views.update_many(
            {"entity_type": view.entity_type, "is_default": True},
            {"$set": {"is_default": False}}
        )

    doc = {
        "id": str(uuid.uuid4()),
        **view.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    await db.saved_views.insert_one(doc)
    doc.pop("_id", None)
    return doc


@bulk_router.get("/views")
async def list_saved_views(entity_type: Optional[str] = Query(None)):
    """List saved views, optionally filtered by entity_type."""
    query: Dict[str, Any] = {}
    if entity_type:
        query["entity_type"] = entity_type

    cursor = db.saved_views.find(query).sort("created_at", -1)
    views = await cursor.to_list(200)
    for v in views:
        v.pop("_id", None)
    return {"views": views, "total": len(views)}


@bulk_router.put("/views/{view_id}")
async def update_saved_view(view_id: str, update: SavedViewUpdate):
    """Update a saved view."""
    existing = await db.saved_views.find_one({"id": view_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Vue introuvable")

    changes = {k: v for k, v in update.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    changes["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Handle is_default promotion
    if changes.get("is_default"):
        entity_type = existing.get("entity_type", "leads")
        await db.saved_views.update_many(
            {"entity_type": entity_type, "is_default": True, "id": {"$ne": view_id}},
            {"$set": {"is_default": False}}
        )

    await db.saved_views.update_one({"id": view_id}, {"$set": changes})
    updated = await db.saved_views.find_one({"id": view_id})
    updated.pop("_id", None)
    return updated


@bulk_router.delete("/views/{view_id}")
async def delete_saved_view(view_id: str):
    """Delete a saved view."""
    result = await db.saved_views.delete_one({"id": view_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vue introuvable")
    return {"deleted": True, "id": view_id}


# ── 8.4 GLOBAL SEARCH ──

SEARCH_COLLECTIONS = {
    "leads": {
        "collection": "leads",
        "fields": ["name", "email", "phone", "address", "notes"],
        "projection": {"id": 1, "name": 1, "email": 1, "phone": 1, "status": 1, "score": 1},
    },
    "quotes": {
        "collection": "quotes",
        "fields": ["reference", "client_name", "notes"],
        "projection": {"id": 1, "reference": 1, "client_name": 1, "status": 1, "total": 1},
    },
    "invoices": {
        "collection": "invoices",
        "fields": ["reference", "client_name", "notes"],
        "projection": {"id": 1, "reference": 1, "client_name": 1, "status": 1, "total": 1},
    },
    "interventions": {
        "collection": "interventions",
        "fields": ["address", "notes", "client_name"],
        "projection": {"id": 1, "address": 1, "notes": 1, "status": 1, "scheduled_at": 1},
    },
    "contracts": {
        "collection": "contracts",
        "fields": ["client_name", "reference", "notes"],
        "projection": {"id": 1, "client_name": 1, "reference": 1, "status": 1},
    },
}

LIMIT_PER_TYPE = 10


async def _search_collection(
    collection_name: str,
    fields: List[str],
    projection: Dict[str, int],
    q: str,
) -> List[dict]:
    """Search a single collection using text index or regex fallback."""
    coll = db[collection_name]

    # Try MongoDB text search first
    try:
        cursor = coll.find(
            {"$text": {"$search": q}},
            {**projection, "score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(LIMIT_PER_TYPE)
        results = await cursor.to_list(LIMIT_PER_TYPE)
        if results:
            for r in results:
                r.pop("_id", None)
                r.pop("score", None)  # remove internal text score
            return results
    except Exception:
        pass  # Fall through to regex

    # Regex fallback
    pattern = {"$regex": re.escape(q), "$options": "i"}
    or_conditions = [{f: pattern} for f in fields]
    cursor = coll.find(
        {"$or": or_conditions},
        projection
    ).limit(LIMIT_PER_TYPE)
    results = await cursor.to_list(LIMIT_PER_TYPE)
    for r in results:
        r.pop("_id", None)
    return results


@bulk_router.get("/search/global")
async def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    types: Optional[str] = Query(None, description="Comma-separated types: leads,quotes,invoices,interventions,contracts"),
):
    """Search across all entity types and return grouped results."""
    q = q.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Paramètre 'q' requis")

    # Parse requested types
    if types:
        requested = [t.strip() for t in types.split(",") if t.strip()]
        invalid = set(requested) - set(SEARCH_COLLECTIONS.keys())
        if invalid:
            raise HTTPException(status_code=400, detail=f"Types inconnus: {invalid}. Valeurs acceptées: {list(SEARCH_COLLECTIONS.keys())}")
        search_types = requested
    else:
        search_types = list(SEARCH_COLLECTIONS.keys())

    results: Dict[str, List[dict]] = {}
    total_count = 0

    for entity_type in search_types:
        config = SEARCH_COLLECTIONS[entity_type]
        hits = await _search_collection(
            collection_name=config["collection"],
            fields=config["fields"],
            projection=config["projection"],
            q=q,
        )
        results[entity_type] = hits
        total_count += len(hits)

    return {
        "query": q,
        "results": results,
        "total_count": total_count,
    }
