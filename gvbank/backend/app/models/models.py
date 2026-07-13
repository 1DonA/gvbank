import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

def gen_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"

class AccountType(str, enum.Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    INVESTMENT = "investment"

class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"

class TxStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    HELD = "held"
    FAILED = "failed"
    REJECTED = "rejected"

class TxType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"
    TRANSFER = "transfer"
    WIRE = "wire"

class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=gen_uuid)
    first_name    = Column(String(80), nullable=False)
    middle_name   = Column(String(80), nullable=True)
    last_name     = Column(String(80), nullable=False)
    email         = Column(String(200), unique=True, nullable=False, index=True)
    phone         = Column(String(30), nullable=True)
    password_hash = Column(String(200), nullable=False)
    role          = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    is_verified   = Column(Boolean, default=False)
    is_active     = Column(Boolean, default=True)

    # Address (split out for shipping & verification)
    address       = Column(String(300), nullable=True)   # legacy / one-line
    street_1      = Column(String(150), nullable=True)
    street_2      = Column(String(80),  nullable=True)
    city          = Column(String(80),  nullable=True)
    state         = Column(String(2),   nullable=True)   # US state code
    zip_code      = Column(String(10),  nullable=True)

    # KYC / Customer Identification Program (CIP) — required by USA PATRIOT Act §326
    date_of_birth  = Column(DateTime, nullable=True)
    ssn_last4      = Column(String(4),  nullable=True)
    citizenship    = Column(String(20), nullable=True)   # us_citizen | us_resident | non_resident
    gov_id_type    = Column(String(20), nullable=True)   # drivers_license | state_id | passport
    gov_id_last4   = Column(String(4),  nullable=True)
    gov_id_state   = Column(String(2),  nullable=True)

    # Source of funds & employment (BSA / AML)
    occupation     = Column(String(120), nullable=True)
    employer       = Column(String(150), nullable=True)
    annual_income  = Column(String(20),  nullable=True)  # bucket code
    source_of_funds = Column(String(40), nullable=True)

    # Recovery
    security_question = Column(String(200), nullable=True)
    security_answer_hash = Column(String(200), nullable=True)

    # 4-digit transaction PIN — required for login and transfers if set.
    # Admin can set/clear this per customer. Stored bcrypt-hashed.
    transaction_pin_hash = Column(String(200), nullable=True)

    # Consent / disclosures (PATRIOT Act, Truth in Savings, eSign)
    consented_at = Column(DateTime, nullable=True)

    # Profile picture — stored as a base64 data URL (no filesystem dependency)
    profile_picture = Column(Text, nullable=True)

    # UI preferences
    language = Column(String(5), default="en")

    created_at    = Column(DateTime, default=datetime.utcnow)
    accounts      = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    otps          = relationship("OTPCode", back_populates="user", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"
    id           = Column(String, primary_key=True, default=gen_uuid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    account_type = Column(Enum(AccountType), default=AccountType.CHECKING)
    account_number = Column(String(20), unique=True, nullable=False)
    balance      = Column(Float, default=0.0)
    status       = Column(Enum(AccountStatus), default=AccountStatus.ACTIVE)
    apy          = Column(Float, default=0.01)
    created_at   = Column(DateTime, default=datetime.utcnow)
    user         = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"
    id           = Column(String, primary_key=True, default=gen_uuid)
    account_id   = Column(String, ForeignKey("accounts.id"), nullable=False)
    tx_type      = Column(Enum(TxType), nullable=False)
    status       = Column(Enum(TxStatus), default=TxStatus.PENDING)
    amount       = Column(Float, nullable=False)
    description  = Column(String(300), nullable=False)
    memo         = Column(String(200), nullable=True)
    to_account   = Column(String(100), nullable=True)
    category     = Column(String(60), nullable=True)
    admin_note   = Column(String(300), nullable=True)

    # Wire-transfer / beneficiary fields (used when tx_type is WIRE / TRANSFER)
    transfer_method      = Column(String(30),  nullable=True)   # internal | ach | domestic_wire | international_wire | zelle
    beneficiary_name     = Column(String(200), nullable=True)
    beneficiary_bank     = Column(String(200), nullable=True)
    beneficiary_account  = Column(String(100), nullable=True)   # full account number or IBAN
    beneficiary_routing  = Column(String(40),  nullable=True)   # ABA routing OR SWIFT/BIC
    beneficiary_address  = Column(String(400), nullable=True)
    wire_purpose         = Column(String(200), nullable=True)
    fee                  = Column(Float, default=0.0)
    reference            = Column(String(40),  nullable=True, unique=False, index=True)  # human-readable ref

    # ── Currency conversion (for international wires) ────────────────────
    target_currency      = Column(String(3),   nullable=True)   # ISO 4217 (USD, GBP, JPY…)
    target_amount        = Column(Float,       nullable=True)   # amount in target currency
    exchange_rate        = Column(Float,       nullable=True)   # 1 EUR = X target

    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    account      = relationship("Account", back_populates="transactions")

class OTPCode(Base):
    __tablename__ = "otp_codes"
    id         = Column(String, primary_key=True, default=gen_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    code       = Column(String(70), nullable=False)   # HMAC-SHA256 hex = 64 chars
    purpose    = Column(String(40), nullable=False)
    is_used    = Column(Boolean, default=False)
    attempts   = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user       = relationship("User", back_populates="otps")


class SupportChat(Base):
    """Persistent support-chat thread. One per customer (auto-created on first message)."""
    __tablename__ = "support_chats"
    id           = Column(String, primary_key=True, default=gen_uuid)
    customer_id  = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    status       = Column(String(20), default="open")     # open | resolved
    subject      = Column(String(200), nullable=True)
    unread_by_customer = Column(Integer, default=0)
    unread_by_admin    = Column(Integer, default=0)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages     = relationship("SupportMessage", back_populates="chat",
                                 cascade="all, delete-orphan",
                                 order_by="SupportMessage.created_at")


class SupportMessage(Base):
    __tablename__ = "support_messages"
    id          = Column(String, primary_key=True, default=gen_uuid)
    chat_id     = Column(String, ForeignKey("support_chats.id"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)   # customer | admin | system
    sender_id   = Column(String, nullable=True)         # user.id of sender (nullable for system)
    sender_name = Column(String(120), nullable=True)    # denormalized for display
    text        = Column(Text, nullable=False)
    is_deleted  = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)
    chat        = relationship("SupportChat", back_populates="messages")


class SystemSetting(Base):
    """Simple key/value store for global admin-configurable settings."""
    __tablename__ = "system_settings"
    key         = Column(String(60), primary_key=True)
    value       = Column(Text, nullable=True)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoginSession(Base):
    """Login activity shown on the customer's Profile page. Admin-editable.
    In production these would be auto-inserted by the auth flow; here they're
    fully admin-controlled so the demo can look real."""
    __tablename__ = "login_sessions"
    id          = Column(String, primary_key=True, default=gen_uuid)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    device      = Column(String(120), nullable=True)   # e.g. "Windows · Chrome"
    location    = Column(String(120), nullable=True)   # e.g. "Frankfurt, Germany"
    ip          = Column(String(45),  nullable=True)   # masked or full
    is_current  = Column(Boolean, default=False)
    logged_at   = Column(DateTime, default=datetime.utcnow, index=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
