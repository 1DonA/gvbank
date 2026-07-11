import hashlib
import hmac
import random
import string
import logging
from datetime import datetime, timedelta
from typing import Optional, Iterable

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import OTPCode, User
from app.core.config import settings

logger = logging.getLogger(__name__)


def _hash_code(code: str) -> str:
    """HMAC-SHA256 hash of an OTP code. We use the JWT SECRET_KEY as the key
    so codes are bound to this server's secret. Constant-time comparable."""
    key = settings.SECRET_KEY.encode("utf-8")
    return hmac.new(key, code.encode("utf-8"), hashlib.sha256).hexdigest()


def _verify_code(code: str, stored_hash: str) -> bool:
    return hmac.compare_digest(_hash_code(code), stored_hash)


# ── OTP creation & verification ────────────────────────────────────────────
def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


async def create_otp(db: AsyncSession, user_id: str, purpose: str) -> str:
    # Invalidate any outstanding OTPs for this user/purpose
    result = await db.execute(
        select(OTPCode).where(
            OTPCode.user_id == user_id,
            OTPCode.purpose == purpose,
            OTPCode.is_used == False,
        )
    )
    for otp in result.scalars().all():
        otp.is_used = True
    await db.flush()

    code = generate_otp(settings.OTP_LENGTH)
    # Store the hash, never the plaintext code, so DB compromise can't reveal codes.
    otp = OTPCode(
        user_id=user_id,
        code=_hash_code(code),
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp)
    await db.flush()
    return code  # Plaintext returned only to the caller for dispatch (email/SMS)


async def verify_otp(db: AsyncSession, user_id: str, code: str, purpose: str) -> bool:
    result = await db.execute(
        select(OTPCode).where(
            OTPCode.user_id == user_id,
            OTPCode.purpose == purpose,
            OTPCode.is_used == False,
        ).order_by(OTPCode.created_at.desc())
    )
    otp = result.scalars().first()
    if not otp:
        return False
    otp.attempts += 1
    if otp.attempts > 5:
        otp.is_used = True
        await db.flush()
        return False
    if otp.expires_at < datetime.utcnow():
        otp.is_used = True
        await db.flush()
        return False
    if not _verify_code(code, otp.code):
        await db.flush()
        return False
    otp.is_used = True
    await db.flush()
    return True


# ── Helpers: placeholder detection + console fallback ──────────────────────
# Markers that appear in .env.example placeholders. If any of these substrings
# show up in a key, we treat it as "not configured" and log the code to console
# instead of crashing on a fake API call.
_EMAIL_PLACEHOLDERS  = ("your-api-key", "your-key", "REPLACE", "SG.your")
_TWILIO_SID_PLACEHOLDERS   = ("ACxxx", "xxxxxxxx", "your-account-sid")
_TWILIO_TOKEN_PLACEHOLDERS = ("your-auth-token", "your-token", "REPLACE")
_TWILIO_PHONE_PLACEHOLDERS = ("+15551234567", "+15550000000")


def _is_real(value: Optional[str], placeholder_markers: Iterable[str]) -> bool:
    """A key is 'real' only if it's set AND doesn't contain any placeholder substring."""
    if not value or not value.strip():
        return False
    v = value.strip()
    return not any(m.lower() in v.lower() for m in placeholder_markers)


def _print_dev_otp(channel: str, target: str, code: str, reason: str = "") -> None:
    """Loud, copy-pasteable terminal banner so the dev can always grab the code."""
    banner = "=" * 60
    suffix = f"  ({reason})" if reason else ""
    logger.warning("\n%s\n  📨 [%s] OTP for %s%s\n         CODE:  %s\n%s",
                   banner, channel, target, suffix, code, banner)


