from fastapi import APIRouter, HTTPException
from app.services.composio_service import composio_service
from app.config import settings
from dotenv import load_dotenv 
import os

load_dotenv()

USER_ID = os.getenv("USER_ID")

router = APIRouter(prefix="/api/auth", tags=["auth"])



@router.get("/{app}/start")
async def start_oauth(app: str):
    """
    Initiate OAuth flow for a specific app.
    Returns redirect URL for the OAuth provider.
    """
    try:
        redirect_url = composio_service.initiate_connection(
            app=app,
            user_id=USER_ID,
            callback_url=settings.FRONTEND_URL
        )
        return {"redirect_url": redirect_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/connections")
async def get_connections():
    """
    Get all connected apps for the default user.
    Returns list of connected app names with ACTIVE status.
    """
    connected_apps = composio_service.get_connections(user_id=USER_ID)
    return {"connected_apps": connected_apps}
