import { NextRequest, NextResponse } from "next/server";
import { Composio } from "composio-core";

export const runtime = "nodejs";

// Trigger configurations for each app
const TRIGGER_CONFIGS = {
  SLACK: {
    triggerName: "SLACK_RECEIVE_MESSAGE",
    config: {
      // Configuration for Slack trigger
      // This will receive messages from DMs and channels where the bot is present
    },
  },
  GMAIL: {
    triggerName: "gmail_new_gmail_message",
    config: {
      // Configuration for Gmail trigger
      // This will receive new emails
    },
  },
};

/**
 * GET /api/triggers
 * List active triggers for the user
 */
export async function GET(req: NextRequest) {
  try {
    const entityId = req.headers.get("x-entity-id");

    if (!entityId) {
      return NextResponse.json(
        { error: "x-entity-id header is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY not configured" },
        { status: 500 }
      );
    }

    const composio = new Composio({ apiKey });

    // Get triggers list - filter by connected accounts for this entity
    const entity = composio.getEntity(entityId);
    const connections = await entity.getConnections();
    const connectedAccountIds = connections?.map((c: { id: string }) => c.id) || [];

    // Get triggers for these connected accounts
    const triggers = connectedAccountIds.length > 0 
      ? await composio.triggers.list({ connectedAccountIds })
      : [];

    return NextResponse.json({
      triggers: Array.isArray(triggers) ? triggers.map((t: { name?: string; appName?: string; enabled?: boolean }) => ({
        id: t.name,
        triggerName: t.name,
        appName: t.appName,
        enabled: t.enabled,
      })) : [],
    });
  } catch (error) {
    console.error("[Triggers API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch triggers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/triggers
 * Setup triggers for Slack and/or Gmail
 */
export async function POST(req: NextRequest) {
  try {
    const entityId = req.headers.get("x-entity-id");

    if (!entityId) {
      return NextResponse.json(
        { error: "x-entity-id header is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { apps } = await req.json();

    if (!apps || !Array.isArray(apps)) {
      return NextResponse.json(
        { error: "apps array is required" },
        { status: 400 }
      );
    }

    const composio = new Composio({ apiKey });
    const entity = composio.getEntity(entityId);

    // Get the webhook URL for this deployment
    const webhookUrl = getWebhookUrl(req);

    const results: Array<{
      app: string;
      success: boolean;
      triggerId?: string;
      error?: string;
    }> = [];

    for (const app of apps) {
      const config = TRIGGER_CONFIGS[app as keyof typeof TRIGGER_CONFIGS];

      if (!config) {
        results.push({
          app,
          success: false,
          error: `Unknown app: ${app}`,
        });
        continue;
      }

      try {
        // First, get the connected account for this app
        const connectedAccount = await entity.getConnection({ app });

        if (!connectedAccount?.id) {
          results.push({
            app,
            success: false,
            error: `No connected account found for ${app}. Please connect the app first.`,
          });
          continue;
        }

        // Setup the trigger with Composio using triggers.setup API
        // Requires connectedAccountId and triggerName
        const trigger = await composio.triggers.setup({
          connectedAccountId: connectedAccount.id,
          triggerName: config.triggerName,
          config: {
            ...config.config,
            webhookUrl,
          },
        });

        results.push({
          app,
          success: true,
          triggerId: trigger?.triggerId,
        });

        console.log(`[Triggers API] Setup ${app} trigger:`, trigger?.triggerId);
      } catch (err) {
        console.error(`[Triggers API] Failed to setup ${app} trigger:`, err);
        results.push({
          app,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      webhookUrl,
      results,
    });
  } catch (error) {
    console.error("[Triggers API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to setup triggers" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/triggers
 * Remove a specific trigger
 */
export async function DELETE(req: NextRequest) {
  try {
    const entityId = req.headers.get("x-entity-id");

    if (!entityId) {
      return NextResponse.json(
        { error: "x-entity-id header is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { triggerId } = await req.json();

    if (!triggerId) {
      return NextResponse.json(
        { error: "triggerId is required" },
        { status: 400 }
      );
    }

    const composio = new Composio({ apiKey });

    // Disable the trigger using the new triggers.disable API
    await composio.triggers.disable({ triggerId });

    return NextResponse.json({
      success: true,
      triggerId,
    });
  } catch (error) {
    console.error("[Triggers API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete trigger" },
      { status: 500 }
    );
  }
}

/**
 * Get the webhook URL based on the current request
 */
function getWebhookUrl(req: NextRequest): string {
  // In production, use the deployment URL
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  // Allow override via environment variable
  if (process.env.WEBHOOK_BASE_URL) {
    return `${process.env.WEBHOOK_BASE_URL}/api/webhooks/composio`;
  }

  return `${protocol}://${host}/api/webhooks/composio`;
}
