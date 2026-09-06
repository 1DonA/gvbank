"""Extra admin delete endpoints.

Kept as a separate router so they work even if admin.py is a stub
in some deploys. Safe to mount next to the main admin router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.models import (
    User, UserRole, Account, Transaction, OTPCode,
    SupportChat, SupportMessage, LoginSession, TrustedDevice,
)

router = APIRouter()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(User).options(selectinload(User.accounts)).where(User.id == user_id)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot delete an admin account")

    name = f"{user.first_name} {user.last_name}".strip()
    account_ids = [a.id for a in (user.accounts or [])]

    if account_ids:
        await db.execute(delete(Transaction).where(Transaction.account_id.in_(account_ids)))
        await db.execute(delete(Account).where(Account.id.in_(account_ids)))

    await db.execute(delete(OTPCode).where(OTPCode.user_id == user_id))
    await db.execute(delete(LoginSession).where(LoginSession.user_id == user_id))
    await db.execute(delete(TrustedDevice).where(TrustedDevice.user_id == user_id))

    chats = (await db.execute(select(SupportChat).where(SupportChat.customer_id == user_id))).scalars().all()
    chat_ids = [c.id for c in chats]
    if chat_ids:
        await db.execute(delete(SupportMessage).where(SupportMessage.chat_id.in_(chat_ids)))
        await db.execute(delete(SupportChat).where(SupportChat.id.in_(chat_ids)))

    await db.delete(user)
    await db.flush()
    return {
        "ok": True,
        "message": f"Customer {name} deleted",
        "deleted_accounts": len(account_ids),
    }


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalars().first()
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")

    acct_type = account.account_type.value if hasattr(account.account_type, "value") else str(account.account_type)
    number = account.account_number

    await db.execute(delete(Transaction).where(Transaction.account_id == account_id))
    await db.delete(account)
    await db.flush()
    return {
        "ok": True,
        "message": f"{acct_type.capitalize()} account {number} deleted",
    }
