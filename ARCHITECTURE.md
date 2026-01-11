# Orbital System Architecture

## High-Level Overview

```mermaid
flowchart TB
    subgraph client [Client Layer]
        Browser[Browser]
        ChatUI[Chat Interface]
        ConnectBtns[Connection Buttons]
        ProposalModal[Proposal Notifications]
    end

    subgraph nextjs [Next.js App Router]
        PageTsx[page.tsx]
        ChatAPI["/api/chat"]
        ProposalsAPI["/api/proposals"]
        AuthAPI["/api/auth/app"]
        WebhookAPI["/api/webhooks/composio"]
        TriggersAPI["/api/triggers"]
    end

    subgraph ai [AI Layer]
        Gemini3[Gemini 3 Flash Preview]
        Gemini25[Gemini 2.5 Flash]
        TaskInference[Task Inference]
    end

    subgraph composio [Composio Platform]
        OAuth[OAuth Management]
        ToolSet[VercelAI ToolSet]
        Triggers[Webhook Triggers]
    end

    subgraph integrations [External Integrations]
        Gmail[Gmail]
        Slack[Slack]
        Calendar[Google Calendar]
        Notion[Notion]
    end

    subgraph storage [Storage Layer]
        Redis[(Upstash Redis)]
    end

    Browser --> PageTsx
    PageTsx --> ChatUI
    PageTsx --> ConnectBtns
    PageTsx --> ProposalModal

    ChatUI --> ChatAPI
    ConnectBtns --> AuthAPI
    ProposalModal --> ProposalsAPI

    ChatAPI --> Gemini25
    ChatAPI --> ToolSet
    WebhookAPI --> TaskInference
    TaskInference --> Gemini3

    AuthAPI --> OAuth
    ToolSet --> Gmail
    ToolSet --> Slack
    ToolSet --> Calendar
    ToolSet --> Notion

    Triggers --> WebhookAPI
    Gmail --> Triggers
    Slack --> Triggers

    WebhookAPI --> Redis
    ProposalsAPI --> Redis
    ProposalModal --> Redis
```

---

## Component Details

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| Main Page | `app/page.tsx` | Entry point, manages entity ID and connections |
| Chat Interface | `app/components/ChatInterface.tsx` | Interactive AI chat with streaming |
| Connect Button | `app/components/ConnectButton.tsx` | OAuth connection for each app |
| Proposal Notification | `app/components/ProposalNotification.tsx` | Badge + modal for HITL confirmations |
| HITL Card | `app/components/HITLCard.tsx` | Displays pending task/event proposals |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | AI chat with function calling |
| `/api/proposals` | GET | Fetch pending proposals for user |
| `/api/proposals` | DELETE | Remove/dismiss a proposal |
| `/api/auth/[app]` | GET | Initiate OAuth flow via Composio |
| `/api/webhooks/composio` | POST | Receive incoming message webhooks |
| `/api/triggers` | POST/DELETE | Manage Composio webhook triggers |

### Core Libraries

| File | Purpose |
|------|---------|
| `app/lib/taskInference.ts` | Two-stage AI task detection |
| `app/lib/composio.ts` | Composio client utilities |
| `app/lib/kv.ts` | Redis operations (proposals, dedup, rate limiting) |
| `app/lib/types.ts` | TypeScript type definitions |
| `app/actions.ts` | Server actions for confirmed executions |

---

## Data Flow 1: Passive Task Detection

```mermaid
sequenceDiagram
    participant Slack
    participant Composio
    participant Webhook as /api/webhooks/composio
    participant AI as Task Inference
    participant Redis
    participant UI as Notification Badge

    Slack->>Composio: New message received
    Composio->>Webhook: POST webhook payload
    
    Webhook->>Webhook: Verify signature
    Webhook->>Webhook: Pre-filter check
    Webhook->>Redis: Check rate limit
    Redis-->>Webhook: Allowed
    Webhook->>Redis: Check deduplication
    Redis-->>Webhook: Not seen
    
    Webhook->>AI: Classify message
    AI->>AI: Stage 1 - Quick classify
    AI->>AI: Stage 2 - Extract details
    AI-->>Webhook: TaskProposal
    
    Webhook->>Redis: Save proposal
    Redis-->>UI: Poll detects new proposal
    UI->>UI: Show badge count
```

---

## Data Flow 2: Interactive Chat

```mermaid
sequenceDiagram
    participant User
    participant Chat as Chat Interface
    participant API as /api/chat
    participant Gemini as Gemini 2.5 Flash
    participant Composio as Composio ToolSet
    participant Gmail
    participant Slack

    User->>Chat: Type message
    Chat->>API: POST with messages
    
    API->>Composio: Get tools for entity
    Composio-->>API: Available tools
    
    API->>Gemini: streamText with tools
    
    Gemini->>Gemini: Decide tool calls
    Gemini->>API: Tool call request
    
    par Parallel Search
        API->>Gmail: GMAIL_FETCH_EMAILS
        API->>Slack: SLACK_FIND_USERS
    end
    
    Gmail-->>API: Email results
    Slack-->>API: Slack results
    
    API->>Gemini: Tool results
    Gemini-->>API: Final response
    API-->>Chat: Stream response
    Chat-->>User: Display message
```

---

## Data Flow 3: HITL Confirmation

```mermaid
sequenceDiagram
    participant User
    participant Modal as Proposal Modal
    participant API as /api/proposals
    participant Actions as Server Actions
    participant Composio
    participant Notion
    participant Redis

    User->>Modal: Click notification badge
    Modal->>API: GET proposals
    API->>Redis: Fetch proposals
    Redis-->>API: Proposal list
    API-->>Modal: Display proposals

    User->>Modal: Click Approve
    Modal->>Actions: executeNotionTask
    
    Actions->>Composio: executeAction
    Composio->>Notion: Create page
    Notion-->>Composio: Page created
    Composio-->>Actions: Success
    
    Actions->>API: DELETE proposal
    API->>Redis: Remove proposal
    
    Actions-->>Modal: Success toast
```

---

## Storage Schema (Redis)

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `proposals:{entityId}` | List | 7 days | Pending task proposals |
| `seen:{messageHash}` | String | 1 hour | Message deduplication |
| `settings:{entityId}:{key}` | String | None | User settings (e.g., Notion DB ID) |
| `ratelimit:{entityId}` | Counter | 60 sec | Rate limiting (10 req/min) |

---

## AI Model Usage

| Model | Location | Purpose | Max Tokens |
|-------|----------|---------|------------|
| `gemini-3-flash-preview` | `taskInference.ts` | Task classification | 50 |
| `gemini-3-flash-preview` | `taskInference.ts` | Task extraction (structured) | Default |
| `gemini-2.5-flash` | `chat/route.ts` | Chat with function calling | Default |

> **Note**: Gemini 3 Flash doesn't support function calling with the current SDK version (requires thought signatures). Use Gemini 2.5 Flash for tool use.

---

## Security Features

- **Webhook Signature Verification** - HMAC-SHA256 validation
- **Rate Limiting** - 10 requests/minute per entity
- **Message Deduplication** - Hash-based duplicate detection
- **Entity Isolation** - All data scoped to entity ID
- **Human-in-the-Loop** - Write operations require explicit confirmation
- **Read-Only Tool Filtering** - Chat API filters out destructive actions

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Framer Motion, Tailwind CSS |
| Backend | Next.js API Routes (Node.js runtime) |
| AI | Vercel AI SDK, Google Gemini API |
| Integrations | Composio (OAuth + tool execution) |
| Storage | Upstash Redis |
| Deployment | Vercel (recommended) |
