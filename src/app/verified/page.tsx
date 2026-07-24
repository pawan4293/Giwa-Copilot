"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { isAddress } from "viem";

interface VerifyResult {
  address: string;
  verified: boolean;
  attestationUid?: string;
  contract?: string;
  chain?: string;
  error?: string;
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-3xl mx-auto mb-6 ${
        verified
          ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
          : "border-red-400/50 bg-red-400/5 text-red-400/60"
      }`}
    >
      {verified ? "✓" : "✗"}
    </motion.div>
  );
}

export default function VerifiedPage() {
  const [upName, setUpName] = useState<string | null>(null);
  const { address: connectedAddress } = useAccount();
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<VerifyResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handleCheck = async (addr?: string) => {
    const target = addr || query.trim();
    if (!target) return;

    if (!isAddress(target)) {
      setError("Invalid Ethereum address");
      return;
    }

    setLoading(true);
    setResult(null);
    setUpName(null);
    setError(null);

    try {
      const res = await fetch(`/api/verify?address=${encodeURIComponent(target)}`);
      const data: VerifyResult = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }

      const nameRes = await fetch(`/api/resolve-address?address=${encodeURIComponent(target)}`);
      const nameData = await nameRes.json();
      if (nameData.name) setUpName(nameData.name);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="text-xs text-white/30 uppercase tracking-[0.3em] mb-3">Verified Address</div>
        <h1 className="text-4xl font-black text-white mb-3">Dojang Check</h1>
        <p className="text-white/40 text-sm leading-relaxed">
          Check if a wallet has a valid Verified Address attestation from Upbit Korea.
          Data is read live from the{" "}
          <code className="text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">
            DojangScroll
          </code>{" "}
          contract on GIWA Sepolia — never cached.
        </p>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="0x… wallet address"
            className="flex-1 bg-white/[0.04] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-mono"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleCheck()}
            disabled={loading || !query.trim()}
            className="bg-white text-black px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              "Check"
            )}
          </motion.button>
        </div>

        {/* Quick check connected wallet */}
        {connectedAddress && (
          <button
            onClick={() => { setQuery(connectedAddress); handleCheck(connectedAddress); }}
            className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Check my wallet ({connectedAddress.slice(0, 8)}…)
          </button>
        )}
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border border-white/10 rounded-3xl p-8 bg-white/[0.02]"
          >
            <VerifiedBadge verified={result.verified} />

            <div className="text-center mb-8">
              <div
                className={`text-2xl font-black mb-2 ${
                  result.verified ? "text-emerald-400" : "text-white/50"
                }`}
              >
                {result.verified ? "Verified Address" : "Not Verified"}
              </div>
              <div className="text-white/40 font-mono text-sm break-all">
                {result.address}
              </div>
              {upName && (
                <div className="text-emerald-400/70 text-sm font-bold mt-1">
                  {upName}
                </div>
              )}
            </div>

            {result.verified && (
              <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-4 mb-6 text-sm text-emerald-400/80">
                <div className="font-bold mb-1">✓ KYC Verified by Upbit Korea</div>
                <div className="text-emerald-400/60 text-xs">
                  This wallet passed Upbit Korea&apos;s customer verification process.
                  It can interact with Verified Address–gated contracts on GIWA.
                </div>
              </div>
            )}

            {!result.verified && (
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 mb-6 text-sm text-white/50">
                <div className="font-bold mb-2">Don't have a .up.id? Get verified in 3 steps</div>
                <ol className="text-white/40 text-xs space-y-1.5 list-decimal list-inside mb-3">
                  <li>Open the GIWA Sepolia Playground and connect this same wallet</li>
                  <li>Click "Issue Dojang" — instant, self-serve on testnet, no real KYC needed</li>
                  <li>Type a username and click "Issue UP ID" to register your .up.id</li>
                </ol>
                
                 <a href="https://sepolia-playground.giwa.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-white/90 transition-all"
                >
                  Open Playground ↗
                </a>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3 text-xs">
              {[
                { label: "Attestation UID", value: result.attestationUid, mono: true, truncate: true },
                { label: "Contract",        value: result.contract,       mono: true },
                { label: "Chain",           value: result.chain },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/30">{row.label}</span>
                  <span className={`text-white/60 ${row.mono ? "font-mono" : ""} ${row.truncate ? "truncate max-w-[180px]" : ""}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info cards */}
      {!result && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 gap-4"
        >
          <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
            <h3 className="text-white font-bold text-sm mb-2">What is a Verified Address?</h3>
            <p className="text-white/40 text-xs leading-relaxed">
              A Verified Address is an EAS attestation issued by Upbit Korea confirming that
              a wallet has completed KYC (customer verification). It enables gated features
              in GIWA DeFi apps and is required for .up.id name registration.
            </p>
          </div>

          <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
            <h3 className="text-white font-bold text-sm mb-2">Contract Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/30">DojangScroll</span>
                <span className="text-white/60 font-mono text-xs">0xd5077b…17B9</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Attester (Upbit Korea)</span>
                <span className="text-white/60 font-mono text-xs">0xd99b42…3034</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Network</span>
                <span className="text-white/60">GIWA Sepolia (91342)</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
