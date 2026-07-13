"""Microsoft Graph API client — email watching, reading, and sending."""

import httpx
import msal
from config import settings

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
_token_cache: dict = {}


def _get_token() -> str:
    app = msal.ConfidentialClientApplication(
        client_id=settings.azure_client_id,
        client_credential=settings.azure_client_secret,
        authority=f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
    )
    result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )
    if "access_token" not in result:
        raise RuntimeError(f"Graph token error: {result.get('error_description')}")
    return result["access_token"]


def _headers() -> dict:
    return {"Authorization": f"Bearer {_get_token()}", "Content-Type": "application/json"}


def get_message(message_id: str) -> dict:
    """Fetch a single email message by ID."""
    resp = httpx.get(
        f"{GRAPH_BASE}/users/{settings.watch_mailbox}/messages/{message_id}",
        headers=_headers(),
    )
    resp.raise_for_status()
    return resp.json()


def send_email(to: str, subject: str, body_html: str, attachments: list[dict] | None = None) -> None:
    """Send an email from the proposals mailbox."""
    message: dict = {
        "message": {
            "subject": subject,
            "body": {"contentType": "HTML", "content": body_html},
            "toRecipients": [{"emailAddress": {"address": to}}],
        }
    }
    if attachments:
        message["message"]["attachments"] = attachments

    resp = httpx.post(
        f"{GRAPH_BASE}/users/{settings.proposal_from_email}/sendMail",
        headers=_headers(),
        json=message,
    )
    resp.raise_for_status()


def create_subscription(notification_url: str) -> dict:
    """Register a Graph webhook subscription on the proposals inbox."""
    payload = {
        "changeType": "created",
        "notificationUrl": notification_url,
        "resource": f"users/{settings.watch_mailbox}/mailFolders/Inbox/messages",
        "expirationDateTime": _expiry_datetime(),
        "clientState": settings.webhook_secret,
    }
    resp = httpx.post(
        f"{GRAPH_BASE}/subscriptions",
        headers=_headers(),
        json=payload,
    )
    resp.raise_for_status()
    return resp.json()


def renew_subscription(subscription_id: str) -> dict:
    """Extend an existing Graph webhook subscription."""
    resp = httpx.patch(
        f"{GRAPH_BASE}/subscriptions/{subscription_id}",
        headers=_headers(),
        json={"expirationDateTime": _expiry_datetime()},
    )
    resp.raise_for_status()
    return resp.json()


def _expiry_datetime() -> str:
    from datetime import datetime, timedelta, timezone
    return (datetime.now(timezone.utc) + timedelta(hours=4230)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
