"""
Orchestration layer — connects the pipeline steps together.

Flow:
  1. New email arrives → Graph webhook fires → handle_new_email()
  2. Claude parses the email → OpportunityData
  3. BC customer is found/created
  4. BC Sales Quote is created with line items
  5. Proposal .docx is generated and emailed to customer
  6. Customer clicks acceptance link → handle_proposal_accepted()
  7. BC Quote is converted to Sales Order
"""

import base64
import logging

import graph_client
import bc_client
from email_parser import parse_email
from proposal_generator import generate_proposal
from webhook_server import build_acceptance_url

log = logging.getLogger("orchestrator")

COMPANY_NAME = "Your Company Name"  # Replace or pull from BC companies endpoint


def handle_new_email(message_id: str) -> None:
    log.info("Processing new email: %s", message_id)

    # 1. Fetch email from Graph
    message = graph_client.get_message(message_id)
    subject = message.get("subject", "")
    sender_email = message["from"]["emailAddress"]["address"]
    body_content = message.get("body", {}).get("content", "")

    log.info("Email from %s: %s", sender_email, subject)

    # 2. Parse with Claude
    opportunity = parse_email(subject, body_content, sender_email)
    log.info("Parsed opportunity: %s for %s", opportunity.project_title, opportunity.customer_name)

    # 3. Find or create BC customer
    customer = bc_client.find_or_create_customer(
        name=opportunity.customer_name,
        email=opportunity.customer_email,
    )
    customer_id = customer["id"]
    log.info("BC customer id: %s", customer_id)

    # 4. Create Sales Quote
    quote = bc_client.create_sales_quote(
        customer_id=customer_id,
        external_document_number=message_id[:20],
    )
    quote_id = quote["id"]
    log.info("Created BC Sales Quote: %s", quote.get("number"))

    # 5. Add line items
    for item in opportunity.line_items:
        bc_client.add_quote_line(
            quote_id=quote_id,
            description=item["description"],
            quantity=float(item.get("quantity", 1)),
            unit_price=float(item.get("unit_price", 0)),
        )

    # 6. Mark quote as Sent in BC
    bc_client.send_quote(quote_id)

    # 7. Generate proposal doc (inject acceptance URL into quote dict)
    acceptance_url = build_acceptance_url(quote_id)
    quote["_acceptance_url"] = acceptance_url
    docx_bytes = generate_proposal(opportunity, quote, company_name=COMPANY_NAME)

    # 8. Email proposal to customer
    attachment = {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": f"Proposal_{quote.get('number', quote_id)}.docx",
        "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "contentBytes": base64.b64encode(docx_bytes).decode(),
    }

    html_body = f"""
    <p>Dear {opportunity.customer_name},</p>
    <p>Thank you for reaching out. Please find attached our proposal for
    <strong>{opportunity.project_title}</strong>.</p>
    <p>To accept this proposal online, click the link below:</p>
    <p><a href="{acceptance_url}">Accept this Proposal</a></p>
    <p>Please don't hesitate to reach out with any questions.</p>
    <p>Best regards,<br>{COMPANY_NAME}</p>
    """

    graph_client.send_email(
        to=opportunity.customer_email,
        subject=f"Proposal: {opportunity.project_title} (Quote #{quote.get('number', '')})",
        body_html=html_body,
        attachments=[attachment],
    )

    log.info("Proposal emailed to %s", opportunity.customer_email)


def handle_proposal_accepted(quote_id: str) -> None:
    log.info("Proposal accepted — converting quote %s to order", quote_id)

    order = bc_client.convert_quote_to_order(quote_id)
    order_number = order.get("number", quote_id)
    log.info("Sales Order created: %s", order_number)

    # Fetch customer email from the quote to send confirmation
    quote = bc_client.get_sales_quote(quote_id)
    customer_email = quote.get("customerEmail", "")

    if customer_email:
        graph_client.send_email(
            to=customer_email,
            subject=f"Proposal Accepted — Order #{order_number} Confirmed",
            body_html=f"""
            <p>Thank you for accepting our proposal.</p>
            <p>Your Sales Order <strong>#{order_number}</strong> has been created
            and our team will be in touch within one business day.</p>
            <p>Best regards,<br>{COMPANY_NAME}</p>
            """,
        )
        log.info("Confirmation email sent to %s", customer_email)
