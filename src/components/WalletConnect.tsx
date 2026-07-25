"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from "wagmi";
import { giwaSepolia } from "@/lib/viemClient";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { formatEther } from "viem";

export function WalletConnect() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: balance } = useBalance({
    address,
    chainId: giwaSepolia.id,
    query: { enabled: !!address && chainId === giwaSepolia.id },
  });

  const [upId, setUpId] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUpId(null);
      return;
    }
    fetch(`/api/resolve-address?address=${address}`)
      .then((r) => r.json())
      .then((d) => setUpId(d.name || null))
      .catch(() => setUpId(null));
  }, [address]);

  const isWrongChain = isConnected && chainId !== giwaSepolia.id;

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector, chainId: giwaSepolia.id });
    }
  };

  const handleSwitchChain = () => {
    switchChain({
      chainId: giwaSepolia.id,
      addEthereumChainParameter: {
        chainName: "GIWA Sepolia",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia-rpc.giwa.io"],
        blockExplorerUrls: ["https://sepolia-explorer.giwa.io"],
      },
    });
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  if (!isConnected) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleConnect}
        disabled={isConnecting}
        className="relative overflow-hidden border border-white/20 bg-white text-black px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-all hover:bg-black hover:text-white hover:border-white/60 disabled:opacity-50"
      >
        {isConnecting ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Connecting…
          </span>
        ) : (
          "Connect Wallet"
        )}
      </motion.button>
    );
  }

  if (isWrongChain) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSwitchChain}
        className="border border-yellow-400/60 bg-yellow-400/10 text-yellow-300 px-5 py-2 rounded-full text-sm font-semibold hover:bg-yellow-400/20 transition-all"
      >
        Switch to GIWA Sepolia
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDropdown((v) => !v)}
        className="flex items-center gap-2 border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-mono text-white hover:border-white/40 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {shortAddress}
        {balance && (
          <span className="text-white/50 text-xs">
            {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50"
          >
            <div className="text-xs text-white/40 mb-1">Connected to</div>
            <div className="text-white font-semibold text-sm mb-3">GIWA Sepolia (91342)</div>
            <div className="text-xs text-white/40 mb-1">UP ID</div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-semibold text-sm">{upId || "-"}</span>
              {upId && (
                <button
                  onClick={() => navigator.clipboard.writeText(upId)}
                  className="text-white/30 hover:text-white/70 text-xs"
                  title="Copy UP ID"
                >
                  📋
                </button>
              )}
            </div>
            <div className="text-xs text-white/40 mb-1">Address</div>
            <div className="text-white/80 font-mono text-xs mb-4 break-all">{address}</div>
            {balance && (
              <>
                <div className="text-xs text-white/40 mb-1">Balance</div>
                <div className="text-white font-mono text-sm mb-4">
                  {parseFloat(formatEther(balance.value)).toFixed(6)} ETH
                </div>
              </>
            )}
            <div className="flex gap-2">
              <a
                href={`https://faucet.giwa.io/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs border border-white/20 text-white/60 py-1.5 rounded-lg hover:border-white/40 hover:text-white transition-all"
              >
                Get Testnet ETH
              </a>
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="flex-1 text-xs border border-white/10 text-white/40 py-1.5 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
