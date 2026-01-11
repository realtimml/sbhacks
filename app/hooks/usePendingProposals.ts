"use client";

import { useRef, useCallback } from "react";
import type { ProposalData } from "@/app/lib/types";

export function usePendingProposals() {
  const proposals = useRef(new Map<string, ProposalData>());

  const addProposal = useCallback((proposal: ProposalData) => {
    proposals.current.set(proposal.proposalId, proposal);
  }, []);

  const getProposal = useCallback((proposalId: string) => {
    return proposals.current.get(proposalId);
  }, []);

  const removeProposal = useCallback((proposalId: string) => {
    proposals.current.delete(proposalId);
  }, []);

  const hasProposal = useCallback((proposalId: string) => {
    return proposals.current.has(proposalId);
  }, []);

  const getAllProposals = useCallback(() => {
    return Array.from(proposals.current.values());
  }, []);

  const clearAll = useCallback(() => {
    proposals.current.clear();
  }, []);

  return {
    addProposal,
    getProposal,
    removeProposal,
    hasProposal,
    getAllProposals,
    clearAll,
  };
}

