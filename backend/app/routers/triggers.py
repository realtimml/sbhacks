from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
import json
import logging

from app.services.composio_service import composio_service
from app.services import redis_service

logger = logging.getLogger(__name__)

USER_ID = os.getenv("USER_ID")

router = APIRouter(prefix="/api/triggers", tags=["triggers"])

# Supported trigger slugs
SUPPORTED_TRIGGERS = {
    "GMAIL_NEW_GMAIL_MESSAGE": "GMAIL",
    "SLACK_NEW_MESSAGE": "SLACK",
    "SLACK_RECEIVE_MESSAGE": "SLACK",  # For DMs and channel messages
}


class TriggerRequest(BaseModel):
    triggers: List[str]  # e.g., ["SLACK_NEW_MESSAGE", "GMAIL_NEW_GMAIL_MESSAGE"]


class SlackDMTriggerRequest(BaseModel):
    connected_account_id: str  # e.g., "ca_-Fgp2VOkDHKC"
    slack_user_id: str | None = None  # Optional: filter DMs mentioning this user


class TriggerResponse(BaseModel):
    trigger: str
    id: str
    toolkit: str


@router.post("")
async def subscribe_triggers(request: TriggerRequest):
    """
    Subscribe to Gmail and/or Slack triggers.
    Creates triggers via Composio SDK and stores IDs in Redis for management.
    """
    logger.info(f"[Triggers] Subscribing to triggers: {request.triggers}")
    
    created_triggers: List[TriggerResponse] = []
    errors: List[str] = []
    
    for trigger_slug in request.triggers:
        # Validate trigger slug
        if trigger_slug not in SUPPORTED_TRIGGERS:
            errors.append(f"Unsupported trigger: {trigger_slug}")
            continue
        
        toolkit = SUPPORTED_TRIGGERS[trigger_slug]
        
        try:
            # Create trigger via Composio SDK
            trigger_id = composio_service.create_trigger(
                user_id=USER_ID,
                toolkit=toolkit,
                trigger_slug=trigger_slug
            )
            
            created_triggers.append(TriggerResponse(
                trigger=trigger_slug,
                id=trigger_id,
                toolkit=toolkit
            ))
            
            logger.info(f"[Triggers] Created trigger {trigger_slug}: {trigger_id}")
            
        except ValueError as e:
            # No active connection for toolkit
            errors.append(f"{toolkit}: {str(e)}")
            logger.warning(f"[Triggers] Failed to create {trigger_slug}: {e}")
        except Exception as e:
            errors.append(f"{trigger_slug}: {str(e)}")
            logger.error(f"[Triggers] Error creating {trigger_slug}: {e}")
    
    # Store trigger IDs in Redis for management
    if created_triggers:
        trigger_data = [t.model_dump() for t in created_triggers]
        await redis_service.set_user_setting(
            USER_ID, 
            "trigger_ids", 
            json.dumps(trigger_data)
        )
        logger.info(f"[Triggers] Stored {len(created_triggers)} trigger IDs in Redis")
    
    return {
        "success": len(created_triggers) > 0,
        "triggers": [t.model_dump() for t in created_triggers],
        "errors": errors if errors else None
    }


@router.delete("")
async def unsubscribe_triggers():
    """
    Unsubscribe from all triggers.
    Deletes triggers via Composio SDK and removes IDs from Redis.
    """
    logger.info("[Triggers] Unsubscribing from all triggers")
    
    # Get stored trigger IDs from Redis
    stored = await redis_service.get_user_setting(USER_ID, "trigger_ids")
    
    if not stored:
        return {"success": True, "message": "No active triggers to unsubscribe"}
    
    deleted_triggers: List[str] = []
    errors: List[str] = []
    
    try:
        trigger_data = json.loads(stored)
        
        for trigger in trigger_data:
            trigger_id = trigger.get("id")
            trigger_slug = trigger.get("trigger")
            
            if not trigger_id:
                continue
            
            try:
                success = composio_service.delete_trigger(trigger_id)
                if success:
                    deleted_triggers.append(trigger_slug)
                    logger.info(f"[Triggers] Deleted trigger: {trigger_slug}")
                else:
                    errors.append(f"Failed to delete {trigger_slug}")
            except Exception as e:
                errors.append(f"{trigger_slug}: {str(e)}")
                logger.error(f"[Triggers] Error deleting {trigger_slug}: {e}")
        
        # Remove trigger IDs from Redis
        await redis_service.delete_user_setting(USER_ID, "trigger_ids")
        logger.info("[Triggers] Removed trigger IDs from Redis")
        
    except json.JSONDecodeError:
        logger.error("[Triggers] Invalid trigger data in Redis")
        await redis_service.delete_user_setting(USER_ID, "trigger_ids")
    
    return {
        "success": len(deleted_triggers) > 0 or len(errors) == 0,
        "deleted": deleted_triggers,
        "errors": errors if errors else None
    }


