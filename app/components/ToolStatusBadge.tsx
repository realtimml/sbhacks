"use client";

import { motion } from "framer-motion";
import {
  Mail,
  Hash,
  Calendar,
  Search,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { TOOL_DISPLAY_NAMES } from "@/app/lib/types";

interface ToolStatusBadgeProps {
  toolName: string;
  status: "executing" | "success" | "error";
  className?: string;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  GMAIL_FETCH_EMAILS: <Mail className="w-3.5 h-3.5" />,
  GMAIL_GET_EMAIL: <Mail className="w-3.5 h-3.5" />,
  GMAIL_LIST_LABELS: <Mail className="w-3.5 h-3.5" />,
  SLACK_LIST_CHANNELS: <Hash className="w-3.5 h-3.5" />,
  SLACK_SEARCH_MESSAGES: <Hash className="w-3.5 h-3.5" />,
  SLACK_GET_CHANNEL_HISTORY: <Hash className="w-3.5 h-3.5" />,
  GOOGLECALENDAR_LIST_EVENTS: <Calendar className="w-3.5 h-3.5" />,
  GOOGLECALENDAR_GET_EVENT: <Calendar className="w-3.5 h-3.5" />,
  GOOGLECALENDAR_LIST_CALENDARS: <Calendar className="w-3.5 h-3.5" />,
  propose_calendar_event: <Calendar className="w-3.5 h-3.5" />,
};

export function ToolStatusBadge({
  toolName,
  status,
  className,
}: ToolStatusBadgeProps) {
  const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName;
  const icon = TOOL_ICONS[toolName] || <Search className="w-3.5 h-3.5" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        "border backdrop-blur-sm",
        status === "executing" &&
          "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
        status === "success" &&
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        status === "error" && "bg-red-500/10 border-red-500/30 text-red-400",
        className
      )}
    >
      {status === "executing" ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === "success" ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}

      <span className="opacity-60">{icon}</span>

      <span>{displayName}</span>

      {status === "executing" && (
        <motion.span
          className="flex gap-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="typing-dot w-1 h-1 rounded-full bg-current" />
          <span className="typing-dot w-1 h-1 rounded-full bg-current" />
          <span className="typing-dot w-1 h-1 rounded-full bg-current" />
        </motion.span>
      )}
    </motion.div>
  );
}

