"""Live-support chat between customers and admin(s).

Design: one persistent thread per customer, auto-created on first message.
Polling-based (customer polls /support/my-messages, admin polls /admin/support/*).
Simple, deploy-friendly, no websocket infrastructure required.
"""
from datetime import datetime
from typing import Optional
import logging
import random
import re
import traceback
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.models import SupportChat, SupportMessage, SystemSetting, User, UserRole
from app.api.deps import get_current_user, require_admin
from app.services.ai_service import generate_ai_reply, is_ai_configured


# ── Randomized agent identity pool ─────────────────────────────────────────
# Each auto-reply picks a name at random so it feels like different specialists
# are jumping in. Mix of European first names for authenticity.
AGENT_NAMES = [
    "Anna Weber",
    "Marcus Fischer",
    "Elena Rossi",
    "Julien Dubois",
    "Sofia García",
    "David Müller",
    "Priya Sharma",
    "Thomas Bergmann",
    "Léa Laurent",
    "Nikolai Weiss",
    "Isabella Romano",
    "Amir Khan",
    "Sophie Andersen",
    "Karim Haddad",
    "Emma Lindqvist",
]


def pick_agent_name() -> str:
    """Random name — used for bot auto-replies which are signed as 'GV Support' anyway
    (this stays for backward compatibility with anything else that might need it)."""
    return random.choice(AGENT_NAMES)


def agent_for_chat(chat_id: str) -> str:
    """Deterministic agent name for a given chat. The same chat_id always maps
    to the same specialist, so the customer builds rapport with 'their' agent
    instead of seeing a new name every reply."""
    if not chat_id:
        return AGENT_NAMES[0]
    # FNV-like accumulator over the chat_id characters, then mod into the pool.
    acc = 2166136261
    for c in chat_id:
        acc = (acc ^ ord(c)) * 16777619
        acc &= 0xFFFFFFFF
    return AGENT_NAMES[acc % len(AGENT_NAMES)]


# ── Settings helpers ─────────────────────────────────────────────────────
DEFAULT_SETTINGS = {
    "support_online": "true",
    "support_welcome_message": (
        "Hi {first_name}! Welcome to GV Union Bank support. "
        "A specialist will be with you shortly. In the meantime, how can we help?"
    ),
    "support_offline_message": (
        "Our team is currently offline. Business hours: Mon-Fri 08:00-18:00 CET. "
        "Leave a message and we'll respond within one business day."
    ),
}


async def get_setting(db: AsyncSession, key: str) -> str:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    row = result.scalars().first()
    if row and row.value is not None:
        return row.value
    return DEFAULT_SETTINGS.get(key, "")


