"use client";

import { useState, useEffect, useCallback } from "react";
import type { TaskProposal } from "@/app/lib/types";

interface UseProposalsOptions {
  entityId: string;
  pollInterval?: number; // milliseconds
  enabled?: boolean;
}

interface UseProposalsReturn {
  proposals: TaskProposal[];
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  removeProposal: (proposalId: string) => Promise<boolean>;
}

export function useProposals({
  entityId,
  pollInterval = 10000, // 10 seconds default
  enabled = true,
}: UseProposalsOptions): UseProposalsReturn {
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!entityId || !enabled) return;

    try {
      const response = await fetch("/api/proposals", {
        headers: {
          "x-entity-id": entityId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch proposals: ${response.status}`);
      }

      const data = await response.json();
      setProposals(data.proposals || []);
      setCount(data.count || 0);
      setError(null);
    } catch (err) {
      console.error("[useProposals] Fetch error:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [entityId, enabled]);

  const removeProposal = useCallback(
    async (proposalId: string): Promise<boolean> => {
      if (!entityId) return false;

      try {
        const response = await fetch("/api/proposals", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-entity-id": entityId,
          },
          body: JSON.stringify({ proposalId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to remove proposal: ${response.status}`);
        }

        // Optimistically update local state
        setProposals((prev) => prev.filter((p) => p.proposalId !== proposalId));
        setCount((prev) => Math.max(0, prev - 1));

        return true;
      } catch (err) {
        console.error("[useProposals] Remove error:", err);
        // Refetch to sync state
        await fetchProposals();
        return false;
      }
    },
    [entityId, fetchProposals]
  );

  // Initial fetch
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    const interval = setInterval(fetchProposals, pollInterval);
    return () => clearInterval(interval);
  }, [fetchProposals, pollInterval, enabled]);

  return {
    proposals,
    count,
    isLoading,
    error,
    refetch: fetchProposals,
    removeProposal,
  };
}

/**
 * Lightweight hook that only fetches the count (for notification badge)
 */
export function useProposalCount({
  entityId,
  pollInterval = 15000,
  enabled = true,
}: UseProposalsOptions): { count: number; isLoading: boolean } {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    if (!entityId || !enabled) return;

    try {
      const response = await fetch("/api/proposals?count=true", {
        headers: {
          "x-entity-id": entityId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCount(data.count || 0);
      }
    } catch (err) {
      console.error("[useProposalCount] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [entityId, enabled]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    const interval = setInterval(fetchCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCount, pollInterval, enabled]);

  return { count, isLoading };
}
