"""
Gemini Service - Handles all Google Generative AI interactions.

Equivalent to the streamText() logic from @ai-sdk/google in TypeScript.
Implements the "Agent Loop" pattern for multi-step tool execution.

References:
- plan.md lines 226-233: Core service requirements
- plan.md lines 323-331: Structured output for task inference
"""

import google.generativeai as genai
from google.generativeai.types import (
    GenerationConfig,
    Content,
    Part,
    FunctionDeclaration,
    Tool,
)
from google.protobuf.struct_pb2 import Struct
from typing import AsyncGenerator, Any, Callable, Awaitable
from pydantic import BaseModel
import json
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Configure API key globally at module load
genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)


class GeminiService:
    """
    Service for interacting with Google Gemini API.
    
    Provides streaming chat with multi-step tool execution (Agent Loop)
    and structured output generation for task inference.
    """
    
    def __init__(self, model_name: str = "gemini-2.5-flash-lite"):
        """
        Initialize the Gemini service.
        
        Args:
            model_name: The Gemini model to use. Default is gemini-2.5-flash-lite
                       for cost-efficient task inference and chat.
        
        Note: The actual GenerativeModel is instantiated per-request in 
        stream_chat() to allow dynamic system_instruction injection.
        """
        self.model_name = model_name
        logger.info(f"[GeminiService] Initialized with model: {model_name}")
    
    async def stream_chat(
        self,
        messages: list[dict],
        tools: dict[str, Any] | None = None,
        system_prompt: str | None = None,
        max_steps: int = 5,
        execute_tool: Callable[[str, dict], Awaitable[dict]] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream chat completion with multi-step tool execution.
        
        This implements the "Agent Loop" pattern equivalent to Vercel AI SDK's
        streamText() with maxSteps. The loop:
        1. Sends message to Gemini
        2. Streams text chunks to client
        3. If tool calls detected, executes them
        4. Sends tool results back to Gemini
        5. Repeats until no more tool calls or max_steps reached
        
        Args:
            messages: Chat history in OpenAI format 
                      [{"role": "user"|"assistant", "content": "..."}]
            tools: Dictionary of tool definitions {name: {description, parameters}}
            system_prompt: System instructions (injected with dynamic date/time)
            max_steps: Maximum tool execution iterations (default 5)
            execute_tool: Async callback to execute tools: (name, args) -> result
            
        Yields:
            Chunks with structure:
            - {"type": "text", "content": "..."} - Text response chunks
            - {"type": "tool_call", "name": "...", "args": {...}} - Tool invocation
            - {"type": "tool_result", "name": "...", "result": {...}} - Tool response
            - {"type": "done"} - Stream complete
            - {"type": "error", "content": "..."} - Error occurred
        """
        logger.info(f"[GeminiService] stream_chat called with {len(messages)} messages, max_steps={max_steps}")
        
        # Step 1: Build tools in Gemini format
        gemini_tools = self._build_tools(tools) if tools else None
        
        # Step 2: Create model with dynamic system_instruction
        # We instantiate per-request to inject dynamic content (date/time)
        model = genai.GenerativeModel(
            model_name=self.model_name,
            tools=gemini_tools,
            system_instruction=system_prompt,
        )
        
        # Step 3: Convert message history (all but last message)
        history = self._convert_messages(messages[:-1]) if len(messages) > 1 else []
        
        # Get the current user message (last in array)
        current_message = messages[-1]["content"] if messages else ""
        
        # Step 4: Start chat session
        # CRITICAL: enable_automatic_function_calling=False allows us to intercept
        # tool calls, yield them to frontend via SSE, execute manually, then continue
        chat = model.start_chat(
            history=history,
            enable_automatic_function_calling=False,
        )
        
        logger.info(f"[GeminiService] Chat session started with {len(history)} history messages")
        
        # Step 5: Agent Loop - execute up to max_steps iterations
        for step in range(max_steps):
            logger.info(f"[GeminiService] Step {step + 1}/{max_steps}")
            
            try:
                # Send message with streaming
                response = await chat.send_message_async(
                    current_message,
                    stream=True,
                )
                
                full_text = ""
                tool_calls = []
                
                # Stream and analyze response chunks
                async for chunk in response:
                    # Handle text chunks
                    if chunk.text:
                        full_text += chunk.text
                        yield {
                            "type": "text",
                            "content": chunk.text,
                        }
                    
                    # Check for function calls (may be multiple for parallel execution)
                    if hasattr(chunk, 'candidates') and chunk.candidates:
                        for candidate in chunk.candidates:
                            if hasattr(candidate, 'content') and candidate.content:
                                for part in candidate.content.parts or []:
                                    if hasattr(part, 'function_call') and part.function_call:
                                        fc = part.function_call
                                        tool_call = {
                                            "name": fc.name,
                                            "args": dict(fc.args) if fc.args else {},
                                        }
                                        tool_calls.append(tool_call)
                                        
                                        logger.info(f"[GeminiService] Tool call detected: {fc.name}")
                                        yield {
                                            "type": "tool_call",
                                            "name": tool_call["name"],
                                            "args": tool_call["args"],
                                        }
                
                # Log step completion (equivalent to onStepFinish in TypeScript)
                logger.info(f"[GeminiService] Step {step + 1} finished: "
                           f"hasText={bool(full_text)}, toolCallsCount={len(tool_calls)}")
                
                # Decision: If no tool calls, we're done
                if not tool_calls:
                    logger.info("[GeminiService] No tool calls, ending loop")
                    break
                
                # Execute tool calls and collect results
                if execute_tool:
                    tool_response_parts = []
                    
                    for tc in tool_calls:
                        try:
                            # Execute the tool via callback
                            result = await execute_tool(tc["name"], tc["args"])
                            
                            logger.info(f"[GeminiService] Tool {tc['name']} result: "
                                       f"{json.dumps(result, default=str)[:200]}")
                            
                            yield {
                                "type": "tool_result",
                                "name": tc["name"],
                                "result": result,
                            }
                            
                            # Build function response part for Gemini
                            # Convert result to Struct for protobuf compatibility
                            response_struct = Struct()
                            response_struct.update({"result": result} if not isinstance(result, dict) else result)
                            
                            tool_response_parts.append(
                                Part.from_function_response(
                                    name=tc["name"],
                                    response=response_struct,
                                )
                            )
                            
                        except Exception as e:
                            logger.error(f"[GeminiService] Tool {tc['name']} failed: {e}")
                            
                            error_result = {"error": str(e)}
                            yield {
                                "type": "tool_result",
                                "name": tc["name"],
                                "result": error_result,
                            }
                            
                            # Still send error result to Gemini so it can respond appropriately
                            response_struct = Struct()
                            response_struct.update(error_result)
                            
                            tool_response_parts.append(
                                Part.from_function_response(
                                    name=tc["name"],
                                    response=response_struct,
                                )
                            )
                    
                    # Set next message to tool results (Content with function role)
                    current_message = Content(
                        role="function",
                        parts=tool_response_parts,
                    )
                else:
                    # No execute_tool callback provided, can't continue loop
                    logger.warning("[GeminiService] Tool calls detected but no execute_tool callback provided")
                    break
                    
            except Exception as e:
                logger.error(f"[GeminiService] Error in step {step + 1}: {e}")
                yield {
                    "type": "error",
                    "content": str(e),
                }
                break
        
        yield {"type": "done"}
        logger.info("[GeminiService] stream_chat completed")
    
    async def generate_text(
        self,
        prompt: str,
        max_tokens: int = 50,
    ) -> str:
        """
        Simple async text generation for classification tasks.
        
        Used by task_inference.py Stage 1 for quick chat/task classification.
        Optimized for fast, cheap responses with minimal token output.
        
        Args:
            prompt: The prompt to send to Gemini
            max_tokens: Maximum tokens in response (default 50 for classification)
            
        Returns:
            Raw text response from Gemini
        """
        logger.info(f"[GeminiService] generate_text called with max_tokens={max_tokens}")
        
        model = genai.GenerativeModel(model_name=self.model_name)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=GenerationConfig(max_output_tokens=max_tokens),
        )
        
        result = response.text or ""
        logger.info(f"[GeminiService] generate_text response: {result[:100]}")
        return result
    
    def generate_structured(
        self,
        prompt: str,
        response_schema: type[BaseModel],
    ) -> BaseModel:
        """
        Generate structured JSON output matching a Pydantic schema (sync version).
        
        Used by task_inference.py for extracting structured task details
        from messages (e.g., calendar events, reminders).
        
        Args:
            prompt: The prompt to send to Gemini
            response_schema: Pydantic model class defining expected structure
            
        Returns:
            Instance of response_schema populated with Gemini's response
            
        Reference: plan.md lines 323-331
        """
        logger.info(f"[GeminiService] generate_structured called with schema: {response_schema.__name__}")
        
        model = genai.GenerativeModel(model_name=self.model_name)
        
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(
                response_mime_type="application/json", 
                # for our purposes, application/json will be fine
                # but if issues arise or for different use cases, use form data
                response_schema=response_schema,
            ),
        )
        
        # Parse JSON response into Pydantic model
        result = response_schema.model_validate_json(response.text)
        
        logger.info(f"[GeminiService] Structured output generated successfully")
        return result
    
    async def generate_structured_async(
        self,
        prompt: str,
        response_schema: type[BaseModel],
        system_prompt: str | None = None,
    ) -> BaseModel:
        """
        Generate structured JSON output matching a Pydantic schema (async version).
        
        Used by task_inference.py Stage 2 for extracting structured task details
        from messages with full context.
        
        Args:
            prompt: The user prompt to send to Gemini
            response_schema: Pydantic model class defining expected structure
            system_prompt: Optional system instructions for context
            
        Returns:
            Instance of response_schema populated with Gemini's response
        """
        logger.info(f"[GeminiService] generate_structured_async called with schema: {response_schema.__name__}")
        
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system_prompt,
        )
        
        response = await model.generate_content_async(
            prompt,
            generation_config=GenerationConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
        
        # Parse JSON response into Pydantic model
        result = response_schema.model_validate_json(response.text)
        
        logger.info(f"[GeminiService] Structured async output generated successfully")
        return result
    
    def _convert_messages(self, messages: list[dict]) -> list[Content]:
        """
        Convert OpenAI-style message dicts to Gemini Content objects.
        
        Maps roles:
        - 'user' -> 'user'
        - 'assistant' -> 'model'
        - 'system' -> ignored (handled via system_instruction parameter)
        
        Args:
            messages: List of {"role": "user"|"assistant"|"system", "content": "..."}
            
        Returns:
            List of Gemini Content objects for chat history
        """
        history = []
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            # Skip system messages (handled via system_instruction)
            if role == "system":
                continue
            
            # Map assistant -> model (Gemini's terminology)
            gemini_role = "model" if role == "assistant" else "user"
            
            history.append(
                Content(
                    role=gemini_role,
                    parts=[Part.from_text(content)],
                )
            )
        
        return history
    
    def _build_tools(self, tools_dict: dict[str, Any]) -> list[Tool]:
        """
        Convert tool definitions dictionary to Gemini Tool format.
        
        Input format (from Composio or custom tools):
        {
            "TOOL_NAME": {
                "description": "...",
                "parameters": {
                    "type": "object",
                    "properties": {...},
                    "required": [...]
                }
            }
        }
        
        Output: List containing a single Tool with FunctionDeclarations
        
        Args:
            tools_dict: Dictionary of tool_name -> {description, parameters}
            
        Returns:
            List with one Tool object containing all FunctionDeclarations
        """
        function_declarations = []
        
        for name, schema in tools_dict.items():
            description = schema.get("description", "")
            parameters = schema.get("parameters", {"type": "object", "properties": {}})
            
            # Create FunctionDeclaration
            func_decl = FunctionDeclaration(
                name=name,
                description=description,
                parameters=parameters,
            )
            function_declarations.append(func_decl)
        
        logger.info(f"[GeminiService] Built {len(function_declarations)} function declarations")
        
        # Wrap in Tool object (Gemini expects list of Tools)
        return [Tool(function_declarations=function_declarations)]


# Singleton instance for import throughout the application
gemini_service = GeminiService()
