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

/**
 * Notion database for the database picker
 */
export interface NotionDatabase {
  id: string;
  title: string;
  icon?: string;
}

/**
 * Notion settings saved in Redis
 */
export interface NotionSettings {
  database_id: string;
  database_name: string;
}

/**
 * Source context for a task proposal
 */
export interface SourceContext {
  channel?: string;
  subject?: string;
  sender: string;
  timestamp: string;
  original_content: string;
  message_id?: string;
  thread_id?: string;
}

/**
 * Task proposal from AI inference on incoming messages
 */
export interface TaskProposal {
  proposal_id: string;
  type: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  source: 'slack' | 'gmail';
  source_context: SourceContext;
  confidence: number;
  reasoning: string;
  created_at: string;
}