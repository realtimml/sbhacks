import { streamText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { VercelAIToolSet } from "composio-core";
import { z } from "zod";

// Create Google AI instance with explicit API key
const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Use Node.js runtime - composio-core requires Node built-ins
// For production, consider Vercel Pro for longer timeouts or implement streaming optimizations
export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for complex tool chains

export async function POST(req: Request) {
  console.log("[Chat API] Request received");
  try {
    const { messages } = await req.json();
    const entityId = req.headers.get("x-entity-id");
    console.log("[Chat API] EntityId:", entityId, "Messages:", messages.length);

    if (!entityId) {
      return new Response(
        JSON.stringify({ error: "x-entity-id header is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const composioApiKey = process.env.COMPOSIO_API_KEY;
    if (!composioApiKey) {
      return new Response(
        JSON.stringify({ error: "COMPOSIO_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Composio toolset with entity context
    const toolset = new VercelAIToolSet({
      apiKey: composioApiKey,
      entityId,
    });

    // Fetch pre-built tools from Composio's Action Registry
    // Fetch by app name to get all available read actions
    console.log("[Chat API] Fetching Composio tools...");
    const composioTools = await toolset.getTools({
      apps: ["GMAIL", "SLACK", "GOOGLECALENDAR"],
      // Filter to only read actions (exclude write actions like CREATE, UPDATE, DELETE)
      // Composio will return all available actions for these apps
    });
    console.log("[Chat API] Tools fetched:", Object.keys(composioTools));
    
    // Filter out write actions manually to ensure only read operations
    const readOnlyTools: Record<string, any> = {};
    const writeActionKeywords = ["CREATE", "UPDATE", "DELETE", "SEND", "POST", "PUT", "PATCH"];
    
    for (const [toolName, tool] of Object.entries(composioTools)) {
      const isWriteAction = writeActionKeywords.some(keyword => 
        toolName.toUpperCase().includes(keyword)
      );
      if (!isWriteAction) {
        readOnlyTools[toolName] = tool;
      }
    }
    
    console.log("[Chat API] Read-only tools after filtering:", Object.keys(readOnlyTools));

    // Custom HITL tool for calendar events (proposal only - no direct creation)
    const propose_calendar_event = tool({
      description:
        "Propose a calendar event for user confirmation before creating. Use this when the user wants to schedule a meeting, event, or reminder.",
      parameters: z.object({
        summary: z.string().describe("Event title/summary"),
        start: z
          .string()
          .describe("Start time in ISO 8601 format (e.g., 2024-01-15T10:00:00)"),
        end: z
          .string()
          .describe("End time in ISO 8601 format (e.g., 2024-01-15T11:00:00)"),
        description: z.string().optional().describe("Event description"),
        attendees: z
          .array(z.string().email())
          .optional()
          .describe("List of attendee email addresses"),
      }),
      execute: async (params) => {
        // Return proposal data - actual creation happens after user confirmation
        return {
          confirmationRequired: true,
          type: "meeting_proposal",
          proposalId: crypto.randomUUID().slice(0, 8),
          proposedAt: new Date().toISOString(),
          messageIndex: messages.length,
          ...params,
        };
      },
    });

    // CRITICAL: Inject current date/time for relative scheduling
    const now = new Date();
    const currentDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // COORDINATING PROMPT with date context and multi-channel search rules
    const systemPrompt = `You are Orbital, an intelligent AI assistant that helps manage communications across email and Slack, and can read and schedule calendar events.

CURRENT DATE/TIME: ${currentDate} at ${currentTime}
Use this to interpret relative dates like "tomorrow", "next Monday", "in 2 hours", etc.

GMAIL RULES:
1. When fetching emails, ALWAYS set max_results to 20 or less to avoid timeout
2. Use the "q" parameter for search queries (e.g., q: "from:john" or q: "subject:invoice")
3. For "latest emails", use max_results: 20 without a query filter

CRITICAL SEARCH RULES:
1. When asked to find, search, or look for something, you MUST search BOTH Gmail AND Slack in PARALLEL
2. Call both search tools simultaneously, do not wait for one to complete before calling the other
3. Wait for ALL results before summarizing to the user
4. If one channel has no results, explicitly tell the user (e.g., "No results in Slack, but found 3 emails...")
5. Never stop after checking just one channel - always check all connected channels

CALENDAR RULES:
1. You can READ calendar events - use GOOGLECALENDAR_LIST_EVENTS to see upcoming events
2. When asked about calendar events, meetings, or schedule, check the calendar first
3. Use the propose_calendar_event tool to suggest NEW events
4. Always convert relative times ("tomorrow at 3pm") to ISO 8601 format based on the current date above
5. The user must confirm before any event is actually created
6. For meetings, default to 1 hour duration if not specified
7. When listing events, show the date, time, title, and attendees if available

Be concise, helpful, and proactive. Summarize email subjects and senders clearly. When showing calendar events, format them nicely with dates and times. If you're searching and find nothing, suggest what the user might search for instead.`;

    // Stream the response for immediate feedback
    console.log("[Chat API] Starting streamText with Gemini...");
    // Note: gemini-3-flash-preview requires thought_signatures for tools which @ai-sdk/google doesn't support yet
    // Using gemini-2.5-flash for function calling until SDK is updated
    const result = streamText({
      model: googleAI("gemini-2.5-flash-lite"),
      messages,
      tools: { ...readOnlyTools, propose_calendar_event },
      system: systemPrompt,
      maxSteps: 5, // Allow multi-tool calls for parallel search
      onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
        console.log("[Chat API] Step finished:", { 
          finishReason,
          hasText: !!text,
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0,
        });
        if (toolResults) {
          toolResults.forEach((tr, i) => {
            console.log(`[Chat API] Tool result ${i}:`, JSON.stringify(tr).slice(0, 200));
          });
        }
      },
    });

    console.log("[Chat API] Returning streaming response");
    // Return streaming response - critical for UX with middleware latency
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("[Chat API] Stream error:", error);
        if (error instanceof Error) {
          return `Error: ${error.message}`;
        }
        return "An unexpected error occurred";
      },
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

