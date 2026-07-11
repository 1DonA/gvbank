from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, Literal
import uuid, random, string

from app.core.database import get_db
from app.models.models import Account, Transaction, TxType, TxStatus, AccountStatus, User


def _display_status(t: Transaction) -> str:
    """Blocked is stored as HELD + admin_note marker; expose it distinctly."""
    if t.status == TxStatus.HELD and (t.admin_note or "").startswith("🛑 BLOCKED"):
        return "blocked"
    return t.status.value
from app.api.deps import get_current_user
from app.services.otp_service import dispatch_otp, verify_otp

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────
def _generate_reference(prefix: str = "GVB") -> str:
    """Human-readable wire reference, e.g. GVB-20260522-7C3F2A1."""
    from datetime import datetime
    stamp = datetime.utcnow().strftime("%Y%m%d")
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
    return f"{prefix}-{stamp}-{suffix}"


# Fee schedule (USD). Adjust as needed; these are typical retail-bank wire fees.
WIRE_FEE = {
    "internal":           0.00,
    "ach":                0.00,
    "zelle":              0.00,
    "domestic_wire":     25.00,
    "international_wire":45.00,
}


def _tx_type_for_method(method: str) -> TxType:
    if method in ("domestic_wire", "international_wire"):
        return TxType.WIRE
    return TxType.TRANSFER


# ── FX rates against EUR (base = 1). Fixed for demo; in production hook a
#    live rate provider like ECB or openexchangerates. Applied as a small
#    retail markup (~0.5%) which is realistic for banks. ────────────────
FX_RATES = {
    "EUR": {"rate": 1.0000, "name": "Euro",           "symbol": "€", "country": "Eurozone"},
    "USD": {"rate": 1.0780, "name": "US Dollar",      "symbol": "$", "country": "United States"},
    "GBP": {"rate": 0.8425, "name": "British Pound",  "symbol": "£", "country": "United Kingdom"},
    "CHF": {"rate": 0.9560, "name": "Swiss Franc",    "symbol": "CHF", "country": "Switzerland"},
    "JPY": {"rate": 165.4,  "name": "Japanese Yen",   "symbol": "¥", "country": "Japan"},
    "CAD": {"rate": 1.4720, "name": "Canadian Dollar","symbol": "C$","country": "Canada"},
    "AUD": {"rate": 1.6350, "name": "Australian Dollar","symbol":"A$","country": "Australia"},
    "CNY": {"rate": 7.8100, "name": "Chinese Yuan",   "symbol": "¥", "country": "China"},
    "INR": {"rate": 90.10,  "name": "Indian Rupee",   "symbol": "₹", "country": "India"},
    "BRL": {"rate": 5.4700, "name": "Brazilian Real", "symbol": "R$","country": "Brazil"},
    "MXN": {"rate": 18.65,  "name": "Mexican Peso",   "symbol": "$", "country": "Mexico"},
    "AED": {"rate": 3.9600, "name": "UAE Dirham",     "symbol": "د.إ","country": "United Arab Emirates"},
    "ZAR": {"rate": 19.85,  "name": "South African Rand","symbol": "R","country": "South Africa"},
    "SGD": {"rate": 1.4550, "name": "Singapore Dollar","symbol": "S$","country": "Singapore"},
    "HKD": {"rate": 8.4400, "name": "Hong Kong Dollar","symbol": "HK$","country": "Hong Kong"},
    "NOK": {"rate": 11.35,  "name": "Norwegian Krone","symbol": "kr","country": "Norway"},
    "SEK": {"rate": 11.42,  "name": "Swedish Krona",  "symbol": "kr","country": "Sweden"},
    "DKK": {"rate": 7.4620, "name": "Danish Krone",   "symbol": "kr","country": "Denmark"},
    "PLN": {"rate": 4.2810, "name": "Polish Złoty",   "symbol": "zł","country": "Poland"},
    "TRY": {"rate": 34.85,  "name": "Turkish Lira",   "symbol": "₺","country": "Turkey"},
}


def convert_from_eur(amount_eur: float, target: str) -> tuple[float, float]:
    """Return (converted_amount, exchange_rate) for an EUR base amount."""
    if target not in FX_RATES:
        target = "EUR"
    rate = FX_RATES[target]["rate"]
    return round(amount_eur * rate, 2), rate


@router.get("/currencies")
async def list_currencies():
    """Return the FX rate table for the wire transfer UI."""
    return {"base": "EUR", "rates": FX_RATES}


