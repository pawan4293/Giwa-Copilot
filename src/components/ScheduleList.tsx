"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import { SCHEDULER_ABI } from "@/lib/contracts";

const SCHEDULER_ADDRESS = process.env.NEXT_PUBLIC_SCHEDULER_ADDRESS || "0x0000000000000000000000000000000000000000";

interface ScheduleRow {
  id: string;
  owner: string;
  recipient: string;
  amountPerRelease: string;
  interval: string;
  occurrences: string;
  released: string;
  nextReleaseAt: string;
  endsAt: string;
  active: boolean;
}

function Countdown({ targetTs }: { targetTs: number }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = targetTs - now;
  if (diff <= 0) return <span className="text-emerald-400 font-bold">Due now!</span>;
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return (
    <span className="font-mono text-white/80">
      {d > 0 && `${d}d `}{h > 0 && `${h}h `}{m > 0 && `${m}m `}{s}s
    </span>
  );
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatIntervalLabel(intervalSeconds: number, occurrences: number): string {
  if (occurrences === 1) return "One-time";
  if (intervalSeconds >= 86400) return `every ${Math.round(intervalSeconds / 86400)}d`;
  if (intervalSeconds >= 3600) return `every ${Math.round(intervalSeconds / 3600)}h`;
  if (intervalSeconds >= 60) return `every ${Math.round(intervalSeconds / 60)}m`;
  return `every ${intervalSeconds}s`;
}

export function ScheduleList() {
  const { address, isConnected } = useAccount();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const { writeContract } = useWriteContract();

  const load = useCallback(async () => {
    if (!address || SCHEDULER_ADDRESS === "0x0000000000000000000000000000000000000000") return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/activity?address=${address}&type=logs`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      const ids = [
        ...new Set(
          (data.events || [])
            .filter((e: { type: string }) => e.type === "Deposited")
            .map((e: { args: { id: string } }) => e.args.id)
        ),
      ] as string[];

      const { publicClient } = await import("@/lib/viemClient");
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const result = await publicClient.readContract({
              address: SCHEDULER_ADDRESS as `0x${string}`,
              abi: SCHEDULER_ABI,
              functionName: "schedules",
              args: [BigInt(id)],
            }) as readonly [string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean];

            const [owner, recipient, amountPerRelease, , interval, occurrences, released, nextReleaseAt, endsAt, active] = result;

            return {
              id, owner, recipient,
              amountPerRelease: amountPerRelease.toString(),
              interval:         interval.toString(),
              occurrences:      occurrences.toString(),
              released:         released.toString(),
              nextReleaseAt:    nextReleaseAt.toString(),
              endsAt:           endsAt.toString(),
              active,
            } as ScheduleRow;
          } catch {
            return null;
          }
        })
      );

      const rows = results.filter((r): r is ScheduleRow => r !== null);
      setSchedules(rows);

      // Resolve .up.id names for all recipients, in parallel
      const uniqueRecipients = [...new Set(rows.map((r) => r.recipient.toLowerCase()))];
      const nameResults = await Promise.all(
        uniqueRecipients.map(async (addr) => {
          try {
            const r = await fetch(`/api/resolve-address?address=${addr}`);
            const d = await r.json();
            return [addr, d.name as string | null] as const;
          } catch {
            return [addr, null] as const;
          }
        })
      );
      const newCache: Record<string, string> = {};
      for (const [addr, name] of nameResults) {
        if (name) newCache[addr] = name;
      }
      setNameCache(newCache);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = (id: string) => {
    setCancelling(id);
    writeContract(
      {
        address: SCHEDULER_ADDRESS as `0x${string}`,
        abi: SCHEDULER_ABI,
        functionName: "cancel",
        args: [BigInt(id)],
      },
      {
        onSuccess: () => {
          setTimeout(load, 3000);
          setCancelling(null);
        },
        onError: (err) => {
          console.error("Cancel failed:", err);
          setCancelling(null);
        },
      }
    );
  };

  const recipientDisplay = (recipient: string) => {
    const name = nameCache[recipient.toLowerCase()];
    return name || `${recipient.slice(0, 10)}…${recipient.slice(-6)}`;
  };

  if (!isConnected) {
    return <div className="text-center py-12 text-white/30 text-sm">Connect your wallet to view schedules.</div>;
  }
  if (SCHEDULER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return <div className="text-center py-12 text-yellow-400/50 text-sm">Scheduler contract not deployed yet.</div>;
  }
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-8 text-red-400/60 text-sm">{error}</div>;
  }

  const active   = schedules.filter((s) => s.active);
  const inactive = schedules.filter((s) => !s.active);

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div>
          <h3 className="text-xs text-white/30 uppercase tracking-widest mb-3">Active</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {active.map((s) => {
                const totalEth = formatEther(BigInt(s.amountPerRelease) * BigInt(s.occurrences));
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border border-white/10 rounded-2xl p-4 bg-white/[0.02]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-semibold text-sm">Schedule #{s.id}</div>
                        <div className="text-emerald-400/80 text-xs mt-0.5">→ {recipientDisplay(s.recipient)}</div>
                        <div className="text-white/25 font-mono text-[10px] mt-0.5">
                          {s.recipient.slice(0, 10)}…{s.recipient.slice(-6)}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCancel(s.id)}
                        disabled={cancelling === s.id}
                        className="text-xs border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg hover:border-red-500/60 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      >
                        {cancelling === s.id ? "Cancelling…" : "Cancel & Refund"}
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <div className="text-white/30 mb-1">Per release</div>
                        <div className="text-white font-mono">{formatEther(BigInt(s.amountPerRelease))} ETH</div>
                      </div>
                      <div>
                        <div className="text-white/30 mb-1">Total scheduled</div>
                        <div className="text-white font-mono">{totalEth} ETH</div>
                      </div>
                      <div>
                        <div className="text-white/30 mb-1">Progress</div>
                        <div className="text-white/70">{s.released}/{s.occurrences} released</div>
                      </div>
                      <div>
                        <div className="text-white/30 mb-1">Frequency</div>
                        <div className="text-white/70">{formatIntervalLabel(Number(s.interval), Number(s.occurrences))}</div>
                      </div>
                      <div>
                        <div className="text-white/30 mb-1">Next release in</div>
                        <Countdown targetTs={Number(s.nextReleaseAt)} />
                      </div>
                      <div>
                        <div className="text-white/30 mb-1">Scheduled for</div>
                        <div className="text-white/70">{formatDate(Number(s.nextReleaseAt))}</div>
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-full h-1">
                      <div
                        className="bg-white rounded-full h-1 transition-all"
                        style={{ width: `${(Number(s.released) / Number(s.occurrences)) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h3 className="text-xs text-white/30 uppercase tracking-widest mb-3">Completed / Cancelled</h3>
          <div className="space-y-3">
            {inactive.map((s) => {
              const totalEth = formatEther(BigInt(s.amountPerRelease) * BigInt(s.occurrences));
              return (
                <div key={s.id} className="border border-white/5 rounded-2xl p-4 bg-white/[0.01] opacity-70">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white/70 font-semibold text-sm">Schedule #{s.id}</div>
                      <div className="text-white/50 text-xs mt-0.5">→ {recipientDisplay(s.recipient)}</div>
                      <div className="text-white/20 font-mono text-[10px] mt-0.5">
                        {s.recipient.slice(0, 10)}…{s.recipient.slice(-6)}
                      </div>
                    </div>
                    <span className="text-xs text-white/30">{s.released}/{s.occurrences} released</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                    <div>
                      <div className="text-white/20 mb-1">Per release</div>
                      <div className="text-white/60 font-mono">{formatEther(BigInt(s.amountPerRelease))} ETH</div>
                    </div>
                    <div>
                      <div className="text-white/20 mb-1">Total scheduled</div>
                      <div className="text-white/60 font-mono">{totalEth} ETH</div>
                    </div>
                    <div>
                      <div className="text-white/20 mb-1">Frequency</div>
                      <div className="text-white/60">{formatIntervalLabel(Number(s.interval), Number(s.occurrences))}</div>
                    </div>
                    <div>
                      <div className="text-white/20 mb-1">Was scheduled for</div>
                      <div className="text-white/60">{formatDate(Number(s.nextReleaseAt))}</div>
                    </div>
                  </div>
                  
                   <a href={`https://sepolia-explorer.giwa.io/address/${SCHEDULER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    View on Explorer ↗
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {schedules.length === 0 && (
        <div className="text-center py-12 text-white/20 text-sm">No schedules found. Create one above.</div>
      )}

      <button
        onClick={load}
        className="w-full border border-white/10 text-white/30 py-2 rounded-xl text-xs hover:border-white/20 hover:text-white/50 transition-all"
      >
        Refresh from chain ↻
      </button>
    </div>
  );
}