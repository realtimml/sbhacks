from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


class TriggerRequest(BaseModel):
    triggers: List[str]  # e.g., ["SLACK_NEW_MESSAGE", "GMAIL_NEW_EMAIL"]


@router.post("")
async def subscribe_triggers(request: TriggerRequest, entityId: str = Query(...)):
    """
    Subscribe entity to Composio webhook triggers.
    """
    # TODO: Implement Composio trigger subscription
    return {"success": True, "subscribed": request.triggers}


@router.delete("")
async def unsubscribe_triggers(entityId: str = Query(...), triggers: Optional[List[str]] = Query(None)):
    """
    Unsubscribe entity from Composio webhook triggers.
    """
    # TODO: Implement Composio trigger unsubscription
    return {"success": True, "unsubscribed": triggers or "all"}