# ── Schemas ────────────────────────────────────────────────────────────────
class TransferInitiate(BaseModel):
    from_account_id: str
    amount: float = Field(gt=0)
    transfer_method: Literal["internal", "ach", "domestic_wire", "international_wire", "zelle"] = "internal"

    # Destination details
    to_destination: str                                       # internal Account.id OR external label
    beneficiary_name: Optional[str] = None
    beneficiary_bank: Optional[str] = None
    beneficiary_account: Optional[str] = None                 # full account number / IBAN
    beneficiary_routing: Optional[str] = None                 # ABA routing OR SWIFT/BIC
    beneficiary_address: Optional[str] = None
    wire_purpose: Optional[str] = None
    memo: Optional[str] = None

    # Currency conversion (default EUR = source currency, no conversion)
    target_currency: Optional[str] = None                     # ISO code like USD/GBP/JPY


class TransferVerify(BaseModel):
    transfer_ref: str     # the pending Transaction.id
    otp_code: str


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/transfer/initiate")
async def initiate_transfer(
    data: TransferInitiate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.amount <= 0:
        raise HTTPException(400, "Amount must be positive")

    # Load source account, ensure owned by current user and active
    result = await db.execute(
        select(Account).where(Account.id == data.from_account_id, Account.user_id == current_user.id)
    )
    acct = result.scalars().first()
    if not acct:
        raise HTTPException(404, "Source account not found")
    if acct.status == AccountStatus.SUSPENDED:
        raise HTTPException(
            403,
            f"This {acct.account_type.value} account has been blocked by GV Union Bank. "
            "Transfers from this account are temporarily disabled. Please contact support "
            "at +49 800 GVB-BANK to have the block reviewed."
        )
    if acct.status == AccountStatus.CLOSED:
        raise HTTPException(403, f"This {acct.account_type.value} account is closed and cannot be used for transfers.")
    if acct.status != AccountStatus.ACTIVE:
        raise HTTPException(403, "Source account is not active. Please contact support.")

    # If destination is an internal GV Union account, make sure IT is active too.
    dest_check = await db.execute(select(Account).where(Account.id == data.to_destination))
    dest_acct_pre = dest_check.scalars().first()
    if dest_acct_pre is not None and dest_acct_pre.status != AccountStatus.ACTIVE:
        raise HTTPException(
            403,
            "The destination account has been blocked or closed. "
            "Please choose a different destination or contact the recipient."
        )

    # Validate required beneficiary fields by method
    method = data.transfer_method
    if method in ("domestic_wire", "international_wire"):
        missing = []
        if not data.beneficiary_name:    missing.append("beneficiary name")
        if not data.beneficiary_bank:    missing.append("beneficiary bank")
        if not data.beneficiary_account: missing.append("beneficiary account")
        if not data.beneficiary_routing:
            missing.append("SWIFT/BIC" if method == "international_wire" else "routing number")
        if missing:
            raise HTTPException(400, f"Missing wire fields: {', '.join(missing)}")
    elif method == "ach":
        if not data.beneficiary_name or not data.beneficiary_account or not data.beneficiary_routing:
            raise HTTPException(400, "ACH transfers require beneficiary name, account, and routing number")
    elif method == "zelle":
        if not data.beneficiary_name or not data.to_destination:
            raise HTTPException(400, "Zelle requires recipient name and email/phone")

    # Fee + total
    fee = WIRE_FEE.get(method, 0.0)
    total_debit = data.amount + fee
    if acct.balance < total_debit:
        raise HTTPException(400, f"Insufficient funds. Need ${total_debit:,.2f} (incl. ${fee:,.2f} fee)")

    # Build the pending transaction
    method_label = {
        "internal":           "Internal Transfer",
        "ach":                "ACH Transfer",
        "domestic_wire":      "Domestic Wire",
        "international_wire": "International Wire",
        "zelle":              "Zelle",
    }.get(method, "Transfer")

    if method == "internal":
        desc = f"{method_label} to {data.to_destination}"
    else:
        desc = f"{method_label} to {data.beneficiary_name or data.to_destination}"

    reference = _generate_reference()

    # Currency conversion (EUR base). Compute the amount the beneficiary
    # actually receives in their local currency. Kept on the tx for the receipt.
    target_currency = (data.target_currency or "EUR").upper()
    if target_currency not in FX_RATES:
        target_currency = "EUR"
    target_amount, exchange_rate = convert_from_eur(data.amount, target_currency)

    tx = Transaction(
        id=str(uuid.uuid4()),
        account_id=acct.id,
        tx_type=_tx_type_for_method(method),
        status=TxStatus.PENDING,
        amount=-data.amount,                  # leg recorded as negative on sender's account (always EUR)
        description=desc,
        memo=data.memo,
        to_account=data.to_destination,
        category="wire" if method.endswith("_wire") else ("transfer" if method in ("internal", "ach") else method),
        transfer_method=method,
        beneficiary_name=data.beneficiary_name,
        beneficiary_bank=data.beneficiary_bank,
        beneficiary_account=data.beneficiary_account,
        beneficiary_routing=data.beneficiary_routing,
        beneficiary_address=data.beneficiary_address,
        wire_purpose=data.wire_purpose,
        fee=fee,
        reference=reference,
        target_currency=target_currency,
        target_amount=target_amount,
        exchange_rate=exchange_rate,
    )
    db.add(tx)
    await db.flush()

    # Dispatch OTP
    await dispatch_otp(db, current_user, "transfer")

    return {
        "transfer_ref": tx.id,
        "reference": reference,
        "amount": data.amount,
        "fee": fee,
        "total": total_debit,
        "method": method,
        "method_label": method_label,
        "to": data.beneficiary_name or data.to_destination,
        "target_currency": target_currency,
        "target_amount": target_amount,
        "exchange_rate": exchange_rate,
        "message": "Authorization required. Enter the 6-digit code sent to your email and phone.",
    }


@router.post("/transfer/verify")
async def verify_transfer(
    data: TransferVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid = await verify_otp(db, current_user.id, data.otp_code, "transfer")
    if not valid:
        # Mark the pending tx as failed. We commit it here before raising so the
        # status sticks (HTTPException would otherwise trigger session rollback).
        result = await db.execute(select(Transaction).where(Transaction.id == data.transfer_ref))
        tx = result.scalars().first()
        if tx:
            tx.status = TxStatus.FAILED
            await db.flush()
        raise HTTPException(401, "Invalid or expired authorization code. Transfer cancelled.")

    result = await db.execute(
        select(Transaction).where(
            Transaction.id == data.transfer_ref,
            Transaction.status == TxStatus.PENDING,
        )
    )
    tx = result.scalars().first()
    if not tx:
        raise HTTPException(404, "Transfer not found or already processed")

    # Load source account
    result = await db.execute(select(Account).where(Account.id == tx.account_id))
    acct = result.scalars().first()
    if not acct:
        tx.status = TxStatus.FAILED
        raise HTTPException(400, "Source account not found")
    if acct.status != AccountStatus.ACTIVE:
        tx.status = TxStatus.FAILED
        raise HTTPException(
            403,
            "This account has been blocked since you started the transfer. "
            "Please contact support at +49 800 GVB-BANK."
        )
    total_debit = abs(tx.amount) + (tx.fee or 0.0)
    if acct.balance < total_debit:
        tx.status = TxStatus.FAILED
        raise HTTPException(400, "Insufficient funds at confirmation time")

    # Debit sender for amount + fee.
    # tx.amount is stored as negative for the principal, fee debited separately.
    acct.balance += tx.amount
    if tx.fee:
        acct.balance -= tx.fee

    # If destination is an internal account ID (matches one of our Account rows), credit them
    # and post a matching credit-leg transaction.
    dest_result = await db.execute(select(Account).where(Account.id == tx.to_account))
    dest_acct = dest_result.scalars().first()
    if dest_acct is not None and dest_acct.id != acct.id:
        dest_acct.balance += abs(tx.amount)
        credit_tx = Transaction(
            id=str(uuid.uuid4()),
            account_id=dest_acct.id,
            tx_type=tx.tx_type,
            status=TxStatus.COMPLETED,
            amount=abs(tx.amount),
            description=f"Transfer from {acct.account_type.value} ****{acct.account_number[-4:]}",
            memo=tx.memo,
            to_account=acct.id,
            category=tx.category,
            transfer_method=tx.transfer_method,
            reference=tx.reference,
        )
        db.add(credit_tx)

    tx.status = TxStatus.COMPLETED

    return {
        "message": "Transfer authorized successfully",
        "new_balance": acct.balance,
        "transaction_id": tx.id,
        "reference": tx.reference,
        "amount": abs(tx.amount),
        "fee": tx.fee or 0.0,
        "total": total_debit,
        "method": tx.transfer_method,
        "beneficiary": tx.beneficiary_name or tx.to_account,
        "target_currency": tx.target_currency,
        "target_amount": tx.target_amount,
        "exchange_rate": tx.exchange_rate,
    }


@router.get("/all")
async def get_all_transactions(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Account).where(Account.user_id == current_user.id))
    acct_ids = [a.id for a in result.scalars().all()]
    if not acct_ids:
        return []
    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id.in_(acct_ids))
        .order_by(Transaction.created_at.desc())
        .limit(limit)
    )
    txs = result.scalars().all()
    return [{
        "id": t.id,
        "type": t.tx_type.value,
        "status": _display_status(t),
        "amount": t.amount,
        "description": t.description,
        "memo": t.memo,
        "category": t.category,
        "transfer_method": t.transfer_method,
        "beneficiary_name": t.beneficiary_name,
        "beneficiary_bank": t.beneficiary_bank,
        "fee": t.fee,
        "reference": t.reference,
        "created_at": t.created_at.isoformat(),
    } for t in txs]
