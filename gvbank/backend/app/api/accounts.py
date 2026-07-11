from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.models import Account, Transaction, TxType, TxStatus, User


def _display_status(t: Transaction) -> str:
    """Blocked is stored as HELD + admin_note marker; expose it distinctly."""
    if t.status == TxStatus.HELD and (t.admin_note or "").startswith("🛑 BLOCKED"):
        return "blocked"
    return t.status.value
from app.api.deps import get_current_user
from app.services.otp_service import dispatch_otp, verify_otp
import uuid

router = APIRouter()

@router.get("/")
async def get_accounts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.user_id == current_user.id))
    accounts = result.scalars().all()
    return [{"id": a.id, "type": a.account_type.value, "number": "••••" + a.account_number[-4:],
             "balance": a.balance, "apy": a.apy, "status": a.status.value} for a in accounts]

@router.get("/{account_id}/transactions")
async def get_transactions(account_id: str, limit: int = 30,
                           current_user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    acct = result.scalars().first()
    if not acct:
        raise HTTPException(404, "Account not found")
    result = await db.execute(
        select(Transaction).where(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc()).limit(limit))
    txs = result.scalars().all()
    return [{"id": t.id, "type": t.tx_type.value, "status": _display_status(t),
             "amount": t.amount, "description": t.description, "memo": t.memo,
             "to_account": t.to_account, "category": t.category,
             "transfer_method": t.transfer_method,
             "beneficiary_name": t.beneficiary_name,
             "beneficiary_bank": t.beneficiary_bank,
             "fee": t.fee, "reference": t.reference,
             "created_at": t.created_at.isoformat()} for t in txs]
