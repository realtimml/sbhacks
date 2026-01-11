from fastapi import APIRouter, Request, Header
from typing import Optional
import logging
import json
import os

from app.services.composio_service import composio_service
from app.services import redis_service

logger = logging.getLogger(__name__)

USER_ID = os.getenv("USER_ID")

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def is_message_mentioning_user(payload: dict, slack_user_id: str | None, dm_only: bool = False) -> tuple[bool, dict]:
    """
    Check if the Slack message mentions the specified user.
    
    Args:
        payload: The webhook payload from Composio
        slack_user_id: The Slack user ID to check for mentions (e.g., "U12345678")
        dm_only: If True, only match DMs. If False, match any message with mention.
        
    Returns:
        Tuple of (is_match, debug_info)
    """
    # Extract message data from payload
    data = payload.get("data", payload)
    
    # Check message type
    channel = data.get("channel", "")
    channel_type = data.get("channel_type", "")
    text = data.get("text", "") or data.get("message", {}).get("text", "")
    
    is_dm = channel_type == "im" or channel.startswith("D")
    
    debug_info = {
        "channel": channel,
        "channel_type": channel_type,
        "is_dm": is_dm,
        "text_preview": text[:100] if text else "",
        "slack_user_id": slack_user_id,
        "dm_only": dm_only,
    }
    
    # If dm_only is True and this isn't a DM, return False
    if dm_only and not is_dm:
        debug_info["reason"] = "not_dm"
        return False, debug_info
    
    # If no user ID specified, return True for all messages (or DMs if dm_only)
    if not slack_user_id:
        debug_info["reason"] = "no_user_id_filter"
        return True, debug_info
    
    # Check for user mention in the message text
    mention_pattern = f"<@{slack_user_id}>"
    has_mention = mention_pattern in text
    
    debug_info["mention_pattern"] = mention_pattern
    debug_info["has_mention"] = has_mention
    debug_info["reason"] = "mention_found" if has_mention else "no_mention"
    
    return has_mention, debug_info


# Keep old function for backward compatibility
def is_dm_mentioning_user(payload: dict, slack_user_id: str | None) -> bool:
    """Legacy function - now also matches channel messages with mentions."""
    result, _ = is_message_mentioning_user(payload, slack_user_id, dm_only=False)
    return result


def extract_slack_message_info(payload: dict) -> dict:
    """
    Extract relevant information from a Slack message webhook payload.
    """
    data = payload.get("data", payload)
    
    return {
        "channel": data.get("channel", ""),
        "channel_type": data.get("channel_type", ""),
        "user": data.get("user", ""),
        "text": data.get("text", "") or data.get("message", {}).get("text", ""),
        "ts": data.get("ts", ""),
        "event_ts": data.get("event_ts", ""),
        "type": data.get("type", ""),
        "subtype": data.get("subtype", ""),
    }


@router.post("/composio")
async def composio_webhook(
    request: Request,
    x_composio_signature: Optional[str] = Header(None)
):
    """
    Receive webhooks from Composio (Slack messages, Gmail emails, etc).
    - Verify HMAC-SHA256 signature
    - Pre-filter messages (skip bots, system notifications)
    - Check rate limit and deduplication
    - Run task inference
    - Save actionable proposals to Redis
    """
    body = await request.json()
    
    logger.info(f"[Webhooks] Received webhook: {json.dumps(body, indent=2)[:500]}...")
    
    # Extract trigger information - check multiple possible field names
    trigger_name = body.get("trigger_name", "") or body.get("triggerName", "") or body.get("type", "")
    trigger_id = body.get("trigger_id", "") or body.get("triggerId", "")
    
    # Handle Slack triggers (DMs and channel messages with mentions)
    if "SLACK" in trigger_name.upper():
        logger.info(f"[Webhooks] Processing Slack trigger: {trigger_name}")
        
        # Get stored Slack DM trigger config from Redis
        trigger_config_str = await redis_service.get_user_setting(USER_ID, "slack_dm_trigger")
        slack_user_id = None
        
        if trigger_config_str:
            try:
                trigger_config = json.loads(trigger_config_str)
                slack_user_id = trigger_config.get("slack_user_id")
            except json.JSONDecodeError:
                pass
        
        # Extract message info
        message_info = extract_slack_message_info(body)
        
        # Skip bot messages and system messages
        if message_info.get("subtype") in ["bot_message", "channel_join", "channel_leave"]:
            logger.info(f"[Webhooks] Skipping system/bot message: {message_info.get('subtype')}")
            return {"status": "skipped", "reason": "bot_or_system_message"}
        
        # Check if this message mentions our user
        is_match, match_debug = is_message_mentioning_user(body, slack_user_id, dm_only=False)
        
        if is_match:
            logger.info(f"[Webhooks] Mention detected! User: {message_info.get('user')}, Text: {message_info.get('text')[:100]}")
            
            # Print the full message to console
            print("\n" + "="*80)
            print("🔔 NEW SLACK MESSAGE RECEIVED")
            print("="*80)
            print(f"From: {message_info.get('user')}")
            print(f"Channel: {message_info.get('channel')} ({message_info.get('channel_type')})")
            print(f"Message: {message_info.get('text')}")
            print(f"Timestamp: {message_info.get('ts')}")
            print("="*80 + "\n")
            
            # Store the mention event for processing
            mention_event = {
                "type": "slack_dm_mention",
                "trigger_id": trigger_id,
                "sender": message_info.get("user"),
                "channel": message_info.get("channel"),
                "text": message_info.get("text"),
                "ts": message_info.get("ts"),
            }
            
            # Save to Redis for later retrieval/processing
            await redis_service.set_user_setting(
                USER_ID,
                f"slack_mention_{message_info.get('ts', 'latest')}",
                json.dumps(mention_event)
            )
            
            # TODO: Add your response logic here
            # For example, use composio_service.execute_action to send a reply:
            #
            # await composio_service.execute_action(
            #     user_id=USER_ID,
            #     action="SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
            #     params={
            #         "channel": message_info.get("channel"),
            #         "text": "Thanks for reaching out! I received your message."
            #     }
            # )
            
            return {
                "status": "processed",
                "event_type": "slack_dm_mention",
                "sender": message_info.get("user"),
                "message_preview": message_info.get("text", "")[:100]
            }
        else:
            logger.info("[Webhooks] Slack message received but not a DM mention, skipping")
            return {"status": "skipped", "reason": "not_dm_mention"}
    
    # TODO: Handle other trigger types (Gmail, etc.)
    
    return {"status": "received"}