async def set_setting(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    row = result.scalars().first()
    if row:
        row.value = value
    else:
        db.add(SystemSetting(key=key, value=value))
    await db.flush()

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────
class SendMessageBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    quick_action: Optional[str] = None   # optional preset key for auto-reply


class AdminReplyBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


# Preset topic replies. Every customer message runs through detect_topic() —
# whatever topic it matches, one of its variant replies is picked at random.
# If nothing matches, "generic" is used.
QUICK_ACTION_REPLIES: dict[str, list[str]] = {
    # ── Cards ────────────────────────────────────────────────────────────────
    "card_lost": [
        "I can help right away, {first_name}. Go to Cards in the app and tap "
        "Freeze — this blocks all new charges instantly. If the card has been "
        "used fraudulently, please call our 24/7 fraud line at {phone_display} "
        "(press 2 for fraud). A specialist will also join this chat to help "
        "order your replacement. Could you share the last 4 digits?",
        "Sorry to hear that. First, freeze the card immediately via Cards → "
        "Freeze in your app. That stops any new activity while we investigate. "
        "For fraudulent charges, please call {phone_display} — we can dispute "
        "unauthorized transactions and reissue a replacement within 3-5 "
        "business days. Was the card physical or virtual?",
    ],
    "card_declined": [
        "That's frustrating, {first_name}. A card can decline for a few reasons: "
        "the account might be low on funds, the merchant category might be "
        "blocked in your controls, or the card might not have international "
        "enabled. Check Cards → Quick Controls in the app. What was the merchant "
        "and roughly the amount?",
        "There are a handful of common causes: insufficient balance, exceeded "
        "daily spending limit, international transactions disabled, or the "
        "merchant marked as high-risk by our fraud engine. Would you like me "
        "to check the exact reason for a specific transaction?",
    ],
    "card_not_received": [
        "New cards typically arrive within 5-7 business days in Germany, "
        "7-10 days elsewhere in Europe. If it's been longer, we can cancel "
        "the shipment and reissue with expedited delivery (2 business days, "
        "€15). When was the card ordered?",
    ],
    "card_activation": [
        "You can activate any new card from Cards → tap the card → Activate. "
        "You'll be asked to enter the last 4 digits and set a 4-digit PIN. "
        "Once activated, the card works immediately for online, contactless, "
        "and ATM.",
    ],
    "card_limit": [
        "You can raise your daily card limit up to €10,000 from Cards → Quick "
        "Controls → daily limit slider. For higher limits, a specialist can "
        "review your account. What limit are you looking to set?",
    ],
    # ── Access / security ────────────────────────────────────────────────────
    "account_locked": [
        "Sorry about that, {first_name}. Try resetting your password via "
        "'Forgot password?' on the sign-in page — you'll get a 6-digit code by "
        "email and SMS. If that doesn't work, a specialist can verify your "
        "identity here and unlock the account.",
        "That usually happens after a few incorrect password attempts. The "
        "quickest fix is 'Forgot password?' on the login screen. If your email "
        "or phone changed, we'll need to verify your identity through the "
        "security questions you set at signup. Want me to walk you through it?",
    ],
    "password_change": [
        "You can change your password from Profile → Security → Change password. "
        "You'll need your current password. Passwords must be 8+ characters "
        "with mixed case and a number.",
    ],
    "otp_not_received": [
        "OTP codes usually arrive within 30 seconds by email and SMS. If it's "
        "not showing up: check spam, confirm the phone number in Profile is "
        "current, or tap 'Resend code'. Codes expire in 10 minutes. What's the "
        "last 4 of the phone number on your account?",
    ],
    "security_concerns": [
        "Thanks for flagging this, {first_name}. Safety is our top priority. "
        "GV Union Bank will never call, email or text asking for your password "
        "or OTP code — if someone did, please forward the message to "
        "{security_email} and we'll investigate immediately.",
    ],
    # ── Transfers / wires ────────────────────────────────────────────────────
    "transfer_help": [
        "Sure — please share the transfer reference (starts with GVB-) and I'll "
        "pull up the details. If it's a pending wire, we can cancel it before "
        "OTP authorization within 15 minutes.",
        "Happy to help with a transfer. Which type — Internal, ACH, Zelle, "
        "Domestic wire, or International wire? And do you have a reference "
        "number handy?",
    ],
    "wire_time": [
        "Domestic wires post the same business day if authorized before 16:00 "
        "CET. International SWIFT wires typically settle in 1-4 business days "
        "depending on correspondent banks. Do you have a reference to check?",
        "For domestic wires (Fedwire / SEPA): same business day if before "
        "16:00 CET, next business day otherwise. International wires: 1-4 "
        "business days. Want me to look up a specific transfer?",
    ],
    "wire_recall": [
        "A wire can only be recalled before OTP authorization — after that it's "
        "final and irrevocable. If you sent to the wrong beneficiary, we can "
        "send an indemnity request to the receiving bank but success isn't "
        "guaranteed. What's the reference number?",
    ],
    "swift_routing": [
        "Our SWIFT / BIC code is **GVUKDEFF** (Frankfurt HQ). For incoming "
        "wires: include your full account number in the reference. Domestic "
        "SEPA transfers use the IBAN shown on your Accounts page.",
    ],
    "direct_deposit": [
        "Setting up direct deposit is easy. Give your employer your account "
        "number and our routing code from Accounts → your Checking → 'Direct "
        "deposit form' (downloadable PDF). Deposits usually start within 1-2 "
        "pay cycles. Want me to email you the form?",
    ],
    "bill_pay": [
        "You can schedule bill payments from Transfer → ACH → save the payee. "
        "Recurring payments can be set weekly, biweekly, or monthly. Any "
        "specific bill you're setting up?",
    ],
    # ── Accounts ─────────────────────────────────────────────────────────────
    "open_account": [
        "You can open a checking or savings account online in about 5 minutes — "
        "tap 'Open Account' at the top of any page. You'll need a valid ID and "
        "an EU/UK address. Want a specialist to walk you through it?",
        "Great choice! Total Checking has a €300 welcome bonus with qualifying "
        "direct deposit, and High-Yield Savings pays 5.20% APY. Both are free "
        "to open with no minimum. Which are you interested in?",
    ],
    "close_account": [
        "I'm sorry to see you go. To close an account, please make sure the "
        "balance is €0 (or arrange a transfer of the remaining funds). Then a "
        "specialist here can close it — closure takes ~2 business days for the "
        "final statement. Would you like to proceed?",
    ],
    "joint_account": [
        "Joint accounts can be opened online with both applicants present, or "
        "an existing account can be converted with proper KYC on the second "
        "owner. Both parties need valid ID and to sign the joint agreement. "
        "Any specific setup you had in mind?",
    ],
    "business_account": [
        "For business banking, please head to 'Business' in the top nav — you "
        "can compare Complete / Performance / Platinum Checking tiers there. "
        "Opening requires your business registration documents and beneficial "
        "owner IDs. Happy to route you to a business banker.",
    ],
    "change_address": [
        "You can update your mailing address from Profile → Edit → Address. "
        "For KYC compliance, we may ask for proof of residence (a utility "
        "bill or bank statement dated within the last 90 days) if the change "
        "is to a new country.",
    ],
    "change_phone": [
        "Update your phone from Profile → Edit → Phone. The new number will "
        "receive OTP codes going forward. If you no longer have access to the "
        "old number, a specialist can verify your identity here first.",
    ],
    "change_email": [
        "Email changes need to be verified by a specialist so we can be sure "
        "the request is genuinely from you. A specialist will join this chat "
        "shortly to help.",
    ],
    # ── Balance / statements ────────────────────────────────────────────────
    "balance": [
        "You can see live balances on the Dashboard the moment you open the "
        "app. If a specific transaction looks off, I can help investigate. What "
        "date or amount are you looking at?",
    ],
    "statement_help": [
        "You can view or download statements any time from Statements → Export "
        "CSV. For a specific date range or an official signed PDF, a specialist "
        "will assist you here shortly.",
        "Statements are available for the last 7 years. From Statements you "
        "can filter by date/type/account and export to CSV. Need a stamped "
        "hard copy for a visa or mortgage application?",
    ],
    "tax_documents": [
        "Tax documents (interest reporting, 1099-INT equivalent) are available "
        "from Statements → Tax documents each January for the previous tax "
        "year. For non-resident depositors, W-8BEN forms can be uploaded from "
        "Profile → Compliance.",
    ],
    "transaction_missing": [
        "Sorry about that. A few things to check: was it a pending transaction "
        "(they can take 1-3 business days to post)? Have you searched by the "
        "merchant name in Statements? What was the amount and approximate date?",
    ],
    # ── Fees / rates / loans ────────────────────────────────────────────────
    "fees": [
        "Total Checking has no monthly fee with a €1,500 average balance or one "
        "qualifying direct deposit. If you were charged and think it's an "
        "error, I can review it. Which fee are you asking about?",
        "Our fee schedule is transparent — €12 monthly for Checking if the "
        "waiver conditions aren't met, €25 domestic wire, €45 international "
        "wire, €35 overdraft (first one per year waived automatically). "
        "Anything specific I can look into?",
    ],
    "overdraft": [
        "Your account has overdraft protection linked from savings by default. "
        "The first overdraft each year is fee-waived. Repeated overdrafts are "
        "€35 each. You can also enable strict decline mode from Profile → "
        "Preferences → Overdraft.",
    ],
    "rates": [
        "Our High-Yield Savings currently pays 5.20% APY on all balances with "
        "no minimum. CDs range from 4.75% (5-year) to 5.50% (12-month). Which "
        "product were you asking about?",
    ],
    "loan_help": [
        "We offer mortgages from 6.49% APR and auto loans from 5.99% APR. You "
        "can pre-qualify online in 5 minutes with no credit-score impact. What "
        "type of loan are you considering?",
    ],
    "credit_score": [
        "You can check your credit score for free from Dashboard → Credit "
        "Score (updated monthly by our credit-bureau partner). If your score "
        "isn't where you want it, we have a free financial coach available "
        "through Profile → Get help.",
    ],
    # ── International / currency ────────────────────────────────────────────
    "currency_conversion": [
        "You can hold and convert between EUR, USD, GBP, CHF and 15 other "
        "currencies from your Investing account. Live rates shown at "
        "conversion — no hidden markup. Which pair are you converting?",
    ],
    "travel_notice": [
        "Great question. GV Union cards work automatically worldwide — no need "
        "to set a travel notice. If you're going somewhere unusual, tap Cards → "
        "International transactions to make sure it's enabled. There's no "
        "foreign transaction fee on any of our cards.",
    ],
    "atm_help": [
        "You can withdraw at 55,000+ ATMs across Europe fee-free through our "
        "partner network. Outside that network, ATM operators may charge a fee "
        "(displayed on screen). We refund up to €10/month of foreign ATM fees "
        "on Premium accounts.",
    ],
    # ── Regulatory ───────────────────────────────────────────────────────────
    "deposit_protection": [
        "Your deposits are protected up to €100,000 per depositor by the German "
        "Deposit Protection Scheme (Einlagensicherung). Joint accounts get "
        "€100,000 per named owner, so €200,000 combined.",
    ],
    "kyc_documents": [
        "For KYC we need: a valid government ID (passport, national ID or "
        "driver's license), proof of address dated within 90 days (utility "
        "bill, bank statement, tax notice), and your tax residency (self-"
        "declared). Would you like to upload documents here?",
    ],
    "hours": [
        "Support is available Monday–Friday 08:00–18:00 CET, and Saturday "
        "09:00–14:00 CET. Outside those hours you can still message and we'll "
        "respond as soon as we're back. Fraud is 24/7 at {phone_display}.",
    ],
    # ── Meta ────────────────────────────────────────────────────────────────
    "talk_human": [
        "Connecting you to a real specialist now, {first_name}. Please stay on "
        "this chat — they'll join within a couple of minutes. If it's urgent, "
        "call us at {phone_display}.",
        "Understood. A human specialist has been paged and will join this chat "
        "shortly. What would you like them to help with, so they can be "
        "prepared?",
    ],
    "greeting": [
        "Hello {first_name}! Thanks for reaching out. How can I help you today?",
        "Hi {first_name}, good to hear from you. What can I help with?",
    ],
    "thanks": [
        "You're very welcome, {first_name}. Is there anything else I can help "
        "with?",
        "My pleasure, {first_name}. Let me know if anything else comes up.",
    ],
    "goodbye": [
        "Have a great day, {first_name}! We're here whenever you need us.",
        "Take care, {first_name}. Reach out any time.",
    ],
    "generic": [
        "Thanks for your message, {first_name}. A specialist has been notified "
        "and will respond here shortly. If it's urgent, feel free to call "
        "{phone_display}.",
        "Got it — thanks for sharing that, {first_name}. Let me route this to "
        "the right team. Anything else I should know so we can help faster?",
    ],
}


# Keyword patterns per topic. First match wins. Case-insensitive.
# More specific patterns first, generic patterns last.
TOPIC_PATTERNS = [
    # ── Card issues ──────────────────────────────────────────────────────────
    ("card_lost",         r"\b(lost|stolen|missing|misplaced)\b.*\b(card|debit|credit)\b|"
                          r"\b(card|debit|credit)\b.*\b(lost|stolen|missing|misplaced)\b|"
                          r"\bfraud(ulent)?\b|\bunauthori[sz]ed\b|\breport\b.*\bcard\b"),
    ("card_declined",     r"\b(declined?|refused|rejected|not working|isn't working|won'?t work|not accept)\b.*\bcard\b|"
                          r"\bcard\b.*\b(declined?|refused|rejected|not working|isn't working|won'?t work)\b"),
    ("card_not_received", r"\bcard\b.*\b(not arrived|hasn'?t arrived|hasn'?t come|didn'?t (get|receive)|where'?s|"
                          r"still waiting|when.*arrive)\b"),
    ("card_activation",   r"\b(activate|activation)\b.*\bcard\b|\bcard\b.*\b(activate|activation)\b"),
    ("card_limit",        r"\b(card )?limit\b.*(raise|increase|change|higher)|"
                          r"\b(raise|increase|change|higher)\b.*\b(card )?limit\b|"
                          r"\bspending limit\b|\bdaily limit\b"),
    # ── Access / security ───────────────────────────────────────────────────
    ("account_locked",    r"\b(locked out|lockout|account locked|can'?t (log|sign) in|"
                          r"unable to (log|sign) in|forgot (my )?password|reset (my )?password|unlock)\b"),
    ("password_change",   r"\b(change|update) (my )?password\b|\bnew password\b"),
    ("otp_not_received",  r"\b(otp|code|verification code|2fa|two.?factor)\b.*\b(not (receiv|arriv|come|get)|"
                          r"missing|didn'?t (get|receive)|where'?s)\b|"
                          r"\b(not (receiv|arriv|come|get))\b.*\b(otp|code|verification)\b"),
    ("security_concerns", r"\bscam(mer)?\b|\bphish|\bsuspicious (email|text|call|sms)\b|"
                          r"\b(hack|breach|compromis|leak)\b|\bsomeone (called|emailed|texted)\b"),
    # ── Transfers / wires ───────────────────────────────────────────────────
    ("wire_time",         r"\bwire\b.*\b(how long|when|arrive|take|settle|cut ?off)\b|"
                          r"\b(how long|when)\b.*\bwire\b"),
    ("wire_recall",       r"\b(recall|cancel|reverse|stop)\b.*\bwire\b|\bwire\b.*\b(recall|cancel|reverse|stop)\b|"
                          r"\bwrong (beneficiary|account)\b"),
    ("swift_routing",     r"\b(swift|bic|routing|sort code|iban)\b.*\b(number|code)\b|"
                          r"\b(what'?s|what is)\b.*\b(swift|bic|routing|iban)\b"),
    ("direct_deposit",    r"\bdirect deposit\b|\b(paycheck|salary|payroll)\b.*\b(setup|set up|arrange)\b|"
                          r"\bemployer\b.*\b(deposit|pay)\b"),
    ("bill_pay",          r"\bbill pay\b|\brecurring payment\b|\bautopay\b|\bschedule.*payment\b"),
    ("transfer_help",     r"\b(transfer|wire|send money|payment|zelle|ach|iban|swift|bic)\b"),
    # ── Accounts ────────────────────────────────────────────────────────────
    ("open_account",      r"\b(open|start|create|new).* (checking|savings|account)\b|"
                          r"\bnew customer\b|\bsign up\b|\bregister\b|\bapply for.*account\b"),
    ("close_account",     r"\b(close|cancel|terminate|delete)\b.*\b(account|my account)\b"),
    ("joint_account",     r"\bjoint account\b|\bshared account\b"),
    ("business_account",  r"\bbusiness (account|checking|banking)\b|\bcompany account\b|\bmerchant\b"),
    ("change_address",    r"\b(change|update|move)\b.*\baddress\b|\bnew address\b|\bmoved\b|"
                          r"\baddress\b.*\bchange\b"),
    ("change_phone",      r"\b(change|update|new)\b.*\b(phone|mobile|number)\b|\bphone\b.*\b(change|update)\b"),
    ("change_email",      r"\b(change|update|new)\b.*\bemail\b|\bemail\b.*\b(change|update)\b"),
    # ── Statements / transactions ──────────────────────────────────────────
    ("balance",           r"\b(balance|available funds|how much (do I|have I|in))\b"),
    ("transaction_missing", r"\bmissing (transaction|charge|deposit)\b|\b(where'?s|where is) my (transaction|deposit)\b|"
                          r"\b(don'?t see|can'?t see|can'?t find)\b.*\b(transaction|deposit|payment)\b"),
    ("statement_help",    r"\b(statement|transaction history|export|download.*(statement|history)|csv|pdf)\b"),
    ("tax_documents",     r"\b(tax|1099|w[-]?8|w[-]?9|tax form|tax document|tax certificate)\b"),
    # ── Fees / rates / loans ────────────────────────────────────────────────
    ("overdraft",         r"\boverdraft\b|\boverdrawn\b|\bnsf\b|\binsufficient funds\b"),
    ("fees",              r"\b(fee|charge|monthly fee|maintenance fee|hidden charge)\b"),
    ("credit_score",      r"\bcredit score\b|\bcredit report\b|\bfico\b|\bcredit rating\b"),
    ("loan_help",         r"\bloan\b|\bmortgage\b|\bfinancing\b|\bcredit line\b|\bheloc\b|"
                          r"\brefinanc|\bpre[- ]?qualif"),
    ("rates",             r"\b(apy|interest rate|savings rate|cd rate|yield|earn (on|from))\b"),
    # ── International / cards abroad ────────────────────────────────────────
    ("currency_conversion", r"\b(convert|exchange|fx)\b.*\b(currency|money|eur|usd|gbp|chf)\b|"
                          r"\b(eur|usd|gbp|chf)\b.*\bto\b.*\b(eur|usd|gbp|chf)\b|"
                          r"\bexchange rate\b"),
    ("travel_notice",     r"\btravel(ing|ling)?\b|\babroad\b|\boverseas\b|\bvacation\b|\bholiday\b|"
                          r"\btravel notice\b|\bforeign transaction\b"),
    ("atm_help",          r"\batm\b|\bcash machine\b|\bwithdraw(al)?\b"),
    # ── Regulatory / compliance ─────────────────────────────────────────────
    ("deposit_protection", r"\b(fdic|bafin|deposit protection|deposit insurance|insured|guaranteed)\b"),
    ("kyc_documents",     r"\bkyc\b|\bidentity verification\b|\bproof of (id|address|residence)\b|"
                          r"\bupload.*(id|passport|document)\b|\baml\b"),
    ("hours",             r"\b(hours?|when.*open|open until|business hours|working hours|"
                          r"available (\d|when)|when.*close|when.*available)\b"),
    # ── Meta / small talk ───────────────────────────────────────────────────
    ("talk_human",        r"\b(human|real (person|agent)|real support|actual (person|agent)|"
                          r"talk to (someone|a person|an? agent|a rep(resentative)?)|"
                          r"speak (to|with)\b.*\b(someone|person|agent))"),
    ("thanks",            r"^(thanks?( you)?|thx|ty|appreciate it|great,? thanks|awesome,? thanks|"
                          r"perfect,? thanks?|got it,? thanks?)[\s!.,]*$"),
    ("goodbye",           r"^(bye|goodbye|good ?night|good ?day|see you|talk (later|soon)|cheers)[\s!.,]*$"),
    ("greeting",          r"^(hi|hello|hey|good (morning|afternoon|evening)|greetings|hallo|bonjour|"
                          r"salut|guten tag|salve)[\s!.,]*$"),
]


def detect_topic(text: str) -> str:
    """Return the first matching topic key, or 'generic' if nothing matches."""
    t = text.strip().lower()
    for topic, pattern in TOPIC_PATTERNS:
        if re.search(pattern, t):
            return topic
    return "generic"


BRAND_PHONE_DISPLAY = "+49 800 GVB-BANK"
BRAND_SECURITY_EMAIL = "security@gvunionbank.com"


def _render_reply(template: str, customer: User) -> str:
    try:
        return template.format(
            first_name=customer.first_name,
            phone_display=BRAND_PHONE_DISPLAY,
            security_email=BRAND_SECURITY_EMAIL,
        )
    except Exception:
        return template


def pick_reply_variant(topic: str) -> str:
    """Pick a random variant reply for a topic. Falls back to 'generic' if unknown."""
    variants = QUICK_ACTION_REPLIES.get(topic) or QUICK_ACTION_REPLIES["generic"]
    if isinstance(variants, str):
        return variants  # backwards-compat safety
    return random.choice(variants) if variants else QUICK_ACTION_REPLIES["generic"][0]


def _serialize_message(m: SupportMessage) -> dict:
    """Safe serialization that never throws even if optional fields are None."""
    created = m.created_at or datetime.utcnow()
    return {
        "id": m.id or str(uuid.uuid4()),
        "sender_type": m.sender_type or "system",
        "sender_id": m.sender_id,
        "sender_name": m.sender_name or ("Support" if m.sender_type == "admin" else "You"),
        "text": m.text or "",
        "created_at": created.isoformat(),
    }


async def _get_or_create_chat(db: AsyncSession, customer: User) -> SupportChat:
    # Eagerly load messages via selectinload — accessing chat.messages later
    # in async SQLAlchemy without this would raise MissingGreenlet.
    result = await db.execute(
        select(SupportChat)
        .options(selectinload(SupportChat.messages))
        .where(SupportChat.customer_id == customer.id)
    )
    chat = result.scalars().first()
    if chat:
        return chat
    chat = SupportChat(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        status="open",
    )
    db.add(chat)
    await db.flush()

    # Compose welcome message from configurable template
    template = await get_setting(db, "support_welcome_message")
    try:
        welcome_text = template.format(first_name=customer.first_name)
    except Exception:
        welcome_text = template

    welcome = SupportMessage(
        id=str(uuid.uuid4()),
        chat_id=chat.id,
        sender_type="system",
        sender_id=None,
        sender_name="GV Support",
        text=welcome_text,
    )
    db.add(welcome)
    chat.unread_by_customer = 1
    await db.flush()
    return chat


# ── Diagnostic / health check (no auth, no DB) ────────────────────────────
@router.get("/support/ping")
async def support_ping():
    """Sanity check that the support module is loaded and running.
    Hit this from your browser: http://localhost:8000/api/support/ping"""
    return {
        "ok": True,
        "module": "support",
        "topic_count": len(QUICK_ACTION_REPLIES),
        "pattern_count": len(TOPIC_PATTERNS),
        "agent_pool_size": len(AGENT_NAMES),
        "ai_configured": is_ai_configured(),
        "version": "v2-defensive",  # bump this whenever you change support.py
    }


# ── Customer endpoints ─────────────────────────────────────────────────────
@router.get("/support/my-chat")
async def my_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the customer's chat + all messages. Auto-creates the chat if needed."""
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(403, "Admins use the admin support inbox")
    chat = await _get_or_create_chat(db, current_user)
    chat.unread_by_customer = 0
    await db.flush()
    online = (await get_setting(db, "support_online")).lower() == "true"
    offline_msg = await get_setting(db, "support_offline_message")
    admin_has_replied = any(m.sender_type == "admin" for m in chat.messages)
    # Which specialist is on this chat (deterministic per chat).
    agent = agent_for_chat(chat.id) if admin_has_replied else None
    return {
        "chat_id": chat.id,
        "status": chat.status,
        "support_online": online,
        "offline_message": offline_msg if not online else None,
        "human_requested": bool(chat.subject and chat.subject.startswith("🔴")),
        "bot_muted": admin_has_replied,
        "assigned_agent": agent,
        "messages": [_serialize_message(m) for m in chat.messages if not (m.is_deleted or False)],
    }


@router.get("/support/status")
async def public_support_status(db: AsyncSession = Depends(get_db)):
    """Public endpoint — no auth. Used by the widget's collapsed state to show online/offline."""
    online = (await get_setting(db, "support_online")).lower() == "true"
    return {"online": online}


@router.post("/support/send")
async def customer_send(
    body: SendMessageBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Customer sends a chat message. Always returns both the customer message
    and an auto-generated reply — never silently drops the reply."""
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(403, "Admins reply via /admin/support")

    try:
        chat = await _get_or_create_chat(db, current_user)
        if chat.status == "resolved":
            chat.status = "open"

        now = datetime.utcnow()

        # ── Customer message (explicit created_at so it's never None) ────────
        msg = SupportMessage(
            id=str(uuid.uuid4()),
            chat_id=chat.id,
            sender_type="customer",
            sender_id=current_user.id,
            sender_name=f"{current_user.first_name} {current_user.last_name}",
            text=body.text.strip(),
            created_at=now,
        )
        db.add(msg)
        chat.unread_by_admin = (chat.unread_by_admin or 0) + 1
        chat.last_message_at = now
        await db.flush()

        # ── Determine reply topic ────────────────────────────────────────────
        topic = body.quick_action if (body.quick_action and body.quick_action in QUICK_ACTION_REPLIES) \
                else detect_topic(body.text)
        if topic == "talk_human":
            chat.subject = "🔴 Human agent requested"

        # ── Bot muting: if an admin has replied in this chat, the human agent
        #    has taken over. Skip the auto-reply so the bot doesn't interrupt.
        #    The customer's message still lands in the admin's inbox — they just
        #    won't get an automated response back. On chat reset (new session),
        #    the admin messages are gone and the bot resumes.
        admin_has_replied = any(m.sender_type == "admin" for m in chat.messages)
        if admin_has_replied:
            logger.info(
                "support.send  user=%s  topic=%s  bot_muted=admin_active",
                current_user.email, topic,
            )
            return {
                "message": _serialize_message(msg),
                "auto_reply": None,
                "topic": topic,
                "reply_source": "human_only",
                "bot_muted": True,
            }

        agent_name = pick_agent_name()
        reply_text: Optional[str] = None
        source = "keyword"

        # Try AI first for free-form messages if configured.
        if not body.quick_action and is_ai_configured():
            try:
                reply_text = await generate_ai_reply(
                    customer=current_user,
                    agent_name=agent_name,
                    recent_messages=list(chat.messages),
                    new_message=body.text,
                )
                if reply_text:
                    source = "ai"
            except Exception as e:
                logger.error("AI reply threw; falling back to keyword: %s", e)
                reply_text = None

        # Fall back to keyword-matched canned reply. Always produces something.
        if not reply_text:
            try:
                reply_text = _render_reply(pick_reply_variant(topic), current_user)
            except Exception as e:
                logger.error("keyword reply threw: %s\n%s", e, traceback.format_exc())
                reply_text = (
                    "Thanks for reaching out. A specialist will respond shortly. "
                    f"For urgent issues, call {BRAND_PHONE_DISPLAY}."
                )

        reply_time = datetime.utcnow()
        auto_reply = SupportMessage(
            id=str(uuid.uuid4()),
            chat_id=chat.id,
            sender_type="system",
            sender_id=None,
            sender_name="GV Support",       # bot messages are always signed "GV Support"
            text=reply_text,
            created_at=reply_time,
        )
        db.add(auto_reply)
        chat.last_message_at = reply_time
        await db.flush()

        logger.info(
            "support.send  user=%s  topic=%s  source=%s  reply_len=%d",
            current_user.email, topic, source, len(reply_text),
        )

        return {
            "message": _serialize_message(msg),
            "auto_reply": _serialize_message(auto_reply),
            "topic": topic,
            "reply_source": source,
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log with full traceback so we can see exactly what broke in the terminal.
        logger.error("support.send FAILED: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Support message failed: {type(e).__name__}. Check backend terminal for details.",
        )


# ── Admin endpoints ───────────────────────────────────────────────────────
@router.get("/admin/support/chats")
async def admin_list_chats(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    """All customer chats with previews, sorted newest activity first."""
    result = await db.execute(
        select(SupportChat, User)
        .join(User, SupportChat.customer_id == User.id)
        .order_by(SupportChat.last_message_at.desc())
    )
    rows = result.all()
    out = []
    for chat, u in rows:
        # Get the last message for preview
        last_msg_res = await db.execute(
            select(SupportMessage)
            .where(SupportMessage.chat_id == chat.id)
            .order_by(SupportMessage.created_at.desc())
            .limit(1)
        )
        last = last_msg_res.scalars().first()
        human_requested = bool(chat.subject and chat.subject.startswith("🔴"))
        out.append({
            "chat_id": chat.id,
            "status": chat.status,
            "subject": chat.subject,
            "human_requested": human_requested,
            "customer_id": u.id,
            "customer_name": f"{u.first_name} {u.last_name}",
            "customer_email": u.email,
            "customer_avatar": u.profile_picture,
            "unread_by_admin": chat.unread_by_admin or 0,
            "last_message_at": chat.last_message_at.isoformat() if chat.last_message_at else None,
            "last_preview": (last.text[:120] if last else ""),
            "last_sender": (last.sender_type if last else None),
        })
    total_unread = sum(c["unread_by_admin"] for c in out)
    return {"chats": out, "total_unread": total_unread}


@router.get("/admin/support/chats/{chat_id}")
async def admin_get_chat(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    result = await db.execute(
        select(SupportChat, User)
        .join(User, SupportChat.customer_id == User.id)
        .options(selectinload(SupportChat.messages))
        .where(SupportChat.id == chat_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(404, "Chat not found")
    chat, u = row
    # Mark admin-side as read
    chat.unread_by_admin = 0
    await db.flush()
    return {
        "chat_id": chat.id,
        "status": chat.status,
        "subject": chat.subject,
        "human_requested": bool(chat.subject and chat.subject.startswith("🔴")),
        "customer": {
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "phone": u.phone,
            "avatar": u.profile_picture,
        },
        "messages": [_serialize_message(m) for m in chat.messages if not (m.is_deleted or False)],
    }


@router.post("/admin/support/chats/{chat_id}/reply")
async def admin_reply(
    chat_id: str,
    body: AdminReplyBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    try:
        result = await db.execute(select(SupportChat).where(SupportChat.id == chat_id))
        chat = result.scalars().first()
        if not chat:
            raise HTTPException(404, "Chat not found")

        # Deterministic agent name based on chat_id — same customer always sees
        # the same specialist (Priya Sharma stays Priya Sharma, never rotates).
        display_name = agent_for_chat(chat.id)
        now = datetime.utcnow()
        msg = SupportMessage(
            id=str(uuid.uuid4()),
            chat_id=chat.id,
            sender_type="admin",
            sender_id=current_user.id,
            sender_name=display_name,
            text=body.text.strip(),
            created_at=now,
        )
        db.add(msg)
        chat.unread_by_customer = (chat.unread_by_customer or 0) + 1
        chat.last_message_at = now
        if chat.status == "resolved":
            chat.status = "open"
        await db.flush()

        logger.info("support.admin_reply  chat=%s  admin=%s  len=%d",
                    chat.id, current_user.email, len(body.text))

        return _serialize_message(msg)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("support.admin_reply FAILED: %s\n%s", e, traceback.format_exc())
        raise HTTPException(500, f"Admin reply failed: {type(e).__name__}")


# ── Reset the customer's chat (called on fresh login) ─────────────────────
@router.delete("/support/my-chat")
async def reset_my_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear the customer's chat history but PRESERVE the chat_id.
    Preserving the id means an admin who currently has the conversation open
    (their SPA has the old chat_id in memory) can still reply to it — the
    reply just lands in the fresh thread."""
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(403, "Admins cannot reset their own chat")

    result = await db.execute(
        select(SupportChat)
        .options(selectinload(SupportChat.messages))
        .where(SupportChat.customer_id == current_user.id)
    )
    chat = result.scalars().first()

    if chat:
        # Delete all messages one-by-one (keep the chat row).
        for m in list(chat.messages):
            await db.delete(m)
        chat.unread_by_customer = 0
        chat.unread_by_admin = 0
        chat.subject = None
        chat.status = "open"
        chat.last_message_at = datetime.utcnow()
        await db.flush()

        # Re-seed the welcome message so the customer opens to a clean state.
        template = await get_setting(db, "support_welcome_message")
        try:
            welcome_text = template.format(first_name=current_user.first_name)
        except Exception:
            welcome_text = template
        welcome = SupportMessage(
            id=str(uuid.uuid4()),
            chat_id=chat.id,
            sender_type="system",
            sender_id=None,
            sender_name="GV Support",
            text=welcome_text,
            created_at=datetime.utcnow(),
        )
        db.add(welcome)
        chat.unread_by_customer = 1
        await db.flush()

    return {"message": "Chat cleared"}


@router.patch("/admin/support/chats/{chat_id}/resolve")
async def admin_resolve(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    result = await db.execute(select(SupportChat).where(SupportChat.id == chat_id))
    chat = result.scalars().first()
    if not chat:
        raise HTTPException(404, "Chat not found")
    chat.status = "resolved" if chat.status == "open" else "open"
    await db.flush()
    return {"status": chat.status}


@router.delete("/admin/support/messages/{message_id}")
async def admin_delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    """Soft-delete a single chat message (hides it from both sides)."""
    result = await db.execute(select(SupportMessage).where(SupportMessage.id == message_id))
    msg = result.scalars().first()
    if not msg:
        raise HTTPException(404, "Message not found")
    msg.is_deleted = True
    await db.flush()
    return {"message": "Message deleted"}


class SupportSettingsBody(BaseModel):
    support_online: Optional[bool] = None
    support_welcome_message: Optional[str] = None
    support_offline_message: Optional[str] = None


@router.get("/admin/support/settings")
async def admin_get_settings(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    return {
        "support_online": (await get_setting(db, "support_online")).lower() == "true",
        "support_welcome_message": await get_setting(db, "support_welcome_message"),
        "support_offline_message": await get_setting(db, "support_offline_message"),
    }


@router.patch("/admin/support/settings")
async def admin_update_settings(
    body: SupportSettingsBody,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    if body.support_online is not None:
        await set_setting(db, "support_online", "true" if body.support_online else "false")
    if body.support_welcome_message is not None:
        await set_setting(db, "support_welcome_message", body.support_welcome_message.strip())
    if body.support_offline_message is not None:
        await set_setting(db, "support_offline_message", body.support_offline_message.strip())
    return await admin_get_settings(db, _)


# ── Public unread-count for the widget indicator ──────────────────────────
@router.get("/support/unread")
async def customer_unread(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.ADMIN:
        return {"unread": 0}
    result = await db.execute(select(SupportChat).where(SupportChat.customer_id == current_user.id))
    chat = result.scalars().first()
    return {"unread": chat.unread_by_customer if chat else 0}
