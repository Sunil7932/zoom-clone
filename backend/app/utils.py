"""Small helpers: Zoom-style meeting codes and invite links."""
from __future__ import annotations

import secrets

from .config import settings


def generate_meeting_code() -> str:
    """Return a Zoom-style numeric code, e.g. ``123-4567-890`` (10 digits).

    Uses ``secrets`` (CSPRNG) rather than ``random`` so codes are not guessable.
    """
    digits = "".join(secrets.choice("0123456789") for _ in range(10))
    return f"{digits[0:3]}-{digits[3:7]}-{digits[7:10]}"


def build_invite_link(code: str) -> str:
    """Build the public shareable link for a meeting code."""
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/meeting/{code}"
