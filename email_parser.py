"""Use Claude to extract structured opportunity data from a raw email."""

import json
import anthropic
from pydantic import BaseModel

client = anthropic.Anthropic()


class OpportunityData(BaseModel):
    customer_name: str
    customer_email: str
    project_title: str
    description: str
    requirements: list[str]
    estimated_budget: float | None
    currency: str = "USD"
    timeline: str | None
    line_items: list[dict]  # [{description, quantity, unit_price}]
    raw_email_subject: str


SYSTEM_PROMPT = """You are a business analyst assistant. Extract structured opportunity data from
proposal request emails. Return valid JSON only, no markdown fences.

Output schema:
{
  "customer_name": "string",
  "customer_email": "string",
  "project_title": "string — concise title for the opportunity",
  "description": "string — 2-3 sentence summary",
  "requirements": ["string", ...],
  "estimated_budget": number or null,
  "currency": "USD",
  "timeline": "string or null",
  "line_items": [
    {"description": "string", "quantity": 1, "unit_price": 0.0}
  ]
}

For line_items: infer reasonable line items from the requirements. If budget is given,
distribute it across items. If no budget is mentioned, use 0.0 for unit_price."""


def parse_email(subject: str, body: str, sender_email: str) -> OpportunityData:
    """Extract opportunity data from an email using Claude."""
    user_content = f"From: {sender_email}\nSubject: {subject}\n\n{body}"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    data = json.loads(message.content[0].text)
    data["raw_email_subject"] = subject

    # Ensure sender email is used if parser missed it
    if not data.get("customer_email"):
        data["customer_email"] = sender_email

    return OpportunityData(**data)