# ── Email (SendGrid) ───────────────────────────────────────────────────────
async def send_otp_email(email: str, name: str, code: str, purpose: str) -> None:
    purpose_label = {
        "login": "Sign In",
        "transfer": "Transfer Authorisation",
        "register": "Account Verification",
    }.get(purpose, "Verification")

    # If SendGrid isn't configured (or still on placeholder), just log the code.
    if not _is_real(settings.SENDGRID_API_KEY, _EMAIL_PLACEHOLDERS):
        _print_dev_otp("EMAIL", email, code, "SendGrid not configured")
        return

    html = f"""
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8f7f4;padding:40px 20px">
      <div style="background:#0a1628;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center">
        <div style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c97a);border-radius:10px;width:48px;height:48px;line-height:48px;font-size:22px;font-weight:700;color:#0a1628;margin-bottom:12px">G</div>
        <div style="color:white;font-size:20px;font-weight:700;font-family:Georgia,serif">GV Union Bank</div>
        <div style="color:#c9a84c;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin-top:4px">Member FDIC</div>
      </div>
      <div style="background:white;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 8px 24px rgba(10,22,40,0.1)">
        <h2 style="color:#0a1628;font-family:Georgia,serif;font-size:22px;margin:0 0 8px">{purpose_label} Code</h2>
        <p style="color:#6b6560;font-size:15px;margin:0 0 24px">Hello {name}, here is your one-time passcode:</p>
        <div style="background:#0a1628;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px">
          <span style="color:#c9a84c;font-size:36px;font-weight:700;letter-spacing:0.3em;font-family:'Courier New',monospace">{code}</span>
        </div>
        <p style="color:#9a9589;font-size:13px;margin:0 0 8px">⏱ This code expires in <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.</p>
        <p style="color:#9a9589;font-size:13px;margin:0">🔒 If you did not request this, please contact us immediately at <a href="mailto:security@gvunionbank.com" style="color:#0a1628">security@gvunionbank.com</a></p>
        <div style="border-top:1px solid #e4e2dc;margin-top:28px;padding-top:20px">
          <p style="color:#9a9589;font-size:12px;text-align:center;margin:0">© 2026 GV Union Bank, N.A. • Member FDIC • Equal Housing Lender</p>
        </div>
      </div>
    </div>
    """
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=email,
            subject=f"GV Union Bank — Your {purpose_label} Code: {code}",
            html_content=html,
        )
        sg.send(message)
        logger.info(f"OTP email sent to {email}")
    except Exception as e:
        # Network down / bad key / domain not verified — log the code so the user
        # can still authorize the action during development.
        logger.error(f"❌ Failed to send email OTP: {e}")
        _print_dev_otp("EMAIL", email, code, f"send failed: {type(e).__name__}")


# ── SMS (Twilio) ───────────────────────────────────────────────────────────
async def send_otp_sms(phone: str, code: str, purpose: str) -> None:
    purpose_label = {
        "login": "sign in",
        "transfer": "transfer authorisation",
        "register": "verification",
    }.get(purpose, "verification")
    body = (
        f"GV Union Bank: Your {purpose_label} code is {code}. "
        f"Valid for {settings.OTP_EXPIRE_MINUTES} mins. Do not share this code."
    )

    sid_ok   = _is_real(settings.TWILIO_ACCOUNT_SID,   _TWILIO_SID_PLACEHOLDERS)
    token_ok = _is_real(settings.TWILIO_AUTH_TOKEN,    _TWILIO_TOKEN_PLACEHOLDERS)
    phone_ok = _is_real(settings.TWILIO_PHONE_NUMBER,  _TWILIO_PHONE_PLACEHOLDERS)

    if not (sid_ok and token_ok and phone_ok):
        missing = []
        if not sid_ok:   missing.append("ACCOUNT_SID")
        if not token_ok: missing.append("AUTH_TOKEN")
        if not phone_ok: missing.append("PHONE_NUMBER")
        _print_dev_otp("SMS", phone, code, f"Twilio not configured ({', '.join(missing)})")
        return

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(body=body, from_=settings.TWILIO_PHONE_NUMBER, to=phone)
        logger.info(f"OTP SMS sent to {phone}")
    except Exception as e:
        logger.error(f"❌ Failed to send SMS OTP: {e}")
        _print_dev_otp("SMS", phone, code, f"send failed: {type(e).__name__}")


# ── Orchestrator ───────────────────────────────────────────────────────────
async def dispatch_otp(db: AsyncSession, user: User, purpose: str) -> str:
    code = await create_otp(db, user.id, purpose)
    await send_otp_email(user.email, user.first_name, code, purpose)
    if user.phone:
        await send_otp_sms(user.phone, code, purpose)
    return code
