from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.models.models import User
from app.services.otp_service import dispatch_otp

router = APIRouter()

class ResendRequest(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    purpose: str = "login"

@router.post("/resend")
async def resend_otp(data: ResendRequest, db: AsyncSession = Depends(get_db)):
    user = None
    if data.username:
        uname = data.username.strip().lower()
        result = await db.execute(select(User).where(User.username == uname))
        user = result.scalars().first()
    if not user and data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    await dispatch_otp(db, user, data.purpose)
    return {"message": "OTP resent to your registered email"}
