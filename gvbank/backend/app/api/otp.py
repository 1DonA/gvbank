from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.models.models import User
from app.services.otp_service import dispatch_otp

router = APIRouter()

class ResendRequest(BaseModel):
    email: EmailStr
    purpose: str = "login"

@router.post("/resend")
async def resend_otp(data: ResendRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    await dispatch_otp(db, user, data.purpose)
    return {"message": "OTP resent to your email and phone"}
