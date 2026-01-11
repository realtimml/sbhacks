from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from datetime import datetime
import json
import logging

from app.services.gemini_service import gemini_service
from app.services.composio_service import composio_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


# System prompt template with placeholder for date/time
SYSTEM_PROMPT = """You are Hound, a helpful AI assistant that can access the user's connected services (Gmail, Slack, Notion) to help them with tasks.

Current date and time: {current_datetime}

Guidelines:
- Be concise and helpful
- When searching emails or messages, summarize the key points
- If you need to use a tool, explain briefly what you're doing
- If a tool fails, explain the error and suggest alternatives
- Format responses with markdown when appropriate for readability

Available capabilities based on user's connected services:
- Search and read emails from Gmail
- Search and read messages from Slack
- Access Notion pages and databases
"""


@router.post("")
async def chat(request: ChatRequest, x_entity_id: str = Header(...)):
    """
    Handle chat messages with Gemini + tool execution.
    Returns SSE stream of response chunks.
    """
    logger.info(f"[ChatRouter] Received chat request from entity: {x_entity_id}")
    logger.info(f"[ChatRouter] Message count: {len(request.messages)}")
    
    async def generate():
        try:
            # Step 1: Get user's connected apps
            connected_apps = composio_service.get_connections(x_entity_id)
            logger.info(f"[ChatRouter] Connected apps: {connected_apps}")
            
            # Step 2: Get available tools for those apps
            tools = {}
            if connected_apps:
                tools = composio_service.get_tools(x_entity_id, connected_apps)
                logger.info(f"[ChatRouter] Retrieved {len(tools)} tools")
            else:
                logger.info("[ChatRouter] No connected apps, proceeding without tools")
            
            # Step 3: Build system prompt with current date/time
            system_prompt = SYSTEM_PROMPT.format(
                current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
            )
            
            # Step 4: Define tool executor callback
            async def execute_tool(name: str, args: dict) -> dict:
                logger.info(f"[ChatRouter] Executing tool: {name}")
                return await composio_service.execute_action(x_entity_id, name, args)
            
            # Step 5: Convert request messages to dict format
            messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
            
            # Step 6: Stream response via Gemini
            async for chunk in gemini_service.stream_chat(
                messages=messages,
                tools=tools if tools else None,
                system_prompt=system_prompt,
                max_steps=5,
                execute_tool=execute_tool if tools else None
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"[ChatRouter] Error in chat stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

