"""
Pydantic models/schemas for the application.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# =============================================================================
# Enums
# =============================================================================

class TaskType(str, Enum):
    """Types of tasks that can be extracted from messages."""
    CALENDAR_EVENT = "calendar_event"
    NOTION_TASK = "notion_task"
    REMINDER = "reminder"


class Priority(str, Enum):
    """Priority levels for extracted tasks."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class MessageSource(str, Enum):
    """Source platforms for incoming messages."""
    SLACK = "slack"
    GMAIL = "gmail"


# =============================================================================
# Task Inference Schemas (Stage 1 & 2)
# =============================================================================

class MessageContext(BaseModel):
    """
    Context about the incoming message being analyzed.
    Used as input to the task inference pipeline.
    """
    source: MessageSource
    content: str
    sender: str
    timestamp: str
    # Slack-specific
    channel: Optional[str] = None
    channel_type: Optional[str] = None  # "channel" | "group" | "im" | "mpim"
    thread_id: Optional[str] = None
    # Gmail-specific
    subject: Optional[str] = None
    message_id: Optional[str] = None
    is_reply: Optional[bool] = None


class TaskDetails(BaseModel):
    """
    Extracted task details from Stage 2 inference.
    Nested within TaskExtraction when a task is detected.
    """
    title: str = Field(..., description="Concise task title (max 80 chars)")
    description: Optional[str] = Field(None, description="Additional context or details")
    due_date: Optional[str] = Field(None, description="ISO 8601 date if deadline mentioned")
    priority: Priority = Field(..., description="Inferred priority level")
    reasoning: str = Field(..., description="Why this was identified as a task")


class TaskExtraction(BaseModel):
    """
    Response schema for Stage 2 structured output.
    Used with Gemini's generation_config.response_schema.
    """
    is_task: bool = Field(..., description="Whether this message contains an actionable task")
    confidence: float = Field(..., ge=0.00, le=1.00, description="Confidence score 0.00-1.00")
    task: Optional[TaskDetails] = None


# =============================================================================
# Source Context (for TaskProposal)
# =============================================================================

class SourceContext(BaseModel):
    """
    Original message metadata stored with proposals.
    Used for reference and potential execution context.
    """
    channel: Optional[str] = None
    subject: Optional[str] = None
    sender: str
    timestamp: str
    original_content: str  # Limited to first 1000 chars
    message_id: Optional[str] = None
    thread_id: Optional[str] = None


# =============================================================================
# Task Proposal (HITL Storage)
# =============================================================================

class TaskProposal(BaseModel):
    """
    A task proposal generated from incoming messages.
    Stored in Redis for HITL (Human-in-the-Loop) approval.
    """
    proposal_id: str
    type: str = "task_proposal"  # Discriminator field
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Priority
    source: MessageSource
    source_context: SourceContext
    confidence: float = Field(..., ge=0, le=1, description="AI confidence score (0.0 - 1.0)")
    reasoning: str
    created_at: str  # ISO 8601 timestamp


# =============================================================================
# Legacy Models (kept for backwards compatibility)
# =============================================================================

class ExtractedTask(BaseModel):
    """
    Structured task data extracted by Gemini during inference.
    Used for generation_config with response_schema.
    
    Note: Consider using TaskExtraction for new code.
    """
    task_type: TaskType
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    attendees: list[str] = []
    confidence: float
