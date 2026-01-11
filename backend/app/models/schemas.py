"""
Pydantic models/schemas for the application.
"""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class TaskType(str, Enum):
    """Types of tasks that can be extracted from messages."""
    CALENDAR_EVENT = "calendar_event"
    NOTION_TASK = "notion_task"
    REMINDER = "reminder"


class TaskProposal(BaseModel):
    """
    A task proposal generated from incoming messages.
    Stored in Redis for HITL (Human-in-the-Loop) approval.
    """
    proposal_id: str
    task_type: str
    title: str
    description: Optional[str] = None
    source: str  # e.g., "slack", "gmail"
    source_message_id: Optional[str] = None
    extracted_data: dict  # Task-specific data (attendees, dates, etc.)
    confidence: float  # AI confidence score (0.0 - 1.0)
    created_at: str  # ISO 8601 timestamp


class ExtractedTask(BaseModel):
    """
    Structured task data extracted by Gemini during inference.
    Used for generation_config with response_schema.
    """
    task_type: TaskType
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    attendees: list[str] = []
    confidence: float
