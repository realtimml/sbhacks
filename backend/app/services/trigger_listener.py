"""
Trigger Listener Service - Background listener for Composio trigger events.

Handles incoming events from Gmail and Slack triggers, filters them appropriately,
runs task inference, and saves proposals to Redis.
"""

import asyncio
import threading
import logging
from typing import Optional, Callable, Any

from composio import Composio
from composio.types import TriggerEvent

from app.services.task_inference import infer_task_from_message
from app.services import redis_service
from app.models.schemas import MessageContext, MessageSource

logger = logging.getLogger(__name__)


def is_user_mentioned(text: str, slack_user_id: Optional[str] = None) -> bool:
    """
    Check if Slack message mentions the user or broadcast mentions.
    
    Args:
        text: The message text to check
        slack_user_id: The Slack user ID to check for direct mentions
        
    Returns:
        True if user is mentioned, False otherwise
    """
    # Check for broadcast mentions
    broadcast_patterns = ["<!here>", "<!channel>", "<!everyone>"]
    if any(pattern in text for pattern in broadcast_patterns):
        return True
    
    # Check for direct user mention
    if slack_user_id and f"<@{slack_user_id}>" in text:
        return True
    
    # Also check for @mentions in plain text (some integrations)
    if "@here" in text.lower() or "@channel" in text.lower() or "@everyone" in text.lower():
        return True
    
    return False


