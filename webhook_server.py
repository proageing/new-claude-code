"""FastAPI webhook server — handles Graph API notifications and proposal acceptances."""

import base64
import hmac
import hashlib
import logging
from fastapi import FastAPI, Request, Query, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse

from config import settings
from orchestrator import handle_new_email, handle_proposal_accepted

log = logging.getLogger("webhook")
app = FastAPI(title="BC Proposal Automation")


# ── Graph API Webhook ─────────────────────────────────────────────────────────

@app.post("/webhook/graph")
async def graph_notification(
    request: Request,
    background_tasks: BackgroundTasks,
    validationToken: str | None = Query(default=None),
):
    # Graph sends a validationToken during subscription setup — echo it back
    if validationToken:
        return PlainTextResponse(validationToken)

    body = await request.json()

    for notification in body.get("value", []):
        # Verify the client state matches our secret
        if notification.get("clientState") != settings.webhook_secret:
            log.warning("Rejected notification — clientState mismatch")
            continue

        resource_data = notification.get("resourceData", {})
        message_id = resource_data.get("id")
        if message_id:
            background_tasks.add_task(handle_new_email, message_id)

    return {"status": "ok"}


# ── Proposal Acceptance ───────────────────────────────────────────────────────

@app.get("/accept/{quote_id}")
async def accept_proposal(
    quote_id: str,
    sig: str,
    background_tasks: BackgroundTasks,
):
    """Customer clicks this link to accept a proposal."""
    if not _verify_signature(quote_id, sig):
        raise HTTPException(status_code=403, detail="Invalid or expired acceptance link")

    background_tasks.add_task(handle_proposal_accepted, quote_id)

    return {
        "message": "Thank you! Your proposal has been accepted. We'll be in touch shortly.",
        "quote_id": quote_id,
    }


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_signature(quote_id: str, sig: str) -> bool:
    expected = hmac.new(
        settings.webhook_secret.encode(),
        quote_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


def build_acceptance_url(quote_id: str) -> str:
    sig = hmac.new(
        settings.webhook_secret.encode(),
        quote_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{settings.webhook_base_url}/accept/{quote_id}?sig={sig}"
