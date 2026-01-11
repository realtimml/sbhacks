from composio import Composio
from app.config import settings
from typing import Dict
import os
from dotenv import load_dotenv

load_dotenv()

# Map app names to their auth_config_ids (configure these in Composio dashboard)
AUTH_CONFIG_IDS: Dict[str, str] = {
    "gmail": os.getenv("GMAIL_AUTH_CONFIG_ID"),  # Your existing Gmail config
    "notion": os.getenv("NOTION_AUTH_CONFIG_ID"),
    "slack": os.getenv("SLACK_AUTH_CONFIG_ID")
}


class ComposioService:
    def __init__(self):
        self.client = Composio(api_key=settings.COMPOSIO_API_KEY)

    def initiate_connection(self, app: str, user_id: str, callback_url: str) -> str:
        """Start OAuth flow, returns redirect URL"""
        auth_config_id = AUTH_CONFIG_IDS.get(app.lower())
        if not auth_config_id:
            raise ValueError(f"No auth config for app: {app}")

        connection_request = self.client.connected_accounts.link(
            auth_config_id=auth_config_id,
            user_id=user_id,
            callback_url=callback_url
        )
        return connection_request.redirect_url

    def get_connections(self, user_id: str) -> list[str]:
        """Get list of connected app names for a user"""
        accounts = self.client.connected_accounts.list(user_id=user_id)
        return [acc.app_name for acc in accounts if acc.status == "ACTIVE"]


composio_service = ComposioService()

