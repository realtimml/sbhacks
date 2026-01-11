"use server";

import { VercelAIToolSet } from "composio-core";
import type { ExecuteResult } from "./lib/types";
import { getUserSetting, setUserSetting, deleteUserSetting } from "./lib/kv";

interface EventProposal {
  proposalId: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  attendees?: string[];
}

interface TaskProposalInput {
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
  };
}

/**
 * Execute a confirmed calendar event creation using Composio
 * This is called after the user confirms the HITL proposal
 */
export async function executeConfirmedEvent(
  proposal: EventProposal,
  entityId: string
): Promise<ExecuteResult> {
  try {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "COMPOSIO_API_KEY not configured",
      };
    }

    const toolset = new VercelAIToolSet({
      apiKey,
      entityId,
    });

    // Use Composio's executeAction - handles OAuth tokens automatically
    const result = await toolset.executeAction({
      action: "GOOGLECALENDAR_CREATE_EVENT",
      params: {
        summary: proposal.summary,
        start: { dateTime: proposal.start },
        end: { dateTime: proposal.end },
        description: proposal.description,
        attendees: proposal.attendees?.map((email) => ({ email })),
      },
    });

    // Check for errors in the result
    if (result.error) {
      return {
        success: false,
        error: typeof result.error === "string" 
          ? result.error 
          : (result.error as { message?: string })?.message || "Failed to create event",
      };
    }

    const data = result.data as { id?: string } | undefined;
    return {
      success: true,
      eventId: data?.id,
      data: result.data,
    };
  } catch (error) {
    console.error("executeConfirmedEvent error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Check if an app is connected for the given entity
 */
export async function checkAppConnection(
  entityId: string,
  appName: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return { connected: false, error: "COMPOSIO_API_KEY not configured" };
    }

    const { Composio } = await import("composio-core");
    const composio = new Composio({ apiKey });
    const entity = composio.getEntity(entityId);
    const connections = await entity.getConnections();

    const connection = connections.find(
      (conn) => conn.appName?.toUpperCase() === appName.toUpperCase()
    );

    return {
      connected: connection?.status === "ACTIVE",
    };
  } catch (error) {
    console.error("checkAppConnection error:", error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all connected apps for an entity
 */
export async function getConnectedApps(
  entityId: string
): Promise<{ apps: string[]; error?: string }> {
  try {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return { apps: [], error: "COMPOSIO_API_KEY not configured" };
    }

    const { Composio } = await import("composio-core");
    const composio = new Composio({ apiKey });
    const entity = composio.getEntity(entityId);
    const connections = await entity.getConnections();

    const apps = connections
      .filter((conn) => conn.status === "ACTIVE")
      .map((conn) => conn.appName?.toUpperCase())
      .filter(Boolean) as string[];

    return { apps };
  } catch (error) {
    console.error("getConnectedApps error:", error);
    return {
      apps: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a Notion task creation using Composio
 * This is called after the user approves a task proposal
 */
export async function executeNotionTask(
  task: TaskProposalInput,
  entityId: string
): Promise<ExecuteResult> {
  try {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "COMPOSIO_API_KEY not configured",
      };
    }

    const toolset = new VercelAIToolSet({
      apiKey,
      entityId,
    });

    // Try to get user's saved database ID, or find one
    let databaseId = await getUserSetting(entityId, "notionDbId");

    if (!databaseId) {
      // Try to find a database automatically
      console.log("[NotionTask] No saved database, searching...");
      
      try {
        // Use NOTION_SEARCH_NOTION_PAGE to find pages (which contain parent database IDs)
        const searchResult = await toolset.executeAction({
          action: "NOTION_SEARCH_NOTION_PAGE",
          params: {},
        });

        // Composio wraps the response in response_data
        const responseData = (searchResult.data as { response_data?: { results?: Array<{ id: string; object: string; parent?: { database_id?: string } }> } })?.response_data;
        const results = responseData?.results || [];
        
        // Extract database ID from the first page that has a database parent
        const pageWithDbParent = results.find((item) => item.object === "page" && item.parent?.database_id);
        
        if (pageWithDbParent?.parent?.database_id) {
          // Use the database ID from the page's parent
          databaseId = pageWithDbParent.parent.database_id;
          // Save it for future use
          await setUserSetting(entityId, "notionDbId", databaseId);
          console.log("[NotionTask] Using database:", databaseId);
        }
      } catch (dbError) {
        console.error("[NotionTask] Failed to search databases:", dbError);
      }
    }

    if (!databaseId) {
      // Fall back to environment variable
      databaseId = process.env.DEFAULT_NOTION_DATABASE_ID ?? null;
    }

    if (!databaseId) {
      return {
        success: false,
        error: "No Notion database configured. Please connect Notion and ensure you have a database.",
      };
    }

    // Build the task description with source context
    const sourceInfo = task.source === "slack"
      ? `From Slack${task.sourceContext.channel ? ` (#${task.sourceContext.channel})` : ""}`
      : `From Gmail${task.sourceContext.subject ? ` - "${task.sourceContext.subject}"` : ""}`;

    const fullDescription = [
      task.description,
      "",
      "---",
      `**Source:** ${sourceInfo}`,
      `**Sender:** ${task.sourceContext.sender}`,
      `**Detected:** ${new Date(task.sourceContext.timestamp).toLocaleString()}`,
      "",
      "**Original Message:**",
      task.sourceContext.originalContent.slice(0, 500),
    ]
      .filter(Boolean)
      .join("\n");

    // Create the Notion page/task
    // Build properties object with due date if provided
    const properties: Record<string, unknown> = {};
    if (task.dueDate) {
      properties["Due date"] = {
        date: {
          start: task.dueDate,
        },
      };
    }
    
    const result = await toolset.executeAction({
      action: "NOTION_CREATE_NOTION_PAGE",
      params: {
        parent_id: databaseId,
        title: task.title,
        content: fullDescription,
        ...(Object.keys(properties).length > 0 && { properties }),
      },
    });

    // Check for errors
    if (result.error) {
      const errorMsg = typeof result.error === "string" ? result.error : (result.error as { message?: string })?.message || "";
      
      // If the parent_id is invalid, clear the saved setting and return a helpful error
      if (errorMsg.includes("neither a page nor a database") || errorMsg.includes("not found")) {
        console.error("[NotionTask] Invalid database ID, clearing saved setting");
        await deleteUserSetting(entityId, "notionDbId");
        return {
          success: false,
          error: "The saved Notion database is no longer valid. Please try again - we'll search for a new database.",
        };
      }
      
      console.error("[NotionTask] Composio error:", result.error);
      return {
        success: false,
        error: errorMsg || "Failed to create Notion task",
      };
    }

    const data = result.data as { id?: string; url?: string } | undefined;
    console.log("[NotionTask] Task created:", data?.id);

    return {
      success: true,
      eventId: data?.id,
      data: result.data,
    };
  } catch (error) {
    console.error("[NotionTask] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get or set the user's Notion database ID
 */
export async function getNotionDatabaseId(
  entityId: string
): Promise<string | null> {
  return await getUserSetting(entityId, "notionDbId");
}

export async function setNotionDatabaseId(
  entityId: string,
  databaseId: string
): Promise<void> {
  await setUserSetting(entityId, "notionDbId", databaseId);
}

