"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";

interface RecipientRow {
  identifier: string;
  amountEth: string;
}

export default function NewSplitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-white/40">Loading…</div>}>
      <NewSplitPageInner />
    </Suspense>
  );
}

function NewSplitPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [description, setDescription] = useState("");
  const [totalAmountEth, setTotalAmountEth] = useState("");
  const [recipients, setRecipients] = useState<RecipientRow[]>([{ identifier: "", amountEth: "" }]);
  const [splitEqually, setSplitEqually] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      try {
        const parsed = JSON.parse(decodeURIComponent(prefill));
        setDescription(parsed.description || "");
        setTotalAmountEth(parsed.totalAmountEth || "");
        setSplitEqually(parsed.splitEqually ?? true);
        if (parsed.recipients?.length) {
          setRecipients(
            parsed.recipients.map((r: RecipientRow) => ({
              identifier: r.identifier || "",
              amountEth: r.amountEth || "",
            }))
          );
        }
      } catch {
        // ignore bad prefill
      }
    }
  }, [searchParams]);

  const updateRecipient = (i: number, field: keyof RecipientRow, value: string) => {
    setRecipients((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRecipient = () => setRecipients((prev) => [...prev, { identifier: "", amountEth: "" }]);
  const removeRecipient = (i: number) => setRecipients((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }
    setError(null);
    setCreating(true);

    try {
      let finalRecipients = recipients;
      let total = totalAmountEth;

      if (splitEqually) {
        if (!totalAmountEth || recipients.length === 0) {
          setError("Enter a total amount and at least one recipient.");
          setCreating(false);
          return;
        }
        const each = (parseFloat(totalAmountEth) / recipients.length).toString();
        finalRecipients = recipients.map((r) => ({ ...r, amountEth: each }));
      } else {
        if (recipients.some((r) => !r.amountEth)) {
          setError("Enter an amount for every recipient, or switch to equal split.");
          setCreating(false);
          return;
        }
        total = recipients.reduce((a, r) => a + parseFloat(r.amountEth), 0).toString();
      }

      const res = await fetch("/api/splits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: address,
          description,
          totalAmountEth: total,
          recipients: finalRecipients,
          baseUrl: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setShareUrl(data.shareUrl);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  if (shareUrl) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Split created! 🎉</h1>
        <div className="border border-white/10 rounded-xl p-4 break-all text-blue-400 mb-4">
          {shareUrl}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="bg-white text-black rounded-xl px-4 py-2 font-bold hover:bg-white/90"
        >
          Copy Link
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-white mb-6">Create a Split</h1>

      <label className="text-white/40 text-xs">What&apos;s this for?</label>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Lunch today"
        className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white mb-4 mt-1"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSplitEqually(true)}
          className={`flex-1 rounded-xl py-2 text-sm font-bold ${splitEqually ? "bg-white text-black" : "border border-white/15 text-white/50"}`}
        >
          Equal Split
        </button>
        <button
          onClick={() => setSplitEqually(false)}
          className={`flex-1 rounded-xl py-2 text-sm font-bold ${!splitEqually ? "bg-white text-black" : "border border-white/15 text-white/50"}`}
        >
          Custom Amounts
        </button>
      </div>

      {splitEqually && (
        <>
          <label className="text-white/40 text-xs">Total amount (ETH)</label>
          <input
            value={totalAmountEth}
            onChange={(e) => setTotalAmountEth(e.target.value)}
            placeholder="0.1"
            className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white mb-4 mt-1"
          />
        </>
      )}

      <label className="text-white/40 text-xs">Recipients</label>
      {recipients.map((r, i) => (
        <div key={i} className="flex gap-2 mt-2">
          <input
            value={r.identifier}
            onChange={(e) => updateRecipient(i, "identifier", e.target.value)}
            placeholder="alice.up.id or 0x..."
            className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white"
          />
          {!splitEqually && (
            <input
              value={r.amountEth}
              onChange={(e) => updateRecipient(i, "amountEth", e.target.value)}
              placeholder="ETH"
              className="w-24 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white"
            />
          )}
          <button onClick={() => removeRecipient(i)} className="text-white/30 hover:text-red-400 px-2">
            ✕
          </button>
        </div>
      ))}
      <button onClick={addRecipient} className="text-blue-400 text-sm mt-2">
        + Add recipient
      </button>

      {error && <div className="text-red-400 text-sm mt-4">{error}</div>}

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-white text-black rounded-xl py-3 font-bold mt-6 hover:bg-white/90 disabled:opacity-40"
      >
        {creating ? "Creating…" : "Create Split"}
      </button>
    </div>
  );
}