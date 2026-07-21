"use client";

import { motion } from "framer-motion";

const BUILT = [
  {
    icon: "✦",
    title: "GIWA Copilot Chat",
    desc: "Grok-3-mini powered assistant with live tool-calling. Resolves names, checks balances, triggers schedule creation — all from real on-chain data.",
  },
  {
    icon: "✓",
    title: "Verified Address (Dojang) Check",
    desc: "Live readContract call to DojangScroll (0xd5077b…). Returns a real boolean, never cached or inferred.",
  },
  {
    icon: "↗",
    title: ".up.id Name Resolution",
    desc: "ENS resolution on Ethereum Sepolia L1 for Upbit Web3 Names. Returns the real registered address or a clear 'not found' error.",
  },
  {
    icon: "⚡",
    title: "Flashblocks Preconfirmation Status",
    desc: "Polls the Flashblocks-aware RPC first (~200ms), falls back to standard RPC for finality. Latency is always measured live with Date.now().",
  },
  {
    icon: "⏱",
    title: "Trustless Recurring Scheduler",
    desc: "Foundry-tested Solidity contract: deposit, release (keeper pattern), cancel with exact refund. User signs all fund-moving transactions client-side.",
  },
  {
    icon: "◎",
    title: "On-Chain Activity Log",
    desc: "getLogs for Deposited/Released/Cancelled events from the Scheduler contract. Every row links to the GIWA Sepolia explorer. No local DB.",
  },
  {
    icon: "◈",
    title: "Keeper + QStash Integration",
    desc: "Server-side keeper wallet (gas only) + Upstash QStash scheduling with signature verification before any on-chain action.",
  },
  {
    icon: "⛩",
    title: "wagmi Wallet Connect",
    desc: "MetaMask injected connector. Auto-prompts addChain/switchChain to GIWA Sepolia (91342) — no manual instructions.",
  },
];

const NOT_BUILT = [
  { title: "Token / ERC-20 Creation",    reason: "Not part of Phase 1 scope." },
  { title: "L1→L2 Bridging UI",          reason: "L2StandardBridge is referenced but no bridge UI was built in this phase." },
  { title: "Contract Safety Check",      reason: "Would require a separate static-analysis pipeline." },
  { title: "Voice Input",                reason: "Not part of the current feature set." },
  { title: "KRW / Fiat Price Display",   reason: "Pyth oracle address is wired in but no price feed UI is implemented yet." },
  { title: "GIWA Mainnet Support",       reason: "Mainnet is not yet live — testnet only." },
  { title: "Scheduler Contract Deploy",  reason: "Deploy script is ready (Foundry); requires a deployer key and SCHEDULER_CONTRACT_ADDRESS env var." },
];

const CONTRACTS = [
  { label: "DojangScroll (Verified Address)", address: "0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9" },
  { label: "EAS",                             address: "0x4200000000000000000000000000000000000021" },
  { label: "EASSchemaRegistry",               address: "0x4200000000000000000000000000000000000020" },
  { label: "WETH9",                           address: "0x4200000000000000000000000000000000000006" },
  { label: "L2StandardBridge",               address: "0x4200000000000000000000000000000000000010" },
  { label: "L2CrossDomainMessenger",          address: "0x4200000000000000000000000000000000000007" },
  { label: "UPNameRegistry (.up.id)",         address: "0x091D00004f21eb2Fc30964A8a4995692d9b49628" },
  { label: "Pyth Price Oracle",              address: "0x2880aB155794e7179c9eE2e38200202908C17B43" },
];

