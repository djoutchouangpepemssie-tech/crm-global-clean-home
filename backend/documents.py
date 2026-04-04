"""
documents.py — Photos & Documents management
Phase 7: Upload/serve files as base64 in MongoDB + before/after intervention photos
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import uuid
import base64
import mimetypes
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = _client[os.environ['DB_NAME']]

documents_router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx"}


# ── MODELS ──

class BeforeAfterRequest(BaseModel):
    intervention_id: str
    type: str  # "before" | "after"
    photo_base64: str
    description: Optional[str] = None
    filename: Optional[str] = None


# ── HELPERS ──

def _detect_mime(filename: str, content: bytes) -> str:
    """Detect MIME type from filename and content magic bytes."""
    mime, _ = mimetypes.guess_type(filename)
    if mime:
        return mime
    # Magic bytes fallback
    if content[:3] == b'\xff\xd8\xff':
        return "image/jpeg"
    if content[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    if content[:4] == b'%PDF':
        return "application/pdf"
    if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        return "image/webp"
    return "application/octet-stream"


def _doc_url(doc_id: str) -> str:
    return f"/api/documents/{doc_id}"


# ── ENDPOINTS ──

@documents_router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
):
    """Upload a file (stored as base64 in MongoDB). Max 10MB."""
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"Fichier trop volumineux (max {MAX_FILE_SIZE // 1024 // 1024} MB).")

    filename = file.filename or "unnamed"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Extension non autorisée: {ext}. Autorisées: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    mime_type = _detect_mime(filename, content)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Type MIME non autorisé: {mime_type}.",
        )

    doc_id = str(uuid.uuid4())
    b64_content = base64.b64encode(content).decode("utf-8")

    doc = {
        "id": doc_id,
        "filename": filename,
        "mime_type": mime_type,
        "size": len(content),
        "content_base64": b64_content,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "description": description,
        "deleted": False,
        "created_at": datetime.now(timezone.utc),
    }

    await db.documents.insert_one(doc)

    return {
        "document_id": doc_id,
        "filename": filename,
        "mime_type": mime_type,
        "size": len(content),
        "url": _doc_url(doc_id),
    }


@documents_router.get("/before-after/{intervention_id}")
async def get_before_after_gallery(intervention_id: str):
    """Get before/after photos for an intervention."""
    cursor = db.documents.find(
        {
            "entity_type": "intervention",
            "entity_id": intervention_id,
            "photo_type": {"$in": ["before", "after"]},
            "deleted": False,
        },
        {"_id": 0, "content_base64": 0},
    ).sort("created_at", 1)

    docs = await cursor.to_list(length=100)

    before = [d for d in docs if d.get("photo_type") == "before"]
    after = [d for d in docs if d.get("photo_type") == "after"]

    # Add URLs
    for d in docs:
        d["url"] = _doc_url(d["id"])

    return {
        "intervention_id": intervention_id,
        "before": before,
        "after": after,
        "total": len(docs),
    }


@documents_router.post("/before-after")
async def upload_before_after(req: BeforeAfterRequest):
    """Upload before/after photo for an intervention (base64 input)."""
    if req.type not in ("before", "after"):
        raise HTTPException(status_code=400, detail="Type doit être 'before' ou 'after'.")

    # Decode base64
    try:
        # Strip data URL prefix if present
        b64 = req.photo_base64
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        content = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="photo_base64 invalide.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"Photo trop volumineuse (max {MAX_FILE_SIZE // 1024 // 1024} MB).")

    filename = req.filename or f"{req.type}_{req.intervention_id}.jpg"
    mime_type = _detect_mime(filename, content)

    doc_id = str(uuid.uuid4())

    doc = {
        "id": doc_id,
        "filename": filename,
        "mime_type": mime_type,
        "size": len(content),
        "content_base64": base64.b64encode(content).decode("utf-8"),
        "entity_type": "intervention",
        "entity_id": req.intervention_id,
        "photo_type": req.type,
        "description": req.description,
        "deleted": False,
        "created_at": datetime.now(timezone.utc),
    }

    await db.documents.insert_one(doc)

    return {
        "document_id": doc_id,
        "filename": filename,
        "mime_type": mime_type,
        "size": len(content),
        "url": _doc_url(doc_id),
        "intervention_id": req.intervention_id,
        "type": req.type,
    }


@documents_router.get("")
async def list_documents(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """List documents, optionally filtered by entity."""
    query: dict = {"deleted": False}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id

    cursor = db.documents.find(query, {"_id": 0, "content_base64": 0}).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    total = await db.documents.count_documents(query)

    for d in docs:
        d["url"] = _doc_url(d["id"])

    return {"documents": docs, "total": total, "limit": limit, "skip": skip}


@documents_router.get("/{doc_id}")
async def serve_document(doc_id: str):
    """Serve a document by ID."""
    doc = await db.documents.find_one({"id": doc_id, "deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    try:
        content = base64.b64decode(doc["content_base64"])
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur de lecture du fichier.")

    return Response(
        content=content,
        media_type=doc.get("mime_type", "application/octet-stream"),
        headers={"Content-Disposition": f'inline; filename="{doc.get("filename", "file")}"'},
    )


@documents_router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Soft-delete a document."""
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    if doc.get("deleted"):
        raise HTTPException(status_code=410, detail="Document déjà supprimé.")

    await db.documents.update_one(
        {"id": doc_id},
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc)}},
    )
    return {"success": True, "deleted_id": doc_id}
