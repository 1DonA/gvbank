"""Seed (or reseed) the database with admin + demo customers.

Run as:  python seed.py
Or to wipe & reseed:  python seed.py --reset

The --reset flag deletes the SQLite file first so any schema changes get applied.
"""
import asyncio
import os
import sys
import uuid
import random
import string
from datetime import datetime, timedelta

from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import User, Account, AccountType, UserRole
from app.core.security import hash_password
from app.core.config import settings


def acct_num() -> str:
    return ''.join(random.choices(string.digits, k=12))


DEMO_USERS = [
    {"first_name": "John",      "last_name": "Doe",      "email": "john.doe@email.com",      "phone": "+15552345678", "balance":  24891.50, "savings":  18340.00},
    {"first_name": "Alexandra", "last_name": "Morgan",   "email": "alex.morgan@email.com",   "phone": "+15559871122", "balance":  67420.80, "savings":  92100.00},
    {"first_name": "Priya",     "last_name": "Patel",    "email": "priya.p@email.com",       "phone": "+15551005541", "balance": 112890.00, "savings": 204000.00},
    {"first_name": "Marcus",    "last_name": "Williams", "email": "m.williams@email.com",    "phone": "+15554418812", "balance":   3241.20, "savings":   8500.00},
]


def _maybe_reset_sqlite():
    """If user passed --reset (or the DB schema is out of date), wipe the SQLite file."""
    if "--reset" not in sys.argv:
        return
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").lstrip("/")
    if not db_path or "://" in db_path:
        print("(--reset only supported for SQLite DB)")
        return
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"🧹 Deleted existing database file: {db_path}")


async def seed():
    _maybe_reset_sqlite()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Admin ────────────────────────────────────────────────────────────
        admin = User(
            id=str(uuid.uuid4()),
            first_name="Admin", last_name="User",
            email=settings.ADMIN_EMAIL,
            phone="+15550000000",
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_verified=True, is_active=True,
            address="GV Union Bank HQ, Chicago, IL 60601",
            consented_at=datetime.utcnow(),
        )
        db.add(admin)

        # ── Demo customers ───────────────────────────────────────────────────
        for u in DEMO_USERS:
            user = User(
                id=str(uuid.uuid4()),
                first_name=u["first_name"], last_name=u["last_name"],
                email=u["email"], phone=u["phone"],
                password_hash=hash_password("password123"),
                role=UserRole.CUSTOMER,
                is_verified=True, is_active=True,
                # Address
                address="123 Main Street, Chicago, IL 60601",
                street_1="123 Main Street",
                city="Chicago", state="IL", zip_code="60601",
                # KYC stub data so demo accounts can use every flow
                date_of_birth=datetime.utcnow() - timedelta(days=365 * 35),
                ssn_last4="1234",
                citizenship="us_citizen",
                gov_id_type="drivers_license",
                gov_id_last4="5678",
                gov_id_state="IL",
                occupation="Software Engineer",
                annual_income="50k_100k",
                source_of_funds="employment",
                consented_at=datetime.utcnow(),
            )
            db.add(user)
            await db.flush()

            db.add(Account(
                id=str(uuid.uuid4()), user_id=user.id,
                account_type=AccountType.CHECKING, account_number=acct_num(),
                balance=u["balance"], apy=0.01,
            ))
            if u["savings"] > 0:
                db.add(Account(
                    id=str(uuid.uuid4()), user_id=user.id,
                    account_type=AccountType.SAVINGS, account_number=acct_num(),
                    balance=u["savings"], apy=5.20,
                ))

        await db.commit()

        print("\n✅ Database seeded successfully!\n")
        print(f"   Admin:       {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        print( "   Customers:   password is 'password123' for all")
        for u in DEMO_USERS:
            print(f"     • {u['email']}")


if __name__ == "__main__":
    asyncio.run(seed())
