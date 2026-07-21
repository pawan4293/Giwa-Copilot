"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress } from "viem";
import { SCHEDULER_ABI } from "@/lib/contracts";
import { INTERVAL_OPTIONS } from "@/lib/qstash";
import { FlashblocksStatus } from "./FlashblocksStatus";

const SCHEDULER_ADDRESS = process.env.NEXT_PUBLIC_SCHEDULER_ADDRESS || "0x0000000000000000000000000000000000000000";

interface PrefillParams {
  recipient?: string;
  amountPerReleaseEth?: string;
  intervalSeconds?: number;
  occurrences?: number;
  endsAt?: number;
}

export function ScheduleForm({ prefill }: { prefill?: PrefillParams }) {
  const { address, isConnected, chainId } = useAccount();
  const isCorrectChain = chainId === 91342;

  const [recipient,   setRecipient]   = useState(prefill?.recipient || "");
  const [amount,      setAmount]      = useState(prefill?.amountPerReleaseEth || "0.01");
  const [intervalIdx, setIntervalIdx] = useState(
    prefill?.intervalSeconds
      ? INTERVAL_OPTIONS.findIndex((o) => o.seconds === prefill.intervalSeconds)
      : 2 // default: daily
  );
  const [occurrences, setOccurrences] = useState(String(prefill?.occurrences || 5));
  const [nameInput,   setNameInput]   = useState("");
  const [resolvedAddr, setResolvedAddr] = useState<string | null>(null);
  const [resolving,   setResolving]   = useState(false);
  const [resolveErr,  setResolveErr]  = useState<string | null>(null);
  const [submitErr,   setSubmitErr]   = useState<string | null>(null);
  const [txHash,      setTxHash]      = useState<string | null>(null);

  const { writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const intervalOpt = INTERVAL_OPTIONS[intervalIdx] || INTERVAL_OPTIONS[2];
  const endsAt = Math.floor(Date.now() / 1000) + intervalOpt.seconds * Number(occurrences) + 86400;
  const totalEth = (parseFloat(amount || "0") * Number(occurrences || "0")).toFixed(6);

  const resolveUpId = async () => {
    if (!nameInput.trim()) return;
    setResolving(true);
    setResolveErr(null);
    setResolvedAddr(null);
    try {
      const res = await fetch(`/api/resolve-name?name=${encodeURIComponent(nameInput)}`);
      const data = await res.json();
      if (data.error) {
        setResolveErr(data.error);
      } else {
        setResolvedAddr(data.address);
        setRecipient(data.address);
      }
    } catch {
      setResolveErr("Resolution failed");
    } finally {
      setResolving(false);
    }
  };

  const handleDeposit = () => {
    const recipientAddr = resolvedAddr || recipient;
    if (!isAddress(recipientAddr)) {
      setSubmitErr("Invalid recipient address");
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      setSubmitErr("Invalid amount");
      return;
    }
    const occ = parseInt(occurrences);
    if (isNaN(occ) || occ < 1) {
      setSubmitErr("Invalid occurrences");
      return;
    }

    setSubmitErr(null);
    const amountWei = parseEther(amount);
    const totalWei = amountWei * BigInt(occ);

    writeContract(
      {
        address: SCHEDULER_ADDRESS as `0x${string}`,
        abi: SCHEDULER_ABI,
        functionName: "deposit",
        args: [
          recipientAddr as `0x${string}`,
          amountWei,
          BigInt(intervalOpt.seconds),
          BigInt(occ),
          BigInt(endsAt),
        ],
        value: totalWei,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          // Register QStash schedule after deposit confirms
          fetch("/api/schedule/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduleId: "pending",
              intervalSeconds: intervalOpt.seconds,
              occurrences: occ,
              owner: address,
            }),
          }).catch(console.warn);
        },
        onError: (err) => {
          setSubmitErr(err.message || "Transaction rejected");
        },
      }
    );
  };

  if (SCHEDULER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-2xl p-6 text-yellow-400 text-sm">
        <div className="font-bold mb-2">⚠ Scheduler Not Deployed</div>
        <p>
          The Scheduler contract has not been deployed yet. Run the Foundry deploy script and
          set <code className="bg-white/10 px-1 rounded">SCHEDULER_CONTRACT_ADDRESS</code> in
          your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Recipient */}
      <div>
        <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">
          Recipient
        </label>
        <div className="flex gap-2">
          <input
            value={nameInput}
            onChange={(e) => { setNameInput(e.target.value); setResolvedAddr(null); }}
            placeholder="alice.up.id or 0x…"
            className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={resolveUpId}
            disabled={resolving || !nameInput.trim()}
            className="border border-white/20 text-white/60 px-4 rounded-xl text-sm hover:border-white/40 hover:text-white transition-all disabled:opacity-40"
          >
            {resolving ? "…" : "Resolve"}
          </motion.button>
        </div>

        {resolvedAddr && (
          <div className="mt-2 text-xs text-emerald-400 font-mono">
            ✓ {resolvedAddr}
          </div>
        )}
        {resolveErr && (
          <div className="mt-2 text-xs text-red-400">{resolveErr}</div>
        )}

        {/* Manual 0x address override */}
        {!resolvedAddr && nameInput.startsWith("0x") && (
          <div className="mt-2 text-xs text-white/30">Detected 0x address — will send directly</div>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">
          Amount per Release (ETH)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.001"
          className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 transition-all font-mono"
        />
      </div>

      {/* Interval */}
      <div>
        <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">
          Interval
        </label>
        <div className="grid grid-cols-3 gap-2">
          {INTERVAL_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setIntervalIdx(i)}
              className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                intervalIdx === i
                  ? "bg-white text-black border-white"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Occurrences */}
      <div>
        <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">
          Occurrences
        </label>
        <input
          type="number"
          value={occurrences}
          onChange={(e) => setOccurrences(e.target.value)}
          min="1"
          step="1"
          className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all font-mono"
        />
      </div>

      {/* Summary */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-white/30 text-xs mb-1">Total deposit</div>
            <div className="text-white font-mono font-bold">{totalEth} ETH</div>
          </div>
          <div>
            <div className="text-white/30 text-xs mb-1">Schedule</div>
            <div className="text-white/80 text-xs">
              {occurrences}× {intervalOpt.label}
            </div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {submitErr && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {submitErr}
        </div>
      )}

      {/* Not connected */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          Connect your wallet to create a schedule.
        </div>
      )}

      {!isCorrectChain && isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          Switch to GIWA Sepolia (chain ID 91342).
        </div>
      )}

      {/* Submit */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDeposit}
        disabled={isPending || isConfirming || !isConnected || !isCorrectChain}
        className="w-full bg-white text-black py-3.5 rounded-2xl font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Sign in Wallet…
          </>
        ) : isConfirming ? (
          <>
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Confirming…
          </>
        ) : (
          `Deposit ${totalEth} ETH & Schedule`
        )}
      </motion.button>

      {/* Flashblocks status */}
      {txHash && <FlashblocksStatus txHash={txHash} />}
    </div>
  );
}
