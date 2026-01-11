from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/{app}/start")
async def start_oauth(app: str, entityId: str = Query(...)):
    """
    Initiate OAuth flow for a specific app.
    Returns redirect URL for the OAuth provider.
    """
    # TODO: Implement Composio OAuth initiation
    return {"redirect_url": f"https://oauth.example.com/{app}"}


@router.get("/connections")
async def get_connections(entityId: str = Query(...)):
    """
    Get all connected apps for an entity.
    Returns list of connected app names with ACTIVE status.
    """
    # TODO: Implement Composio connections fetch
    return {"connected_apps": []}

