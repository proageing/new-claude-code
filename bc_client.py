"""Business Central REST API client (OData v4)."""

import httpx
import msal
from config import settings

BC_SCOPE = "https://api.businesscentral.dynamics.com/.default"
_API = f"{settings.bc_base_url}/api/v2.0/companies({settings.bc_company_id})"


def _get_token() -> str:
    app = msal.ConfidentialClientApplication(
        client_id=settings.azure_client_id,
        client_credential=settings.azure_client_secret,
        authority=f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
    )
    result = app.acquire_token_for_client(scopes=[BC_SCOPE])
    if "access_token" not in result:
        raise RuntimeError(f"BC token error: {result.get('error_description')}")
    return result["access_token"]


def _headers(etag: str | None = None) -> dict:
    h = {
        "Authorization": f"Bearer {_get_token()}",
        "Content-Type": "application/json",
    }
    if etag:
        h["If-Match"] = etag
    return h


# ── Customers ────────────────────────────────────────────────────────────────

def find_or_create_customer(name: str, email: str) -> dict:
    """Look up a customer by email; create if not found."""
    resp = httpx.get(
        f"{_API}/customers",
        headers=_headers(),
        params={"$filter": f"email eq '{email}'"},
    )
    resp.raise_for_status()
    results = resp.json().get("value", [])
    if results:
        return results[0]

    payload = {"displayName": name, "email": email, "type": "Company"}
    resp = httpx.post(f"{_API}/customers", headers=_headers(), json=payload)
    resp.raise_for_status()
    return resp.json()


# ── Sales Quotes ──────────────────────────────────────────────────────────────

def create_sales_quote(customer_id: str, external_document_number: str, salesperson_code: str = "") -> dict:
    """Create a new Sales Quote header in Business Central."""
    payload = {
        "customerId": customer_id,
        "externalDocumentNumber": external_document_number,
        "salespersonCode": salesperson_code,
    }
    resp = httpx.post(f"{_API}/salesQuotes", headers=_headers(), json=payload)
    resp.raise_for_status()
    return resp.json()


def add_quote_line(quote_id: str, description: str, quantity: float, unit_price: float, item_id: str | None = None) -> dict:
    """Add a line item to a Sales Quote."""
    payload: dict = {
        "documentId": quote_id,
        "sequence": 0,
        "lineType": "Item" if item_id else "G/L Account",
        "description": description,
        "quantity": quantity,
        "unitPrice": unit_price,
    }
    if item_id:
        payload["itemId"] = item_id

    resp = httpx.post(f"{_API}/salesQuoteLines", headers=_headers(), json=payload)
    resp.raise_for_status()
    return resp.json()


def get_sales_quote(quote_id: str) -> dict:
    resp = httpx.get(f"{_API}/salesQuotes({quote_id})", headers=_headers())
    resp.raise_for_status()
    return resp.json()


def send_quote(quote_id: str) -> None:
    """Mark quote as Sent in BC."""
    quote = get_sales_quote(quote_id)
    etag = quote.get("@odata.etag", "*")
    resp = httpx.post(
        f"{_API}/salesQuotes({quote_id})/Microsoft.NAV.send",
        headers=_headers(etag=etag),
    )
    resp.raise_for_status()


def convert_quote_to_order(quote_id: str) -> dict:
    """Convert an accepted Sales Quote to a Sales Order."""
    quote = get_sales_quote(quote_id)
    etag = quote.get("@odata.etag", "*")
    resp = httpx.post(
        f"{_API}/salesQuotes({quote_id})/Microsoft.NAV.makeOrder",
        headers=_headers(etag=etag),
    )
    resp.raise_for_status()
    return resp.json()


def list_companies() -> list[dict]:
    """List all companies accessible in this BC environment."""
    resp = httpx.get(
        f"{settings.bc_base_url}/api/v2.0/companies",
        headers=_headers(),
    )
    resp.raise_for_status()
    return resp.json().get("value", [])
