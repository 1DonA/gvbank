from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid, random, string
from app.core.database import get_db
from app.core.security import hash_password
from app.models.models import (
    User, Account, Transaction, TxStatus, AccountStatus, UserRole, AccountType, TxType,
    LoginSession,
)
from app.api.deps import get_current_user, require_admin

router = APIRouter()


def _acct_num() -> str:
    return ''.join(random.choices(string.digits, k=12))


# ── Users ──────────────────────────────────────────────────────────────────
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
            "email": u.email, "phone": u.phone,
            "is_active": u.is_active, "is_verified": u.is_verified,
            "total_balance": total, "account_count": len(accts),
            "created_at": u.created_at.isoformat(),
        })
    return out


class CreateUserBody(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
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


@router.patch("/users/{user_id}/block")
async def block_user(user_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = not user.is_active
    action = "blocked" if not user.is_active else "unblocked"
    return {"message": f"User {action}", "is_active": user.is_active}


class UpdateUserBody(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    joined_at: Optional[str] = None    # ISO date/datetime — change member-since


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UpdateUserBody,
                      db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    if body.first_name: user.first_name = body.first_name.strip()
    if body.last_name:  user.last_name  = body.last_name.strip()
    if body.phone:      user.phone      = body.phone.strip()
    if body.address is not None:  user.address = body.address.strip() or None

    if body.joined_at:
        try:
            new_joined = datetime.fromisoformat(body.joined_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(400, "joined_at must be an ISO date (YYYY-MM-DD) or ISO datetime")
        if new_joined > datetime.utcnow():
            raise HTTPException(400, "joined_at cannot be in the future")
        # Sanity floor — bank was founded in 1950 (arbitrary lower bound).
        if new_joined.year < 1950:
            raise HTTPException(400, "joined_at is too far in the past")
        user.created_at = new_joined

    return {"message": "User updated"}


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str,
                          db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Full per-user view: profile + accounts + recent transactions."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")

    acct_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = acct_result.scalars().all()
    acct_ids = [a.id for a in accounts]

    txs = []
    if acct_ids:
        tx_result = await db.execute(
            select(Transaction)
            .where(Transaction.account_id.in_(acct_ids))
            .order_by(Transaction.created_at.desc())
            .limit(50)
        )
        txs = tx_result.scalars().all()

    return {
        "user": {
            "id": user.id,
            "first_name": user.first_name, "last_name": user.last_name,
            "email": user.email, "phone": user.phone, "address": user.address,
            "role": user.role.value, "is_verified": user.is_verified,
            "is_active": user.is_active,
            "profile_picture": user.profile_picture,
            "has_pin": bool(user.transaction_pin_hash),
            "created_at": user.created_at.isoformat(),
        },
        "accounts": [{
            "id": a.id, "type": a.account_type.value,
            "number": a.account_number,
            "masked_number": "••••" + a.account_number[-4:],
            "balance": a.balance, "apy": a.apy, "status": a.status.value,
            "created_at": a.created_at.isoformat(),
        } for a in accounts],
        "transactions": [{
            "id": t.id,
            "account_id": t.account_id,
            "type": t.tx_type.value, "status": t.status.value,
            "amount": t.amount, "description": t.description,
            "memo": t.memo, "category": t.category,
            "transfer_method": t.transfer_method,
            "beneficiary_name": t.beneficiary_name,
            "fee": t.fee, "reference": t.reference,
            "admin_note": t.admin_note,
            "created_at": t.created_at.isoformat(),
        } for t in txs],
        "totals": {
            "balance": sum(a.balance for a in accounts),
            "account_count": len(accounts),
            "transaction_count": len(txs),
        },
    }


class ResetPasswordBody(BaseModel):
    new_password: str


class SetPinBody(BaseModel):
    pin: str    # 4 digits


@router.post("/users/{user_id}/pin")
async def admin_set_pin(user_id: str, body: SetPinBody,
                        db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Set (or update) the customer's 4-digit transaction PIN.
    If set, the customer will be prompted for it on login and on transfers."""
    pin = (body.pin or "").strip()
    if not pin.isdigit() or len(pin) != 4:
        raise HTTPException(400, "PIN must be exactly 4 digits")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    user.transaction_pin_hash = hash_password(pin)
    await db.flush()
    return {"message": "Transaction PIN set"}


@router.delete("/users/{user_id}/pin")
async def admin_clear_pin(user_id: str,
                          db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Clear the transaction PIN — customer will no longer be prompted for it."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    user.transaction_pin_hash = None
    await db.flush()
    return {"message": "Transaction PIN cleared"}


@router.post("/users/{user_id}/password")
async def admin_reset_password(user_id: str, body: ResetPasswordBody,
                               db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Admin-forced password reset. No need to know the existing password."""
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    user.password_hash = hash_password(body.new_password)
    return {"message": f"Password reset for {user.email}"}


class AdminAvatarBody(BaseModel):
    data_url: str


@router.post("/users/{user_id}/avatar")
async def admin_set_avatar(user_id: str, body: AdminAvatarBody,
                           db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    if not body.data_url.startswith("data:image/"):
        raise HTTPException(400, "Must be a base64 data URL of an image")
    if len(body.data_url) > 1_000_000:
        raise HTTPException(400, "Image too large")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    user.profile_picture = body.data_url
    await db.flush()
    return {"message": "Profile picture updated"}


class OpenAccountBody(BaseModel):
    account_type: str = "checking"      # checking | savings | investment
    initial_balance: float = 0.0
    apy: Optional[float] = None


@router.post("/users/{user_id}/accounts", status_code=201)
async def open_additional_account(user_id: str, body: OpenAccountBody,
                                  db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Open a new checking/savings/investment account for an existing user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    if body.initial_balance < 0:
        raise HTTPException(400, "Initial balance must be non-negative")
    try:
        atype = AccountType(body.account_type.lower())
    except ValueError:
        raise HTTPException(400, "account_type must be checking, savings, or investment")

    default_apy = {AccountType.CHECKING: 0.01, AccountType.SAVINGS: 5.20, AccountType.INVESTMENT: 4.10}
    apy = body.apy if body.apy is not None else default_apy[atype]

    acct = Account(
        id=str(uuid.uuid4()),
        user_id=user.id,
        account_type=atype,
        account_number=_acct_num(),
        balance=body.initial_balance,
        apy=apy,
    )
    db.add(acct)
    await db.flush()

    # If there's an opening deposit, post it as a transaction for the audit trail.
    if body.initial_balance > 0:
        db.add(Transaction(
            id=str(uuid.uuid4()),
            account_id=acct.id,
            tx_type=TxType.CREDIT,
            status=TxStatus.COMPLETED,
            amount=body.initial_balance,
            description=f"Opening deposit — {atype.value.title()} account",
            category="opening_deposit",
            admin_note="Admin-opened account",
        ))

    return {
        "id": acct.id,
        "type": acct.account_type.value,
        "number": acct.account_number,
        "balance": acct.balance,
        "apy": acct.apy,
    }


# ── Accounts ────────────────────────────────────────────────────────────────
@router.get("/accounts")
async def list_accounts(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Account, User).join(User, Account.user_id == User.id))
    rows = result.all()
    return [{
        "id": a.id, "number": "••••" + a.account_number[-4:], "type": a.account_type.value,
        "balance": a.balance, "apy": a.apy, "status": a.status.value,
        "owner": f"{u.first_name} {u.last_name}", "owner_email": u.email,
    } for a, u in rows]


class AdjustBalance(BaseModel):
    amount: float
    note: str = ""


@router.patch("/accounts/{account_id}/balance")
async def adjust_balance(account_id: str, body: AdjustBalance,
                         db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Account).where(Account.id == account_id))
    acct = result.scalars().first()
    if not acct:
        raise HTTPException(404, "Account not found")
    acct.balance = body.amount
    return {"message": "Balance updated", "new_balance": acct.balance}


@router.patch("/accounts/{account_id}/suspend")
async def suspend_account(account_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Account).where(Account.id == account_id))
    acct = result.scalars().first()
    if not acct:
        raise HTTPException(404, "Account not found")
    acct.status = AccountStatus.SUSPENDED if acct.status == AccountStatus.ACTIVE else AccountStatus.ACTIVE
    return {"message": f"Account {acct.status.value}", "status": acct.status.value}


class PostingBody(BaseModel):
    action: str            # "credit" or "debit"
    amount: float          # always positive; sign is determined by action
    description: str
    memo: Optional[str] = None
    admin_note: Optional[str] = None
    posted_at: Optional[str] = None   # ISO date or datetime — backdate support
    status: Optional[str] = "completed"  # completed | pending | held


@router.post("/accounts/{account_id}/post", status_code=201)
async def post_manual_transaction(account_id: str, body: PostingBody,
                                  db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Admin posts a manual credit (deposit) or debit (withdrawal) to an account.
    Creates a real Transaction record so it shows up in the customer's history.
    Use cases: cash deposit at a branch, fee reversal, chargeback, error correction.
    Supports backdating via posted_at and creating non-completed (pending/held) entries."""
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if body.action not in ("credit", "debit"):
        raise HTTPException(400, "Action must be 'credit' or 'debit'")
    if not body.description.strip():
        raise HTTPException(400, "Description is required for audit trail")

    # Resolve status
    status_map = {
        "completed": TxStatus.COMPLETED,
        "pending":   TxStatus.PENDING,
        "held":      TxStatus.HELD,
    }
    status = status_map.get((body.status or "completed").lower())
    if not status:
        raise HTTPException(400, "Status must be completed, pending, or held")

    # Resolve backdate
    posted_at = datetime.utcnow()
    if body.posted_at:
        try:
            # Accept either ISO date "2026-06-21" or ISO datetime
            posted_at = datetime.fromisoformat(body.posted_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(400, "posted_at must be ISO 8601 (e.g. 2026-06-21 or 2026-06-21T14:30:00)")
        if posted_at > datetime.utcnow():
            raise HTTPException(400, "posted_at cannot be in the future")

    result = await db.execute(select(Account).where(Account.id == account_id))
    acct = result.scalars().first()
    if not acct:
        raise HTTPException(404, "Account not found")

    is_credit = body.action == "credit"
    signed_amount = body.amount if is_credit else -body.amount

    # Only move balance if the entry is COMPLETED. Pending/Held transactions don't move funds.
    if status == TxStatus.COMPLETED:
        if not is_credit and acct.balance < body.amount:
            raise HTTPException(400, f"Insufficient funds. Balance is ${acct.balance:,.2f}")
        acct.balance += signed_amount

    tx = Transaction(
        id=str(uuid.uuid4()),
        account_id=acct.id,
        tx_type=TxType.CREDIT if is_credit else TxType.DEBIT,
        status=status,
        amount=signed_amount,
        description=body.description.strip(),
        memo=body.memo,
        category="admin_credit" if is_credit else "admin_debit",
        admin_note=body.admin_note or "Posted by admin",
        created_at=posted_at,
        updated_at=posted_at,
    )
    db.add(tx)
    await db.flush()
    return {
        "message": f"{'Credit' if is_credit else 'Debit'} of ${body.amount:,.2f} posted",
        "transaction_id": tx.id,
        "new_balance": acct.balance,
        "posted_at": posted_at.isoformat(),
        "status": status.value,
    }


@router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str,
                             db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Hard-delete a transaction. If it was COMPLETED, the balance impact is
    reversed before deletion. Use sparingly — most real banks reverse rather
    than delete, but the action exists for cleanup of erroneous entries."""
    result = await db.execute(select(Transaction).where(Transaction.id == tx_id))
    tx = result.scalars().first()
    if not tx:
        raise HTTPException(404, "Transaction not found")

    if tx.status == TxStatus.COMPLETED:
        acct_res = await db.execute(select(Account).where(Account.id == tx.account_id))
        acct = acct_res.scalars().first()
        if acct:
            # Reverse the leg: if the tx was a debit (amount<0), give it back
            acct.balance -= tx.amount

    await db.delete(tx)
    await db.flush()
    return {"message": "Transaction deleted", "reversed_balance_impact": tx.status == TxStatus.COMPLETED}


# ── Transactions ─────────────────────────────────────────────────────────────
@router.get("/transactions")
async def list_transactions(status: Optional[str] = None, limit: int = 100,
                            db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    q = select(Transaction, Account, User).join(Account, Transaction.account_id == Account.id).join(User, Account.user_id == User.id)
    if status:
        q = q.where(Transaction.status == status)
    q = q.order_by(Transaction.created_at.desc()).limit(limit)
    result = await db.execute(q)
    rows = result.all()
    def _display_status(t: Transaction) -> str:
        # "blocked" is stored as HELD + admin_note marker; render it distinctly.
        if t.status == TxStatus.HELD and (t.admin_note or "").startswith("🛑 BLOCKED"):
            return "blocked"
        return t.status.value

    return [{
        "id": t.id, "user": f"{u.first_name} {u.last_name}", "user_email": u.email,
        "amount": t.amount, "description": t.description, "type": t.tx_type.value,
        "status": _display_status(t), "memo": t.memo, "to_account": t.to_account,
        "admin_note": t.admin_note, "created_at": t.created_at.isoformat(),
    } for t, a, u in rows]


class TxAction(BaseModel):
    """Comprehensive transaction moderation. Accepts any target status and
    optionally a backdated posting date."""
    action: str                          # complete | pending | held | blocked | rejected  (aliases: approve, hold, reject also accepted)
    posted_at: Optional[str] = None      # ISO date/datetime to backdate the transaction
    note: Optional[str] = None           # admin audit note


# Map convenience aliases + friendly names to actual TxStatus enum values.
# "block" is stored as HELD with a special admin-note marker so we don't need a
# schema change; it renders in the UI as a distinct "Blocked" state.
ACTION_TO_STATUS = {
    "complete":  TxStatus.COMPLETED,
    "approve":   TxStatus.COMPLETED,   # alias
    "completed": TxStatus.COMPLETED,   # alias
    "pending":   TxStatus.PENDING,
    "pend":      TxStatus.PENDING,     # alias
    "held":      TxStatus.HELD,
    "hold":      TxStatus.HELD,        # alias
    "blocked":   TxStatus.HELD,        # stored as HELD with note marker
    "block":     TxStatus.HELD,
    "rejected":  TxStatus.REJECTED,
    "reject":    TxStatus.REJECTED,    # alias
}


@router.patch("/transactions/{tx_id}")
async def moderate_transaction(tx_id: str, body: TxAction,
                               db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Move a transaction to any state and optionally backdate it. Balance
    implications are handled automatically:
      - Any -> COMPLETED: applies the tx.amount to the account balance
        (if it wasn't already COMPLETED).
      - COMPLETED -> anything else: reverses the balance impact.
      - Between non-COMPLETED states: no balance change (funds never moved).
    """
    action_key = (body.action or "").lower().strip()
    new_status = ACTION_TO_STATUS.get(action_key)
    if new_status is None:
        raise HTTPException(400, f"Invalid action '{body.action}'. Use one of: complete, pending, held, blocked, rejected.")

    result = await db.execute(select(Transaction, Account).join(Account).where(Transaction.id == tx_id))
    row = result.first()
    if not row:
        raise HTTPException(404, "Transaction not found")
    tx, acct = row

    prev_status = tx.status

    # ── Balance implications ────────────────────────────────────────────────
    # Determine whether we're crossing the COMPLETED boundary in either direction.
    was_completed = prev_status == TxStatus.COMPLETED
    will_be_completed = new_status == TxStatus.COMPLETED

    if will_be_completed and not was_completed:
        # Apply the leg. For debits amount is negative → subtracts; for credits it adds.
        acct.balance += tx.amount
    elif was_completed and not will_be_completed:
        # Undo the leg — money returns to the account.
        acct.balance -= tx.amount

    tx.status = new_status

    # ── Special-case: distinguish "blocked" from ordinary "held" via admin_note.
    if action_key in ("blocked", "block"):
        tx.admin_note = (body.note or "🛑 BLOCKED by admin").strip()
    elif body.note is not None:
        tx.admin_note = body.note.strip() or tx.admin_note

    # ── Backdate ────────────────────────────────────────────────────────────
    if body.posted_at:
        try:
            new_dt = datetime.fromisoformat(body.posted_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(400, "posted_at must be ISO 8601 (e.g. 2026-06-21 or 2026-06-21T14:30:00)")
        if new_dt > datetime.utcnow():
            raise HTTPException(400, "posted_at cannot be in the future")
        tx.created_at = new_dt
        tx.updated_at = new_dt

    await db.flush()

    return {
        "message": f"Transaction set to {new_status.value}",
        "status": new_status.value,
        "prev_status": prev_status.value if prev_status else None,
        "new_balance": acct.balance,
        "created_at": tx.created_at.isoformat(),
    }


# ── Login sessions (admin-editable per-customer login activity) ──────────
class SessionBody(BaseModel):
    device: Optional[str] = None
    location: Optional[str] = None
    ip: Optional[str] = None
    is_current: Optional[bool] = False
    logged_at: Optional[str] = None    # ISO date/datetime


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        raise HTTPException(400, "logged_at must be ISO 8601 (e.g. 2026-06-21 or 2026-06-21T14:30:00)")


@router.get("/users/{user_id}/sessions")
async def list_sessions(user_id: str,
                        db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(
        select(LoginSession)
        .where(LoginSession.user_id == user_id)
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


@router.post("/users/{user_id}/sessions", status_code=201)
async def create_session(user_id: str, body: SessionBody,
                         db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalars().first():
        raise HTTPException(404, "User not found")

    logged_at = _parse_dt(body.logged_at) or datetime.utcnow()

    # If this session is being marked current, unset any other current for this user.
    if body.is_current:
        others = await db.execute(select(LoginSession).where(
            LoginSession.user_id == user_id, LoginSession.is_current == True))
        for s in others.scalars().all():
            s.is_current = False

    session = LoginSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        device=(body.device or "").strip() or None,
        location=(body.location or "").strip() or None,
        ip=(body.ip or "").strip() or None,
        is_current=bool(body.is_current),
        logged_at=logged_at,
    )
    db.add(session)
    await db.flush()
    return {"id": session.id, "message": "Session created"}


@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, body: SessionBody,
                         db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(LoginSession).where(LoginSession.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")

    if body.device is not None:   session.device = body.device.strip() or None
    if body.location is not None: session.location = body.location.strip() or None
    if body.ip is not None:       session.ip = body.ip.strip() or None

    if body.is_current is not None:
        if body.is_current and not session.is_current:
            others = await db.execute(select(LoginSession).where(
                LoginSession.user_id == session.user_id,
                LoginSession.is_current == True,
                LoginSession.id != session.id))
            for s in others.scalars().all():
                s.is_current = False
        session.is_current = body.is_current

    if body.logged_at is not None:
        session.logged_at = _parse_dt(body.logged_at) or session.logged_at

    await db.flush()
    return {"message": "Session updated"}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str,
                         db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(LoginSession).where(LoginSession.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.flush()
    return {"message": "Session deleted"}


# ── Stats ───────────────────────────────────────────────────────────────────
@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    user_count  = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.CUSTOMER))).scalar()
    total_bal   = (await db.execute(select(func.sum(Account.balance)))).scalar() or 0
    pending_tx  = (await db.execute(
        select(func.count(Transaction.id)).where(Transaction.status.in_([TxStatus.PENDING, TxStatus.HELD]))
    )).scalar()
    total_tx    = (await db.execute(select(func.count(Transaction.id)))).scalar()
    return {
        "total_customers": user_count,
        "total_assets": round(total_bal, 2),
        "pending_reviews": pending_tx,
        "total_transactions": total_tx,
    }
