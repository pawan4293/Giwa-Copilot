"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { TxConfirmModal } from "./TxConfirmModal";
import { SplitFormModal } from "./SplitFormModal";
import { BulkSendModal } from "./BulkSendModal";
import { BulkFormModal } from "./BulkFormModal";
import { ScheduleForm } from "./ScheduleForm";

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
  "Request 0.1 ETH split equally from alice.up.id and bob.up.id",
  "Open a payment request form",
  "Explain Flashblocks",
];

const STORAGE_KEY = "giwa-copilot-chat-history";

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 text-xs text-white/40 hover:text-white/80 transition-colors"
      title="Copy link"
    >
      {copied ? "✅" : "📋"}
    </button>
  );
}

function renderMessageContent(content: string) {
  const parts = content.split(/(\[[^\]]*\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    if (match) {
      const url = match[2];
      const isFullShareLink = url.includes("/split/") && !url.includes("/activity");
      return (
        <span key={i} className="inline-flex items-center">
          <a
            href={url}
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all"
          >
            {isFullShareLink ? url : match[1]}
          </a>
          <CopyLinkButton url={url} />
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatWindow() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [sendCompleted, setSendCompleted] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{ isOpen: boolean; prefill?: Record<string, unknown> }>({ isOpen: false });
const [scheduleCompleted, setScheduleCompleted] = useState(false);
  const [splitModal, setSplitModal] = useState<{ isOpen: boolean; prefill: Record<string, unknown> | null }>({
    isOpen: false,
    prefill: null,
  });
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    recipients: { identifier: string; address: string; amountEth: string }[];
  }>({ isOpen: false, recipients: [] });
  const [bulkCompleted, setBulkCompleted] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);

  const handleBulkFormConfirm = (
    recipients: { identifier: string; address: string; amountEth: string }[]
  ) => {
    setBulkFormOpen(false);
    setBulkModal({ isOpen: true, recipients });
  };

  const handleBulkFormClose = () => {
    setBulkFormOpen(false);
    appendSystemMessage("❌ You cancelled the bulk payment form.");
  };

  const handleBulkSuccess = (txHash: string) => {
    setBulkCompleted(true);
    appendSystemMessage(
      `✅ Bulk payment sent successfully to ${bulkModal.recipients.length} recipients.\nHash: ${txHash} [↗](https://sepolia-explorer.giwa.io/tx/${txHash})`
    );
  };

  const handleBulkModalClose = () => {
    if (!bulkCompleted) {
      appendSystemMessage("❌ You cancelled the bulk payment. Nothing was sent.");
    }
    setBulkCompleted(false);
    setBulkModal({ isOpen: false, recipients: [] });
  };

  const handleSplitCreated = (shareUrl: string) => {
    setSplitModal({ isOpen: false, prefill: null });
    appendSystemMessage(
      `Split request created! Each person will owe their share to you.\nShare this link: [↗](${shareUrl})\nTrack who has paid in [Activity → Splits](https://giwa-copilot.vercel.app/activity)`
    );
  };

  const handleSplitModalClose = () => {
    setSplitModal({ isOpen: false, prefill: null });
    appendSystemMessage("❌ You cancelled the payment request form.");
  };

  const appendSystemMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, id: crypto.randomUUID() },
    ]);
  };

  const handleSendSuccess = (txHash: string) => {
    setSendCompleted(true);
    appendSystemMessage(
      `✅ Payment sent successfully.\nTo: ${sendModal.to}\nAmount: ${sendModal.amountEth} ETH (testnet — no real value)\nHash: ${txHash} [↗](https://sepolia-explorer.giwa.io/tx/${txHash})`
    );
  };

  const handleSendModalClose = () => {
    if (!sendCompleted) {
      appendSystemMessage("❌ You cancelled the payment. Nothing was sent.");
    }
    setSendCompleted(false);
    setSendModal((s) => ({ ...s, isOpen: false }));
  };

  const handleScheduleSuccess = (txHash: string, summary: string) => {
    setScheduleCompleted(true);
    appendSystemMessage(`✅ Schedule created: ${summary}\nTrack it in the [Schedule tab](/schedule) ↗`);
    setScheduleModal({ isOpen: false });
  };

  const handleScheduleModalClose = () => {
    if (!scheduleCompleted) {
      appendSystemMessage("❌ You cancelled the schedule.");
    }
    setScheduleCompleted(false);
    setScheduleModal({ isOpen: false });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          connectedAddress: isConnected ? address : null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
        setScheduleModal({ isOpen: true, prefill: action.params });
      }
      if (action?.action === "open_send_modal") {
        setSendModal({
          isOpen: true,
          to: action.to,
          displayName: action.displayName,
          amountEth: action.amountEth,
        });
      }
      if (action?.action === "open_split_form") {
        setSplitModal({ isOpen: true, prefill: action.params });
      }
      if (action?.action === "open_bulk_send_modal") {
        setBulkModal({ isOpen: true, recipients: action.recipients });
      }
      if (action?.action === "open_bulk_form") {
        setBulkFormOpen(true);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("This is taking too long — the AI service may be busy. Please try again in a moment.");
      } else {
        setError("Network error. Please try again.");
      }
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
        onClose={handleSendModalClose}
        onSuccess={handleSendSuccess}
        to={sendModal.to}
        displayName={sendModal.displayName}
        amountEth={sendModal.amountEth}
      />

      <SplitFormModal
        isOpen={splitModal.isOpen}
        onClose={handleSplitModalClose}
        onCreated={handleSplitCreated}
        prefill={splitModal.prefill}
      />

      {scheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg">
            <ScheduleForm
              prefill={scheduleModal.prefill}
              onClose={handleScheduleModalClose}
              onSuccess={handleScheduleSuccess}
            />
          </div>
        </div>
      )}

      <BulkSendModal
        isOpen={bulkModal.isOpen}
        onClose={handleBulkModalClose}
        onSuccess={handleBulkSuccess}
        recipients={bulkModal.recipients}
      />

      <BulkFormModal
        isOpen={bulkFormOpen}
        onClose={handleBulkFormClose}
        onConfirm={handleBulkFormConfirm}
      />
    </div>
  );
}