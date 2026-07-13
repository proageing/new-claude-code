# BC Proposal Automation

Automates the full proposal lifecycle:

```
Outlook email → Claude parses → BC Sales Quote → Word proposal emailed → Customer accepts → BC Sales Order
```

## Prerequisites

1. **Azure App Registration** with these API permissions:
   - `Mail.Read` (Graph) — read incoming emails
   - `Mail.Send` (Graph) — send proposals
   - `Financials.ReadWrite.All` (Business Central) — create quotes/orders

2. **Public HTTPS endpoint** for the webhook server (ngrok works for local dev)

## Setup

```bash
cd bc-proposal-automation
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your credentials
```

### Find your BC Company ID

```bash
python setup.py
# Copy the printed ID into BC_COMPANY_ID in .env
```

### Run

```bash
python main.py
```

This will:
1. Register a Microsoft Graph webhook on your proposals inbox
2. Start the FastAPI server on the configured PORT

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_TENANT_ID` | Your Azure AD tenant (pre-filled) |
| `AZURE_CLIENT_ID` | Azure app registration client ID |
| `AZURE_CLIENT_SECRET` | Azure app registration secret |
| `BC_COMPANY_ID` | GUID from `python setup.py` |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `WEBHOOK_BASE_URL` | Public URL of this server (e.g. `https://yourapp.com`) |
| `WEBHOOK_SECRET` | Random secret for validating Graph webhooks |
| `WATCH_MAILBOX` | Outlook mailbox to watch (e.g. `proposals@company.com`) |
| `PROPOSAL_FROM_EMAIL` | Mailbox used to send proposals (can be same as above) |

## File Map

| File | Role |
|---|---|
| `main.py` | Entry point — registers Graph sub and starts server |
| `orchestrator.py` | Pipeline logic — connects all steps |
| `email_parser.py` | Claude API — extracts opportunity data from emails |
| `bc_client.py` | Business Central REST API calls |
| `graph_client.py` | Microsoft Graph API (email read/send, webhooks) |
| `proposal_generator.py` | Generates Word (.docx) proposal |
| `webhook_server.py` | FastAPI server for Graph notifications and acceptances |
| `config.py` | Settings loaded from `.env` |
| `setup.py` | One-time helper to find your BC Company ID |
