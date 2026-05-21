from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import authenticate
from db import get_conn

router = APIRouter(prefix="/usage", tags=["usage"])


class UsageEvent(BaseModel):
    filename: str
    rent_roll_type: str
    pages: int = 0
    rows_extracted: int = 0
    columns_count: int = 0
    tenants: int = 0
    warnings_count: int = 0
    file_size_bytes: int = 0
    processing_ms: int = 0
    uploaded_at: datetime | None = None
    finished_at: datetime | None = None


class DownloadEvent(BaseModel):
    usage_id: int | None = None  # if known, bump that row; else insert a fresh download-only row
    filename: str | None = None
    rent_roll_type: str | None = None


@router.post("")
def log_usage(event: UsageEvent, user=Depends(authenticate)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO rent_roll_wizard_usage
              (user_id, filename, rent_roll_type, pages, rows_extracted, columns_count,
               tenants, warnings_count, file_size_bytes, processing_ms,
               uploaded_at, finished_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user["userId"],
                event.filename[:512],
                event.rent_roll_type[:64],
                event.pages,
                event.rows_extracted,
                event.columns_count,
                event.tenants,
                event.warnings_count,
                event.file_size_bytes,
                event.processing_ms,
                event.uploaded_at,
                event.finished_at,
            ),
        )
        return {"ok": True, "id": cur.lastrowid}


@router.post("/download")
def log_download(event: DownloadEvent, user=Depends(authenticate)):
    with get_conn() as conn, conn.cursor() as cur:
        if event.usage_id is not None:
            cur.execute(
                "UPDATE rent_roll_wizard_usage SET downloads = downloads + 1 "
                "WHERE id = %s AND user_id = %s",
                (event.usage_id, user["userId"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usage row not found")
            return {"ok": True, "id": event.usage_id}
        # No usage_id — insert a fresh download-only row
        cur.execute(
            """
            INSERT INTO rent_roll_wizard_usage
              (user_id, filename, rent_roll_type, downloads)
            VALUES (%s, %s, %s, 1)
            """,
            (
                user["userId"],
                (event.filename or "")[:512],
                (event.rent_roll_type or "")[:64],
            ),
        )
        return {"ok": True, "id": cur.lastrowid}


@router.get("")
def list_usage(user=Depends(authenticate)):
    """Everyone signed in can see all usage — no role gate."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              ru.id, ru.user_id, ru.filename, ru.rent_roll_type,
              ru.pages, ru.rows_extracted, ru.columns_count, ru.tenants,
              ru.downloads, ru.warnings_count, ru.file_size_bytes, ru.processing_ms,
              ru.uploaded_at, ru.finished_at, ru.used_at,
              u.username,
              TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))) AS full_name,
              e.designation
            FROM rent_roll_wizard_usage ru
            JOIN users u ON u.id = ru.user_id
            LEFT JOIN employees e ON e.user_id = u.id
            ORDER BY ru.used_at DESC
            """
        )
        return cur.fetchall()
