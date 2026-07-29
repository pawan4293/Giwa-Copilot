"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RecipientRow {
  identifier: string;
  amountEth: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    recipients: { identifier: string; address: string; amountEth: string }[],
    description: string
  ) => void;
}

export function BulkFormModal({ isOpen, onClose, onConfirm }: Props) {
  const [description, setDescription] = useState("");
  const [splitEqually, setSplitEqually] = useState(true);
  const [totalAmountEth, setTotalAmountEth] = useState("");
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [newIdentifier, setNewIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setSplitEqually(true);
      setTotalAmountEth("");
      setRecipients([]);
      setNewIdentifier("");
      setError(null);
    }
  }, [isOpen]);

  const addRecipient = () => {
    if (!newIdentifier.trim()) return;
    setRecipients((prev) => [...prev, { identifier: newIdentifier.trim(), amountEth: "" }]);
    setNewIdentifier("");
  };

  const updateAmount = (i: number, value: string) => {
    setRecipients((prev) => prev.map((r, idx) => (idx === i ? { ...r, amountEth: value } : r)));
  };

  const removeRecipient = (i: number) => setRecipients((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError(null);

    if (recipients.length === 0) {
      setError("Add at least one recipient.");
      return;
    }

    let finalRecipients: RecipientRow[];

    if (splitEqually) {
      if (!totalAmountEth || parseFloat(totalAmountEth) <= 0) {
        setError("Enter a total amount to split equally.");
        return;
      }
      const each = (parseFloat(totalAmountEth) / recipients.length).toString();
      finalRecipients = recipients.map((r) => ({ ...r, amountEth: each }));
    } else {
      if (recipients.some((r) => !r.amountEth || parseFloat(r.amountEth) <= 0)) {
        setError("Enter a valid amount for every recipient.");
        return;
      }
      finalRecipients = recipients;
    }

    setResolving(true);
    try {
      const resolved = await Promise.all(
        finalRecipients.map(async (r) => {
          if (r.identifier.startsWith("0x")) {
            return { identifier: r.identifier, address: r.identifier, amountEth: r.amountEth };
          }
          const res = await fetch(`/api/resolve-name?name=${encodeURIComponent(r.identifier)}`);
          const data = await res.json();
          if (data.error || !data.address) {
            throw new Error(`Could not resolve "${r.identifier}"`);
          }
          return { identifier: r.identifier, address: data.address, amountEth: r.amountEth };
        })
      );
      onConfirm(resolved, description);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
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
                <h2 className="text-lg font-bold text-white">Bulk Payment</h2>
                <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">
                  ✕
                </button>
              </div>

              <label className="text-white/40 text-xs">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly payout"
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
                    placeholder="0.0"
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white mt-1"
                  />
                  {totalAmountEth && recipients.length > 0 && (
                    <div className="text-white/40 text-xs mt-1 mb-4">
                      {(parseFloat(totalAmountEth) / recipients.length).toFixed(8).replace(/\.?0+$/, "")} ETH each
                      × {recipients.length} recipients
                    </div>
                  )}
                  {!(totalAmountEth && recipients.length > 0) && <div className="mb-4" />}
                </>
              )}

              <label className="text-white/40 text-xs">Recipients ({recipients.length})</label>
              <div className="flex gap-2 mt-1 mb-2">
                <input
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                  placeholder="alice.up.id or 0x..."
                  className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white"
                />
                <button
                  onClick={addRecipient}
                  className="w-10 h-10 flex-shrink-0 bg-white text-black rounded-xl font-bold hover:bg-white/90"
                >
                  +
                </button>
              </div>

              {recipients.length === 0 ? (
                <div className="text-white/20 text-xs text-center py-3">
                  Add recipients using the field above.
                </div>
              ) : (
                <div className="space-y-2">
                  {recipients.map((r, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="flex-1 text-white/70 text-sm truncate">{r.identifier}</span>
                      {!splitEqually ? (
                        <input
                          value={r.amountEth}
                          onChange={(e) => updateAmount(i, e.target.value)}
                          placeholder="ETH"
                          className="w-24 bg-white/[0.04] border border-white/15 rounded-xl px-2 py-1.5 text-white text-sm"
                        />
                      ) : (
                        <span className="text-white/50 text-xs font-mono">
                          {totalAmountEth
                            ? (parseFloat(totalAmountEth) / recipients.length).toFixed(8).replace(/\.?0+$/, "")
                            : "0"} ETH
                        </span>
                      )}
                      <button onClick={() => removeRecipient(i)} className="text-white/30 hover:text-red-400 px-1">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="text-red-400 text-sm mt-4">{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={resolving}
                className="w-full bg-white text-black rounded-xl py-3 font-bold mt-6 hover:bg-white/90 disabled:opacity-40"
              >
                {resolving ? "Resolving names…" : `Send Bulk Payment (${recipients.length} recipients)`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}