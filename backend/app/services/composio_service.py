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
            # Use the new tools.execute API
            result = self.client.tools.execute(
                slug=action,
                arguments=params,
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

    # =========================================================================
    # Trigger Management
    # =========================================================================

    def get_active_connection(self, user_id: str, toolkit: str) -> str | None:
        """
        Get active connected account ID for a toolkit.
        
        Args:
            user_id: The entity ID for the user
            toolkit: The toolkit name (e.g., "GMAIL", "SLACK")
            
        Returns:
            Connected account ID if found, None otherwise
        """
        logger.info(f"[ComposioService] Getting active connection for {toolkit}")
        
        try:
            connected_accounts = self.client.connected_accounts.list(
                user_ids=[user_id],
                toolkit_slugs=[toolkit.upper()],
            )
            
            items = connected_accounts.items if hasattr(connected_accounts, 'items') else []
            for account in items:
                status = getattr(account, 'status', None)
                if status == "ACTIVE":
                    account_id = getattr(account, 'id', None)
                    logger.info(f"[ComposioService] Found active {toolkit} connection: {account_id}")
                    return account_id
            
            logger.info(f"[ComposioService] No active {toolkit} connection found")
            return None
            
        except Exception as e:
            logger.error(f"[ComposioService] Error getting active connection: {e}")
            return None

    def check_existing_trigger(self, connected_account_id: str, trigger_slug: str) -> str | None:
        """
        Check if a trigger already exists for the connected account.
        
        Args:
            connected_account_id: The connected account ID
            trigger_slug: The trigger slug (e.g., "GMAIL_NEW_GMAIL_MESSAGE")
            
        Returns:
            Trigger ID if exists, None otherwise
        """
        logger.info(f"[ComposioService] Checking for existing trigger: {trigger_slug}")
        
        try:
            triggers = self.client.triggers.list_active(
                trigger_names=[trigger_slug],
                connected_account_ids=[connected_account_id],
            )
            
            items = triggers.items if hasattr(triggers, 'items') else triggers
            for trigger in items:
                trigger_id = getattr(trigger, 'id', None) or trigger.get('id') if isinstance(trigger, dict) else None
                if trigger_id:
                    logger.info(f"[ComposioService] Found existing trigger: {trigger_id}")
                    return trigger_id
            
            logger.info(f"[ComposioService] No existing trigger found for {trigger_slug}")
            return None
            
        except Exception as e:
            logger.error(f"[ComposioService] Error checking existing trigger: {e}")
            return None

    def create_trigger(self, user_id: str, toolkit: str, trigger_slug: str) -> str:
        """
        Create a trigger safely, checking for existing ones first.
        
        Args:
            user_id: The entity ID for the user
            toolkit: The toolkit name (e.g., "GMAIL", "SLACK")
            trigger_slug: The trigger slug (e.g., "GMAIL_NEW_GMAIL_MESSAGE")
            
        Returns:
            Trigger ID (existing or newly created)
            
        Raises:
            ValueError: If no active connection found for toolkit
        """
        logger.info(f"[ComposioService] Creating trigger: {trigger_slug} for toolkit: {toolkit}")
        
        # Get connected account
        account_id = self.get_active_connection(user_id, toolkit)
        if not account_id:
            raise ValueError(f"No active {toolkit} connection found for user {user_id}")
        
        # Check for existing trigger
        existing_trigger = self.check_existing_trigger(account_id, trigger_slug)
        if existing_trigger:
            logger.info(f"[ComposioService] Using existing trigger: {existing_trigger}")
            return existing_trigger
        
        # Create new trigger
        try:
            response = self.client.triggers.create(
                slug=trigger_slug,
                connected_account_id=account_id,
                trigger_config={}
            )
            
            trigger_id = getattr(response, 'trigger_id', None) or getattr(response, 'id', None)
            logger.info(f"[ComposioService] Created new trigger: {trigger_id}")
            return trigger_id
            
        except Exception as e:
            logger.error(f"[ComposioService] Error creating trigger: {e}")
            raise

    def set_callback_url(self, callback_url: str) -> bool:
        """
        Set the global webhook callback URL for all triggers.
        
        Args:
            callback_url: The public URL where Composio will send webhook events
            
        Returns:
            True if successful
        """
        logger.info(f"[ComposioService] Setting callback URL: {callback_url}")
        
        try:
            # Try the triggers.set_callback_url method
            if hasattr(self.client.triggers, 'set_callback_url'):
                self.client.triggers.set_callback_url(callback_url)
                logger.info(f"[ComposioService] Callback URL set successfully")
                return True
            # Try alternative method names
            elif hasattr(self.client.triggers, 'callback'):
                self.client.triggers.callback(callback_url)
                logger.info(f"[ComposioService] Callback URL set via .callback()")
                return True
            else:
                logger.warning(f"[ComposioService] No callback URL method found on triggers client")
                return False
        except Exception as e:
            logger.error(f"[ComposioService] Error setting callback URL: {e}")
            return False

    def create_trigger_with_account(
        self, 
        connected_account_id: str, 
        trigger_slug: str, 
        trigger_config: dict | None = None
    ) -> str:
        """
        Create a trigger directly with a connected account ID.
        
        Args:
            connected_account_id: The connected account ID (e.g., "ca_-Fgp2VOkDHKC")
            trigger_slug: The trigger slug (e.g., "SLACK_RECEIVE_MESSAGE")
            trigger_config: Optional trigger configuration
            
        Returns:
            Trigger ID
        """
        logger.info(f"[ComposioService] Creating trigger {trigger_slug} for account: {connected_account_id}")
        
        try:
            response = self.client.triggers.create(
                slug=trigger_slug,
                connected_account_id=connected_account_id,
                trigger_config=trigger_config or {}
            )
            
            trigger_id = getattr(response, 'trigger_id', None) or getattr(response, 'id', None)
            logger.info(f"[ComposioService] Created trigger: {trigger_id}")
            return trigger_id
            
        except Exception as e:
            logger.error(f"[ComposioService] Error creating trigger: {e}")
            raise

    def delete_trigger(self, trigger_id: str) -> bool:
        """
        Delete a trigger by ID.
        
        Args:
            trigger_id: The trigger ID to delete
            
        Returns:
            True if deleted successfully
        """
        logger.info(f"[ComposioService] Deleting trigger: {trigger_id}")
        
        try:
            self.client.triggers.delete(trigger_id=trigger_id)
            logger.info(f"[ComposioService] Trigger {trigger_id} deleted successfully")
            return True
        except Exception as e:
            logger.error(f"[ComposioService] Error deleting trigger: {e}")
            return False

    def list_active_triggers(self, user_id: str) -> list[dict]:
        """
        List all active triggers for a user.
        
        Args:
            user_id: The entity ID for the user
            
        Returns:
            List of trigger info dicts
        """
        logger.info(f"[ComposioService] Listing active triggers for user: {user_id}")
        
        try:
            # Get all connected accounts for user
            connected_accounts = self.client.connected_accounts.list(user_ids=[user_id])
            account_ids = []
            
            items = connected_accounts.items if hasattr(connected_accounts, 'items') else []
            for account in items:
                if getattr(account, 'status', None) == "ACTIVE":
                    account_ids.append(getattr(account, 'id', None))
            
            if not account_ids:
                return []
            
            # Get triggers for all connected accounts
            triggers = self.client.triggers.list_active(
                connected_account_ids=account_ids,
            )
            
            result = []
            trigger_items = triggers.items if hasattr(triggers, 'items') else triggers
            for trigger in trigger_items:
                if isinstance(trigger, dict):
                    result.append(trigger)
                else:
                    result.append({
                        "id": getattr(trigger, 'id', None),
                        "trigger_name": getattr(trigger, 'trigger_name', None),
                        "status": getattr(trigger, 'status', None),
                    })
            
            logger.info(f"[ComposioService] Found {len(result)} active triggers")
            return result
            
        except Exception as e:
            logger.error(f"[ComposioService] Error listing triggers: {e}")
            return []


composio_service = ComposioService()

