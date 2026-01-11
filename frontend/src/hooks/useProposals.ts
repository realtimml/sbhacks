import { useState, useEffect, useCallback } from 'react';
import { getProposals, getProposalCount } from '../lib/api';
import type { TaskProposal } from '../lib/types';

const POLL_INTERVAL = 30000; // 30 seconds

interface UseProposalsReturn {
  proposals: TaskProposal[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeProposal: (proposalId: string) => void;
}

export function useProposals(): UseProposalsReturn {
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const data = await getProposals();
      setProposals(data);
      setCount(data.length);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      setError('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCount = useCallback(async () => {
    try {
      const newCount = await getProposalCount();
      setCount(newCount);
    } catch (err) {
      console.error('Failed to fetch proposal count:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Polling for count updates
  useEffect(() => {
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Remove a proposal from local state (after dismiss/execute)
  const removeProposal = useCallback((proposalId: string) => {
    setProposals(prev => prev.filter(p => p.proposal_id !== proposalId));
    setCount(prev => Math.max(0, prev - 1));
  }, []);

  return {
    proposals,
    count,
    isLoading,
    error,
    refresh: fetchProposals,
    removeProposal,
  };
}

// Lightweight hook just for count (for sidebar badge)
export function useProposalCount(): { count: number; isLoading: boolean } {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const newCount = await getProposalCount();
        setCount(newCount);
      } catch (err) {
        console.error('Failed to fetch proposal count:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return { count, isLoading };
}

