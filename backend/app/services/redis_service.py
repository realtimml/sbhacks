"""
Redis Service for proposal management, deduplication, rate limiting, and user settings.
Supports both local Redis (redis-py) and Upstash REST API (upstash-redis).
"""

import json
import hashlib
from typing import Optional, Any

import redis.asyncio as aioredis
from upstash_redis.asyncio import Redis as UpstashRedis

from app.config import settings

# Constants
PROPOSAL_TTL = 60 * 60 * 24 * 7  # 7 days in seconds
SEEN_MESSAGE_TTL = 60 * 60       # 1 hour in seconds

# Global Redis client
redis_client: Any = None


async def init_redis() -> None:
    """
    Initialize Redis client based on configuration.
    Uses Upstash REST API if credentials are provided, otherwise falls back to local Redis.
    """
    global redis_client
    
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        # Use Upstash REST API (HTTP-based, serverless compatible)
        redis_client = UpstashRedis(
            url=settings.UPSTASH_REDIS_REST_URL,
            token=settings.UPSTASH_REDIS_REST_TOKEN
        )
        print("Redis initialized: Upstash REST API")
    elif settings.REDIS_URL:
        # Use standard Redis TCP connection
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        print(f"Redis initialized: Local Redis at {settings.REDIS_URL}")
    else:
        raise ValueError(
            "No Redis configuration found. "
            "Set either UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or REDIS_URL"
        )


async def close_redis() -> None:
    """
    Close Redis connection gracefully.
    Note: Upstash REST client is stateless and doesn't require closing.
    """
    global redis_client
    if redis_client and hasattr(redis_client, 'close'):
        await redis_client.close()
    redis_client = None
    print("Redis connection closed")


# =============================================================================
# Proposal Management
# =============================================================================

async def add_proposal(entity_id: str, proposal: dict) -> None:
    """
    Add a new task proposal for an entity.
    Uses LPUSH to add to the front of the list, with 7-day TTL.
    """
    key = f"proposals:{entity_id}"
    await redis_client.lpush(key, json.dumps(proposal))
    await redis_client.expire(key, PROPOSAL_TTL)


async def get_proposals(entity_id: str, limit: int = 50) -> list[dict]:
    """
    Get all pending proposals for an entity.
    Returns up to `limit` proposals, newest first.
    """
    key = f"proposals:{entity_id}"
    raw = await redis_client.lrange(key, 0, limit - 1)
    
    proposals = []
    for item in raw:
        if isinstance(item, str):
            proposals.append(json.loads(item))
        else:
            proposals.append(item)
    return proposals


async def remove_proposal(entity_id: str, proposal_id: str) -> bool:
    """
    Remove a specific proposal by its ID.
    Finds the proposal in the list and removes it.
    Returns True if removed, False if not found.
    """
    key = f"proposals:{entity_id}"
    proposals = await get_proposals(entity_id)
    
    # Find the proposal to remove
    proposal_to_remove = None
    for p in proposals:
        if p.get("proposal_id") == proposal_id:
            proposal_to_remove = p
            break
    
    if not proposal_to_remove:
        return False
    
    # Remove the specific proposal from the list
    removed = await redis_client.lrem(key, 1, json.dumps(proposal_to_remove))
    return removed > 0


async def get_proposal_count(entity_id: str) -> int:
    """
    Get the count of pending proposals for an entity.
    """
    key = f"proposals:{entity_id}"
    return await redis_client.llen(key)


# =============================================================================
# Message Deduplication
# =============================================================================

async def has_seen_message(message_hash: str) -> bool:
    """
    Check if a message has been seen recently (for deduplication).
    """
    key = f"seen:{message_hash}"
    exists = await redis_client.exists(key)
    return exists > 0


async def mark_message_seen(message_hash: str) -> None:
    """
    Mark a message as seen with 1-hour TTL.
    """
    key = f"seen:{message_hash}"
    await redis_client.set(key, "1", ex=SEEN_MESSAGE_TTL)


def create_message_hash(source: str, sender_id: str, content: str) -> str:
    """
    Create a hash for message deduplication.
    Uses MD5 for fast, collision-resistant hashing (not for security).
    """
    message = f"{source}:{sender_id}:{content}"
    return hashlib.md5(message.encode()).hexdigest()


# =============================================================================
# User Settings
# =============================================================================

async def set_user_setting(entity_id: str, key: str, value: str) -> None:
    """
    Store a user setting (e.g., Notion database ID).
    """
    setting_key = f"settings:{entity_id}:{key}"
    await redis_client.set(setting_key, value)


async def get_user_setting(entity_id: str, key: str) -> Optional[str]:
    """
    Retrieve a user setting.
    Returns None if not found.
    """
    setting_key = f"settings:{entity_id}:{key}"
    return await redis_client.get(setting_key)


async def delete_user_setting(entity_id: str, key: str) -> None:
    """
    Delete a user setting.
    """
    setting_key = f"settings:{entity_id}:{key}"
    await redis_client.delete(setting_key)


# =============================================================================
# Rate Limiting
# =============================================================================

async def check_rate_limit(
    entity_id: str,
    max_requests: int = 10,
    window_seconds: int = 60
) -> dict:
    """
    Check if an entity has exceeded their rate limit.
    Uses sliding window counter pattern.
    
    Returns:
        dict with 'allowed' (bool) and 'remaining' (int) keys
    """
    key = f"ratelimit:{entity_id}"
    current = await redis_client.incr(key)
    
    # Set expiry only on first request in window
    if current == 1:
        await redis_client.expire(key, window_seconds)
    
    allowed = current <= max_requests
    remaining = max(0, max_requests - current)
    
    return {"allowed": allowed, "remaining": remaining}
