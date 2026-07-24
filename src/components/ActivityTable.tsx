"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";

interface EventRow {
  type: "Deposited" | "Released" | "Cancelled" | "Transfer" | string;
  txHash: string;
  blockNumber: string;
  args: Record<string, string>;
  explorerUrl: string;
}

const TYPE_COLORS: Record<string, string> = {
  Deposited: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Released:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  Transfer:  "text-white/70 bg-white/[0.06] border-white/20",
};

export function ActivityTable() {
  const { address, isConnected } = useAccount();
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/activity?address=${address}&type=logs`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setEvents(data.events || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  const loadNames = useCallback(async (addrs: string[]) => {
    const unique = [...new Set(addrs.map((a) => a.toLowerCase()))].filter(
      (a) => a && !(a in nameCache)
    );
    if (unique.length === 0) return;

    const results = await Promise.all(
      unique.map(async (a) => {
        try {
          const res = await fetch(`/api/resolve-address?address=${a}`);
          const data = await res.json();
          return [a, data.name as string | null] as const;
        } catch {
          return [a, null] as const;
        }
      })
    );

    setNameCache((prev) => {
      const next = { ...prev };
      for (const [a, name] of results) {
        if (name) next[a] = name;
      }
      return next;
    });
  }, [nameCache]);

  useEffect(() => {
    const counterparties = events
      .filter((e) => e.type === "Transfer")
      .map((e) =>
        e.args.from?.toLowerCase() === address?.toLowerCase() ? e.args.to : e.args.from
      )
      .filter(Boolean) as string[];
    loadNames(counterparties);
  }, [events, address, loadNames]);


  if (!isConnected) {
    return (
      <div className="text-center py-12 text-white/30 text-sm">
        Connect your wallet to view activity.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
        <div className="text-white/30 text-xs mt-3">Reading from chain…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400/60 text-sm">{error}</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4 opacity-20">📋</div>
        <div className="text-white/20 text-sm">No activity found for this address.</div>
        <div className="text-white/10 text-xs mt-2">
          Activity is read directly from the Scheduler contract events on GIWA Sepolia.
        </div>
        <button
          onClick={load}
          className="mt-4 border border-white/10 text-white/30 px-4 py-2 rounded-xl text-xs hover:border-white/20 hover:text-white/50 transition-all"
        >
          Refresh ↻
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-white/30 uppercase tracking-widest">
          {events.length} event{events.length !== 1 ? "s" : ""} from chain
        </div>
        <button
          onClick={load}
          className="text-xs border border-white/10 text-white/30 px-3 py-1 rounded-lg hover:border-white/20 hover:text-white/50 transition-all"
        >
          Refresh ↻
        </button>
      </div>

      <AnimatePresence>
        {events.map((event, i) => (
          <motion.div
            key={`${event.txHash}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="border border-white/10 rounded-2xl p-4 bg-white/[0.02] hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${TYPE_COLORS[event.type]}`}
                >
                  {event.type}
                </span>
                <span className="text-white/30 text-xs">
                  Block #{event.blockNumber}
                </span>
              </div>
              <a
                href={event.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/70 transition-colors font-mono"
              >
                {event.txHash.slice(0, 8)}…{event.txHash.slice(-6)} ↗
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {event.type === "Deposited" && (
                <>
                  <div>
                    <div className="text-white/30 mb-1">Schedule ID</div>
                    <div className="text-white font-mono">#{event.args.id}</div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Total Deposited</div>
                    <div className="text-white font-mono">
                      {formatEther(BigInt(event.args.totalDeposited || "0"))} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Per Release</div>
                    <div className="text-white/70 font-mono">
                      {formatEther(BigInt(event.args.amountPerRelease || "0"))} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Occurrences</div>
                    <div className="text-white/70">{event.args.occurrences}×</div>
                  </div>
                </>
              )}

              {event.type === "Released" && (
                <>
                  <div>
                    <div className="text-white/30 mb-1">Schedule ID</div>
                    <div className="text-white font-mono">#{event.args.id}</div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Amount</div>
                    <div className="text-emerald-400 font-mono font-bold">
                      +{formatEther(BigInt(event.args.amount || "0"))} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Release #</div>
                    <div className="text-white/70">{Number(event.args.releaseIndex || "0") + 1}</div>
                  </div>
                </>
              )}

              {event.type === "Cancelled" && (
                <>
                  <div>
                    <div className="text-white/30 mb-1">Schedule ID</div>
                    <div className="text-white font-mono">#{event.args.id}</div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Refund</div>
                    <div className="text-red-400 font-mono">
                      {formatEther(BigInt(event.args.refundAmount || "0"))} ETH
                    </div>
                  </div>
                </>
              )}

              {event.type === "Transfer" && (
                <>
                  <div>
                    <div className="text-white/30 mb-1">
                      {event.args.from?.toLowerCase() === address?.toLowerCase() ? "Sent to" : "Received from"}
                    </div>
                    <div>
                      {(() => {
                        const counterparty =
                          event.args.from?.toLowerCase() === address?.toLowerCase()
                            ? event.args.to
                            : event.args.from;
                        const name = counterparty && nameCache[counterparty.toLowerCase()];
                        const shortAddr = `${counterparty?.slice(0, 6)}…${counterparty?.slice(-4)}`;
                        return name ? (
                          <>
                            <div className="text-white font-mono">{name}</div>
                            <div className="text-white/30 font-mono text-[10px] mt-0.5">{shortAddr}</div>
                          </>
                        ) : (
                          <div className="text-white font-mono">{shortAddr}</div>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-1">Amount</div>
                    <div
                      className={`font-mono font-bold ${
                        event.args.from?.toLowerCase() === address?.toLowerCase()
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {event.args.from?.toLowerCase() === address?.toLowerCase() ? "-" : "+"}
                      {formatEther(BigInt(event.args.valueWei || "0"))} ETH
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
