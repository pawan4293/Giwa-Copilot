"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";

interface RecipientRow {
  identifier: string;
  amountEth: string;
}

interface PrefillParams {
  description?: string;
  totalAmountEth?: string;
  recipients?: RecipientRow[];
  splitEqually?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (shareUrl: string) => void;
  prefill: PrefillParams | null;
}

export function SplitFormModal({ isOpen, onClose, onCreated, prefill }: Props) {
  const { address, isConnected } = useAccount();

  const [description, setDescription] = useState("");
  const [totalAmountEth, setTotalAmountEth] = useState("");
  const [recipients, setRecipients] = useState<RecipientRow[]>([{ identifier: "", amountEth: "" }]);
  const [splitEqually, setSplitEqually] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (prefill) {
      setDescription(prefill.description || "");
      setTotalAmountEth(prefill.totalAmountEth || "");
      setSplitEqually(prefill.splitEqually ?? true);
      if (prefill.recipients?.length) {
        setRecipients(
          prefill.recipients.map((r) => ({ identifier: r.identifier || "", amountEth: r.amountEth || "" }))
        );
      } else {
        setRecipients([{ identifier: "", amountEth: "" }]);
      }
      setError(null);
    }
  }, [prefill, isOpen]);

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
      onCreated(data.shareUrl);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-black border border-white/20 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Request Payment</h2>
                <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">
                  ✕
                </button>
              </div>

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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}