"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSendTransaction, useAccount } from "wagmi";
import { parseEther, isAddress } from "viem";
import { useState } from "react";
import { FlashblocksStatus } from "./FlashblocksStatus";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  to: string;         // resolved 0x address
  displayName: string; // .up.id name or raw address shown to user
  amountEth: string;
  onSuccess?: (txHash: string) => void;
}

export function TxConfirmModal({
  isOpen,
  onClose,
  to,
  displayName,
  amountEth,
  onSuccess,
}: Props) {
  const { isConnected } = useAccount();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const { sendTransaction, isPending } = useSendTransaction();

  const handleConfirm = () => {
    if (!isAddress(to)) {
      setError("Invalid recipient address");
      return;
    }

    setError(null);

    sendTransaction(
      {
        to:    to as `0x${string}`,
        value: parseEther(amountEth),
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          onSuccess?.(hash);
        },
        onError: (err) => {
          setError(err.message || "Transaction rejected");
        },
      }
    );
  };

  const handleClose = () => {
    if (!isPending) {
      setTxHash(null);
      setError(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
          >
            <div className="bg-black border border-white/20 rounded-3xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Confirm Transfer</h2>
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-white/30 hover:text-white text-xl transition-colors disabled:opacity-30"
                >
                  ✕
                </button>
              </div>

              {/* Transfer details */}
              <div className="space-y-4 mb-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-white/40 mb-1">To</div>
                  <div className="text-white font-semibold text-sm mb-1">{displayName}</div>
                  <div className="text-white/40 font-mono text-xs break-all">{to}</div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-white/40 mb-1">Amount</div>
                  <div className="text-white text-2xl font-bold font-mono">
                    {amountEth} <span className="text-white/40 text-base">ETH</span>
                  </div>
                  <div className="text-xs text-white/30 mt-1">GIWA Sepolia testnet — no real value</div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Not connected */}
              {!isConnected && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
                  Please connect your wallet first.
                </div>
              )}

              {/* Action buttons */}
              {!txHash ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isPending}
                    className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl hover:border-white/30 hover:text-white transition-all disabled:opacity-30 text-sm"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    disabled={isPending || !isConnected}
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Signing…
                      </>
                    ) : (
                      "Confirm & Sign"
                    )}
                  </motion.button>
                </div>
              ) : (
                <div>
                  <div className="text-emerald-400 text-center font-semibold mb-3 text-sm">
                    ✓ Transaction submitted
                  </div>
                  <FlashblocksStatus txHash={txHash} />
                  <button
                    onClick={handleClose}
                    className="w-full mt-4 border border-white/10 text-white/50 py-2.5 rounded-xl hover:border-white/30 hover:text-white transition-all text-sm"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
