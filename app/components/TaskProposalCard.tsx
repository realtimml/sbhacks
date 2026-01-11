"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Hash,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { TaskProposal } from "@/app/lib/types";
import type { ExecuteResult } from "@/app/lib/types";

interface TaskProposalCardProps {
  proposal: TaskProposal;
  onApprove: () => Promise<ExecuteResult>;
  onReject: () => Promise<void>;
}

const priorityConfig = {
  low: {
    label: "Low",
    color: "text-zinc-400",
    bg: "bg-zinc-500/20",
    border: "border-zinc-500/30",
  },
  medium: {
    label: "Medium",
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
  },
  high: {
    label: "High",
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
  },
};

const sourceConfig = {
  slack: {
    icon: Hash,
    label: "Slack",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
  },
  gmail: {
    icon: Mail,
    label: "Gmail",
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
};

export function TaskProposalCard({
  proposal,
  onApprove,
  onReject,
}: TaskProposalCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [error, setError] = useState<string | null>(null);

  const priority = priorityConfig[proposal.priority];
  const source = sourceConfig[proposal.source];
  const SourceIcon = source.icon;

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const result = await onApprove();
      if (result.success) {
        setStatus("approved");
      } else {
        setError(result.error || "Failed to create task");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject();
      setStatus("rejected");
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setIsRejecting(false);
    }
  };

  // Approved state
  if (status === "approved") {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.7 }}
        className={cn(
          "p-4 rounded-2xl border",
          "bg-emerald-500/10 border-emerald-500/30"
        )}
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Task created: {proposal.title}</span>
        </div>
      </motion.div>
    );
  }

  // Rejected state
  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "p-4 rounded-2xl border",
          "bg-zinc-500/10 border-zinc-500/30"
        )}
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Dismissed: {proposal.title}</span>
        </div>
      </motion.div>
    );
  }

  const formattedDate = proposal.dueDate
    ? new Date(proposal.dueDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border overflow-hidden",
        "bg-white/5 border-white/10",
        "backdrop-blur-xl"
      )}
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Source Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  source.bg,
                  source.color
                )}
              >
                <SourceIcon className="w-3 h-3" />
                {source.label}
              </span>

              {/* Priority Badge */}
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  priority.bg,
                  priority.color
                )}
              >
                {proposal.priority === "high" && (
                  <AlertTriangle className="w-3 h-3 mr-1" />
                )}
                {priority.label}
              </span>

              {/* Confidence */}
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <Sparkles className="w-3 h-3" />
                {Math.round(proposal.confidence * 100)}%
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-white leading-tight">
              {proposal.title}
            </h3>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-600">From:</span>
            {proposal.sourceContext.sender}
          </span>

          {formattedDate && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-600" />
              Due {formattedDate}
            </span>
          )}

          {proposal.sourceContext.channel && (
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Hash className="w-3.5 h-3.5" />
              {proposal.sourceContext.channel}
            </span>
          )}
        </div>

        {/* Description (if present) */}
        {proposal.description && (
          <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
            {proposal.description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium",
              "hover:from-cyan-400 hover:to-teal-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
            whileHover={!isApproving ? { scale: 1.02 } : {}}
            whileTap={!isApproving ? { scale: 0.98 } : {}}
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Add to Notion</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={handleReject}
            disabled={isApproving || isRejecting}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-white/5 border border-white/10 text-zinc-400",
              "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
            whileHover={!isRejecting ? { scale: 1.02 } : {}}
            whileTap={!isRejecting ? { scale: 0.98 } : {}}
          >
            {isRejecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
          </motion.button>

          {/* Expand Button */}
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center justify-center p-2.5 rounded-xl",
              "bg-white/5 border border-white/10 text-zinc-400",
              "hover:bg-white/10 hover:text-white",
              "transition-all duration-200"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresenceWrapper isExpanded={isExpanded}>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 pt-2 border-t border-white/5">
            {/* AI Reasoning */}
            <div className="mb-3">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Why this was detected
              </h4>
              <p className="text-sm text-zinc-400">{proposal.reasoning}</p>
            </div>

            {/* Original Content */}
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Original message
              </h4>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-sm text-zinc-400 whitespace-pre-wrap line-clamp-6">
                  {proposal.sourceContext.originalContent}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresenceWrapper>
    </motion.div>
  );
}

// Helper component to handle AnimatePresence
import { AnimatePresence } from "framer-motion";

function AnimatePresenceWrapper({
  isExpanded,
  children,
}: {
  isExpanded: boolean;
  children: React.ReactNode;
}) {
  return <AnimatePresence>{isExpanded && children}</AnimatePresence>;
}
