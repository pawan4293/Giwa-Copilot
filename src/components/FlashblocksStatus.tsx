"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlashblocksResult {
  receipt: { status: string; blockNumber: string } | null;
  source: "flashblocks" | "standard" | "pending";
  latencyMs: number;
  preconfirmed: boolean;
  finalised: boolean;
  txHash: string;
}

interface Props {
  txHash: string | null;
  onFinalised?: (receipt: FlashblocksResult) => void;
}

export function FlashblocksStatus({ txHash, onFinalised }: Props) {
  const [status, setStatus] = useState<FlashblocksResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const poll = useCallback(async (hash: string) => {
    setPolling(true);
    const startTime = Date.now();

    const res = await fetch(`/api/flashblocks?hash=${encodeURIComponent(hash)}`);
    const data: FlashblocksResult = await res.json();

    // Override latencyMs with true client-side measurement
    data.latencyMs = Date.now() - startTime;

    setStatus(data);
    setAttempts((a) => a + 1);

    if (data.finalised || data.preconfirmed) {
      setPolling(false);
      onFinalised?.(data);
    } else {
      // Keep polling until finalised (max 60 attempts = ~30s)
      setPolling(false);
    }
  }, [onFinalised]);

  useEffect(() => {
    if (!txHash) {
      setStatus(null);
      setAttempts(0);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      if (cancelled) return;
      await poll(txHash);
      if (!cancelled && attempts < 60) {
        timer = setTimeout(run, 500);
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [txHash]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!txHash) return null;

  const sourceLabel = {
    flashblocks: "Flashblocks preconfirmed",
    standard:    "Finalised on-chain",
    pending:     "Pending…",
  };

  const sourceColor = {
    flashblocks: "text-emerald-400",
    standard:    "text-blue-400",
    pending:     "text-yellow-400",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mt-4 border border-white/10 rounded-2xl p-4 bg-white/[0.02] backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {polling && (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              Transaction Status
            </span>
          </div>
          {status && (
            <span className={`text-xs font-bold ${sourceColor[status.source]}`}>
              {sourceLabel[status.source]}
            </span>
          )}
        </div>

        <div className="font-mono text-xs text-white/40 mb-3 break-all">
          {txHash}
        </div>

        {status && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-white/30 text-xs mb-1">Latency</div>
              <div className="text-white font-mono text-sm font-bold">
                {status.latencyMs}ms
              </div>
            </div>
            <div>
              <div className="text-white/30 text-xs mb-1">Source</div>
              <div className={`text-sm font-semibold ${sourceColor[status.source]}`}>
                {status.source}
              </div>
            </div>
            <div>
              <div className="text-white/30 text-xs mb-1">Polls</div>
              <div className="text-white/60 font-mono text-sm">{attempts}</div>
            </div>
          </div>
        )}

        <a
          href={`https://sepolia-explorer.giwa.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-xs text-white/30 hover:text-white/70 transition-colors"
        >
          View on GIWA Explorer ↗
        </a>
      </motion.div>
    </AnimatePresence>
  );
}
