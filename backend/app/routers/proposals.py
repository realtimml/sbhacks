from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


class Proposal(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    data: dict


class ExecuteRequest(BaseModel):
    proposal: Proposal
    action: str


@router.get("")
async def get_proposals(entityId: str = Query(...)):
    """
    Get all pending proposals for an entity.
    """
    # TODO: Implement Redis fetch
    return {"proposals": []}


@router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str, entityId: str = Query(...)):
    """
    Remove/dismiss a proposal.
    """
    # TODO: Implement Redis removal
    return {"success": True, "proposal_id": proposal_id}


@router.post("/execute")
async def execute_proposal(request: ExecuteRequest, entityId: str = Query(...)):
    """
    Execute a proposal (create calendar event, Notion page, etc).
    """
    # TODO: Implement Composio action execution
    return {"success": True, "proposal_id": request.proposal.id}

