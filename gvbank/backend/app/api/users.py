from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.models import User, LoginSession
from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password

router = APIRouter()


class UpdateProfile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "address": current_user.address,
        "role": current_user.role.value,
        "is_verified": current_user.is_verified,
        "profile_picture": current_user.profile_picture,
        "language": current_user.language or "en",
        "member_since": current_user.created_at.isoformat(),
    }


class AvatarBody(BaseModel):
    data_url: str   # "data:image/png;base64,…"


@router.post("/me/avatar")
async def upload_avatar(
    body: AvatarBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.data_url.startswith("data:image/"):
        raise HTTPException(400, "Must be a base64 data URL of an image")
    # Cap payload size at ~750 KB to keep DB rows reasonable.
    if len(body.data_url) > 1_000_000:
        raise HTTPException(400, "Image too large. Please upload a smaller picture (under 750 KB).")
    current_user.profile_picture = body.data_url
    await db.flush()
    return {"message": "Profile picture updated"}


@router.delete("/me/avatar")
async def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.profile_picture = None
    await db.flush()
    return {"message": "Profile picture removed"}


class LanguageBody(BaseModel):
    language: str


@router.post("/me/language")
async def set_language(
    body: LanguageBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.language not in ("en", "es", "fr", "zh"):
        raise HTTPException(400, "Unsupported language")
    current_user.language = body.language
    await db.flush()
    return {"message": "Language updated", "language": body.language}


@router.patch("/me")
async def update_profile(
    body: UpdateProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.first_name is not None: current_user.first_name = body.first_name.strip()
    if body.last_name  is not None: current_user.last_name  = body.last_name.strip()
    if body.phone      is not None: current_user.phone      = body.phone.strip() or None
    if body.address    is not None: current_user.address    = body.address.strip()
    await db.flush()
    return {"message": "Profile updated"}


@router.post("/me/password")
async def change_password(
    body: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    current_user.password_hash = hash_password(body.new_password)
    await db.flush()
    return {"message": "Password changed"}


# ── Login sessions (read-only for customer) ───────────────────────────────
@router.get("/me/sessions")
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the customer's login-activity history. Admin manages the actual
    entries — customer sees them read-only on their Profile page."""
    result = await db.execute(
        select(LoginSession)
        .where(LoginSession.user_id == current_user.id)
        .order_by(LoginSession.logged_at.desc())
    )
    sessions = result.scalars().all()
    return [{
        "id": s.id,
        "device": s.device,
        "location": s.location,
        "ip": s.ip,
        "is_current": s.is_current,
        "logged_at": s.logged_at.isoformat() if s.logged_at else None,
    } for s in sessions]
