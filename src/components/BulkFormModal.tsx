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
  onConfirm: (recipients: { identifier: string; address: string; amountEth: string }[]) => void;
}

export function BulkFormModal({ isOpen, onClose, onConfirm }: Props) {
  const [recipients, setRecipients] = useState<RecipientRow[]>([{ identifier: "", amountEth: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipients([{ identifier: "", amountEth: "" }]);
      setError(null);
    }
  }, [isOpen]);

  const updateRecipient = (i: number, field: keyof RecipientRow, value: string) => {
    setRecipients((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRecipient = () => setRecipients((prev) => [...prev, { identifier: "", amountEth: "" }]);
  const removeRecipient = (i: number) => setRecipients((prev) => prev.filter((_, idx) => idx !== i));

  const handleNext = async () => {
    setError(null);

    if (recipients.some((r) => !r.identifier || !r.amountEth)) {
      setError("Fill in an identifier and amount for every recipient.");
      return;
    }

    setResolving(true);
    try {
      const resolved = await Promise.all(
        recipients.map(async (r) => {
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
      onConfirm(resolved);
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

              <label className="text-white/40 text-xs">Recipients &amp; amounts</label>
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <input
                    value={r.identifier}
                    onChange={(e) => updateRecipient(i, "identifier", e.target.value)}
                    placeholder="alice.up.id or 0x..."
                    className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                  <input
                    value={r.amountEth}
                    onChange={(e) => updateRecipient(i, "amountEth", e.target.value)}
                    placeholder="ETH"
                    className="w-24 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
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
                onClick={handleNext}
                disabled={resolving}
                className="w-full bg-white text-black rounded-xl py-3 font-bold mt-6 hover:bg-white/90 disabled:opacity-40"
              >
                {resolving ? "Resolving names…" : "Next: Review & Sign"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}