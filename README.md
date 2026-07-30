# GIWA Copilot

A chat-based AI assistant for **GIWA Sepolia** (an OP Stack Ethereum L2 by Dunamu/Upbit and the Optimism Foundation). Talk to it in plain English — send ETH, schedule recurring payments, split bills, or bulk-pay multiple people — and it turns your request into a real, correctly-formed on-chain transaction that you review and sign yourself.

**Live demo:** https://giwa-copilot.vercel.app
**Network:** GIWA Sepolia Testnet (chain ID `91342`) — all ETH used has no real value.

> Every number, address, and status shown anywhere in this app is read live from the chain. Nothing is simulated, cached as fake data, or hardcoded.

---

## Features

- **Chat with tool-calling** — Groq (`llama-3.3-70b-versatile`, free tier) drives an OpenAI-compatible tool-calling loop against real API routes
- **`.up.id` name resolution** — Upbit Web3 Names, resolved both directions (name→address via ENS, address→name reverse lookup)
- **Verified Address check** — live EAS attestation lookup via GIWA's AttestationIndexer contract
- **Direct ETH transfers** — signed client-side, with live Flashblocks preconfirmation (~200ms) shown before final confirmation
- **Trustless recurring payments** — a deployed, verified Scheduler contract holds user funds (never the app or any team-controlled wallet). Supports one-time sends at an exact chosen time, and recurring schedules (minute/hour/day/week/month) with cancel-anytime instant refunds
- **Automated releases** — a single Upstash QStash cron job sweeps all schedules every 2 minutes and triggers releases through a gas-only keeper wallet
- **Bulk Send** — one transaction, multiple recipients, different amounts, via a verified BatchSend contract
- **Split / Payment Requests** — request money owed back from multiple people, with a shareable link and live paid-status tracking
- **On-chain Activity feed** — real contract events + Blockscout transaction history, no local database as source of truth

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), wagmi, viem, Tailwind, Framer Motion |
| AI | Groq (OpenAI-compatible tool-calling, free tier) |
| Chain | GIWA Sepolia (OP Stack, chain ID `91342`) |
| Automation | Upstash QStash (single cron-sweep pattern) |
| Contracts | Solidity 0.8.19 / 0.8.20, deployed via Remix |
| Hosting | Vercel |

---

## Verified contracts (GIWA Sepolia)

| Contract | Address | Explorer |
|---|---|---|
| Scheduler | `0xc28787ABf5b0Ba0B6d7714cE496B32D71E846Aff` | [View source ↗](https://sepolia-explorer.giwa.io/address/0xc28787ABf5b0Ba0B6d7714cE496B32D71E846Aff) |
| BatchSend | `0xcAb18E72C8617AebB8A4C7Cf3670d2A68EC66600` | [View source ↗](https://sepolia-explorer.giwa.io/address/0xcAb18E72C8617AebB8A4C7Cf3670d2A68EC66600) |

Both contracts' full source, ABI, and bytecode are publicly verified and readable.

---

## Architecture

```
User (chat or direct UI)
        │
        ▼
Next.js frontend (wagmi + viem)
        │
        ├── Groq API (tool-calling) ──► real API routes (never synthetic data)
        │
        ├── Direct signed transactions ──► GIWA Sepolia RPC
        │
        └── Scheduler / BatchSend contracts (verified, on-chain)
                    ▲
                    │ release() triggered every 2 min
            Upstash QStash cron ──► /api/cron-execute ──► Keeper wallet (gas only)
```

The keeper wallet only ever pays gas to trigger `release()` — it never holds user principal. User funds sit in the Scheduler contract itself until released to the intended recipient or refunded via `cancel()`.

---

## Getting started locally

### Prerequisites
- Node.js 18+
- A GIWA Sepolia wallet with testnet ETH ([faucet](https://faucet.giwa.io/) · [Nodit faucet](https://faucet.lambda256.io/giwa-sepolia))

### Environment variables

Create `.env.local` in the project root:

```bash
DATABASE_URL=                        # Postgres connection string (Neon free tier works)
GROQ_API_KEY=                        # console.groq.com
QSTASH_URL=https://qstash-eu-central-1.upstash.io
QSTASH_TOKEN=                        # Upstash dashboard
QSTASH_CURRENT_SIGNING_KEY=          # Upstash dashboard
QSTASH_NEXT_SIGNING_KEY=             # Upstash dashboard
CRON_SECRET=                         # any random string you generate
KEEPER_PRIVATE_KEY=                  # fresh wallet, funded with gas only — never a wallet holding real funds
SCHEDULER_CONTRACT_ADDRESS=0xc28787ABf5b0Ba0B6d7714cE496B32D71E846Aff
NEXT_PUBLIC_SCHEDULER_ADDRESS=0xc28787ABf5b0Ba0B6d7714cE496B32D71E846Aff
BATCHSEND_CONTRACT_ADDRESS=0xcAb18E72C8617AebB8A4C7Cf3670d2A68EC66600
NEXT_PUBLIC_BATCHSEND_ADDRESS=0xcAb18E72C8617AebB8A4C7Cf3670d2A68EC66600
ETHEREUM_SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Install & run

```bash
npm install
npx drizzle-kit push   # creates the database schema
npm run dev
```

### Deploying the contracts yourself

Both `Scheduler.sol` and `BatchSend.sol` are in `contracts/src/`. Deploy via Remix (or Foundry) to GIWA Sepolia (`https://sepolia-rpc.giwa.io`, chain ID `91342`), then set the resulting addresses in your environment variables above.

### Registering the cron sweep

After deploying, register a single QStash schedule pointed at your `/api/cron-execute` endpoint:

```bash
curl.exe -X POST https://qstash.upstash.io/v2/schedules/<your-app-url>/api/cron-execute \
  -H "Authorization: Bearer <YOUR_QSTASH_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Upstash-Cron: */2 * * * *" \
  -H "Upstash-Forward-Authorization: Bearer <YOUR_CRON_SECRET>" \
  -d "{}"
```

---

## What's not built yet (honest roadmap)

- L1→L2 bridging UI
- Token/ERC-20 creation flow
- Contract safety-check before sending to unknown addresses
- KRW-equivalent price display (Pyth oracle address already wired in)
- Gasless transactions / account abstraction, matching GIWA's own stated wallet direction
- GIWA mainnet support (mainnet isn't live yet)

See the [technical one-pager](./giwa-copilot-one-pager.md) for the full phased roadmap.

---

## Network reference

| | |
|---|---|
| Chain | GIWA Sepolia |
| Chain ID | `91342` |
| RPC | `https://sepolia-rpc.giwa.io` |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Currency | ETH (testnet — no real value) |

## Links

- [GIWA Docs](https://docs.giwa.io)
- [GIWA Sepolia Playground](https://sepolia-playground.giwa.io) — self-serve Verified Address + `.up.id` registration
- [GIWA Faucet](https://faucet.giwa.io/) · [Nodit Faucet](https://faucet.lambda256.io/giwa-sepolia)

---

*Built for GIWA's GASOK MVP Build Phase. This is a testnet-only submission — no real assets are involved anywhere in this project.*