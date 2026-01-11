export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'completed' | 'error';
  displayName?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp?: Date;
}
