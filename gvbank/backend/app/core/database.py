from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

def _asyncpg_url(url: str) -> tuple[str, dict]:
    """Convert ?sslmode=... (libpq style) into asyncpg-compatible connect_args.
    asyncpg does not accept sslmode as a connect keyword.
    """
    if not url:
        return url, {}
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    connect_args: dict = {}
    sslmode = (qs.pop("sslmode", [None])[0] or "").lower()
    if sslmode in ("require", "verify-ca", "verify-full", "prefer", "true", "1"):
        connect_args["ssl"] = True
    elif sslmode in ("disable", "allow", "false", "0"):
        connect_args["ssl"] = False
    # Rebuild URL without sslmode so it is not passed as a connect kwarg
    new_query = urlencode({k: v[0] if len(v) == 1 else v for k, v in qs.items()}, doseq=True)
    clean = urlunparse(parsed._replace(query=new_query))
    return clean, connect_args

_db_url, _connect_args = _asyncpg_url(settings.DATABASE_URL)
engine = create_async_engine(_db_url, echo=False, connect_args=_connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
