// HITL Proposal types for calendar events
export interface ProposalData {
  proposalId: string;
  type: "meeting_proposal";
  summary: string;
  start: string;
  end: string;
  description?: string;
  attendees?: string[];
  proposedAt: string;
  messageIndex: number;
  confirmationRequired: boolean;
  toolCallId?: string;
}

// Task Proposal types for proactive AI
export interface TaskProposal {
  proposalId: string;
  type: "task_proposal";
  title: string;
  description?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  source: "slack" | "gmail";
  sourceContext: {
    channel?: string;
    subject?: string;
    sender: string;
    timestamp: string;
    originalContent: string;
    messageId?: string;
    threadId?: string;
  };
  confidence: number;
  reasoning: string;
  createdAt: string;
}

// Tool execution states for streaming UI
export type ToolStatus = "idle" | "executing" | "success" | "error" | "warning";

export interface ToolState {
  toolCallId: string;
  toolName: string;
  status: ToolStatus;
  message?: string;
  startedAt: number;
}

// Connection status from Composio
export interface ConnectionStatus {
  connected: boolean;
  syncing: boolean;
  lastSyncedAt?: string;
  error?: string;
}

// Supported apps
export type AppName = "GMAIL" | "SLACK" | "GOOGLECALENDAR" | "NOTION";

export interface AppConnection {
  app: AppName;
  status: "disconnected" | "connecting" | "connected" | "syncing" | "error";
  lastSyncedAt?: string;
}

// Tool invocation from Vercel AI SDK
export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "partial-call" | "call" | "result";
  result?: unknown;
}

// Execute action result
export interface ExecuteResult {
  success: boolean;
  eventId?: string;
  data?: unknown;
  error?: string;
}

// Chat message type
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolInvocations?: ToolInvocation[];
  createdAt?: Date;
}

// App display config
export const APP_CONFIG: Record<
  AppName,
  { label: string; icon: string; color: string }
> = {
  GMAIL: { label: "Gmail", icon: "Mail", color: "text-red-400" },
  SLACK: { label: "Slack", icon: "Hash", color: "text-purple-400" },
  GOOGLECALENDAR: { label: "Calendar", icon: "Calendar", color: "text-blue-400" },
  NOTION: { label: "Notion", icon: "FileText", color: "text-zinc-300" },
};

// Tool display names
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  GMAIL_FETCH_EMAILS: "Searching emails",
  GMAIL_GET_EMAIL: "Reading email",
  GMAIL_LIST_LABELS: "Getting labels",
  SLACK_LIST_CHANNELS: "Listing channels",
  SLACK_SEARCH_MESSAGES: "Searching Slack",
  SLACK_GET_CHANNEL_HISTORY: "Reading channel",
  GOOGLECALENDAR_LIST_EVENTS: "Fetching calendar events",
  GOOGLECALENDAR_GET_EVENT: "Reading calendar event",
  GOOGLECALENDAR_LIST_CALENDARS: "Listing calendars",
  propose_calendar_event: "Proposing event",
  NOTION_CREATE_NOTION_PAGE: "Creating Notion task",
  NOTION_SEARCH_NOTION_PAGE: "Searching Notion",
  NOTION_QUERY_DATABASE: "Querying Notion database",
};

// Composio webhook payload types
export interface ComposioWebhookPayload {
  entity_id: string;
  connection_id: string;
  app_name: "SLACK" | "GMAIL";
  trigger_name: string;
  payload: SlackEventPayload | GmailEventPayload;
}

export interface SlackEventPayload {
  type: "message";
  text: string;
  user: string;
  channel: string;
  channel_type: "channel" | "group" | "im" | "mpim";
  ts: string;
  thread_ts?: string;
  team?: string;
}

export interface GmailEventPayload {
  // Composio actual field names
  message_id: string;
  thread_id: string;
  sender: string;
  to: string;
  subject: string;
  message_text: string;
  message_timestamp: string;
  label_ids?: string[];
  preview?: {
    body: string;
    subject: string;
  };
  // Legacy field names (for backwards compatibility)
  messageId?: string;
  threadId?: string;
  from?: string;
  snippet?: string;
  body?: string;
  date?: string;
  labelIds?: string[];
}
