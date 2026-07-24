"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { TxConfirmModal } from "@/components/TxConfirmModal";

interface SplitData {
  description: string;
  totalAmountEth: string;
  creatorAddress: string;
  deadline: string | null;
  recipientCount: number;
  matched: boolean;
  yourAmountEth?: string;
  yourIdentifier?: string;
  paid?: boolean;
  paidTxHash?: string;
  recipientId?: number;
}

export default function SplitPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<SplitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = address
        ? `/api/splits/${id}?address=${address}`
        : `/api/splits/${id}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id, address]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePaySuccess = async (txHash: string) => {
    if (!data?.recipientId) return;
    await fetch(`/api/splits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: data.recipientId, txHash }),
    });
    setPayModalOpen(false);
    load();
  };

  if (loading) {
    return <div className="text-center py-20 text-white/40">Loading…</div>;
  }

  if (error || !data) {
    return <div className="text-center py-20 text-red-400">{error || "Split not found"}</div>;
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">{data.description}</h1>
      <p className="text-white/40 text-sm mb-8">
        Total: {data.totalAmountEth} ETH · Split {data.recipientCount} ways
      </p>

      {!isConnected && (
        <div className="text-yellow-400/70 text-sm border border-yellow-400/20 rounded-xl p-4">
          Connect your wallet to see if this split is for you.
        </div>
      )}

      {isConnected && !data.matched && (
        <div className="text-white/40 text-sm border border-white/10 rounded-xl p-4">
          This split isn&apos;t for your connected wallet.
        </div>
      )}

      {isConnected && data.matched && (
        <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
          <div className="text-white/40 text-xs mb-1">Your share ({data.yourIdentifier})</div>
          <div className="text-3xl font-bold text-white mb-4">{data.yourAmountEth} ETH</div>

          {data.paid ? (
            <div className="text-emerald-400 text-sm">
              ✅ Paid — hash: {data.paidTxHash}
            </div>
          ) : (
            <button
              onClick={() => setPayModalOpen(true)}
              className="w-full bg-white text-black rounded-xl py-3 font-bold hover:bg-white/90 transition-all"
            >
              Pay {data.yourAmountEth} ETH
            </button>
          )}
        </div>
      )}

      <TxConfirmModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={handlePaySuccess}
        to={data.creatorAddress}
        displayName={data.description}
        amountEth={data.yourAmountEth || "0"}
      />
    </div>
  );
}