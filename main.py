"""Entry point — starts the webhook server and registers the Graph subscription."""

import logging
import uvicorn
from config import settings
import graph_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger("main")


def register_graph_subscription() -> None:
    notification_url = f"{settings.webhook_base_url}/webhook/graph"
    log.info("Registering Graph subscription → %s", notification_url)
    sub = graph_client.create_subscription(notification_url)
    log.info("Subscription created: %s (expires %s)", sub["id"], sub["expirationDateTime"])


if __name__ == "__main__":
    register_graph_subscription()
    uvicorn.run(
        "webhook_server:app",
        host="0.0.0.0",
        port=settings.port,
        reload=False,
    )
