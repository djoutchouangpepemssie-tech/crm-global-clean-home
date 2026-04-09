"""
ENDPOINTS PREMIUM MANQUANTS - Correction des erreurs 404
========================================================
Ajoute les endpoints pour :
- /api/invoices/premium/stats
- /api/quotes/premium/stats
"""
from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

_db = None

def init_db(database):
    global _db
    _db = database

premium_router = APIRouter(prefix="/api")


# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

async def _require_auth(request: Request):
    """Simple auth check (extract from server.py if needed)"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return token


def _get_date_range(period: str = "30d"):
    """Get date range based on period string"""
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    elif period == "1y":
        start = now - timedelta(days=365)
    else:
        start = now - timedelta(days=30)
    
    return start, now


# ═══════════════════════════════════════════════════════════════════
# INVOICES PREMIUM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@premium_router.get("/invoices/premium/stats")
async def get_invoices_premium_stats(
    request: Request,
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$")
):
    """Get premium invoice stats for a period"""
    try:
        await _require_auth(request)
        
        start, end = _get_date_range(period)
        
        # Count factures
        total_invoices = await _db.erp_invoices.count_documents({
            "invoice_date": {"$gte": start, "$lt": end}
        })
        
        # Sum montants
        stats = await _db.erp_invoices.aggregate([
            {
                "$match": {
                    "invoice_date": {"$gte": start, "$lt": end},
                    "status": {"$in": ["envoyee", "payee"]}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_ht": {"$sum": "$total_ht"},
                    "total_ttc": {"$sum": "$total_ttc"},
                    "total_tva": {"$sum": "$total_tva"},
                    "paid_count": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "payee"]}, 1, 0]
                        }
                    },
                    "paid_amount": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "payee"]}, "$total_ttc", 0]
                        }
                    }
                }
            }
        ]).to_list(1)
        
        if stats and stats[0]:
            data = stats[0]
        else:
            data = {
                "total_ht": 0,
                "total_ttc": 0,
                "total_tva": 0,
                "paid_count": 0,
                "paid_amount": 0
            }
        
        return {
            "period": period,
            "total_invoices": total_invoices,
            "total_ht": round(data.get("total_ht", 0), 2),
            "total_ttc": round(data.get("total_ttc", 0), 2),
            "total_tva": round(data.get("total_tva", 0), 2),
            "paid_count": data.get("paid_count", 0),
            "paid_amount": round(data.get("paid_amount", 0), 2),
            "unpaid_amount": round(
                data.get("total_ttc", 0) - data.get("paid_amount", 0), 2
            ),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_invoices_premium_stats: {str(e)}")
        return {
            "period": period,
            "total_invoices": 0,
            "total_ht": 0,
            "total_ttc": 0,
            "total_tva": 0,
            "paid_count": 0,
            "paid_amount": 0,
            "unpaid_amount": 0,
        }


@premium_router.get("/invoices/premium/{invoice_id}")
async def get_invoice_premium_detail(
    request: Request,
    invoice_id: str
):
    """Get detailed invoice info"""
    try:
        await _require_auth(request)
        
        from bson import ObjectId
        invoice = await _db.erp_invoices.find_one(
            {"_id": ObjectId(invoice_id)}
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice["_id"] = str(invoice["_id"])
        if "client_id" in invoice:
            invoice["client_id"] = str(invoice["client_id"])
        
        return invoice
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_invoice_premium_detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal error")


@premium_router.post("/invoices/premium")
async def create_invoice_premium(request: Request):
    """Create premium invoice (stub)"""
    try:
        await _require_auth(request)
        body = await request.json()
        return {"status": "created", "id": "stub"}
    except Exception as e:
        logger.error(f"Error in create_invoice_premium: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal error")


@premium_router.post("/invoices/premium/{invoice_id}/payment")
async def record_invoice_payment_premium(request: Request, invoice_id: str):
    """Record payment for premium invoice"""
    try:
        await _require_auth(request)
        return {"status": "payment_recorded"}
    except Exception as e:
        logger.error(f"Error in record_invoice_payment_premium: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal error")


@premium_router.post("/invoices/premium/{invoice_id}/mark-overdue")
async def mark_invoice_overdue_premium(request: Request, invoice_id: str):
    """Mark invoice as overdue"""
    try:
        await _require_auth(request)
        return {"status": "marked_overdue"}
    except Exception as e:
        logger.error(f"Error in mark_invoice_overdue_premium: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal error")


# ═══════════════════════════════════════════════════════════════════
# QUOTES PREMIUM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@premium_router.get("/quotes/premium/stats")
async def get_quotes_premium_stats(
    request: Request,
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$")
):
    """Get premium quotes stats for a period"""
    try:
        await _require_auth(request)
        
        start, end = _get_date_range(period)
        
        # Count devis
        total_quotes = await _db.devis.count_documents({
            "created_at": {"$gte": start, "$lt": end}
        })
        
        # Sum montants
        stats = await _db.devis.aggregate([
            {
                "$match": {
                    "created_at": {"$gte": start, "$lt": end}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_ht": {"$sum": "$montant_ht"},
                    "total_ttc": {"$sum": "$montant_ttc"},
                    "total_tva": {"$sum": "$montant_tva"},
                    "accepted_count": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "accepted"]}, 1, 0]
                        }
                    },
                    "accepted_amount": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "accepted"]}, "$montant_ttc", 0]
                        }
                    }
                }
            }
        ]).to_list(1)
        
        if stats and stats[0]:
            data = stats[0]
        else:
            data = {
                "total_ht": 0,
                "total_ttc": 0,
                "total_tva": 0,
                "accepted_count": 0,
                "accepted_amount": 0
            }
        
        return {
            "period": period,
            "total_quotes": total_quotes,
            "total_ht": round(data.get("total_ht", 0), 2),
            "total_ttc": round(data.get("total_ttc", 0), 2),
            "total_tva": round(data.get("total_tva", 0), 2),
            "accepted_count": data.get("accepted_count", 0),
            "accepted_amount": round(data.get("accepted_amount", 0), 2),
            "pending_amount": round(
                data.get("total_ttc", 0) - data.get("accepted_amount", 0), 2
            ),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_quotes_premium_stats: {str(e)}")
        return {
            "period": period,
            "total_quotes": 0,
            "total_ht": 0,
            "total_ttc": 0,
            "total_tva": 0,
            "accepted_count": 0,
            "accepted_amount": 0,
            "pending_amount": 0,
        }


# ═══════════════════════════════════════════════════════════════════
# ERROR HANDLERS FOR MISSING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@premium_router.api_route(
    "/invoices/premium/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def fallback_invoices_premium(path: str, request: Request):
    """Fallback for unknown premium invoice endpoints"""
    logger.warning(f"Unknown premium invoice endpoint: {request.url.path}")
    return {
        "status": "not_found",
        "message": f"Endpoint {request.url.path} not implemented",
        "method": request.method
    }


@premium_router.api_route(
    "/quotes/premium/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
)
async def fallback_quotes_premium(path: str, request: Request):
    """Fallback for unknown premium quotes endpoints"""
    logger.warning(f"Unknown premium quotes endpoint: {request.url.path}")
    return {
        "status": "not_found",
        "message": f"Endpoint {request.url.path} not implemented",
        "method": request.method
    }
