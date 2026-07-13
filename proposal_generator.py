"""Generate a Word (.docx) proposal from Business Central quote data."""

import io
from datetime import date
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from email_parser import OpportunityData


def _heading(doc: Document, text: str, level: int = 1) -> None:
    p = doc.add_heading(text, level=level)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.runs[0] if p.runs else p.add_run(text)
    run.font.color.rgb = RGBColor(0x1F, 0x35, 0x64)


def generate_proposal(opportunity: OpportunityData, quote: dict, company_name: str = "Your Company") -> bytes:
    """Return proposal as .docx bytes."""
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Header
    header_para = doc.add_paragraph()
    header_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header_para.add_run(company_name.upper())
    run.bold = True
    run.font.size = Pt(20)
    run.font.color.rgb = RGBColor(0x1F, 0x35, 0x64)

    doc.add_paragraph()

    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_para.add_run(f"PROPOSAL: {opportunity.project_title.upper()}")
    run.bold = True
    run.font.size = Pt(14)

    doc.add_paragraph()

    # Metadata table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.style = "Table Grid"
    meta_data = [
        ("Prepared for:", opportunity.customer_name),
        ("Date:", date.today().strftime("%B %d, %Y")),
        ("Quote #:", quote.get("number", "—")),
        ("Valid until:", quote.get("expirationDate", "30 days from date")),
    ]
    for i, (label, value) in enumerate(meta_data):
        meta_table.cell(i, 0).text = label
        meta_table.cell(i, 1).text = str(value)
        meta_table.cell(i, 0).paragraphs[0].runs[0].bold = True

    doc.add_paragraph()

    # Overview
    _heading(doc, "Project Overview", level=2)
    doc.add_paragraph(opportunity.description)

    # Requirements
    if opportunity.requirements:
        _heading(doc, "Scope of Work", level=2)
        for req in opportunity.requirements:
            p = doc.add_paragraph(style="List Bullet")
            p.add_run(req)

    # Timeline
    if opportunity.timeline:
        _heading(doc, "Timeline", level=2)
        doc.add_paragraph(opportunity.timeline)

    # Pricing table
    _heading(doc, "Investment Summary", level=2)
    price_table = doc.add_table(rows=1, cols=4)
    price_table.style = "Table Grid"
    headers = ["Description", "Qty", "Unit Price", "Total"]
    for i, h in enumerate(headers):
        cell = price_table.rows[0].cells[i]
        cell.text = h
        cell.paragraphs[0].runs[0].bold = True

    total = 0.0
    for line in opportunity.line_items:
        qty = float(line.get("quantity", 1))
        price = float(line.get("unit_price", 0))
        line_total = qty * price
        total += line_total
        row = price_table.add_row()
        row.cells[0].text = line.get("description", "")
        row.cells[1].text = str(qty)
        row.cells[2].text = f"${price:,.2f}"
        row.cells[3].text = f"${line_total:,.2f}"

    # Total row
    total_row = price_table.add_row()
    total_row.cells[0].merge(total_row.cells[2])
    total_row.cells[0].text = "TOTAL"
    total_row.cells[0].paragraphs[0].runs[0].bold = True
    total_row.cells[3].text = f"${total:,.2f}"
    total_row.cells[3].paragraphs[0].runs[0].bold = True

    doc.add_paragraph()

    # Acceptance section
    _heading(doc, "Acceptance", level=2)
    doc.add_paragraph(
        "To accept this proposal, please click the link below or reply to this email "
        "with your written approval. Upon acceptance, a Sales Order will be created "
        "and our team will be in touch within one business day."
    )

    acceptance_url = quote.get("_acceptance_url", "[ACCEPTANCE_LINK]")
    p = doc.add_paragraph()
    run = p.add_run(f"Accept this proposal: {acceptance_url}")
    run.bold = True

    doc.add_paragraph()

    # Footer
    footer_para = doc.add_paragraph()
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer_para.add_run(f"© {date.today().year} {company_name} · Confidential")
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
