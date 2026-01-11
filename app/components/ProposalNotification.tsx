"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useProposals } from "@/app/hooks/useProposals";
import { TaskProposalCard } from "./TaskProposalCard";
import { executeNotionTask } from "@/app/actions";
import type { TaskProposal } from "@/app/lib/types";

interface ProposalNotificationProps {
  entityId: string;
}

export function ProposalNotification({ entityId }: ProposalNotificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { proposals, count, isLoading, refetch, removeProposal } = useProposals({
    entityId,
    pollInterval: 10000,
  });

  const handleApprove = async (proposal: TaskProposal) => {
    try {
      const result = await executeNotionTask(
        {
          title: proposal.title,
          description: proposal.description,
          dueDate: proposal.dueDate,
          priority: proposal.priority,
          source: proposal.source,
          sourceContext: proposal.sourceContext,
        },
        entityId
      );

      if (result.success) {
        await removeProposal(proposal.proposalId);
      } else {
        console.error("Failed to create Notion task:", result.error);
      }

      return result;
    } catch (error) {
      console.error("Error approving proposal:", error);
      return { success: false, error: "Failed to create task" };
    }
  };

  const handleReject = async (proposalId: string) => {
    await removeProposal(proposalId);
  };

  return (
    <>
      {/* Bell Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative p-2.5 rounded-xl transition-all duration-200",
          "bg-white/5 border border-white/10",
          "hover:bg-white/10 hover:border-white/20",
          count > 0 && "border-amber-500/30 bg-amber-500/10"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell
          className={cn(
            "w-4 h-4",
            count > 0 ? "text-amber-400" : "text-zinc-400"
          )}
        />
        {/* Badge */}
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                "absolute -top-1 -right-1",
                "min-w-[18px] h-[18px] px-1",
                "flex items-center justify-center",
                "text-[10px] font-bold text-white",
                "bg-gradient-to-r from-amber-500 to-orange-500",
                "rounded-full shadow-lg shadow-amber-500/30"
              )}
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed right-0 top-0 bottom-0 z-50",
                "w-full max-w-md",
                "bg-zinc-900/95 backdrop-blur-xl",
                "border-l border-white/10",
                "flex flex-col"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Inbox className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Task Proposals
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {count} pending {count === 1 ? "task" : "tasks"} detected
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="text-sm">Loading proposals...</p>
                  </div>
                ) : proposals.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="p-4 rounded-2xl bg-white/5 mb-4">
                      <Inbox className="w-10 h-10 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-400 mb-1">
                      No pending tasks
                    </h3>
                    <p className="text-sm text-zinc-600 max-w-xs">
                      When Orbital detects tasks from your Slack DMs or emails,
                      they&apos;ll appear here for your approval.
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {proposals.map((proposal, index) => (
                      <motion.div
                        key={proposal.proposalId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TaskProposalCard
                          proposal={proposal}
                          onApprove={() => handleApprove(proposal)}
                          onReject={() => handleReject(proposal.proposalId)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {proposals.length > 0 && (
                <div className="px-6 py-4 border-t border-white/10">
                  <p className="text-xs text-zinc-600 text-center">
                    Tasks are detected from Slack DMs and Gmail using AI.
                    Review and approve to add to Notion.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
