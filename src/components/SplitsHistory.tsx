"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";

interface Recipient {
  identifier: string;
  amountEth: string;
  paid: boolean;
  paidTxHash: string | null;
}

interface SplitItem {
  id: number;
  description: string;
  totalAmountEth: string;
  createdAt: string;
  recipients: Recipient[];
  shareUrl: string;
}

export function SplitsHistory() {
  const { address, isConnected } = useAccount();
  const [splits, setSplits] = useState<SplitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/splits/mine?address=${address}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setSplits(data.splits || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isConnected) {
    return <div className="text-white/40 text-sm">Connect your wallet to see splits you've created.</div>;
  }

  if (loading) {
    return <div className="text-white/40 text-sm">Loading splits…</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>;
  }

  if (splits.length === 0) {
    return <div className="text-white/40 text-sm">You haven&apos;t created any splits yet.</div>;
  }

  return (
    <div className="space-y-4">
      {splits.map((split) => {
        const paidCount = split.recipients.filter((r) => r.paid).length;
        return (
          <div key={split.id} className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-semibold">{split.description}</div>
                <div className="text-white/30 text-xs">
                  {split.totalAmountEth} ETH total · {paidCount}/{split.recipients.length} paid
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(split.shareUrl)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Copy link
              </button>
            </div>
            <div className="space-y-1.5">
              {split.recipients.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {r.paid ? "✅" : "⬜"} {r.identifier}
                  </span>
                  <span className={r.paid ? "text-emerald-400" : "text-white/40"}>
                    {r.amountEth} ETH
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}