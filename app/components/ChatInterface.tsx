"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChat } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { usePendingProposals } from "@/app/hooks/usePendingProposals";
import { executeConfirmedEvent } from "@/app/actions";
import { MessageBubble } from "./MessageBubble";
import { ToolStatusBadge } from "./ToolStatusBadge";
import { OptimisticLoader } from "./OptimisticLoader";
import { HITLCard } from "./HITLCard";
import type { ProposalData, ToolInvocation } from "@/app/lib/types";

interface ChatInterfaceProps {
  entityId: string;
}

export function ChatInterface({ entityId }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addProposal, getProposal, removeProposal } = usePendingProposals();

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, error } =
    useChat({
      api: "/api/chat",
      headers: {
        "x-entity-id": entityId,
      },
      onError: (err) => {
        console.error("Chat error:", err);
      },
    });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract and store proposals from tool invocations
  useEffect(() => {
    messages.forEach((msg) => {
      const toolInvocations = msg.toolInvocations as ToolInvocation[] | undefined;
      toolInvocations?.forEach((inv) => {
        if (
          inv.toolName === "propose_calendar_event" &&
          inv.state === "result"
        ) {
          const result = inv.result as ProposalData;
          if (result.confirmationRequired && result.proposalId) {
            addProposal({
              ...result,
              toolCallId: inv.toolCallId,
            });
          }
        }
      });
    });
  }, [messages, addProposal]);

  // Handle HITL confirmation with context
  const handleConfirm = useCallback(
    async (proposal: ProposalData) => {
      const messagesSince = messages.length - proposal.messageIndex;

      // Execute the actual calendar creation
      const result = await executeConfirmedEvent(
        {
          proposalId: proposal.proposalId,
          summary: proposal.summary,
          start: proposal.start,
          end: proposal.end,
          description: proposal.description,
          attendees: proposal.attendees,
        },
        entityId
      );

      // Contextual append with proposal reference to prevent history drift
      append({
        role: "user",
        content: `[System] User confirmed calendar event "${proposal.summary}" (ID: ${proposal.proposalId}) proposed ${messagesSince} messages ago. ${
          result.success
            ? `Event created successfully.`
            : `Error: ${result.error}`
        }`,
      });

      removeProposal(proposal.proposalId);
    },
    [messages.length, entityId, append, removeProposal]
  );

  // Handle form submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSubmit(e);
  };

  // Handle Enter key (submit on Enter, new line on Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  // Get current tool invocations for streaming status
  const getCurrentToolInvocations = () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "assistant") return [];
    return (lastMessage.toolInvocations as ToolInvocation[]) || [];
  };

  const toolInvocations = getCurrentToolInvocations();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {/* Welcome message */}
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-cyan-400" />
              </div>
              <motion.div
                className="absolute -inset-2 rounded-3xl"
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(6, 182, 212, 0.2)",
                    "0 0 40px rgba(6, 182, 212, 0.1)",
                    "0 0 20px rgba(6, 182, 212, 0.2)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              Welcome to Orbital
            </h2>
            <p className="text-zinc-400 max-w-md">
              I can search your emails and Slack messages, and help you schedule
              calendar events. What would you like to do?
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                "Search my emails for invoices",
                "Find messages from John",
                "Schedule a meeting tomorrow",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    handleInputChange({
                      target: { value: suggestion },
                    } as React.ChangeEvent<HTMLTextAreaElement>);
                    inputRef.current?.focus();
                  }}
                  className="px-4 py-2 rounded-full text-sm bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {messages.map((message) => {
            const toolInvocations = message.toolInvocations as ToolInvocation[] | undefined;
            const hasContent = message.content && message.content.trim().length > 0;
            const hasTools = toolInvocations && toolInvocations.length > 0;

            return (
              <div key={message.id} className="space-y-3 animate-fade-in-up">
                {/* Only render message bubble if there's content */}
                {hasContent && (
                  <MessageBubble
                    role={message.role as "user" | "assistant"}
                    content={message.content}
                  />
                )}

                {/* Render tool invocations */}
                {hasTools && (
                  <div className={hasContent ? "ml-11" : ""}>
                    <div className="space-y-3">
                      {toolInvocations.map((inv) => (
                        <div key={inv.toolCallId} className="space-y-3">
                          {/* Tool status badge */}
                          {(inv.state === "call" || inv.state === "partial-call") && (
                            <ToolStatusBadge toolName={inv.toolName} status="executing" />
                          )}
                          {inv.state === "result" && inv.toolName !== "propose_calendar_event" && (
                            <ToolStatusBadge toolName={inv.toolName} status="success" />
                          )}

                          {/* HITL Card for calendar proposals */}
                          {inv.toolName === "propose_calendar_event" &&
                            inv.state === "result" && (
                              <HITLCard
                                proposal={inv.result as ProposalData}
                                onConfirm={() =>
                                  handleConfirm(inv.result as ProposalData)
                                }
                              />
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </AnimatePresence>

        {/* Loading indicator */}
        <AnimatePresence>
          {isLoading && (
            <div className="space-y-3">
              {toolInvocations.length === 0 ? (
                <OptimisticLoader message="Thinking..." />
              ) : (
                <OptimisticLoader message="Processing results..." />
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            <p className="font-medium">Error</p>
            <p className="text-red-400/80">{error.message}</p>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 p-4">
        <form onSubmit={onSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to search your emails, Slack, or schedule events..."
            rows={1}
            className={cn(
              "w-full resize-none pr-14",
              "glass-input",
              "min-h-[52px] max-h-[200px]"
            )}
            style={{
              height: "auto",
              overflowY: input.split("\n").length > 3 ? "auto" : "hidden",
            }}
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "p-2.5 rounded-xl",
              "bg-gradient-to-r from-cyan-500 to-teal-500",
              "text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
            whileHover={!isLoading && input.trim() ? { scale: 1.05 } : {}}
            whileTap={!isLoading && input.trim() ? { scale: 0.95 } : {}}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
        <p className="text-xs text-zinc-600 mt-2 text-center">
          Orbital uses AI to search your connected accounts. Events require
          confirmation.
        </p>
      </div>
    </div>
  );
}

