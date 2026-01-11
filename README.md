# Orbital - Agentic Personal OS

Orbital is an intelligent AI assistant that helps manage communications across email (Gmail) and Slack, and can read and schedule calendar events. It uses AI to detect actionable tasks from messages and proposes them for your confirmation.

## Features

- **Multi-channel Communication**: Connect and search across Gmail and Slack simultaneously
- **Task Detection**: Automatically identifies actionable tasks from messages using AI
- **Calendar Integration**: Read calendar events and propose new meetings
- **Human-in-the-Loop (HITL)**: All write operations require user confirmation before execution
- **Real-time Notifications**: Get notified when new task proposals are detected

## Prerequisites

- Node.js 18+ and npm
- A Composio account and API key ([sign up here](https://composio.dev))
- A Google Generative AI API key (for Gemini models)
- An Upstash Redis account (for storing proposals and caching)
- (Optional) Grok API access if you want to use Grok models instead of Gemini

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "AI Agent Test"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in your environment variables (see [Environment Variables](#environment-variables) section below).

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

- `COMPOSIO_API_KEY` - Your Composio API key for integrating with Gmail, Slack, and Google Calendar
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google AI API key for Gemini models
- `UPSTASH_REDIS_REST_URL` - Your Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Your Upstash Redis REST API token

### Optional Variables

- `COMPOSIO_WEBHOOK_SECRET` - Secret for verifying Composio webhook signatures (recommended for production)
- `WEBHOOK_BASE_URL` - Base URL for webhooks (e.g., `https://your-domain.com`). If not set, defaults to `http://localhost:3000` in development
- `NEXT_PUBLIC_APP_URL` - Public URL of your application (defaults to `http://localhost:3000`)
- `DEFAULT_NOTION_DATABASE_ID` - Default Notion database ID for task creation (if using Notion integration)

### Using Grok Instead of Gemini

If you prefer to use Grok (xAI) models instead of Google Gemini, you'll need to:

1. Get a Grok API key from [xAI](https://x.ai)
2. Install the Grok SDK: `npm install @ai-sdk/xai` (if available)
3. Update the model configuration in `app/api/chat/route.ts` and `app/lib/taskInference.ts` to use Grok instead of Gemini

Note: Currently, the app is configured to use Google Gemini (`gemini-2.5-flash`). To switch to Grok, you'll need to modify the AI model initialization in the codebase.

## Setting Up Integrations

### 1. Connect Your Apps

Once the app is running, click the connection buttons in the header to connect:
- **Gmail**: Connect your Gmail account to read emails
- **Slack**: Connect your Slack workspace to read messages
- **Notion**: Connect Notion to create tasks (optional)

### 2. Set Up Webhooks (for Task Detection)

After connecting your apps, you need to set up webhooks so Orbital can detect tasks from incoming messages:

1. The webhook endpoint is automatically available at `/api/webhooks/composio`
2. In production, make sure `WEBHOOK_BASE_URL` is set to your public URL
3. Configure webhooks in Composio dashboard or use the triggers API

### 3. Configure Composio Triggers

The app supports automatic task detection from:
- **Slack**: Messages in DMs or channels where you're mentioned
- **Gmail**: New emails (excluding automated/newsletter emails)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[app]/route.ts    # OAuth connection endpoints
│   │   ├── chat/route.ts           # Main chat API with AI
│   │   ├── proposals/route.ts      # Task proposal management
│   │   ├── triggers/route.ts       # Webhook trigger setup
│   │   └── webhooks/composio/      # Composio webhook handler
│   ├── components/                 # React components
│   ├── hooks/                      # Custom React hooks
│   └── lib/
│       ├── composio.ts             # Composio client utilities
│       ├── kv.ts                   # Redis/Upstash operations
│       ├── taskInference.ts        # AI task detection logic
│       └── types.ts                # TypeScript type definitions
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## How It Works

1. **Message Reception**: When you receive a message in Gmail or Slack, Composio sends a webhook to the app
2. **Task Detection**: The AI analyzes the message to determine if it contains an actionable task
3. **Proposal Creation**: If a task is detected, a proposal is created and stored in Redis
4. **User Notification**: You'll see a notification badge with the number of pending proposals
5. **Confirmation**: Review and confirm proposals to create actual tasks or calendar events

## Troubleshooting

### Webhook Issues

- Make sure `WEBHOOK_BASE_URL` is set correctly in production
- For local development, use a tool like [ngrok](https://ngrok.com) to expose your local server
- Check that `COMPOSIO_WEBHOOK_SECRET` matches your Composio webhook configuration

### Connection Issues

- Verify your Composio API key is correct
- Check that you've authorized the necessary scopes for each app
- Ensure your Upstash Redis instance is accessible

### AI Model Issues

- Verify your `GOOGLE_GENERATIVE_AI_API_KEY` is valid
- Check API rate limits if you're experiencing errors
- For Grok, ensure you have proper API access and credentials

## License

[Add your license here]
