import { Composio } from "composio-core";
import { NextRequest, NextResponse } from "next/server";

// Use Node.js runtime - composio-core requires Node built-ins
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { app: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json(
        { error: "entityId is required" },
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
    const entity = composio.getEntity(entityId);

    // Normalize app name to uppercase
    const appName = params.app.toUpperCase();

    // Composio generates the OAuth redirect URL
    const connection = await entity.initiateConnection({
      appName,
      config: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/`,
      },
    });

    // Redirect user to OAuth provider
    if (!connection.redirectUrl) {
      return NextResponse.json(
        { error: "Failed to get OAuth redirect URL" },
        { status: 500 }
      );
    }
    return NextResponse.redirect(connection.redirectUrl);
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

