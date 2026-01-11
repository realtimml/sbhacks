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
        response = self.client.connected_accounts.list(user_ids=[user_id])
        items = response.items if hasattr(response, 'items') else []
        result = []
        for item in items:
            status = getattr(item, 'status', None)
            toolkit = getattr(item, 'toolkit', None)
            toolkit_name = getattr(toolkit, 'name', None) or getattr(toolkit, 'slug', None) if toolkit else None
            if status == "ACTIVE" and toolkit_name:
                result.append(toolkit_name)
        return result

    def get_connected_account(self, user_id: str, app: str) -> str | None:
        """Get the connected account ID for a specific app and user"""
        response = self.client.connected_accounts.list(user_ids=[user_id])
        items = response.items if hasattr(response, 'items') else []
        for item in items:
            status = getattr(item, 'status', None)
            toolkit = getattr(item, 'toolkit', None)
            toolkit_name = getattr(toolkit, 'name', None) or getattr(toolkit, 'slug', None) if toolkit else None
            if status == "ACTIVE" and toolkit_name and toolkit_name.lower() == app.lower():
                return getattr(item, 'id', None)
        return None

    def execute_action(self, user_id: str, action: str, params: dict) -> dict:
        """
        Execute a Composio action on behalf of a user.
        
        Args:
            user_id: The entity/user ID
            action: Composio action name (e.g., 'GOOGLECALENDAR_CREATE_EVENT')
            params: Action-specific parameters
            
        Returns:
            dict with execution result or error
        """
        # Map action to app for finding the right connected account
        action_to_app = {
            "NOTION_CREATE_PAGE": "notion",
            "NOTION_CREATE_DATABASE_ITEM": "notion",
            "GMAIL_SEND_EMAIL": "gmail",
            "SLACK_SEND_MESSAGE": "slack",
        }
        
        app = action_to_app.get(action)
        if not app:
            raise ValueError(f"Unknown action: {action}")
        
        connected_account_id = self.get_connected_account(user_id, app)
        if not connected_account_id:
            raise ValueError(f"No connected {app} account for user {user_id}")
        
        # Execute the action
        result = self.client.actions.execute(
            action=action,
            params=params,
            connected_account_id=connected_account_id
        )
        
        return {
            "success": True,
            "data": result.data if hasattr(result, 'data') else result,
            "action": action
        }


composio_service = ComposioService()

