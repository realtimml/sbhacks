from composio import Composio
from app.config import settings
from typing import Dict, Any
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Map app names to their auth_config_ids (configure these in Composio dashboard)
AUTH_CONFIG_IDS: Dict[str, str] = {
    "gmail": os.getenv("GMAIL_AUTH_CONFIG_ID"),  # Your existing Gmail config
    "notion": os.getenv("NOTION_AUTH_CONFIG_ID"),
    "slack": os.getenv("SLACK_AUTH_CONFIG_ID")
}

# Map app names to their Composio toolkit slugs (uppercase)
APP_TO_TOOLKIT: Dict[str, str] = {
    "gmail": "GMAIL",
    "notion": "NOTION",
    "slack": "SLACK",
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

    def get_tools(self, user_id: str, apps: list[str]) -> dict[str, Any]:
        """
        Get available tools for connected apps in Gemini-compatible format.
        
        Args:
            user_id: The entity ID for the user
            apps: List of app names to get tools for (e.g., ["gmail", "slack"])
            
        Returns:
            Dictionary in format expected by GeminiService._build_tools():
            {
                "TOOL_NAME": {
                    "description": "...",
                    "parameters": { ...JSON Schema... }
                }
            }
        """
        if not apps:
            logger.info("[ComposioService] No apps provided, returning empty tools")
            return {}
        
        # Convert app names to toolkit slugs
        toolkit_slugs = []
        for app in apps:
            slug = APP_TO_TOOLKIT.get(app.lower()) or app.upper()
            toolkit_slugs.append(slug)
        
        logger.info(f"[ComposioService] Fetching tools for apps: {toolkit_slugs}")
        
        try:
            # Fetch tools from Composio
            tools_response = self.client.tools.get(
                toolkits=toolkit_slugs,
                user_id=user_id
            )
            
            # Transform to Gemini-compatible format
            tools_dict: dict[str, Any] = {}
            
            for tool in tools_response:
                # Get tool attributes - handle both dict and object forms
                if isinstance(tool, dict):
                    name = tool.get("name", "")
                    description = tool.get("description", "")
                    parameters = tool.get("parameters", {"type": "object", "properties": {}})
                else:
                    name = getattr(tool, "name", "")
                    description = getattr(tool, "description", "")
                    parameters = getattr(tool, "parameters", {"type": "object", "properties": {}})
                
                if name:
                    tools_dict[name] = {
                        "description": description,
                        "parameters": parameters
                    }
            
            logger.info(f"[ComposioService] Retrieved {len(tools_dict)} tools")
            return tools_dict
            
        except Exception as e:
            logger.error(f"[ComposioService] Error fetching tools: {e}")
            return {}

    async def execute_action(self, user_id: str, action: str, params: dict) -> dict:
        """
        Execute a Composio action and return the result.
        
        Args:
            user_id: The entity ID for the user
            action: The action name to execute (e.g., "GMAIL_SEARCH_EMAILS")
            params: Parameters to pass to the action
            
        Returns:
            Result dictionary from Composio
        """
        logger.info(f"[ComposioService] Executing action: {action} for user: {user_id}")
        logger.debug(f"[ComposioService] Action params: {params}")
        
        try:
            result = self.client.actions.execute(
                action=action,
                params=params,
                user_id=user_id
            )
            
            # Convert result to dict if needed
            if hasattr(result, 'model_dump'):
                result_dict = result.model_dump()
            elif hasattr(result, '__dict__'):
                result_dict = result.__dict__
            elif isinstance(result, dict):
                result_dict = result
            else:
                result_dict = {"result": str(result)}
            
            logger.info(f"[ComposioService] Action {action} completed successfully")
            return result_dict
            
        except Exception as e:
            logger.error(f"[ComposioService] Error executing action {action}: {e}")
            return {"error": str(e)}


composio_service = ComposioService()

