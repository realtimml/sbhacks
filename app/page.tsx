"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Orbit, Sparkles, Loader2, Bell } from "lucide-react";
import { ChatInterface } from "./components/ChatInterface";
import { ConnectButton } from "./components/ConnectButton";
import { ProposalNotification } from "./components/ProposalNotification";
import { useEntityId } from "./hooks/useEntityId";
import { getConnectedApps } from "./actions";
import type { AppName } from "./lib/types";

export default function Home() {
  const { entityId, isLoading: isEntityLoading } = useEntityId();
  const [connectedApps, setConnectedApps] = useState<Set<AppName>>(new Set());
  const [isCheckingConnections, setIsCheckingConnections] = useState(true);

  // Check connected apps on mount and when entityId changes
  useEffect(() => {
    async function checkConnections() {
      if (!entityId) return;
      
      setIsCheckingConnections(true);
      try {
        const result = await getConnectedApps(entityId);
        setConnectedApps(new Set(result.apps as AppName[]));
      } catch (error) {
        console.error("Failed to check connections:", error);
      } finally {
        setIsCheckingConnections(false);
      }
    }

    checkConnections();
  }, [entityId]);

  // Loading state
  if (isEntityLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <Orbit className="w-12 h-12 text-cyan-500 animate-spin-slow" />
            <motion.div
              className="absolute inset-0"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Orbit className="w-12 h-12 text-cyan-500" />
            </motion.div>
          </div>
          <p className="text-zinc-500 text-sm">Initializing Orbital...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Orbit className="w-5 h-5 text-cyan-500" />
            </div>
            <Sparkles className="w-3 h-3 text-teal-400 absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-gradient">
              Orbital
            </h1>
            <p className="text-xs text-zinc-500">Agentic Personal OS</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          {isCheckingConnections ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking connections...</span>
            </div>
          ) : (
            <>
              <ConnectButton
                app="GMAIL"
                entityId={entityId}
                isConnected={connectedApps.has("GMAIL")}
              />
              <ConnectButton
                app="SLACK"
                entityId={entityId}
                isConnected={connectedApps.has("SLACK")}
              />
              <ConnectButton
                app="NOTION"
                entityId={entityId}
                isConnected={connectedApps.has("NOTION")}
              />
              
              {/* Divider */}
              <div className="w-px h-6 bg-white/10 mx-1" />
              
              {/* Notification Bell */}
              <ProposalNotification entityId={entityId} />
            </>
          )}
        </motion.div>
      </header>

      {/* Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-0 overflow-hidden"
      >
        <ChatInterface entityId={entityId} />
      </motion.div>
    </main>
  );
}

