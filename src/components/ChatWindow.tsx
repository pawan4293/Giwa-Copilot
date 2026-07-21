"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { TxConfirmModal } from "./TxConfirmModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const EXAMPLE_PROMPTS = [
  "What's the ETH balance of 0x1234…?",
  "Is alice.up.id verified?",
  "Resolve bob.up.id",
  "Schedule 0.01 ETH daily to alice.up.id",
  "What is GIWA Sepolia?",
  "Explain Flashblocks",
];

const STORAGE_KEY = "giwa-copilot-chat-history";

function renderMessageContent(content: string) {
  const parts = content.split(/(\[[^\]]*\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <a
          key={i}
          href={match[2]}
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {match[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatWindow() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const [sendModal, setSendModal] = useState<{
    isOpen: boolean;
    to: string;
    displayName: string;
    amountEth: string;
  }>({ isOpen: false, to: "", displayName: "", amountEth: "" });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text.trim(),
      id: crypto.randomUUID(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          connectedAddress: isConnected ? address : null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.content || "(no response)",
        id: crypto.randomUUID(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      const action = data.pendingAction;
      if (action?.action === "open_schedule_form") {
        window.location.href = `/schedule?prefill=${encodeURIComponent(JSON.stringify(action.params))}`;
      }
      if (action?.action === "open_send_modal") {
        setSendModal({
          isOpen: true,
          to: action.to,
          displayName: action.displayName,
          amountEth: action.amountEth,
        });
      }
    } catch (e) {
      setError("Network error. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center pt-8 pb-4"
            >
              <div className="text-4xl mb-4">⛩</div>
              <h2 className="text-white text-xl font-bold mb-2">GIWA Copilot</h2>
              <p className="text-white/40 text-sm max-w-sm mx-auto">
                AI assistant for GIWA Sepolia testnet. Ask me about balances,
                verified addresses, .up.id names, and more.
              </p>
              {!isConnected && (
                <p className="text-yellow-400/60 text-xs mt-4">
                  Connect your wallet for full functionality
                </p>
              )}
              {isConnected && address && (
                <p className="text-emerald-400/60 text-xs mt-4 font-mono">
                  Connected: {address.slice(0, 6)}…{address.slice(-4)}
                </p>
              )}

              <div className="mt-8 grid grid-cols-2 gap-2 max-w-md mx-auto">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <motion.button
                    key={prompt}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(prompt)}
                    className="text-left border border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05] rounded-xl px-3 py-2 text-xs text-white/50 hover:text-white/80 transition-all"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-white text-black rounded-br-md"
                    : "bg-white/[0.06] border border-white/10 text-white/90 rounded-bl-md"
                }`}
              >
                {renderMessageContent(msg.content)}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-white/40 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto max-w-md bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <button
            onClick={clearChat}
            title="Clear chat"
            disabled={messages.length === 0}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border border-white/15 text-white/40 hover:text-red-400 hover:border-red-400/40 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            🗑️
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about GIWA Sepolia…"
            rows={1}
            className="flex-1 bg-white/[0.04] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/25 resize-none focus:outline-none focus:border-white/30 transition-all max-h-32 overflow-y-auto"
            style={{ minHeight: "48px" }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center font-bold text-lg hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              "↑"
            )}
          </motion.button>
        </div>
        <div className="text-center text-xs text-white/20 mt-2">
          Enter to send · Shift+Enter for new line · Chain: GIWA Sepolia (91342)
        </div>
      </div>

      <TxConfirmModal
        isOpen={sendModal.isOpen}
        onClose={() => setSendModal((s) => ({ ...s, isOpen: false }))}
        to={sendModal.to}
        displayName={sendModal.displayName}
        amountEth={sendModal.amountEth}
      />
    </div>
  );
}