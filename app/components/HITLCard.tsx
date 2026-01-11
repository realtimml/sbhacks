"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Check,
  X,
  Loader2,
  Edit3,
} from "lucide-react";
import { cn, formatDate } from "@/app/lib/utils";
import type { ProposalData } from "@/app/lib/types";

interface HITLCardProps {
  proposal: ProposalData;
  onConfirm: () => Promise<void>;
  onEdit?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function HITLCard({
  proposal,
  onConfirm,
  onEdit,
  onCancel,
  className,
}: HITLCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setIsConfirmed(true);
    } catch (error) {
      console.error("Failed to confirm event:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isConfirmed) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.7 }}
        className={cn(
          "p-4 rounded-2xl border",
          "bg-emerald-500/10 border-emerald-500/30",
          className
        )}
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Check className="w-5 h-5" />
          <span className="font-medium">Event created: {proposal.summary}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-2xl border",
        "bg-white/5 border-white/10",
        "backdrop-blur-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{proposal.summary}</h3>
            <p className="text-xs text-zinc-500">
              Proposal ID: {proposal.proposalId}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span>{formatDate(proposal.start)}</span>
          <span className="text-zinc-500">→</span>
          <span>{formatDate(proposal.end)}</span>
        </div>

        {proposal.description && (
          <div className="flex items-start gap-2 text-sm text-zinc-400">
            <FileText className="w-4 h-4 text-zinc-500 mt-0.5" />
            <span>{proposal.description}</span>
          </div>
        )}

        {proposal.attendees && proposal.attendees.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Users className="w-4 h-4 text-zinc-500" />
            <span>{proposal.attendees.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          onClick={handleConfirm}
          disabled={isConfirming}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium",
            "hover:from-cyan-400 hover:to-teal-400",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
          whileHover={!isConfirming ? { scale: 1.02 } : {}}
          whileTap={!isConfirming ? { scale: 0.98 } : {}}
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Confirm</span>
            </>
          )}
        </motion.button>

        {onEdit && (
          <motion.button
            onClick={onEdit}
            disabled={isConfirming}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-white/5 border border-white/10 text-zinc-300",
              "hover:bg-white/10 hover:text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
            whileHover={!isConfirming ? { scale: 1.02 } : {}}
            whileTap={!isConfirming ? { scale: 0.98 } : {}}
          >
            <Edit3 className="w-4 h-4" />
          </motion.button>
        )}

        {onCancel && (
          <motion.button
            onClick={onCancel}
            disabled={isConfirming}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-red-500/10 border border-red-500/30 text-red-400",
              "hover:bg-red-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
            whileHover={!isConfirming ? { scale: 1.02 } : {}}
            whileTap={!isConfirming ? { scale: 0.98 } : {}}
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

