from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json


router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


@router.post("")
async def chat(request: ChatRequest, x_entity_id: str = Header(...)):
    """
    Handle chat messages with Gemini + tool execution.
    Returns SSE stream of response chunks.
    """
    async def generate():
        # TODO: Implement Gemini streaming with tool calls
        yield f"data: {json.dumps({'type': 'text', 'content': 'Hello! This is a placeholder response.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