const ENV_VARS = [
  { name: "XAI_API_KEY",                  source: "xAI developer console" },
  { name: "QSTASH_TOKEN",                 source: "Upstash dashboard" },
  { name: "QSTASH_CURRENT_SIGNING_KEY",   source: "Upstash dashboard" },
  { name: "KEEPER_PRIVATE_KEY",           source: "Fresh wallet (gas only)" },
  { name: "SCHEDULER_CONTRACT_ADDRESS",   source: "After Foundry deploy to GIWA Sepolia" },
  { name: "ETHEREUM_SEPOLIA_RPC",         source: "Public RPC or Infura/Alchemy" },
  { name: "NEXT_PUBLIC_APP_URL",          source: "Your Vercel project URL" },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="text-xs text-white/30 uppercase tracking-[0.3em] mb-3">About</div>
        <h1 className="text-5xl font-black text-white mb-4">GIWA Copilot</h1>
        <p className="text-white/40 leading-relaxed">
          An open-source, fully on-chain AI assistant for GIWA Sepolia testnet.
          Built with Next.js App Router, viem, wagmi, Grok, and QStash.
        </p>
      </motion.div>

      {/* What&apos;s built */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-12"
      >
        <h2 className="text-xs text-white/30 uppercase tracking-[0.3em] mb-6">
          ✓ What&apos;s Built (Tier 1)
        </h2>
        <div className="space-y-4">
          {BUILT.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="flex gap-4 border border-white/10 rounded-2xl p-4 bg-white/[0.02]"
            >
              <div className="text-xl opacity-50 mt-0.5 flex-shrink-0">{item.icon}</div>
              <div>
                <div className="text-white font-semibold text-sm mb-1">{item.title}</div>
                <div className="text-white/40 text-xs leading-relaxed">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* What&apos;s NOT built */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-12"
      >
        <h2 className="text-xs text-white/30 uppercase tracking-[0.3em] mb-6">
          ✗ Not Yet Built (Explicit Roadmap)
        </h2>
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          {NOT_BUILT.map((item, i) => (
            <div
              key={item.title}
              className={`flex justify-between items-start p-4 text-sm ${
                i < NOT_BUILT.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div>
                <div className="text-white/50 font-medium mb-0.5">{item.title}</div>
                <div className="text-white/25 text-xs">{item.reason}</div>
              </div>
              <span className="text-white/15 text-xs border border-white/10 px-2 py-0.5 rounded-full flex-shrink-0 ml-4">
                pending
              </span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Contracts reference */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-12"
      >
        <h2 className="text-xs text-white/30 uppercase tracking-[0.3em] mb-6">
          Contract Addresses (GIWA Sepolia)
        </h2>
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          {CONTRACTS.map((c, i) => (
            <div
              key={c.address}
              className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 text-xs ${
                i < CONTRACTS.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <span className="text-white/40 mb-1 sm:mb-0">{c.label}</span>
              <a
                href={`https://sepolia-explorer.giwa.io/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 font-mono hover:text-white transition-colors"
              >
                {c.address.slice(0, 10)}…{c.address.slice(-8)} ↗
              </a>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Environment variables */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-12"
      >
        <h2 className="text-xs text-white/30 uppercase tracking-[0.3em] mb-6">
          Required Environment Variables
        </h2>
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          {ENV_VARS.map((v, i) => (
            <div
              key={v.name}
              className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 text-xs ${
                i < ENV_VARS.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <code className="text-white/70 font-mono bg-white/[0.04] px-2 py-0.5 rounded mb-1 sm:mb-0 w-fit">
                {v.name}
              </code>
              <span className="text-white/30">{v.source}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/20 mt-3">
          Never commit secrets to the repo. Use Vercel&apos;s environment variable dashboard.
        </p>
      </motion.section>

      {/* Links */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-xs text-white/30 uppercase tracking-[0.3em] mb-6">Links</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "https://docs.giwa.io",                     label: "GIWA Docs" },
            { href: "https://sepolia-explorer.giwa.io",         label: "Explorer" },
            { href: "https://sepolia-playground.giwa.io",       label: "Playground" },
            { href: "https://faucet.giwa.io",                   label: "GIWA Faucet" },
            { href: "https://faucet.lambda256.io/giwa-sepolia", label: "Nodit Faucet" },
            { href: "https://docs.x.ai",                        label: "xAI Grok Docs" },
            { href: "https://upstash.com/docs/qstash",          label: "QStash Docs" },
            { href: "https://viem.sh",                          label: "viem" },
            { href: "https://wagmi.sh",                         label: "wagmi" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white/40 hover:text-white hover:border-white/30 px-4 py-2 rounded-xl text-sm transition-all"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
