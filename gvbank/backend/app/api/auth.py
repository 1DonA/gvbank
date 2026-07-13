from datetime import datetime, timedelta
from typing import Optional, Literal
import uuid, random, string, secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, hash_password
from app.models.models import User, UserRole, Account, AccountType, TrustedDevice
from app.services.otp_service import dispatch_otp, verify_otp

router = APIRouter()

# ── Trusted-device helpers ────────────────────────────────────────────────
DEVICE_TRUST_DAYS = 90

async def _is_device_trusted(db: AsyncSession, user_id: str, device_token: Optional[str]) -> bool:
    """Return True if the caller's device_token matches a non-expired
    trusted-device record for this user."""
    if not device_token or len(device_token) < 20:
        return False
    now = datetime.utcnow()
    result = await db.execute(
        select(TrustedDevice).where(
            TrustedDevice.user_id == user_id,
            TrustedDevice.expires_at > now,
        )
    )
    for td in result.scalars().all():
        try:
            if verify_password(device_token, td.token_hash):
                td.last_used_at = now
                return True
        except Exception:
            continue
    return False


async def _issue_device_token(db: AsyncSession, user: User, ua: Optional[str]) -> str:
    """Mint a new opaque device token, store its hash, return the plaintext
    to send back to the client so future logins on this device can skip OTP."""
    token = secrets.token_urlsafe(32)
    td = TrustedDevice(
        user_id=user.id,
        token_hash=hash_password(token),
        device_label=(ua or "")[:200] or None,
        expires_at=datetime.utcnow() + timedelta(days=DEVICE_TRUST_DAYS),
    )
    db.add(td)
    return token


def _acct_num() -> str:
    return ''.join(random.choices(string.digits, k=12))


# ── Schemas ────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_token: Optional[str] = None


class PinVerifyRequest(BaseModel):
    email: EmailStr
    pin: str
    device_token: Optional[str] = None


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: str = "login"


class RegisterRequest(BaseModel):
    """US-bank-compliant new-customer payload. All KYC fields required by
    USA PATRIOT Act §326 (Customer Identification Program)."""

    # Identity
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    email: EmailStr
    phone: str
    date_of_birth: str            # ISO yyyy-mm-dd
    ssn_last4: str = Field(min_length=4, max_length=4)
    citizenship: Literal["us_citizen", "us_resident", "non_resident"] = "us_citizen"

    # Address
    street_1: str
    street_2: Optional[str] = None
    city: str
    state: str = Field(min_length=2, max_length=2)
    zip_code: str = Field(min_length=5, max_length=10)

    # Government ID
    gov_id_type: Literal["drivers_license", "state_id", "passport"] = "drivers_license"
    gov_id_last4: str = Field(min_length=4, max_length=4)
    gov_id_state: Optional[str] = Field(default=None, max_length=2)

    # Employment / income (BSA-AML)
    occupation: str
    employer: Optional[str] = None
    annual_income: Literal[
        "under_25k", "25k_50k", "50k_100k", "100k_200k", "200k_500k", "over_500k"
    ] = "25k_50k"
    source_of_funds: Literal[
        "employment", "business", "investments", "inheritance", "gift", "savings", "other"
    ] = "employment"

    # Account selection
    open_checking: bool = True
    open_savings: bool = False
    initial_deposit: float = 0.0

    # Security
    password: str = Field(min_length=8)
    security_question: str
    security_answer: str

    # Consents (USA PATRIOT Act, Electronic Disclosure, Terms)
    consent_patriot: bool
    consent_esign: bool
    consent_terms: bool

    @field_validator("ssn_last4", "gov_id_last4")
    @classmethod
    def _digits_only(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Must be 4 numeric digits")
        return v

    @field_validator("state", "gov_id_state")
    @classmethod
    def _upper_state(cls, v):
        return v.upper() if v else v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=8)


