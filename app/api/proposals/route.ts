import { NextRequest, NextResponse } from "next/server";
import { getProposals, removeProposal, getProposalCount } from "@/app/lib/kv";

export const runtime = "nodejs";

/**
 * GET /api/proposals
 * Fetch all pending proposals for the current user
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

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const countOnly = req.nextUrl.searchParams.get("count") === "true";

    if (countOnly) {
      const count = await getProposalCount(entityId);
      return NextResponse.json({ count });
    }

    const proposals = await getProposals(entityId, limit);

    return NextResponse.json({
      proposals,
      count: proposals.length,
    });
  } catch (error) {
    console.error("[Proposals API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proposals
 * Remove a specific proposal by ID (after approval or rejection)
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

    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json(
        { error: "proposalId is required" },
        { status: 400 }
      );
    }

    const removed = await removeProposal(entityId, proposalId);

    if (!removed) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      proposalId,
    });
  } catch (error) {
    console.error("[Proposals API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete proposal" },
      { status: 500 }
    );
  }
}
