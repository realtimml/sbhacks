import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  addProposal,
  hasSeenMessage,
  markMessageSeen,
  createMessageHash,
  checkRateLimit,
} from "@/app/lib/kv";
import { inferTaskFromMessage, type MessageContext } from "@/app/lib/taskInference";
import type {
  ComposioWebhookPayload,
  SlackEventPayload,
  GmailEventPayload,
} from "@/app/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Verify webhook signature from Composio
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    // In development, allow unsigned webhooks if no secret is configured
    if (process.env.NODE_ENV === "development" && !secret) {
      console.warn("[Webhook] No secret configured, skipping signature verification");
      return true;
    }
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Pre-filter: Should we process this message?
function shouldProcess(payload: ComposioWebhookPayload): {
  process: boolean;
  reason?: string;
} {
  if (payload.app_name === "SLACK") {
    const slackPayload = payload.payload as SlackEventPayload;
    const { channel_type, text } = slackPayload;

    // Only process: DMs, or messages that @mention the bot
    const isDM = channel_type === "im";
    const isMention =
      text?.toLowerCase().includes("@orbital") ||
      text?.includes("<@"); // Slack user mentions

    if (!isDM && !isMention) {
      return {
        process: false,
        reason: "Channel message without @mention",
      };
    }

    // Skip bot messages and system messages
    if (!text || text.trim().length === 0) {
      return { process: false, reason: "Empty message" };
    }

    return { process: true };
  }

  if (payload.app_name === "GMAIL") {
    const gmailPayload = payload.payload as GmailEventPayload;

    // Skip automated/newsletter emails based on common patterns
    // Handle both Composio field names (sender, label_ids) and legacy names (from, labelIds)
    const from = (gmailPayload.sender || gmailPayload.from || "").toLowerCase();
    const subject = (gmailPayload.subject || "").toLowerCase();
    const labelIds = gmailPayload.label_ids || gmailPayload.labelIds || [];

    const isAutomated =
      from.includes("noreply") ||
      from.includes("no-reply") ||
      from.includes("notifications") ||
      from.includes("mailer-daemon") ||
      subject.includes("unsubscribe") ||
      labelIds.includes("CATEGORY_PROMOTIONS") ||
      labelIds.includes("CATEGORY_SOCIAL");

    if (isAutomated) {
      return { process: false, reason: "Automated/newsletter email" };
    }

    return { process: true };
  }

  return { process: false, reason: "Unknown app" };
}

// Transform webhook payload to MessageContext
function toMessageContext(payload: ComposioWebhookPayload): MessageContext {
  if (payload.app_name === "SLACK") {
    const slack = payload.payload as SlackEventPayload;
    return {
      source: "slack",
      content: slack.text,
      sender: slack.user, // This is the user ID, ideally resolve to name
      timestamp: new Date(parseFloat(slack.ts) * 1000).toISOString(),
      channel: slack.channel,
      channelType: slack.channel_type,
      threadId: slack.thread_ts,
    };
  }

  // Gmail - handle Composio's actual payload structure
  const gmail = payload.payload as GmailEventPayload;
  // Composio uses: message_text, sender, message_timestamp, message_id, thread_id, preview
  const content = gmail.message_text || gmail.preview?.body || gmail.body || gmail.snippet || "";
  const sender = gmail.sender || gmail.from || "";
  const timestamp = gmail.message_timestamp || gmail.date || new Date().toISOString();
  const messageId = gmail.message_id || gmail.messageId || "";
  
  return {
    source: "gmail",
    content,
    sender,
    timestamp,
    subject: gmail.subject,
    messageId,
    isReply: gmail.subject?.toLowerCase().startsWith("re:"),
  };
}

export async function POST(req: NextRequest) {
  console.log("[Webhook] Received request");

  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-composio-signature");
    const webhookSecret = process.env.COMPOSIO_WEBHOOK_SECRET || "";

    // Verify signature
    if (!verifyWebhookSignature(bodyText, signature, webhookSecret)) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const rawBody = JSON.parse(bodyText);
    
    // Log raw payload for debugging
    console.log("[Webhook] Raw payload:", JSON.stringify(rawBody, null, 2));

    // Composio webhook format:
    // { type: "slack_receive_message", timestamp, log_id, data: { user_id, connection_id, channel, text, ... } }
    const triggerType = rawBody.type || "";
    const data = rawBody.data || {};
    
    // Extract app name from trigger type (e.g., "slack_receive_message" -> "SLACK")
    const appName = triggerType.split("_")[0]?.toUpperCase() as "SLACK" | "GMAIL";
    
    // Build normalized payload
    const body: ComposioWebhookPayload = {
      entity_id: data.user_id || rawBody.entity_id || rawBody.entityId,
      connection_id: data.connection_id || rawBody.connection_id,
      app_name: appName,
      trigger_name: triggerType,
      payload: data, // The actual message data is inside `data`
    };
    
    const entityId = body.entity_id;

    console.log("[Webhook] Processing:", {
      entityId,
      app: body.app_name,
      trigger: body.trigger_name,
    });

    if (!entityId) {
      console.error("[Webhook] Missing entity_id - could not extract from payload");
      return NextResponse.json({ error: "Missing entity_id" }, { status: 400 });
    }

    // Pre-filter check
    const filterResult = shouldProcess(body);
    if (!filterResult.process) {
      console.log(`[Webhook] Skipped: ${filterResult.reason}`);
      return NextResponse.json({
        processed: false,
        reason: filterResult.reason,
      });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(entityId, 10, 60);
    if (!rateLimit.allowed) {
      console.warn(`[Webhook] Rate limited for entity: ${entityId}`);
      return NextResponse.json(
        { error: "Rate limited", remaining: rateLimit.remaining },
        { status: 429 }
      );
    }

    // Deduplication check
    const context = toMessageContext(body);
    const messageHash = createMessageHash(
      context.source,
      context.sender,
      context.content
    );

    if (await hasSeenMessage(messageHash)) {
      console.log("[Webhook] Duplicate message, skipping");
      return NextResponse.json({ processed: false, reason: "Duplicate" });
    }

    // Mark as seen before processing (to prevent race conditions)
    await markMessageSeen(messageHash);

    // Run AI inference
    console.log("[Webhook] Running task inference...");
    const proposal = await inferTaskFromMessage(context);

    if (proposal) {
      console.log("[Webhook] Task detected, saving proposal:", {
        title: proposal.title,
        confidence: proposal.confidence,
      });

      await addProposal(entityId, proposal);

      return NextResponse.json({
        processed: true,
        proposalId: proposal.proposalId,
        title: proposal.title,
        confidence: proposal.confidence,
      });
    }

    console.log("[Webhook] No task detected");
    return NextResponse.json({
      processed: true,
      taskDetected: false,
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
