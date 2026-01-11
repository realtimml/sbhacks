from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
import logging

from app.services.composio_service import composio_service
from app.services import redis_service

logger = logging.getLogger(__name__)

USER_ID = os.getenv("USER_ID")

router = APIRouter(prefix="/api/notion", tags=["notion"])


class NotionDatabase(BaseModel):
    id: str
    title: str
    icon: Optional[str] = None


class NotionSettingsRequest(BaseModel):
    database_id: str
    database_name: str


class NotionSettingsResponse(BaseModel):
    database_id: str
    database_name: str


@router.get("/databases")
async def get_notion_databases():
    """
    List all Notion databases accessible to the user.
    """
    try:
        result = await composio_service.execute_action(
            user_id=USER_ID,
            action="NOTION_LIST_DATABASES",
            params={}
        )
        
        # Handle error response
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Extract databases from result
        databases = []
        results_data = result.get("data", {}).get("results", [])
        if not results_data:
            results_data = result.get("results", [])
        
        for db in results_data:
            db_id = db.get("id", "")
            # Extract title from title array
            title_arr = db.get("title", [])
            title = ""
            if title_arr and len(title_arr) > 0:
                title = title_arr[0].get("plain_text", "") or title_arr[0].get("text", {}).get("content", "")
            
            # Extract icon
            icon = None
            icon_obj = db.get("icon")
            if icon_obj:
                if icon_obj.get("type") == "emoji":
                    icon = icon_obj.get("emoji")
                elif icon_obj.get("type") == "external":
                    icon = icon_obj.get("external", {}).get("url")
            
            if db_id:
                databases.append({
                    "id": db_id,
                    "title": title or "Untitled",
                    "icon": icon
                })
        
        return {"databases": databases}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing Notion databases: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/databases/search")
async def search_notion_databases(q: str = Query(..., min_length=1)):
    """
    Search for Notion databases by name.
    """
    try:
        result = await composio_service.execute_action(
            user_id=USER_ID,
            action="NOTION_SEARCH_PAGES_AND_DATABASES",
            params={
                "query": q,
                "filter": {"value": "database", "property": "object"}
            }
        )
        
        # Handle error response
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Extract databases from result
        databases = []
        results_data = result.get("data", {}).get("results", [])
        if not results_data:
            results_data = result.get("results", [])
        
        for db in results_data:
            db_id = db.get("id", "")
            # Extract title from title array
            title_arr = db.get("title", [])
            title = ""
            if title_arr and len(title_arr) > 0:
                title = title_arr[0].get("plain_text", "") or title_arr[0].get("text", {}).get("content", "")
            
            # Extract icon
            icon = None
            icon_obj = db.get("icon")
            if icon_obj:
                if icon_obj.get("type") == "emoji":
                    icon = icon_obj.get("emoji")
                elif icon_obj.get("type") == "external":
                    icon = icon_obj.get("external", {}).get("url")
            
            if db_id:
                databases.append({
                    "id": db_id,
                    "title": title or "Untitled",
                    "icon": icon
                })
        
        return {"databases": databases}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching Notion databases: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings")
async def save_notion_settings(request: NotionSettingsRequest):
    """
    Save the user's selected Notion database.
    """
    try:
        # Save both database_id and database_name
        await redis_service.set_user_setting(USER_ID, "notion_database_id", request.database_id)
        await redis_service.set_user_setting(USER_ID, "notion_database_name", request.database_name)
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error saving Notion settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings")
async def get_notion_settings():
    """
    Get the user's saved Notion database settings.
    """
    try:
        database_id = await redis_service.get_user_setting(USER_ID, "notion_database_id")
        database_name = await redis_service.get_user_setting(USER_ID, "notion_database_name")
        
        if not database_id:
            return {"settings": None}
        
        return {
            "settings": {
                "database_id": database_id,
                "database_name": database_name or "Unknown"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting Notion settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

