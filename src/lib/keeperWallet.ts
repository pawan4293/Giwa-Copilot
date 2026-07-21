import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { giwaSepolia } from "./viemClient";

// Keeper wallet — server-side signer used ONLY to pay gas for Scheduler.release() calls
// This wallet NEVER holds user principal — only enough ETH to pay gas fees
// Private key comes from KEEPER_PRIVATE_KEY env var (never committed to repo)
export function getKeeperWalletClient() {
  const privateKey = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("KEEPER_PRIVATE_KEY is not set");
  }

  const formattedKey = (
    privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  ) as `0x${string}`;

  const account = privateKeyToAccount(formattedKey);

  const walletClient = createWalletClient({
    account,
    chain: giwaSepolia,
    transport: http("https://sepolia-rpc.giwa.io"),
  });

  return { walletClient, account };
}

export function getKeeperAddress(): string {
  const { account } = getKeeperWalletClient();
  return account.address;
}
