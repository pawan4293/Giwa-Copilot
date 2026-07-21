"use client";

import { ActivityTable } from "@/components/ActivityTable";
import { motion } from "framer-motion";

export default function ActivityPage() {
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
          All events are read directly from the Scheduler contract on GIWA Sepolia via{" "}
          <code className="text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">getLogs</code>.
          The blockchain is the source of truth — no local database.
        </p>
      </motion.div>

      {/* Chain info bar */}
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
    </div>
  );
}
