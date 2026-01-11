"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface OptimisticLoaderProps {
  message?: string;
  className?: string;
}

export function OptimisticLoader({
  message = "Thinking...",
  className,
}: OptimisticLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl",
        "bg-white/5 border border-white/10",
        "max-w-fit",
        className
      )}
    >
      <div className="relative">
        <Sparkles className="w-5 h-5 text-cyan-500" />
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="w-5 h-5 text-cyan-500" />
        </motion.div>
      </div>

      <span className="text-sm text-zinc-400">{message}</span>

      <div className="flex gap-1">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-cyan-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-cyan-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-cyan-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  );
}

