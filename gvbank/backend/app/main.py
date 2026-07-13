import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, users, accounts, transactions, admin, otp, support
from app.core.database import engine, Base

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables if they don't exist yet.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Auto-seed the admin + demo customers on the FIRST startup only.
    #    This is a no-op after the first successful run — checks for existing
    #    users and skips if the DB already has data. Lets you deploy on a plan
    #    that has no shell access and still get an initial admin login.
    try:
        from seed import seed_if_empty
        await seed_if_empty()
    except Exception as e:
        logger.error("Auto-seed on startup failed (non-fatal): %s", e)

    yield
    # (No teardown required.)


app = FastAPI(title="GV Union Bank API", version="1.0.0", lifespan=lifespan)

# CORS: this API uses Bearer tokens (not cookies), so allow_credentials must be False
# when allow_origins is the wildcard. Browsers reject "*" + credentials=True.
# For production, replace the wildcard with the exact frontend origin(s) and set credentials=True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    # placeholder — you'll fill this in Phase 6 with your real Render URL
    "https://gvbank-web.onrender.com",
],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(otp.router,          prefix="/api/otp",          tags=["OTP"])
app.include_router(users.router,        prefix="/api/users",        tags=["Users"])
app.include_router(accounts.router,     prefix="/api/accounts",     tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(admin.router,        prefix="/api/admin",        tags=["Admin"])
app.include_router(support.router,      prefix="/api",              tags=["Support"])


@app.get("/health")
async def health():
    return {"status": "ok", "bank": "GV Union Bank"}
