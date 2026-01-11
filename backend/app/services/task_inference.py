"""
Task Inference Service - Two-stage AI pipeline for task extraction.

Converts incoming messages (Slack, Gmail) into actionable task proposals.
Implements a cost-effective two-stage approach:
  Stage 1: Fast, cheap classification (chat vs task)
  Stage 2: Detailed structured extraction (only if Stage 1 passes)

"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from app.models.schemas import (
    MessageContext,
    TaskExtraction,
    TaskProposal,
    SourceContext,
    Priority,
)
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


# =============================================================================
# Stage 1: Quick Classification
# =============================================================================

async def classify_message(content: str) -> str:
    """
    Stage 1: Quick spam/chat classification.
    
    Returns "task" or "chat" - cheap and fast.
    Uses fail-open strategy: defaults to "task" on error or empty response.
    
    Args:
        content: The message content to classify (first 500 chars used)
        
    Returns:
        "task" if message may contain actionable content, "chat" otherwise
    """
    prompt = f'''You are classifying messages. Respond with exactly one word: either "task" or "chat".

TASK - message contains:
- Deadlines (by today, by Friday, EOD, ASAP, due)
- Action requests (complete, finish, do, submit, send, review)
- Assignments or todos
- Something that needs to be done

CHAT - message contains:
- Greetings, social chat
- Already completed items
- Pure information with no action needed

Message to classify:
"{content[:500]}"

Classification (task or chat):'''

    try:
        logger.info(f"[TaskInference] Calling classification model with content: {content[:100]}")
        
        result = await gemini_service.generate_text(prompt, max_tokens=50)
        raw_result = result.strip().lower() if result else ""
        
        logger.info(f"[TaskInference] Classification raw response: {repr(result)}")
        
        # If empty response, default to task to let extraction decide
        if not raw_result:
            logger.info("[TaskInference] Empty response from model, defaulting to task")
            return "task"
        
        # Extract just "task" or "chat" from the response
        classification = "task" if "task" in raw_result else "chat"
        logger.info(f"[TaskInference] Classification result: {classification}")
        return classification
        
    except Exception as e:
        logger.error(f"[TaskInference] Classification error: {e}")
        # On error, default to "task" to allow extraction to make the final call
        return "task"


# =============================================================================
# Stage 2: Full Task Extraction
# =============================================================================

async def extract_task_details(
    context: MessageContext,
    current_date: Optional[datetime] = None,
) -> TaskExtraction:
    """
    Stage 2: Full task extraction with structured output.
    
    Only called if Stage 1 returns "task". Uses Gemini's structured output
    with Pydantic schema validation.
    
    Args:
        context: Full message context including source, sender, content, etc.
        current_date: Override for current date (useful for testing)
        
    Returns:
        TaskExtraction with is_task, confidence, and optional task details
    """
    if current_date is None:
        current_date = datetime.now()
    
    formatted_date = current_date.strftime("%A, %B %d, %Y")
    
    system_prompt = f'''You are a task detection AI. Analyze messages to identify actionable tasks, to-dos, and deadlines.

CURRENT DATE: {formatted_date}

TASK INDICATORS (high confidence 0.8-1.0):
- Direct requests: "please do", "can you", "need you to", "make sure to"
- Action items: "TODO", "action item", "follow up", "don't forget"
- Deadlines: "by Friday", "due tomorrow", "ASAP", "urgent", "EOD", "end of week"
- Assignments: mentions of the user, "assigned to you", "your responsibility"
- Commitments: "I'll handle", "I will", "let me take care of"

TASK INDICATORS (medium confidence 0.5-0.8):
- Questions implying action: "Can we schedule?", "Would you be able to?"
- Suggestions: "We should", "It would be good to"
- Meeting follow-ups: "As discussed", "Per our conversation"

LOW CONFIDENCE (0.3-0.5):
- Vague requests without clear action
- Information that might need follow-up

NOT TASKS (confidence < 0.3):
- Pure informational messages
- Social chat, greetings
- Already completed items ("I finished", "Done")
- Questions seeking information only
- Automated notifications without action needed

PRIORITY RULES:
- HIGH: Contains "urgent", "ASAP", "critical", "blocking", deadline within 24h
- MEDIUM: Has a deadline within 1 week, or explicit request
- LOW: No deadline, nice-to-have, suggestions

When extracting deadlines, convert relative dates to ISO 8601 format based on the current date.
Keep task titles concise (under 80 characters) and actionable.'''

    # Build source-specific info
    if context.source.value == "slack":
        source_info = f"CHANNEL: {context.channel or 'DM'}"
        source_type = "Slack message"
    else:
        source_info = f"SUBJECT: {context.subject or '(no subject)'}"
        source_type = "email"

    user_prompt = f'''Analyze this {source_type} for potential tasks:

SOURCE: {context.source.value.upper()}
{source_info}
FROM: {context.sender}
TIME: {context.timestamp}

CONTENT:
{context.content}

Determine if this contains an actionable task for the recipient. If yes, extract the task details.'''

    try:
        logger.info(f"[TaskInference] Extracting task details from {context.source.value} message")
        
        result = await gemini_service.generate_structured_async(
            prompt=user_prompt,
            response_schema=TaskExtraction,
            system_prompt=system_prompt,
        )
        
        logger.info(f"[TaskInference] Extraction result: is_task={result.is_task}, confidence={result.confidence}")
        return result
        
    except Exception as e:
        logger.error(f"[TaskInference] Extraction error: {e}")
        # Return low-confidence negative result on error
        return TaskExtraction(
            is_task=False,
            confidence=0.0,
            task=None,
        )


# =============================================================================
# Main Pipeline
# =============================================================================

async def infer_task_from_message(
    context: MessageContext,
    confidence_threshold: float = 0.6, # change this to a more specific confidence threshold (0%-100%)
) -> Optional[TaskProposal]:
    """
    Full two-stage inference pipeline.
    
    Returns a TaskProposal if a task is detected with sufficient confidence.
    
    Args:
        context: Full message context (source, content, sender, etc.)
        confidence_threshold: Minimum confidence to create a proposal (default 0.6)
        
    Returns:
        TaskProposal if task detected with sufficient confidence, None otherwise
    """
    # Stage 1: Quick classification
    classification = await classify_message(context.content)
    
    if classification == "chat":
        logger.info("[TaskInference] Message classified as chat, skipping extraction")
        return None
    
    # Stage 2: Full extraction
    extraction = await extract_task_details(context)
    
    if not extraction.is_task or extraction.confidence < confidence_threshold:
        logger.info(
            f"[TaskInference] Task not detected or low confidence: {extraction.confidence}"
        )
        return None
    
    if not extraction.task:
        logger.info("[TaskInference] No task details extracted")
        return None
    
    # Build the proposal
    proposal = TaskProposal(
        proposal_id=uuid.uuid4().hex[:8],
        type="task_proposal",
        title=extraction.task.title,
        description=extraction.task.description,
        due_date=extraction.task.due_date,
        priority=extraction.task.priority,
        source=context.source,
        source_context=SourceContext(
            channel=context.channel,
            subject=context.subject,
            sender=context.sender,
            timestamp=context.timestamp,
            original_content=context.content[:1000],  # Limit stored content
            message_id=context.message_id,
            thread_id=context.thread_id,
        ),
        confidence=extraction.confidence,
        reasoning=extraction.task.reasoning,
        created_at=datetime.now().isoformat(),
    )
    
    logger.info(f"[TaskInference] Created proposal: {proposal.proposal_id} - {proposal.title}")
    return proposal
