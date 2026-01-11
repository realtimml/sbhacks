"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Hash, Calendar, Loader2, Check, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { AppName } from "@/app/lib/types";

interface ConnectButtonProps {
  app: AppName;
  entityId: string;
  isConnected?: boolean;
  className?: string;
}

const APP_ICONS: Record<AppName, React.ReactNode> = {
  GMAIL: <Mail className="w-4 h-4" />,
  SLACK: <Hash className="w-4 h-4" />,
  GOOGLECALENDAR: <Calendar className="w-4 h-4" />,
  NOTION: <FileText className="w-4 h-4" />,
};

const APP_LABELS: Record<AppName, string> = {
  GMAIL: "Gmail",
  SLACK: "Slack",
  GOOGLECALENDAR: "Calendar",
  NOTION: "Notion",
};

const APP_COLORS: Record<AppName, string> = {
  GMAIL: "hover:border-red-500/50 hover:bg-red-500/10",
  SLACK: "hover:border-purple-500/50 hover:bg-purple-500/10",
  GOOGLECALENDAR: "hover:border-blue-500/50 hover:bg-blue-500/10",
  NOTION: "hover:border-zinc-400/50 hover:bg-zinc-400/10",
};

const APP_CONNECTED_COLORS: Record<AppName, string> = {
  GMAIL: "border-red-500/30 bg-red-500/10 text-red-400",
  SLACK: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  GOOGLECALENDAR: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  NOTION: "border-zinc-400/30 bg-zinc-400/10 text-zinc-300",
};

export function ConnectButton({
  app,
  entityId,
  isConnected = false,
  className,
}: ConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    if (isConnected || isLoading) return;
    
    setIsLoading(true);
    // Redirect to OAuth endpoint
    window.location.href = `/api/auth/${app}?entityId=${encodeURIComponent(entityId)}`;
  };

  return (
    <motion.button
      onClick={handleConnect}
      disabled={isLoading || isConnected}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
        "text-sm font-medium",
        isConnected
          ? APP_CONNECTED_COLORS[app]
          : cn(
              "border-white/10 bg-white/5 text-zinc-400",
              APP_COLORS[app],
              "hover:text-white"
            ),
        isLoading && "opacity-50 cursor-wait",
        className
      )}
      whileHover={!isConnected && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!isConnected && !isLoading ? { scale: 0.98 } : {}}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
          >
            <Loader2 className="w-4 h-4" />
          </motion.div>
        ) : isConnected ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Check className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {APP_ICONS[app]}
          </motion.div>
        )}
      </AnimatePresence>

      <span>{APP_LABELS[app]}</span>

      {!isConnected && !isLoading && (
        <ExternalLink className="w-3 h-3 opacity-50" />
      )}
    </motion.button>
  );
}

