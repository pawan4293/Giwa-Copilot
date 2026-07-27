"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress, formatEther } from "viem";
import { SCHEDULER_ABI } from "@/lib/contracts";
import { FlashblocksStatus } from "./FlashblocksStatus";

const SCHEDULER_ADDRESS = (process.env.NEXT_PUBLIC_SCHEDULER_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const UNIT_SECONDS: Record<string, number> = {
  Minutes: 60,
  Hours: 3600,
  Days: 86400,
  Weeks: 604800,
  Months: 2592000, // 30 days
};

interface PrefillParams {
  recipient?: string;
  amountPerReleaseEth?: string;
  intervalSeconds?: number;
  occurrences?: number;
  endsAt?: number;
}

interface Props {
  prefill?: PrefillParams;
  onClose?: () => void;
  onSuccess?: (txHash: string, scheduleSummary: string) => void;
}

function toLocalInputs(ts: number) {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

function fromLocalInputs(date: string, time: string): number {
  if (!date || !time) return 0;
  return Math.floor(new Date(`${date}T${time}:00`).getTime() / 1000);
}

export function ScheduleForm({ prefill, onClose, onSuccess }: Props) {
  const { address, isConnected, chainId } = useAccount();
  const isCorrectChain = chainId === 91342;
  const { data: balanceData } = useBalance({ address, chainId: 91342 });
 const availableEth = balanceData ? parseFloat(formatEther(balanceData.value)) : 0;

  const [mode, setMode] = useState<"onetime" | "recurring">("onetime");
  const [nameInput, setNameInput] = useState(prefill?.recipient || "");
  const [resolvedAddr, setResolvedAddr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [amount, setAmount] = useState(prefill?.amountPerReleaseEth || "1");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const nowPlus10 = Math.floor(Date.now() / 1000) + 10 * 60;
  const defaultStart = toLocalInputs(nowPlus10);

  const [sendDate, setSendDate] = useState(defaultStart.date);
  const [sendTime, setSendTime] = useState(defaultStart.time);

  const [repeatEvery, setRepeatEvery] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState("Days");
  const [untilDate, setUntilDate] = useState(defaultStart.date);
  const [untilTime, setUntilTime] = useState("23:59");

  const { writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const startTs = fromLocalInputs(sendDate, sendTime);
  const untilTs = fromLocalInputs(untilDate, untilTime);
  const intervalSeconds = UNIT_SECONDS[repeatUnit] || 86400;

  const startTooSoon = startTs < Math.floor(Date.now() / 1000) + 10 * 60;
  const untilBeforeStart = mode === "recurring" && untilTs <= startTs;

  const cycles = useMemo(() => {
    if (mode === "onetime") return 1;
    if (untilBeforeStart || !intervalSeconds) return 0;
    return Math.max(0, Math.floor((untilTs - startTs) / intervalSeconds) + 1);
  }, [mode, untilTs, startTs, intervalSeconds, untilBeforeStart]);

  const totalEth = (parseFloat(amount || "0") * cycles).toFixed(6);
  const canSubmit =
    !startTooSoon &&
    !untilBeforeStart &&
    cycles > 0 &&
    parseFloat(amount || "0") > 0 &&
    isConnected &&
    isCorrectChain;

  const resolveUpId = async () => {
    if (!nameInput.trim()) return;
    if (nameInput.startsWith("0x")) {
      setResolvedAddr(nameInput);
      return;
    }
    setResolving(true);
    setResolveErr(null);
    setResolvedAddr(null);
    try {
      const res = await fetch(`/api/resolve-name?name=${encodeURIComponent(nameInput)}`);
      const data = await res.json();
      if (data.error) setResolveErr(data.error);
      else setResolvedAddr(data.address);
    } catch {
      setResolveErr("Resolution failed");
    } finally {
      setResolving(false);
    }
  };

  const handleMax = () => {
    setAmount(availableEth > 0 ? availableEth.toFixed(6) : "0");
  };

  const handleDeposit = async () => {
    let recipientAddr = resolvedAddr;
    if (!recipientAddr) {
      await resolveUpId();
      recipientAddr = resolvedAddr;
    }
    if (!recipientAddr || !isAddress(recipientAddr)) {
      setSubmitErr("Could not resolve a valid recipient address");
      return;
    }
    if (!canSubmit) {
      setSubmitErr("Please fix the highlighted issues above");
      return;
    }

    setSubmitErr(null);
    const amountWei = parseEther(amount);
    const totalWei = amountWei * BigInt(cycles);
    const now = Math.floor(Date.now() / 1000);
    const firstDelay = Math.max(60, startTs - now);
    const interval = mode === "onetime" ? firstDelay : intervalSeconds;
    const endsAt = mode === "onetime" ? startTs + 3600 : untilTs + 3600;

    writeContract(
      {
        address: SCHEDULER_ADDRESS,
        abi: SCHEDULER_ABI,
        functionName: "deposit",
        args: [recipientAddr as `0x${string}`, amountWei, BigInt(firstDelay), BigInt(interval), BigInt(cycles), BigInt(endsAt)],
        value: totalWei,
      },
      {
       onSuccess: async (hash) => {
          setTxHash(hash);
          try {
            const { publicClient } = await import("@/lib/viemClient");
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const depositedLog = receipt.logs.find(
              (log) => log.address.toLowerCase() === SCHEDULER_ADDRESS.toLowerCase()
            );
            const realScheduleId = depositedLog?.topics[1]
              ? BigInt(depositedLog.topics[1]).toString()
              : null;

            if (realScheduleId) {
              fetch("/api/schedule/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scheduleId: realScheduleId,
                  intervalSeconds: interval,
                  occurrences: cycles,
                  owner: address,
                }),
              }).catch(console.warn);
            } else {
              setSubmitErr("Deposit succeeded but couldn't read the schedule ID — QStash job not registered. Contact support with tx hash: " + hash);
            }
          } catch (e) {
            console.warn("Failed to register QStash job:", e);
          }

          const summary = `${cycles}× ${amount} ETH to ${nameInput || recipientAddr}`;

          // Reset the form now that the deposit succeeded
          setNameInput("");
          setResolvedAddr(null);
          setAmount(prefill?.amountPerReleaseEth || "1");
          const resetDefaults = toLocalInputs(Math.floor(Date.now() / 1000) + 10 * 60);
          setSendDate(resetDefaults.date);
          setSendTime(resetDefaults.time);

          onSuccess?.(hash, summary);
        },
        onError: (err) => setSubmitErr(err.message || "Transaction rejected"),
      }
    );
  };

  if (SCHEDULER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-2xl p-6 text-yellow-400 text-sm">
        ⚠ Scheduler contract not deployed. Set NEXT_PUBLIC_SCHEDULER_ADDRESS.
      </div>
    );
  }

  return (
    <div className="bg-black border border-white/10 rounded-2xl p-7 w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <span className="text-white/40">⏱</span> Schedule Payment
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setMode("onetime")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "onetime" ? "bg-white text-black" : "border border-white/15 text-white/50"
          }`}
        >
          One-time
        </button>
        <button
          onClick={() => setMode("recurring")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "recurring" ? "bg-white text-black" : "border border-white/15 text-white/50"
          }`}
        >
          Recurring
        </button>
      </div>

      {/* Recipient */}
      <label className="block text-xs text-white/40 mb-1.5">Sending to</label>
      <input
        value={nameInput}
        onChange={(e) => { setNameInput(e.target.value); setResolvedAddr(null); }}
        onBlur={resolveUpId}
        placeholder="@alice or 0x…"
        className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-white text-sm mb-1 focus:outline-none focus:border-white/30"
      />
      {resolving && <div className="text-xs text-white/30 mb-2">Resolving…</div>}
      {resolvedAddr && <div className="text-xs text-emerald-400 font-mono mb-2">✓ {resolvedAddr.slice(0, 10)}…{resolvedAddr.slice(-6)}</div>}
      {resolveErr && <div className="text-xs text-red-400 mb-2">{resolveErr}</div>}

      {/* Amount */}
      <label className="block text-xs text-white/40 mb-1.5 mt-3">Amount per transfer</label>
      <div className="flex gap-2 mb-1">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.0001"
          className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30"
        />
        <button onClick={handleMax} className="px-4 rounded-xl border border-white/20 text-white/70 text-sm font-bold hover:border-white/40">
          Max
        </button>
        <div className="px-4 flex items-center rounded-xl border border-white/15 text-white/60 text-sm font-bold">
          ETH
        </div>
      </div>
      <div className="text-xs text-white/30 mb-4">Available: {availableEth.toFixed(4)} ETH</div>

      {/* One-time send at */}
      {mode === "onetime" && (
        <>
          <label className="block text-xs text-white/40 mb-1.5">Send at</label>
          <div className="flex gap-2 mb-1">
            <input type="date" value={sendDate} onChange={(e) => setSendDate(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
            <input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
          </div>
          <div className="text-xs text-white/25 mb-4">⏱ Payment may take 2-3 minutes to reach the destination wallet after this time</div>
        </>
      )}

      {/* Recurring config */}
      {mode === "recurring" && (
        <>
          <label className="block text-xs text-white/40 mb-1.5">Start time (first payment goes at this time)</label>
          <div className="flex gap-2 mb-1">
            <input type="date" value={sendDate} onChange={(e) => setSendDate(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
            <input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
          </div>
          <div className="text-xs text-white/25 mb-4">⏱ Payment may take 2-3 minutes to reach the destination wallet after this time</div>

          <label className="block text-xs text-white/40 mb-1.5">Repeat every</label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              min="1"
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(e.target.value)}
              className="w-16 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm text-center"
            />
            {Object.keys(UNIT_SECONDS).map((u) => (
              <button
                key={u}
                onClick={() => setRepeatUnit(u)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  repeatUnit === u ? "bg-white text-black border-white" : "border-white/15 text-white/50"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <label className="block text-xs text-white/40 mb-1.5">Repeat until</label>
          <div className="flex gap-2 mb-4">
            <input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
            <input type="time" value={untilTime} onChange={(e) => setUntilTime(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
          </div>
        </>
      )}

      {/* Summary */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-4">
        <div className="text-white text-sm mb-1">Total cycles: <b>{cycles}</b></div>
        <div className="text-white text-sm mb-1">Total deposit needed: <b>{totalEth} ETH</b></div>
        {startTooSoon && (
          <div className="text-yellow-400 text-xs mt-2">⚠ Pick a time at least 10 minutes from now</div>
        )}
        {untilBeforeStart && (
          <div className="text-yellow-400 text-xs mt-2">⚠ "Repeat until" must be after the start time</div>
        )}
      </div>

      {submitErr && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
          {submitErr}
        </div>
      )}

      {!isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm mb-4">
          Connect your wallet to schedule a payment.
        </div>
      )}
      {isConnected && !isCorrectChain && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm mb-4">
          Switch to GIWA Sepolia (chain ID 91342).
        </div>
      )}

      <div className="flex gap-3">
        {onClose && (
          <button onClick={onClose} className="flex-1 border border-white/15 text-white/70 py-3 rounded-xl font-bold text-sm">
            Cancel
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDeposit}
          disabled={isPending || isConfirming || !canSubmit}
          className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-white/90 disabled:opacity-40"
        >
          {isPending ? "Sign in Wallet…" : isConfirming ? "Confirming…" : "Deposit & Schedule"}
        </motion.button>
      </div>

      {txHash && <div className="mt-4"><FlashblocksStatus txHash={txHash} /></div>}
    </div>
  );
}