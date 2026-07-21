import { createPublicClient, http, defineChain } from "viem";

// GIWA Sepolia — OP Stack L2
// Chain ID: 91342  |  RPC: https://sepolia-rpc.giwa.io
export const giwaSepolia = defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.giwa.io"] },
    flashblocks: { http: ["https://sepolia-rpc-flashblocks.giwa.io"] },
  },
  blockExplorers: {
    default: {
      name: "GIWA Explorer",
      url: "https://sepolia-explorer.giwa.io",
    },
  },
  testnet: true,
});

// Standard public client — all on-chain reads
export const publicClient = createPublicClient({
  chain: giwaSepolia,
  transport: http("https://sepolia-rpc.giwa.io"),
});

// Flashblocks-aware client — for preconfirmation polling
export const flashblocksClient = createPublicClient({
  chain: giwaSepolia,
  transport: http("https://sepolia-rpc-flashblocks.giwa.io"),
});
