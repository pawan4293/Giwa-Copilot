import { NextRequest, NextResponse } from "next/server";
import { isAddress, formatEther } from "viem";
import { publicClient } from "@/lib/viemClient";
import { getSchedulerAddress, getBatchSendAddress } from "@/lib/contracts";
import { getAbiItem } from "viem";
import { SCHEDULER_ABI } from "@/lib/contracts";

// Block the Scheduler contract was deployed at — safe to start log scans here,
// avoids scanning from genesis (which hits RPC block-range limits).
const SCHEDULER_DEPLOY_BLOCK = BigInt(31796539);

// Returns either:
// - balance: live ETH balance for an address
// - logs: real activity for an address, sourced from the GIWA Blockscout explorer API
// Chain is always the source of truth — no local database

interface BlockscoutLogItem {
  hash?: string;
  transaction_hash?: string;
  block_number: number;
  to?: { hash?: string };
  from?: { hash?: string };
  value: string;
  method?: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();
  const type = searchParams.get("type") || "logs";

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid or missing address" }, { status: 400 });
  }

  // ── Balance query ──────────────────────────────────────────────
  if (type === "balance") {
    try {
      const balanceWei = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      return NextResponse.json({
        address,
        balanceWei: balanceWei.toString(),
        balanceEth: formatEther(balanceWei),
        chain: "GIWA Sepolia (91342)",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Balance fetch failed: ${message}` }, { status: 500 });
    }
  }

  // ── Activity query (via Blockscout API — fast, already indexed) ──
  const schedulerAddress = getSchedulerAddress();
  if (schedulerAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({
      events: [],
      note: "SCHEDULER_CONTRACT_ADDRESS not configured yet",
    });
  }

  try {
    const [explorerRes, internalRes] = await Promise.all([
      fetch(`https://sepolia-explorer.giwa.io/api/v2/addresses/${address}/transactions`),
      fetch(`https://sepolia-explorer.giwa.io/api/v2/addresses/${address}/internal-transactions`),
    ]);
    if (!explorerRes.ok) {
      return NextResponse.json(
        { error: `Explorer API returned ${explorerRes.status}`, events: [] },
        { status: 200 }
      );
    }

    const explorerData = await explorerRes.json();
    const items: BlockscoutLogItem[] = explorerData.items || [];
    const internalData = await internalRes.json().catch(() => ({ items: [] }));
    const internalItems: BlockscoutLogItem[] = internalData.items || [];

    const batchSendAddr = getBatchSendAddress().toLowerCase();
    const schedulerAddrLower = schedulerAddress.toLowerCase();

    const normalEvents = items
      .filter((item) => {
        const to = item.to?.hash?.toLowerCase();
        // Exclude raw contract-call rows for Scheduler/BatchSend — these are already
        // represented as decoded Deposited/Cancelled/BulkSend transfer events below.
        return to !== schedulerAddrLower && to !== batchSendAddr;
      })
      .map((item) => ({
        type: item.method || "Transfer",
        txHash: item.hash,
        blockNumber: String(item.block_number),
        args: {
          from: item.from?.hash || "",
          to: item.to?.hash || "",
          valueWei: item.value,
          timestamp: item.timestamp,
        },
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${item.hash}`,
      }));

    const internalEvents = internalItems
      .filter((item) => item.value && item.value !== "0" && (item.hash || item.transaction_hash))
      .map((item) => {
        const hash = item.hash || item.transaction_hash!;
        return {
          type: "BulkSend transfer",
          txHash: hash,
          blockNumber: String(item.block_number),
          args: {
            from: item.from?.hash || "",
            to: item.to?.hash || "",
            valueWei: item.value,
            timestamp: item.timestamp,
          },
          explorerUrl: `https://sepolia-explorer.giwa.io/tx/${hash}`,
        };
      });

   // Real Deposited events from the Scheduler contract, decoded properly —
    // this is what powers "My Schedules" (owner-filtered, so cancel/refund is possible).
    let scheduleEvents: Array<{
      type: string;
      txHash: string;
      blockNumber: string;
      args: Record<string, string>;
      explorerUrl: string;
    }> = [];
    try {
      const depositedAbi = getAbiItem({ abi: SCHEDULER_ABI, name: "Deposited" });
      const latestBlock = await publicClient.getBlockNumber();
      const CHUNK = BigInt(9000); // stay safely under typical free-RPC getLogs range limits

      const ranges: { from: bigint; to: bigint }[] = [];
      for (let from = SCHEDULER_DEPLOY_BLOCK; from <= latestBlock; from += CHUNK) {
        const to = from + CHUNK - BigInt(1) > latestBlock ? latestBlock : from + CHUNK - BigInt(1);
        ranges.push({ from, to });
      }
      const chunkResults = await Promise.allSettled(
        ranges.map(({ from, to }) =>
          publicClient.getLogs({
            address: schedulerAddress,
            event: depositedAbi,
            args: { owner: address as `0x${string}` },
            fromBlock: from,
            toBlock: to,
          })
        )
      );
     const logs = [];
      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          logs.push(...result.value);
        } else {
          console.warn("A chunk of getLogs failed:", result.reason);
        }
      }

      scheduleEvents = logs.map((log) => ({
        type: "Deposited",
        txHash: log.transactionHash,
        blockNumber: String(log.blockNumber),
        args: {
          id: log.args.id?.toString() ?? "",
          owner: log.args.owner ?? "",
          recipient: log.args.recipient ?? "",
          amountPerRelease: log.args.amountPerRelease?.toString() ?? "0",
          occurrences: log.args.occurrences?.toString() ?? "0",
          totalDeposited: log.args.totalDeposited?.toString() ?? "0",
        },
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${log.transactionHash}`,
      }));
    } catch (e) {
      console.warn("Failed to fetch Deposited events:", e);
      // Don't fail the whole request if this part breaks — just show fewer events
    }

    const events = [...normalEvents, ...internalEvents, ...scheduleEvents].sort(
      (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
    );

    return NextResponse.json({
      address,
      events,
      scheduler: schedulerAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Activity fetch failed: ${message}`, events: [] }, { status: 200 });
  }
}