import { useState, useCallback, useRef } from 'react';
import { streamChat } from '../lib/api';
import type { Message, ToolCall, ChatChunk } from '../lib/types';

/**
 * Custom hook for managing chat state with SSE streaming.
 * 
 * Handles:
 * - Message state management
 * - Streaming text accumulation
 * - Tool call status tracking (pending -> completed)
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the current assistant message ID for updates during streaming
  const currentAssistantIdRef = useRef<string | null>(null);
  // Counter for generating unique tool call IDs
  const toolCallCounterRef = useRef(0);

  /**
   * Helper to create a display name from a tool action name.
   * e.g., "GMAIL_SEARCH_EMAILS" -> "Searched Gmail"
   */
  const getToolDisplayName = (name: string): string => {
    const parts = name.split('_');
    if (parts.length < 2) return name;
    
    const app = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
    const action = parts.slice(1).join(' ').toLowerCase();
    
    // Convert action to past tense if it starts with common verbs
    const pastTenseMap: Record<string, string> = {
      'search': 'Searched',
      'get': 'Retrieved from',
      'list': 'Listed',
      'read': 'Read',
      'fetch': 'Fetched from',
      'find': 'Found in',
    };
    
    for (const [verb, pastTense] of Object.entries(pastTenseMap)) {
      if (action.startsWith(verb)) {
        return `${pastTense} ${app}`;
      }
    }
    
    return `${app}: ${action}`;
  };

  /**
   * Handle incoming SSE chunks and update message state accordingly.
   */
  const handleChunk = useCallback((chunk: ChatChunk) => {
    switch (chunk.type) {
      case 'text':
        // Append text to the current assistant message
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content + chunk.content,
            };
          }
          return updated;
        });
        break;

      case 'tool_call':
        // Add a new tool call with 'pending' status
        toolCallCounterRef.current += 1;
        const toolCallId = `tool-${toolCallCounterRef.current}`;
        
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            const existingCalls = updated[lastIdx].toolCalls || [];
            const newToolCall: ToolCall = {
              id: toolCallId,
              name: chunk.name,
              displayName: getToolDisplayName(chunk.name),
              status: 'pending',
            };
            updated[lastIdx] = {
              ...updated[lastIdx],
              toolCalls: [...existingCalls, newToolCall],
            };
          }
          return updated;
        });
        break;

      case 'tool_result':
        // Update the matching tool call to 'completed' status
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            const toolCalls = updated[lastIdx].toolCalls || [];
            // Find the most recent pending tool call with matching name
            const updatedCalls = toolCalls.map(tc => {
              if (tc.name === chunk.name && tc.status === 'pending') {
                return {
                  ...tc,
                  status: 'completed' as const,
                  result: chunk.result,
                };
              }
              return tc;
            });
            updated[lastIdx] = {
              ...updated[lastIdx],
              toolCalls: updatedCalls,
            };
          }
          return updated;
        });
        break;

      case 'error':
        setError(chunk.content);
        // Mark any pending tool calls as error
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            const toolCalls = updated[lastIdx].toolCalls || [];
            const updatedCalls = toolCalls.map(tc => 
              tc.status === 'pending' ? { ...tc, status: 'error' as const } : tc
            );
            updated[lastIdx] = {
              ...updated[lastIdx],
              toolCalls: updatedCalls,
            };
          }
          return updated;
        });
        break;

      case 'done':
        // Stream complete - nothing to do, loading state handled in finally
        break;
    }
  }, []);

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Create placeholder assistant message
    const assistantId = `assistant-${Date.now()}`;
    currentAssistantIdRef.current = assistantId;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      timestamp: new Date(),
    };

    // Add both messages to state
    setMessages(prev => [...prev, userMessage, assistantMessage]);

    try {
      // Build message history for the API (exclude the empty assistant message)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      await streamChat(apiMessages, handleChunk);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Update the assistant message to show the error
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content || `Error: ${errorMessage}`,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      currentAssistantIdRef.current = null;
    }
  }, [messages, isLoading, handleChunk]);

  /**
   * Clear all messages and reset state.
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
