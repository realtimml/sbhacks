export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'completed' | 'error';
  displayName?: string;
  result?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp?: Date;
}

/**
 * SSE chunk types from the backend chat stream.
 * Discriminated union for type-safe chunk handling.
 */
export type ChatChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: Record<string, unknown> }
  | { type: 'error'; content: string }
  | { type: 'done' };
