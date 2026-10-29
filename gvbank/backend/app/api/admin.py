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


# ── Users ────────────────────────────────────────────────────────────────
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


class CreateUserBody(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    username: str
    phone: Optional[str] = None
    password: str
    address: Optional[str] = ""
    initial_checking_balance: float = 0.0
    initial_savings_balance: float = 0.0
    joined_at: Optional[str] = None    # ISO date — backdate the signup
    pin: Optional[str] = None          # 4-digit transaction PIN (optional)


@router.post("/users", status_code=201)
async def create_user(body: CreateUserBody,
                      db: AsyncSession = Depends(get_db),
                      _=Depends(require_admin)):
    # Reject duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalars().first():
        raise HTTPException(400, "Email already registered")

    uname = (body.username or "").strip().lower()
    if len(uname) < 3 or len(uname) > 30:
        raise HTTPException(400, "Username must be 3–30 characters")
    if not re.match(r"^[a-z0-9._]+$", uname):
        raise HTTPException(400, "Username may only contain letters, numbers, dots and underscores")
    taken = await db.execute(select(User).where(User.username == uname))
    if taken.scalars().first():
        raise HTTPException(400, "Username already taken")

    # Basic validation
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if body.initial_checking_balance < 0 or body.initial_savings_balance < 0:
        raise HTTPException(400, "Initial balances must be non-negative")

    # Optional PIN — must be 4 digits if provided
    pin_hash = None
    if body.pin:
        pin_val = body.pin.strip()
        if not (pin_val.isdigit() and len(pin_val) == 4):
            raise HTTPException(400, "PIN must be exactly 4 digits")
        pin_hash = hash_password(pin_val)

    # Optional backdated signup
    created_at = None
    if body.joined_at:
        try:
            created_at = datetime.fromisoformat(body.joined_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(400, "joined_at must be an ISO date")
        if created_at > datetime.utcnow():
            raise HTTPException(400, "joined_at cannot be in the future")

    user_kwargs = dict(
        id=str(uuid.uuid4()),
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        email=body.email,
        username=uname,
        phone=body.phone,
        password_hash=hash_password(body.password),
        address=body.address or "",
        role=UserRole.CUSTOMER,
        is_verified=True,   # admin-created users skip email/phone verification
        is_active=True,
        transaction_pin_hash=pin_hash,
        # Admin creating this account counts as identity verification, so the
        # customer can complete their FIRST login without OTP. After that first
        # successful login (any device), this flag flips off and normal
        # new-device OTP protection resumes.
        skip_first_otp=True,
    )
    if created_at is not None:
        user_kwargs["created_at"] = created_at
    user = User(**user_kwargs)
    db.add(user)
    await db.flush()

    # Always create a checking account; optional savings if initial balance > 0
    db.add(Account(
        id=str(uuid.uuid4()), user_id=user.id,
        account_type=AccountType.CHECKING,
        account_number=_acct_num(),
        balance=body.initial_checking_balance, apy=0.01,
    ))
    if body.initial_savings_balance > 0:
        db.add(Account(
            id=str(uuid.uuid4()), user_id=user.id,
            account_type=AccountType.SAVINGS,
            account_number=_acct_num(),
            balance=body.initial_savings_balance, apy=5.20,
        ))

    msg = "Customer created. First login is password"
    if pin_hash:
        msg += " + PIN (no OTP)."
    else:
        msg += " (no OTP required for their first sign-in)."
    return {
        "id": user.id,
        "name": f"{user.first_name} {user.last_name}",
        "email": user.email,
        "phone": user.phone,
        "has_pin": bool(pin_hash),
        "message": msg,
    }
