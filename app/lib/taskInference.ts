import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { TaskProposal } from "./types";


const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Schema for the AI's structured task extraction output
const TaskExtractionSchema = z.object({
  isTask: z.boolean().describe("Whether this message contains an actionable task"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  task: z
    .object({
      title: z.string().describe("Concise task title (max 80 chars)"),
      description: z.string().optional().describe("Additional context or details"),
      dueDate: z.string().optional().describe("ISO 8601 date if deadline mentioned"),
      priority: z.enum(["low", "medium", "high"]).describe("Inferred priority level"),
      reasoning: z.string().describe("Why this was identified as a task"),
    })
    .optional(),
});

export type TaskExtraction = z.infer<typeof TaskExtractionSchema>;

export interface MessageContext {
  source: "slack" | "gmail";
  content: string;
  sender: string;
  timestamp: string;
  // Slack-specific
  channel?: string;
  channelType?: "channel" | "group" | "im" | "mpim";
  threadId?: string;
  // Gmail-specific
  subject?: string;
  messageId?: string;
  isReply?: boolean;
}

/**
 * Stage 1: Quick spam/chat classification
 * Returns "task" or "chat" - cheap and fast
 */
export async function classifyMessage(content: string): Promise<"task" | "chat"> {
  const prompt = `You are classifying messages. Respond with exactly one word: either "task" or "chat".

TASK - message contains:
- Deadlines (by today, by Friday, EOD, ASAP, due)
- Action requests (complete, finish, do, submit, send, review)
- Assignments or todos
- Something that needs to be done

CHAT - message contains:
- Greetings, social chat
- Already completed items
- Pure information with no action needed

Message to classify:
"${content.slice(0, 500)}"

Classification (task or chat):`;

  try {
    console.log("[TaskInference] Calling classification model with content:", content.slice(0, 100));
    const result = await generateText({
      model: googleAI("gemini-2.5-flash-lite"),
      prompt,
      maxTokens: 50,
    });

    const rawResult = result.text?.trim().toLowerCase() || "";
    console.log("[TaskInference] Classification raw response:", JSON.stringify(result.text));
    
    // If empty response, default to task to let extraction decide
    if (!rawResult) {
      console.log("[TaskInference] Empty response from model, defaulting to task");
      return "task";
    }
    
    // Extract just "task" or "chat" from the response
    const classification = rawResult.includes("task") ? "task" : "chat";
    console.log("[TaskInference] Classification result:", classification);
    return classification;
  } catch (error) {
    console.error("[TaskInference] Classification error:", error);
    // On error, default to "task" to allow extraction to make the final call
    return "task";
  }
}

/**
 * Stage 2: Full task extraction with structured output
 * Only called if Stage 1 returns "task"
 */
export async function extractTaskDetails(
  context: MessageContext,
  currentDate: Date = new Date()
): Promise<TaskExtraction> {
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are a task detection AI. Analyze messages to identify actionable tasks, to-dos, and deadlines.

CURRENT DATE: ${formattedDate}

TASK INDICATORS (high confidence 0.8-1.0):
- Direct requests: "please do", "can you", "need you to", "make sure to"
- Action items: "TODO", "action item", "follow up", "don't forget"
- Deadlines: "by Friday", "due tomorrow", "ASAP", "urgent", "EOD", "end of week"
- Assignments: mentions of the user, "assigned to you", "your responsibility"
- Commitments: "I'll handle", "I will", "let me take care of"

TASK INDICATORS (medium confidence 0.5-0.8):
- Questions implying action: "Can we schedule?", "Would you be able to?"
- Suggestions: "We should", "It would be good to"
- Meeting follow-ups: "As discussed", "Per our conversation"

LOW CONFIDENCE (0.3-0.5):
- Vague requests without clear action
- Information that might need follow-up

NOT TASKS (confidence < 0.3):
- Pure informational messages
- Social chat, greetings
- Already completed items ("I finished", "Done")
- Questions seeking information only
- Automated notifications without action needed

PRIORITY RULES:
- HIGH: Contains "urgent", "ASAP", "critical", "blocking", deadline within 24h
- MEDIUM: Has a deadline within 1 week, or explicit request
- LOW: No deadline, nice-to-have, suggestions

When extracting deadlines, convert relative dates to ISO 8601 format based on the current date.
Keep task titles concise (under 80 characters) and actionable.`;

  const sourceInfo =
    context.source === "slack"
      ? `CHANNEL: ${context.channel || "DM"}`
      : `SUBJECT: ${context.subject || "(no subject)"}`;

  const userPrompt = `Analyze this ${context.source === "slack" ? "Slack message" : "email"} for potential tasks:

SOURCE: ${context.source.toUpperCase()}
${sourceInfo}
FROM: ${context.sender}
TIME: ${context.timestamp}

CONTENT:
${context.content}

Determine if this contains an actionable task for the recipient. If yes, extract the task details.`;

  try {
    const result = await generateObject({
      model: googleAI("gemini-2.5-flash-lite"),
      schema: TaskExtractionSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.object;
  } catch (error) {
    console.error("[TaskInference] Extraction error:", error);
    return {
      isTask: false,
      confidence: 0,
    };
  }
}

/**
 * Full two-stage inference pipeline
 * Returns a TaskProposal if a task is detected with sufficient confidence
 */
export async function inferTaskFromMessage(
  context: MessageContext,
  confidenceThreshold: number = 0.6
): Promise<TaskProposal | null> {
  // Stage 1: Quick classification
  const classification = await classifyMessage(context.content);

  if (classification === "chat") {
    console.log("[TaskInference] Message classified as chat, skipping extraction");
    return null;
  }

  // Stage 2: Full extraction
  const extraction = await extractTaskDetails(context);

  if (!extraction.isTask || extraction.confidence < confidenceThreshold) {
    console.log(
      `[TaskInference] Task not detected or low confidence: ${extraction.confidence}`
    );
    return null;
  }

  if (!extraction.task) {
    console.log("[TaskInference] No task details extracted");
    return null;
  }

  // Build the proposal
  const proposal: TaskProposal = {
    proposalId: crypto.randomUUID().slice(0, 8),
    type: "task_proposal",
    title: extraction.task.title,
    description: extraction.task.description,
    dueDate: extraction.task.dueDate,
    priority: extraction.task.priority,
    source: context.source,
    sourceContext: {
      channel: context.channel,
      subject: context.subject,
      sender: context.sender,
      timestamp: context.timestamp,
      originalContent: context.content.slice(0, 1000), // Limit stored content
      messageId: context.messageId,
      threadId: context.threadId,
    },
    confidence: extraction.confidence,
    reasoning: extraction.task.reasoning,
    createdAt: new Date().toISOString(),
  };

  return proposal;
}
