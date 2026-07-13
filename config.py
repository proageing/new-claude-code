from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    azure_tenant_id: str
    azure_client_id: str
    azure_client_secret: str

    bc_base_url: str = "https://api.businesscentral.dynamics.com/v2.0/51fad1fe-8ba8-4ecb-992f-7458a8aa7c11/Production"
    bc_company_id: str = ""

    anthropic_api_key: str

    webhook_base_url: str = ""
    webhook_secret: str
    port: int = 8000

    watch_mailbox: str
    proposal_from_email: str

    class Config:
        env_file = ".env"


settings = Settings()
