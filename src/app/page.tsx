"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { WalletConnect } from "@/components/WalletConnect";

// Animated particles
function Particle({ delay, x, y }: { delay: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute w-0.5 h-0.5 bg-white rounded-full"
      style={{ left: x, top: y }}
      animate={{
        opacity:    [0, 0.6, 0],
        scale:      [0, 1, 0],
        y:          [0, -80, -160],
      }}
      transition={{
        duration: 6 + Math.random() * 4,
        delay,
        repeat:   Infinity,
        ease:     "easeOut",
      }}
    />
  );
}

// Animated counter
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = to / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [to]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

// Moving grid lines
function GridLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent"
          style={{ left: `${(i + 1) * 12.5}%` }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
          style={{ top: `${(i + 1) * 16.6}%` }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  { text: "Check if alice.up.id is verified", icon: "✓" },
  { text: "Send 0.01 ETH to alice.up.id",     icon: "→" },
  { text: "Schedule payment",                 icon: "⏱" },
  { text: "Bulk payment form",                icon: "⇄" },
  { text: "Open a payment request form",      icon: "🧾" },
  { text: "Explain GIWA Flashblocks",         icon: "⚡" },
];

const FEATURES = [
  {
    icon: "✦",
    title: "AI-Powered Copilot",
    desc: "Groq-powered chat that calls real on-chain tools. Never invents balances or addresses.",
  },
  {
    icon: "◎",
    title: "Flashblocks Status",
    desc: "See preconfirmation in ~200ms via the Flashblocks-aware RPC. Real latency, real hashes.",
  },
  {
    icon: "✓",
    title: "Verified Address",
    desc: "Live DojangScroll check — know instantly if a wallet is KYC-verified by Upbit Korea.",
  },
  {
    icon: "⏱",
    title: "Recurring Scheduler",
    desc: "Deposit ETH into the deployed Scheduler contract and set it-and-forget — a keeper wallet triggers each release automatically.",
  },
  {
    icon: "↗",
    title: ".up.id Names",
    desc: "Resolve Upbit Web3 Names via ENS on Ethereum Sepolia — human-readable, wallet-verified.",
  },
  {
    icon: "📋",
    title: "On-Chain Activity",
    desc: "All history comes from contract events — the chain is always the source of truth.",
  },
  {
    icon: "⇄",
    title: "Bulk Send",
    desc: "Send different amounts to multiple recipients in a single transaction.",
  },
  {
    icon: "🧾",
    title: "Split Payments",
    desc: "Request money owed back from multiple people, with a shareable link and live paid-status tracking.",
  },
];

export default function LandingPage() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY     = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const particles = Array.from({ length: 40 }, (_, i) => ({
    id:    i,
    delay: Math.random() * 8,
    x:     `${Math.random() * 100}%`,
    y:     `${Math.random() * 100}%`,
  }));

  return (
    <div className="bg-black text-white overflow-hidden">

      {/* ── HERO ─────────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 mesh-gradient"
      >
        <GridLines />

        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((p) => (
            <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} />
          ))}
        </div>

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 inline-flex items-center gap-2 border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-full px-4 py-2 text-xs text-white/60"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          GIWA Sepolia Testnet · Chain ID 91342
          <span className="text-white/30">·</span>
          OP Stack L2
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="text-6xl sm:text-8xl font-black tracking-tight leading-none mb-6"
        >
          <span className="text-shimmer">GIWA</span>
          <br />
          <span className="text-white">Copilot</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg sm:text-xl text-white/40 max-w-xl mb-10 leading-relaxed"
        >
          Chat-based AI assistant for{" "}
          <span className="text-white/70">GIWA Sepolia</span>. Resolve names,
          check verified addresses, schedule payments — all on-chain, all real.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <Link href="/chat">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-sm hover:bg-white/90 transition-all cursor-pointer"
            >
              Open Copilot ✦
            </motion.div>
          </Link>
          <WalletConnect />
        </motion.div>

        {/* Example chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap gap-2 justify-center max-w-2xl"
        >
          {EXAMPLE_PROMPTS.map((p, i) => (
            <motion.div
              key={p.text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.07 }}
              whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.3)" }}
            >
              <Link href={`/chat?prompt=${encodeURIComponent(p.text)}`}>
                <div className="border border-white/10 bg-white/[0.03] rounded-full px-4 py-2 text-xs text-white/50 hover:text-white/80 transition-all cursor-pointer flex items-center gap-2">
                  <span className="text-white/30">{p.icon}</span>
                  {p.text}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </motion.section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section className="border-y border-white/10 py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 91342, label: "Chain ID", suffix: "" },
            { value: 200,   label: "Flashblocks ms", suffix: "ms" },
            { value: 6,     label: "AI Tools", suffix: "" },
            { value: 100,   label: "On-chain",  suffix: "%" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl font-black text-white font-mono">
                <Counter to={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-white/30 mt-1 uppercase tracking-widest">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="text-xs text-white/30 uppercase tracking-[0.3em] mb-4">
            What&apos;s built
          </div>
          <h2 className="text-4xl font-black text-white">
            Real data. Real chain. No fakes.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group border border-white/10 rounded-3xl p-6 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] transition-all"
            >
              <div className="text-2xl mb-4 opacity-60 group-hover:opacity-100 transition-opacity">
                {f.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── NETWORK INFO ─────────────────────────────────── */}
      <section className="py-16 px-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-xs text-white/30 uppercase tracking-[0.3em] mb-4">
              Network
            </div>
            <h2 className="text-3xl font-black text-white">GIWA Sepolia</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Network Name",  value: "GIWA Sepolia" },
              { label: "Chain ID",      value: "91342" },
              { label: "Currency",      value: "ETH (testnet)" },
              { label: "Stack",         value: "OP Stack (Optimism)" },
              { label: "RPC",           value: "sepolia-rpc.giwa.io" },
              { label: "Flashblocks RPC", value: "sepolia-rpc-flashblocks.giwa.io" },
              { label: "Explorer",      value: "sepolia-explorer.giwa.io" },
              { label: "Operator",      value: "Dunamu / Upbit" },
            ].map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex justify-between items-center border border-white/10 rounded-2xl px-5 py-4 bg-white/[0.02]"
              >
                <span className="text-white/40 text-sm">{item.label}</span>
                <span className="text-white font-mono text-sm font-semibold">{item.value}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://faucet.giwa.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white/60 hover:text-white hover:border-white/40 px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              GIWA Faucet (0.005 ETH)
            </a>
            <a
              href="https://faucet.lambda256.io/giwa-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white/60 hover:text-white hover:border-white/40 px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Nodit Faucet (0.01 ETH)
            </a>
            <a
              href="https://sepolia-explorer.giwa.io"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white/60 hover:text-white hover:border-white/40 px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Explorer ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-5xl mb-6 float-anim">⛩</div>
          <h2 className="text-4xl font-black text-white mb-4">
            Start exploring GIWA
          </h2>
          <p className="text-white/40 mb-8">
            Connect your wallet and ask the Copilot anything about GIWA Sepolia.
          </p>
          <Link href="/chat">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-10 py-4 bg-white text-black font-black rounded-2xl text-sm hover:bg-white/90 transition-all cursor-pointer"
            >
              Open GIWA Copilot ✦
            </motion.div>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-xs text-white/20">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <a href="https://docs.giwa.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
            Docs
          </a>
          <a href="https://sepolia-explorer.giwa.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
            Explorer
          </a>
          <a href="https://sepolia-playground.giwa.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
            Playground
          </a>
          <span>GIWA Sepolia Testnet · No real assets</span>
        </div>
      </footer>
    </div>
  );
}
