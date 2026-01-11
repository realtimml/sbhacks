from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from app.services import redis_service
from app.services.composio_service import composio_service

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


# =============================================================================
# Request/Response Schemas
# =============================================================================

class ProposalResponse(BaseModel):
    """Response containing list of proposals"""
    proposals: list[dict]


class DeleteResponse(BaseModel):
    """Response for proposal deletion"""
    success: bool
    proposal_id: str


class ExecuteRequest(BaseModel):
    """Request to execute a proposal"""
    proposal_id: str
    action_type: str  # "calendar_event" | "notion_task"
    action_params: dict[str, Any]


class ExecuteResponse(BaseModel):
    """Response for proposal execution"""
    success: bool
    proposal_id: str
    result: Optional[dict] = None
    error: Optional[str] = None


# =============================================================================
# Action Type to Composio Action Mapping
# =============================================================================

ACTION_TYPE_MAP = {
    "notion_task": "NOTION_CREATE_PAGE",
    "notion_database": "NOTION_CREATE_DATABASE_ITEM",
}


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=ProposalResponse)
async def get_proposals(entityId: str = Query(..., description="User/entity ID")):
    """
    Get all pending proposals for an entity.
    Returns proposals from Redis, newest first.
    """
    proposals = await redis_service.get_proposals(entityId)
    return {"proposals": proposals}


@router.delete("/{proposal_id}", response_model=DeleteResponse)
async def delete_proposal(
    proposal_id: str,
    entityId: str = Query(..., description="User/entity ID")
):
    """
    Remove/dismiss a proposal without executing it.
    """
    removed = await redis_service.remove_proposal(entityId, proposal_id)
    if not removed:
        # Still return success - idempotent delete
        pass
    return {"success": True, "proposal_id": proposal_id}


@router.post("/execute", response_model=ExecuteResponse)
async def execute_proposal(
    request: ExecuteRequest,
    entityId: str = Query(..., description="User/entity ID")
):
    """
    Execute a proposal (create calendar event, Notion page, etc).
    Removes the proposal from Redis after successful execution.
    """
    # Map action type to Composio action
    composio_action = ACTION_TYPE_MAP.get(request.action_type)
    if not composio_action:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown action type: {request.action_type}. "
                   f"Valid types: {list(ACTION_TYPE_MAP.keys())}"
        )
    
    try:
        # Execute via Composio
        result = composio_service.execute_action(
            user_id=entityId,
            action=composio_action,
            params=request.action_params
        )
        
        # Remove proposal from Redis on success
        await redis_service.remove_proposal(entityId, request.proposal_id)
        
        return {
            "success": True,
            "proposal_id": request.proposal_id,
            "result": result
        }
    except ValueError as e:
        # Missing connection or unknown action
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Composio execution error
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute action: {str(e)}"
        )
