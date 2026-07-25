"use client";

import { motion } from "framer-motion";
import { ScheduleForm } from "@/components/ScheduleForm";
import { ScheduleList } from "@/components/ScheduleList";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SchedulePageInner() {
  const searchParams = useSearchParams();
  const prefillStr   = searchParams.get("prefill");

  let prefill;
  if (prefillStr) {
    try { prefill = JSON.parse(prefillStr); }
    catch { prefill = undefined; }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="text-xs text-white/30 uppercase tracking-[0.3em] mb-3">Schedule</div>
        <h1 className="text-4xl font-black text-white mb-3">Recurring Payments</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-xl">
          Deposit ETH into the on-chain Scheduler contract and set up recurring payments.
          You sign the deposit with your own wallet — the keeper only calls{" "}
          <code className="text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">release()</code>,
          never holds your funds.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New schedule form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="border border-white/10 rounded-3xl p-6 bg-white/[0.02]">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="text-white/40">⏱</span>
              New Schedule
            </h2>
            <ScheduleForm prefill={prefill} />
          </div>
        </motion.div>

        {/* Active schedules */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="border border-white/10 rounded-3xl p-6 bg-white/[0.02]">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="text-white/40">◎</span>
              My Schedules
            </h2>
            <ScheduleList />
          </div>

          {/* How it works */}
          <div className="mt-4 border border-white/5 rounded-2xl p-5 bg-white/[0.01]">
            <h3 className="text-white/60 font-semibold text-sm mb-3">How it works</h3>
            <ol className="space-y-2 text-xs text-white/30">
              <li className="flex gap-2">
                <span className="text-white/20 font-mono">1.</span>
                You sign a deposit transaction from your wallet.
              </li>
              <li className="flex gap-2">
                <span className="text-white/20 font-mono">2.</span>
                The contract holds your ETH trustlessly.
              </li>
              <li className="flex gap-2">
                <span className="text-white/20 font-mono">3.</span>
                QStash triggers the keeper at each interval.
              </li>
              <li className="flex gap-2">
                <span className="text-white/20 font-mono">4.</span>
                The keeper calls{" "}
                <code className="text-white/40 bg-white/[0.06] px-1 rounded">release()</code>{" "}
                — gas only, never your principal.
              </li>
              <li className="flex gap-2">
                <span className="text-white/20 font-mono">5.</span>
                Cancel anytime to refund unpaid ETH instantly.
              </li>
            </ol>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense>
      <SchedulePageInner />
    </Suspense>
  );
}
