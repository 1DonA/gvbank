from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sa_delete
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid, random, string, re
from app.core.database import get_db
from app.core.security import hash_password
from app.models.models import (
    User, Account, Transaction, TxStatus, AccountStatus, UserRole, AccountType, TxType,
    LoginSession, OTPCode, SupportChat, SupportMessage, TrustedDevice,
)
from app.api.deps import get_current_user, require_admin

router = APIRouter()


def _acct_num() -> str:
    return ''.join(random.choices(string.digits, k=12))


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(User).where(User.role == UserRole.CUSTOMER))
    users = result.scalars().all()
    out = []
    for u in users:
        acct_res = await db.execute(select(Account).where(Account.user_id == u.id))
        accts = acct_res.scalars().all()
        total = sum(a.balance for a in accts)
        out.append({
            "id": u.id, "name": f"{u.first_name} {u.last_name}",
            "email": u.email, "username": u.username, "phone": u.phone,
            "is_active": u.is_active, "is_verified": u.is_verified,
            "total_balance": total, "account_count": len(accts),
            "created_at": u.created_at.isoformat(),
        })
    return out
