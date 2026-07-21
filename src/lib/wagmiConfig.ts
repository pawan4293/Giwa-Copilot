"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { giwaSepolia } from "./viemClient";

// wagmi config — only injected connector (MetaMask)
// Chain: GIWA Sepolia (91342) only
export const wagmiConfig = createConfig({
  chains: [giwaSepolia],
  connectors: [injected()],
  transports: {
    [giwaSepolia.id]: http("https://sepolia-rpc.giwa.io"),
  },
});
