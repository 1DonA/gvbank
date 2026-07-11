"""LLM-powered support-chat replies.

The service calls any OpenAI-compatible chat-completions endpoint. To use it:

    OPENAI_API_KEY=sk-...
    OPENAI_MODEL=gpt-4o-mini            # (default; can also point at Groq/etc.)
    OPENAI_BASE_URL=https://api.openai.com/v1

If OPENAI_API_KEY isn't set (or is a placeholder), the AI is skipped and
support.py falls back to keyword-matched canned replies.
"""
from typing import List, Optional
import logging

import httpx

from app.core.config import settings
from app.models.models import SupportMessage, User

logger = logging.getLogger(__name__)


PLACEHOLDER_MARKERS = ("your-api-key", "sk-your", "sk-placeholder", "REPLACE_ME")


def is_ai_configured() -> bool:
    key = (settings.OPENAI_API_KEY or "").strip()
    if not key or len(key) < 15:
        return False
    if any(m in key.lower() for m in (m.lower() for m in PLACEHOLDER_MARKERS)):
        return False
    return True


def _system_prompt(customer: User, agent_name: str) -> str:
    return (
        f"You are {agent_name}, a friendly and professional customer support "
        "specialist at GV Union Bank, a European retail bank headquartered in "
        "Frankfurt, Germany.\n\n"
        f"The customer's first name is {customer.first_name}. Use it occasionally "
        "so replies feel personal without being repetitive.\n\n"
        "Bank facts you can rely on:\n"
        "- Regulated by BaFin. Deposits protected up to €100,000 per depositor.\n"
        "- Offices in Frankfurt, London, Amsterdam, Zurich, Luxembourg.\n"
        "- High-Yield Savings: 5.20% APY, no minimum balance.\n"
        "- CDs: 4.75% (5-year) up to 5.50% (12-month).\n"
        "- Total Checking: no monthly fee with €1,500 avg balance or one direct deposit; €12 otherwise.\n"
        "- Sapphire Preferred credit card: 100,000-point welcome bonus, €95 annual fee.\n"
        "- Mortgages from 6.49% APR. Auto loans from 5.99% APR.\n"
        "- Wire fees: €25 domestic, €45 international. Zelle/ACH free.\n"
        "- Currency shown in the app is €. Support phone: +49 800 GVB-BANK.\n"
        "- Hours: Mon–Fri 08:00–18:00 CET, Sat 09:00–14:00 CET. 24/7 fraud line.\n"
        "- Transfers: internal instant, ACH 1–3 days, wires same-day (domestic), "
        "  international 1–4 days.\n"
        "- OTP codes are 6 digits, expire in 10 minutes, sent by email and SMS.\n\n"
        "Rules:\n"
        "- Keep replies short — 1–3 sentences unless the customer asks for detail.\n"
        "- Warm, professional, plain language. No emoji-vomit.\n"
        "- NEVER invent specific account balances, transaction amounts, dates, "
        "  or fees. Say you'll pull them up or ask the customer to check the app.\n"
        "- If they report fraud, a lost card, or being locked out, reassure them "
        "  and mention immediate next steps (freeze card in app, call fraud line, "
        "  reset password link).\n"
        "- If they ask something you can't answer with confidence, say so and "
        "  offer to connect them to a human specialist.\n"
        "- If they thank you or greet you, be brief and warm.\n"
        "- Never claim to be an AI or 'chatbot'. You are the support agent."
    )


async def generate_ai_reply(
    customer: User,
    agent_name: str,
    recent_messages: List[SupportMessage],
    new_message: str,
) -> Optional[str]:
    """Return an AI-generated reply, or None if AI isn't configured or errored."""
    if not is_ai_configured():
        return None

    # Build the running conversation. Customer msgs = user, everyone else = assistant.
    history = []
    for m in recent_messages[-8:]:  # last 8 turns for context
        role = "user" if m.sender_type == "customer" else "assistant"
        history.append({"role": role, "content": m.text})
    history.append({"role": "user", "content": new_message})

    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": _system_prompt(customer, agent_name)},
            *history,
        ],
        "max_tokens": 220,
        "temperature": 0.7,
    }

    url = settings.OPENAI_BASE_URL.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            if r.status_code >= 400:
                logger.error(f"AI reply HTTP {r.status_code}: {r.text[:300]}")
                return None
            data = r.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            return content or None
    except Exception as e:
        logger.error(f"AI reply exception: {type(e).__name__}: {e}")
        return None
