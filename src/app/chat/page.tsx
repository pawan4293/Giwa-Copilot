"use client";

import { ChatWindow } from "@/components/ChatWindow";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ChatPageInner() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10 px-4 py-3 flex items-center justify-between bg-black/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-semibold text-sm">GIWA Copilot</span>
          <span className="text-white/30 text-xs">Grok · GIWA Sepolia (91342)</span>
        </div>
        <div className="text-xs text-white/20 hidden sm:block">
          All data fetched live from the chain — no synthetic values
        </div>
      </motion.div>

      {/* Chat window */}
      {ready && (
        <div className="flex-1 overflow-hidden">
          <ChatWindow key={prompt || "default"} />
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