@router.get("")
async def get_triggers():
    """
    Get currently active triggers for the user.
    """
    logger.info("[Triggers] Getting active triggers")
    
    # Get stored trigger IDs from Redis
    stored = await redis_service.get_user_setting(USER_ID, "trigger_ids")
    
    if not stored:
        return {"triggers": []}
    
    try:
        trigger_data = json.loads(stored)
        return {"triggers": trigger_data}
    except json.JSONDecodeError:
        logger.error("[Triggers] Invalid trigger data in Redis")
        return {"triggers": []}


@router.get("/status")
async def get_trigger_status():
    """
    Get detailed status of triggers from Composio.
    """
    logger.info("[Triggers] Getting trigger status from Composio")
    
    try:
        active_triggers = composio_service.list_active_triggers(USER_ID)
        return {
            "success": True,
            "triggers": active_triggers
        }
    except Exception as e:
        logger.error(f"[Triggers] Error getting trigger status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-callback-url")
async def set_webhook_callback_url(callback_url: str):
    """
    Set the webhook callback URL where Composio will send trigger events.
    This must be a publicly accessible URL (use ngrok for local development).
    
    Example: https://your-ngrok-url.ngrok.io/api/webhooks/composio
    """
    logger.info(f"[Triggers] Setting callback URL: {callback_url}")
    
    success = composio_service.set_callback_url(callback_url)
    
    if success:
        return {"success": True, "callback_url": callback_url}
    else:
        raise HTTPException(
            status_code=500, 
            detail="Failed to set callback URL. You may need to set it via Composio CLI: composio triggers callback set <url>"
        )


@router.post("/slack-dm")
async def subscribe_slack_dm_trigger(request: SlackDMTriggerRequest):
    """
    Subscribe to Slack DM trigger using a connected account ID.
    This trigger fires when a new direct message is received.
    Optionally filter for messages that mention a specific user.
    """
    logger.info(f"[Triggers] Creating Slack DM trigger for account: {request.connected_account_id}")
    
    trigger_slug = "SLACK_RECEIVE_MESSAGE"
    
    try:
        # Check if trigger already exists
        existing_trigger = composio_service.check_existing_trigger(
            request.connected_account_id, 
            trigger_slug
        )
        
        if existing_trigger:
            logger.info(f"[Triggers] Using existing Slack DM trigger: {existing_trigger}")
            
            # Store trigger info in Redis
            trigger_data = {
                "trigger": trigger_slug,
                "id": existing_trigger,
                "toolkit": "SLACK",
                "connected_account_id": request.connected_account_id,
                "slack_user_id": request.slack_user_id,
                "type": "slack_dm"
            }
            await redis_service.set_user_setting(
                USER_ID,
                "slack_dm_trigger",
                json.dumps(trigger_data)
            )
            
            return {
                "success": True,
                "trigger_id": existing_trigger,
                "message": "Using existing Slack DM trigger",
                "slack_user_id": request.slack_user_id
            }
        
        # Create new trigger
        trigger_id = composio_service.create_trigger_with_account(
            connected_account_id=request.connected_account_id,
            trigger_slug=trigger_slug,
            trigger_config={}
        )
        
        logger.info(f"[Triggers] Created Slack DM trigger: {trigger_id}")
        
        # Store trigger info in Redis
        trigger_data = {
            "trigger": trigger_slug,
            "id": trigger_id,
            "toolkit": "SLACK",
            "connected_account_id": request.connected_account_id,
            "slack_user_id": request.slack_user_id,
            "type": "slack_dm"
        }
        await redis_service.set_user_setting(
            USER_ID,
            "slack_dm_trigger",
            json.dumps(trigger_data)
        )
        
        return {
            "success": True,
            "trigger_id": trigger_id,
            "message": "Slack DM trigger created successfully",
            "slack_user_id": request.slack_user_id
        }
        
    except Exception as e:
        logger.error(f"[Triggers] Error creating Slack DM trigger: {e}")
        raise HTTPException(status_code=500, detail=str(e))
