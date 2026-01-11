from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
import logging
import requests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notion", tags=["notion"])

# Notion API configuration
NOTION_TOKEN = os.environ.get("NOTION_TOKEN", "")
NOTION_VERSION = "2022-06-28"
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

# Hardcoded database ID for direct writes
DATABASE_ID = "2e59fd61a0128028ab15e5c03531bb72"
DATABASE_NAME = "Tasks"


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


class InsertRowRequest(BaseModel):
    title: str
    due_iso: Optional[str] = None
    title_prop: str = "Task"


def notion_search_pages(query: str, *, page_size: int = 10, start_cursor: str | None = None):
    """Search pages by title text."""
    url = "https://api.notion.com/v1/search"
    payload = {
        "query": query,
        "filter": {"property": "object", "value": "page"},
        "page_size": page_size,
    }
    if start_cursor:
        payload["start_cursor"] = start_cursor
    r = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()


def insert_row(database_id: str, *, title_prop: str, title: str, due_iso: str | None = None):
    """
    Create a new row (page) in a database.
    title_prop must match your database's title column name EXACTLY.
    In your database, the title property name is likely "Task" (not "Name").
    """
    url = "https://api.notion.com/v1/pages"
    properties = {
        title_prop: {
            "title": [{"text": {"content": title}}]
        }
    }
    if due_iso is not None:
        # property name must exist in the DB and be type "date"
        properties["Due"] = {"date": {"start": due_iso}}
    payload = {
        "parent": {"database_id": database_id},
        "properties": properties,
    }
    r = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()


@router.get("/databases")
async def get_notion_databases():
    """
    List all Notion databases accessible to the user.
    Returns the hardcoded database since we're using direct Notion API.
    """
    # Return the hardcoded database
    return {
        "databases": [
            {
                "id": DATABASE_ID,
                "title": DATABASE_NAME,
                "icon": None
            }
        ]
    }


@router.get("/databases/search")
async def search_notion_databases(q: str = Query(..., min_length=1)):
    """
    Search for Notion pages by name using direct Notion API.
    """
    try:
        result = notion_search_pages(q, page_size=10)
        
        pages = []
        for page in result.get("results", []):
            page_id = page.get("id", "")
            # Extract title from properties
            title = "Untitled"
            props = page.get("properties", {})
            for prop_value in props.values():
                if prop_value.get("type") == "title":
                    title_arr = prop_value.get("title", [])
                    if title_arr:
                        title = title_arr[0].get("plain_text", "Untitled")
                    break
            
            # Extract icon
            icon = None
            icon_obj = page.get("icon")
            if icon_obj:
                if icon_obj.get("type") == "emoji":
                    icon = icon_obj.get("emoji")
                elif icon_obj.get("type") == "external":
                    icon = icon_obj.get("external", {}).get("url")
            
            if page_id:
                pages.append({
                    "id": page_id,
                    "title": title,
                    "icon": icon
                })
        
        return {"databases": pages}
        
    except requests.RequestException as e:
        logger.error(f"Error searching Notion pages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings")
async def save_notion_settings(request: NotionSettingsRequest):
    """
    Save the user's selected Notion database.
    With hardcoded database, this is a no-op but kept for API compatibility.
    """
    return {"success": True}


@router.get("/settings")
async def get_notion_settings():
    """
    Get the user's saved Notion database settings.
    Hardcoded database ID for direct writes without selection.
    """
    return {
        "settings": {
            "database_id": DATABASE_ID,
            "database_name": DATABASE_NAME
        }
    }


@router.post("/insert")
async def insert_notion_row(request: InsertRowRequest):
    """
    Insert a new row into the hardcoded Notion database.
    """
    try:
        result = insert_row(
            DATABASE_ID,
            title_prop=request.title_prop,
            title=request.title,
            due_iso=request.due_iso
        )
        return {
            "success": True,
            "page_id": result.get("id"),
            "url": result.get("url")
        }
    except requests.RequestException as e:
        logger.error(f"Error inserting Notion row: {e}")
        raise HTTPException(status_code=500, detail=str(e))