# ── Register ───────────────────────────────────────────────────────────────
@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Compliance: all three consents required
    if not (data.consent_patriot and data.consent_esign and data.consent_terms):
        raise HTTPException(400, "All three disclosures must be accepted to open an account")

    # Age check
    try:
        dob = datetime.strptime(data.date_of_birth, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Date of birth must be in YYYY-MM-DD format")
    age = (datetime.utcnow() - dob).days / 365.25
    if age < 18:
        raise HTTPException(400, "You must be at least 18 years old to open an account")
    if age > 120:
        raise HTTPException(400, "Invalid date of birth")

    # Email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalars().first():
        raise HTTPException(400, "An account with this email already exists. Try signing in or recover your password.")

    if not (data.open_checking or data.open_savings):
        raise HTTPException(400, "Please select at least one account type to open")

    if data.initial_deposit < 0:
        raise HTTPException(400, "Initial deposit cannot be negative")

    # Compose legacy single-line address for backwards compat
    address_line = ", ".join(filter(None, [
        data.street_1, data.street_2, data.city, data.state, data.zip_code,
    ]))

    user = User(
        id=str(uuid.uuid4()),
        first_name=data.first_name.strip(),
        middle_name=(data.middle_name or "").strip() or None,
        last_name=data.last_name.strip(),
        email=data.email,
        phone=data.phone.strip(),
        password_hash=hash_password(data.password),
        role=UserRole.CUSTOMER,
        is_verified=False,
        is_active=True,

        address=address_line,
        street_1=data.street_1.strip(),
        street_2=(data.street_2 or "").strip() or None,
        city=data.city.strip(),
        state=data.state,
        zip_code=data.zip_code.strip(),

        date_of_birth=dob,
        ssn_last4=data.ssn_last4,
        citizenship=data.citizenship,
        gov_id_type=data.gov_id_type,
        gov_id_last4=data.gov_id_last4,
        gov_id_state=data.gov_id_state,

        occupation=data.occupation.strip(),
        employer=(data.employer or "").strip() or None,
        annual_income=data.annual_income,
        source_of_funds=data.source_of_funds,

        security_question=data.security_question,
        security_answer_hash=hash_password(data.security_answer.lower().strip()),

        consented_at=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()

    # Open accounts per selection. Split initial deposit between them if both opened.
    accounts_to_open = []
    if data.open_checking: accounts_to_open.append((AccountType.CHECKING, 0.01))
    if data.open_savings:  accounts_to_open.append((AccountType.SAVINGS, 5.20))

    if data.initial_deposit > 0:
        # Put all of the deposit into the first selected account.
        per_account = [data.initial_deposit] + [0.0] * (len(accounts_to_open) - 1)
    else:
        per_account = [0.0] * len(accounts_to_open)

    for (atype, apy), opening in zip(accounts_to_open, per_account):
        db.add(Account(
            id=str(uuid.uuid4()), user_id=user.id,
            account_type=atype, account_number=_acct_num(),
            balance=opening, apy=apy,
        ))

    await db.flush()

    # Dispatch verification OTP
    await dispatch_otp(db, user, "register")

    return {
        "message": "Application received. Please verify your identity with the code sent to your email and phone.",
        "user_id": user.id,
        "email": user.email,
    }


# ── Login ──────────────────────────────────────────────────────────────────
@router.post("/login/initiate")
async def login_initiate(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been suspended. Please contact your account officer.")

    # Admins skip OTP, PIN, and device-recognition entirely.
    if user.role == UserRole.ADMIN:
        token = create_access_token({"sub": user.id, "role": user.role.value})
        return {
            "requires_otp": False, "requires_pin": False,
            "access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": f"{user.first_name} {user.last_name}",
                     "role": user.role.value, "email": user.email},
        }

    # Is this a recognized device? Recognized devices skip OTP but still need PIN.
    trusted = await _is_device_trusted(db, user.id, data.device_token)

    # If admin set a PIN, ask for it first. OTP (or not) will be decided after PIN.
    if user.transaction_pin_hash:
        return {
            "requires_pin": True,
            "requires_otp": False,
            "device_trusted": trusted,
            "user_id": user.id,
            "message": (
                "Please enter your 4-digit transaction PIN to continue."
                if trusted else
                "Please enter your 4-digit transaction PIN. We'll then send you a one-time code."
            ),
        }

    # No PIN set. Trusted device → issue token directly. Otherwise → send OTP.
    if trusted:
        await db.flush()  # persist last_used_at update from _is_device_trusted
        token = create_access_token({"sub": user.id, "role": user.role.value})
        return {
            "requires_otp": False, "requires_pin": False,
            "access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": f"{user.first_name} {user.last_name}",
                     "email": user.email, "role": user.role.value, "phone": user.phone},
        }

    await dispatch_otp(db, user, "login")
    local, _, domain = user.email.partition("@")
    masked_email = (local[:2] if len(local) >= 2 else local) + "***@" + domain
    masked_phone = ("***" + user.phone[-4:]) if user.phone else "N/A"
    return {
        "requires_otp": True, "requires_pin": False, "user_id": user.id,
        "message": f"New device detected. Verification code sent to {masked_email} and {masked_phone}",
    }


@router.post("/login/verify-pin")
async def login_verify_pin(data: PinVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Verify the 4-digit transaction PIN. If the device is trusted, we issue
    the JWT immediately; otherwise we dispatch an OTP and require /login/verify."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user or not user.transaction_pin_hash:
        raise HTTPException(400, "No PIN is set for this account")
    if not verify_password(data.pin.strip(), user.transaction_pin_hash):
        raise HTTPException(401, "Incorrect PIN")

    # Trusted device? PIN alone is enough — issue JWT now.
    if await _is_device_trusted(db, user.id, data.device_token):
        if not user.is_verified:
            user.is_verified = True
        await db.flush()
        token = create_access_token({"sub": user.id, "role": user.role.value})
        return {
            "requires_otp": False,
            "access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": f"{user.first_name} {user.last_name}",
                     "email": user.email, "role": user.role.value, "phone": user.phone},
        }

    # New device → dispatch OTP.
    await dispatch_otp(db, user, "login")
    local, _, domain = user.email.partition("@")
    masked_email = (local[:2] if len(local) >= 2 else local) + "***@" + domain
    masked_phone = ("***" + user.phone[-4:]) if user.phone else "N/A"
    return {
        "requires_otp": True,
        "message": f"PIN verified. Code sent to {masked_email} and {masked_phone}",
    }


@router.post("/login/verify")
async def login_verify(data: OTPVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    valid = await verify_otp(db, user.id, data.code, data.purpose or "login")
    if not valid:
        raise HTTPException(401, "Invalid or expired verification code")
    if not user.is_verified:
        user.is_verified = True

    # OTP passed on a new device → mint a device_token so next login skips OTP.
    ua = request.headers.get("user-agent", "") if request else ""
    device_token = await _issue_device_token(db, user, ua)

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {
        "access_token": token, "token_type": "bearer",
        "device_token": device_token,
        "user": {"id": user.id, "name": f"{user.first_name} {user.last_name}",
                 "email": user.email, "role": user.role.value, "phone": user.phone},
    }


# ── Forgot / reset password ───────────────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Send a password-reset OTP. Always returns 200 so we don't leak which
    emails are registered (security best practice)."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if user and user.is_active:
        await dispatch_otp(db, user, "reset")
    return {"message": "If that email is associated with an account, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "User not found")
    valid = await verify_otp(db, user.id, data.code, "reset")
    if not valid:
        raise HTTPException(401, "Invalid or expired reset code")
    user.password_hash = hash_password(data.new_password)
    return {"message": "Password reset successfully. You may now sign in with your new password."}
