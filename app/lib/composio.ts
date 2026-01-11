import { Composio } from "composio-core";
import type { ConnectionStatus, AppName } from "./types";

// Initialize Composio client (server-side only)
export function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY environment variable is required");
  }
  return new Composio({ apiKey });
}

// Check connection status for a specific app and user
export async function getConnectionStatus(
  entityId: string,
  app: AppName
): Promise<ConnectionStatus> {
  try {
    const composio = getComposioClient();
    const entity = composio.getEntity(entityId);
    const connections = await entity.getConnections();

    // Find connection for the specific app
    const connection = connections.find(
      (conn) => conn.appName?.toUpperCase() === app
    );

    if (!connection) {
      return { connected: false, syncing: false };
    }

    const isConnected = connection.status === "ACTIVE";
    const isSyncing =
      connection.status === "INITIATED" || connection.status === "SYNCING";

    return {
      connected: isConnected,
      syncing: isSyncing,
      lastSyncedAt: connection.updatedAt,
    };
  } catch (error) {
    console.error(`Error checking connection status for ${app}:`, error);
    return {
      connected: false,
      syncing: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get all connected apps for a user
export async function getConnectedApps(entityId: string): Promise<AppName[]> {
  try {
    const composio = getComposioClient();
    const entity = composio.getEntity(entityId);
    const connections = await entity.getConnections();

    return connections
      .filter((conn) => conn.status === "ACTIVE")
      .map((conn) => conn.appName?.toUpperCase() as AppName)
      .filter(Boolean);
  } catch (error) {
    console.error("Error fetching connected apps:", error);
    return [];
  }
}

// Supported apps
export const SUPPORTED_APPS: AppName[] = ["GMAIL", "SLACK", "GOOGLECALENDAR", "NOTION"];

