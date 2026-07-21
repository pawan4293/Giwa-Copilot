import { NextRequest, NextResponse } from "next/server";
import { isAddress, formatEther, parseAbiItem } from "viem";
import { publicClient } from "@/lib/viemClient";
import { getSchedulerAddress } from "@/lib/contracts";

// Returns either:
// - balance: live ETH balance for an address
// - logs: Deposited/Released/Cancelled events from the Scheduler contract
// Chain is always the source of truth — no local database

const depositedEvent = parseAbiItem(
  "event Deposited(uint256 indexed id, address indexed owner, address indexed recipient, uint256 amountPerRelease, uint256 interval, uint256 occurrences, uint256 totalDeposited, uint256 firstReleaseAt, uint256 endsAt)"
);

const releasedEvent = parseAbiItem(
  "event Released(uint256 indexed id, address indexed recipient, uint256 amount, uint256 releaseIndex, uint256 timestamp)"
);

const cancelledEvent = parseAbiItem(
  "event Cancelled(uint256 indexed id, address indexed owner, uint256 refundAmount, uint256 timestamp)"
);

function serializeArgs(args: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = typeof v === "bigint" ? v.toString() : String(v);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();
  const type    = searchParams.get("type") || "logs";

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
        balanceWei:  balanceWei.toString(),
        balanceEth:  formatEther(balanceWei),
        chain:       "GIWA Sepolia (91342)",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Balance fetch failed: ${message}` }, { status: 500 });
    }
  }

  // ── Event logs query ───────────────────────────────────────────
  const schedulerAddress = getSchedulerAddress();
  if (schedulerAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({
      events: [],
      note: "SCHEDULER_CONTRACT_ADDRESS not configured yet",
    });
  }

  try {
    const fromBlock = BigInt(0);

    // Deposited events where this address is the owner
    const depositedLogs = await publicClient.getLogs({
      address: schedulerAddress,
      event:   depositedEvent,
      args:    { owner: address as `0x${string}` },
      fromBlock,
      toBlock: "latest" as const,
    });

    // Released events where this address is the recipient
    const releasedLogs = await publicClient.getLogs({
      address: schedulerAddress,
      event:   releasedEvent,
      args:    { recipient: address as `0x${string}` },
      fromBlock,
      toBlock: "latest" as const,
    });

    // Cancelled events where this address is the owner
    const cancelledLogs = await publicClient.getLogs({
      address: schedulerAddress,
      event:   cancelledEvent,
      args:    { owner: address as `0x${string}` },
      fromBlock,
      toBlock: "latest" as const,
    });

    const events = [
      ...depositedLogs.map((log) => ({
        type:        "Deposited",
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber?.toString() ?? "0",
        args:        serializeArgs(log.args as Record<string, unknown>),
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${log.transactionHash}`,
      })),
      ...releasedLogs.map((log) => ({
        type:        "Released",
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber?.toString() ?? "0",
        args:        serializeArgs(log.args as Record<string, unknown>),
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${log.transactionHash}`,
      })),
      ...cancelledLogs.map((log) => ({
        type:        "Cancelled",
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber?.toString() ?? "0",
        args:        serializeArgs(log.args as Record<string, unknown>),
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${log.transactionHash}`,
      })),
    ].sort((a, b) => {
      const diff = BigInt(b.blockNumber) - BigInt(a.blockNumber);
      return diff > BigInt(0) ? 1 : diff < BigInt(0) ? -1 : 0;
    });

    return NextResponse.json({
      address,
      events,
      scheduler: schedulerAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Log fetch failed: ${message}` }, { status: 500 });
  }
}
