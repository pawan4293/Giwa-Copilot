"use client";

import { useState } from "react";
import { ActivityTable } from "@/components/ActivityTable";
import { SplitsHistory } from "@/components/SplitsHistory";
import { motion } from "framer-motion";

type Tab = "history" | "splits";

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>("history");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="text-xs text-white/30 uppercase tracking-[0.3em] mb-3">Activity</div>
        <h1 className="text-4xl font-black text-white mb-3">Transaction History</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-lg">
          All events are read directly from the chain — no local database for balances or transfers.
          Split payment tracking uses a lightweight database only to store who owes what.
        </p>
      </motion.div>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "history"
              ? "bg-white text-black"
              : "border border-white/10 text-white/50 hover:text-white"
          }`}
        >
          History
        </button>
        <button
          onClick={() => setTab("splits")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "splits"
              ? "bg-white text-black"
              : "border border-white/10 text-white/50 hover:text-white"
          }`}
        >
          Splits
        </button>
      </div>

      {tab === "history" && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 border border-white/10 rounded-2xl px-4 py-3 mb-8 bg-white/[0.02] text-xs"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50">Reading from GIWA Sepolia</span>
            <span className="text-white/20">·</span>
            <a
              href="https://sepolia-rpc.giwa.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white/60 transition-colors font-mono"
            >
              sepolia-rpc.giwa.io
            </a>
            <span className="text-white/20">·</span>
            <span className="text-white/30">Chain ID 91342</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ActivityTable />
          </motion.div>
        </>
      )}

      {tab === "splits" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SplitsHistory />
        </motion.div>
      )}
    </div>
  );
}