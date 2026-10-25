from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sa_delete
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid, random, string
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
