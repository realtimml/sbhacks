from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import logging

from app.services import redis_service
from app.services.composio_service import composio_service

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
    Execute a proposal - creates a Notion page in the user's selected database.
    """
    try:
        # Get the user's selected Notion database
        database_id = await redis_service.get_user_setting(USER_ID, "notion_database_id")
        
        if not database_id:
            raise HTTPException(
                status_code=400, 
                detail="No Notion database configured. Please select a database in settings."
            )
        
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
        description = proposal.get("description", "")
        
        # Add source context to description
        source_context = proposal.get("source_context", {})
        if source_context:
            source = proposal.get("source", "unknown")
            sender = source_context.get("sender", "Unknown")
            original = source_context.get("original_content", "")[:500]
            
            description_parts = [description] if description else []
            description_parts.append(f"\n\n---\nSource: {source.upper()}")
            description_parts.append(f"From: {sender}")
            if original:
                description_parts.append(f"Original message:\n{original}")
            
            full_description = "\n".join(description_parts)
        else:
            full_description = description
        
        # Execute Notion action via Composio using NOTION_UPSERT_ROW_DATABASE
        # This adds a row to the user's task database with structured fields
        result = await composio_service.execute_action(
            user_id=USER_ID,
            action="NOTION_UPSERT_ROW_DATABASE",
            params={
                "database_id": database_id,
                "items": [{
                    "Name": title,
                    "Description": full_description,
                    "Priority": proposal.get("priority", "medium").capitalize(),
                    "Source": proposal.get("source", "slack").upper(),
                    "Status": "To Do",
                }]
            }
        )
        
        # Check for errors in result
        if "error" in result:
            logger.error(f"Notion action failed: {result['error']}")
            raise HTTPException(status_code=500, detail=f"Failed to create Notion page: {result['error']}")
        
        # Remove the proposal from Redis after successful execution
        await redis_service.remove_proposal(USER_ID, request.proposal_id)
        
        logger.info(f"Successfully executed proposal {request.proposal_id} and created Notion page")
        
        return {
            "success": True,
            "proposal_id": request.proposal_id,
            "notion_page_id": result.get("data", {}).get("id") or result.get("id")
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