class TriggerListener:
    """
    Background listener for Composio trigger events.
    
    Subscribes to trigger events and processes them:
    - Gmail: All new emails go through task inference
    - Slack: Only messages with user mentions are processed
    """
    
    def __init__(self, composio_client: Composio, user_id: str):
        """
        Initialize the trigger listener.
        
        Args:
            composio_client: Initialized Composio client
            user_id: The entity ID for the user
        """
        self.client = composio_client
        self.user_id = user_id
        self.subscription = None
        self.thread: Optional[threading.Thread] = None
        self.running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        
        logger.info(f"[TriggerListener] Initialized for user: {user_id}")
    
    async def handle_gmail(self, event: TriggerEvent):
        """
        Handle new Gmail message event.
        
        Extracts email content and runs task inference to detect actionable items.
        
        Args:
            event: The trigger event from Composio
        """
        logger.info("[TriggerListener] Handling Gmail event")
        
        try:
            payload = event.get("payload", {})
            
            # Extract email content
            body = payload.get("body", "") or payload.get("snippet", "") or ""
            sender = payload.get("from", "unknown")
            subject = payload.get("subject", "")
            message_id = payload.get("id", "") or payload.get("messageId", "")
            date = payload.get("date", "") or payload.get("internalDate", "")
            
            # Skip if no content
            if not body and not subject:
                logger.info("[TriggerListener] Skipping Gmail event - no content")
                return
            
            # Combine subject and body for analysis
            content = f"Subject: {subject}\n\n{body}" if subject else body
            
            # Create message context for inference
            context = MessageContext(
                source=MessageSource.GMAIL,
                content=content,
                sender=sender,
                timestamp=date,
                subject=subject,
                message_id=message_id,
            )
            
            logger.info(f"[TriggerListener] Processing Gmail from: {sender}, subject: {subject[:50]}...")
            
            # Run task inference
            proposal = await infer_task_from_message(context)
            
            if proposal:
                # Save proposal to Redis
                await redis_service.add_proposal(self.user_id, proposal.model_dump())
                logger.info(f"[TriggerListener] Created proposal from Gmail: {proposal.title}")
            else:
                logger.info("[TriggerListener] No actionable task detected in Gmail")
                
        except Exception as e:
            logger.error(f"[TriggerListener] Error handling Gmail event: {e}")
    
    async def handle_slack(self, event: TriggerEvent):
        """
        Handle new Slack message event.
        
        Only processes messages where the user is mentioned.
        
        Args:
            event: The trigger event from Composio
        """
        logger.info("[TriggerListener] Handling Slack event")
        
        try:
            payload = event.get("payload", {})
            
            text = payload.get("text", "")
            user = payload.get("user", "unknown")
            channel = payload.get("channel", "")
            channel_type = payload.get("channel_type", "")
            ts = payload.get("ts", "")
            thread_ts = payload.get("thread_ts")
            
            # Skip if no text
            if not text:
                logger.info("[TriggerListener] Skipping Slack event - no text")
                return
            
            # Skip bot messages
            if payload.get("bot_id") or payload.get("subtype") == "bot_message":
                logger.info("[TriggerListener] Skipping Slack bot message")
                return
            
            # Filter: only process if user is mentioned
            # Note: In a multi-user system, we'd get the Slack user ID from the connected account
            if not is_user_mentioned(text):
                logger.info("[TriggerListener] Skipping Slack message - user not mentioned")
                return
            
            # Create message context for inference
            context = MessageContext(
                source=MessageSource.SLACK,
                content=text,
                sender=user,
                timestamp=ts,
                channel=channel,
                channel_type=channel_type,
                thread_id=thread_ts,
            )
            
            logger.info(f"[TriggerListener] Processing Slack from: {user}, channel: {channel}")
            
            # Run task inference
            proposal = await infer_task_from_message(context)
            
            if proposal:
                # Save proposal to Redis
                await redis_service.add_proposal(self.user_id, proposal.model_dump())
                logger.info(f"[TriggerListener] Created proposal from Slack: {proposal.title}")
            else:
                logger.info("[TriggerListener] No actionable task detected in Slack")
                
        except Exception as e:
            logger.error(f"[TriggerListener] Error handling Slack event: {e}")
    
    def _run_async(self, coro):
        """
        Run an async coroutine from a sync context.
        
        Uses the stored event loop or creates a new one.
        """
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, self._loop)
        else:
            asyncio.run(coro)
    
    def start(
        self, 
        gmail_trigger_id: Optional[str] = None, 
        slack_trigger_id: Optional[str] = None,
        event_loop: Optional[asyncio.AbstractEventLoop] = None
    ):
        """
        Start listening for trigger events in a background thread.
        
        Args:
            gmail_trigger_id: ID of the Gmail trigger to listen for
            slack_trigger_id: ID of the Slack trigger to listen for
            event_loop: The main event loop for running async handlers
        """
        if not gmail_trigger_id and not slack_trigger_id:
            logger.warning("[TriggerListener] No trigger IDs provided, not starting")
            return
        
        self._loop = event_loop
        self.running = True
        
        logger.info(f"[TriggerListener] Starting listener - Gmail: {gmail_trigger_id}, Slack: {slack_trigger_id}")
        
        try:
            # Create trigger subscription
            self.subscription = self.client.triggers.subscribe()
            
            # Register Gmail handler
            if gmail_trigger_id:
                @self.subscription.handle(
                    trigger_id=gmail_trigger_id,
                    trigger_slug="GMAIL_NEW_GMAIL_MESSAGE",
                )
                def on_gmail(event: TriggerEvent):
                    logger.info("[TriggerListener] Gmail event received")
                    self._run_async(self.handle_gmail(event))
                
                logger.info(f"[TriggerListener] Registered Gmail handler for trigger: {gmail_trigger_id}")
            
            # Register Slack handler
            if slack_trigger_id:
                @self.subscription.handle(
                    trigger_id=slack_trigger_id,
                    trigger_slug="SLACK_NEW_MESSAGE",
                )
                def on_slack(event: TriggerEvent):
                    logger.info("[TriggerListener] Slack event received")
                    self._run_async(self.handle_slack(event))
                
                logger.info(f"[TriggerListener] Registered Slack handler for trigger: {slack_trigger_id}")
            
            # Start listening in background thread
            def listen():
                try:
                    logger.info("[TriggerListener] Background thread started, waiting for events...")
                    self.subscription.wait_forever()
                except Exception as e:
                    logger.error(f"[TriggerListener] Error in background listener: {e}")
                finally:
                    self.running = False
                    logger.info("[TriggerListener] Background thread stopped")
            
            self.thread = threading.Thread(target=listen, daemon=True)
            self.thread.start()
            
            logger.info("[TriggerListener] Started successfully")
            
        except Exception as e:
            logger.error(f"[TriggerListener] Error starting listener: {e}")
            self.running = False
    
    def stop(self):
        """
        Stop the trigger listener.
        """
        logger.info("[TriggerListener] Stopping...")
        self.running = False
        
        # The daemon thread will stop when the main process exits
        # We don't need to explicitly join it
        
        logger.info("[TriggerListener] Stopped")
    
    @property
    def is_running(self) -> bool:
        """Check if the listener is running."""
        return self.running and self.thread is not None and self.thread.is_alive()

