from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import logging

from app.services import redis_service
from app.routers.notion import insert_row, DATABASE_ID

logger = logging.getLogger(__name__)

USER_ID = os.getenv("USER_ID")

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


class ExecuteRequest(BaseModel):
    proposal_id: str


@router.get("")
async def get_proposals():
    """
    Get all pending proposals for the user.
    """
    try:
        proposals = await redis_service.get_proposals(USER_ID)
        return {"proposals": proposals}
    except Exception as e:
        logger.error(f"Error fetching proposals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str):
    """
    Remove/dismiss a proposal.
    """
    try:
        removed = await redis_service.remove_proposal(USER_ID, proposal_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return {"success": True, "proposal_id": proposal_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting proposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_proposal(request: ExecuteRequest):
    """
    Execute a proposal - creates a Notion page in the hardcoded database using direct API.
    """
    try:
        # Get the proposal from Redis
        proposals = await redis_service.get_proposals(USER_ID)
        proposal = None
        for p in proposals:
            if p.get("proposal_id") == request.proposal_id:
                proposal = p
                break
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Build Notion page content
        title = proposal.get("title", "Untitled Task")
        due_date = proposal.get("due_date")  # ISO format date string
        
        # Insert row using direct Notion API with hardcoded database
        result = insert_row(
            DATABASE_ID,
            title_prop="Task",  # Must match your database's title column name
            title=title,
            due_iso=due_date
        )
        
        # Remove the proposal from Redis after successful execution
        await redis_service.remove_proposal(USER_ID, request.proposal_id)
        
        logger.info(f"Successfully executed proposal {request.proposal_id} and created Notion page")
        
        return {
            "success": True,
            "proposal_id": request.proposal_id,
            "notion_page_id": result.get("id"),
            "notion_url": result.get("url")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing proposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/count")
async def get_proposal_count():
    """
    Get the count of pending proposals.
    """
    try:
        count = await redis_service.get_proposal_count(USER_ID)
        return {"count": count}
    except Exception as e:
        logger.error(f"Error getting proposal count: {e}")
        raise HTTPException(status_code=500, detail=str(e))
