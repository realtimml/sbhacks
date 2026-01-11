"use client";

import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  className?: string;
}

export function MessageBubble({ role, content, className }: MessageBubbleProps) {
  const isUser = role === "user";
  const isSystem = role === "system" || content.startsWith("[System]");

  // Don't render system messages as bubbles
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "text-xs text-zinc-500 text-center py-2 italic",
          className
        )}
      >
        {content.replace("[System]", "").trim()}
      </motion.div>
    );
  }

  // Don't render empty assistant messages (tool-only responses handled separately)
  if (!content && role === "assistant") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-cyan-500 to-teal-500"
            : "bg-white/10 border border-white/10"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl",
          isUser
            ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-white"
            : "bg-white/5 border border-white/10 text-zinc-200"
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </motion.div>
  );
}

