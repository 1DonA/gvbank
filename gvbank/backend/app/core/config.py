from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./gvbank.db"

    # JWT
    SECRET_KEY: str = "gv-union-bank-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Email (SendGrid)
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@gvunionbank.com"
    FROM_NAME: str = "GV Union Bank"

    # SMS (Twilio)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # OTP
    OTP_EXPIRE_MINUTES: int = 10
    OTP_LENGTH: int = 6

    # Admin
    ADMIN_EMAIL: str = "admin@gvunionbank.com"
    ADMIN_PASSWORD: str = "Admin@GVBank2026!"

    # AI support agent (OpenAI-compatible API)
    # Works with OpenAI, Groq, Together.ai, Anthropic-via-proxy, Ollama, etc.
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
