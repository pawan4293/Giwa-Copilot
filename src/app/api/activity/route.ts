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
    const explorerRes = await fetch(
      `https://sepolia-explorer.giwa.io/api/v2/addresses/${address}/logs?filter_address=${schedulerAddress}`
    );
    const explorerData = await explorerRes.json();
    const items = explorerData.items || [];

    const events = items
      .map((item: { transaction_hash: string; block_number: number; decoded?: { method_call?: string; parameters?: { name: string; value: string }[] } }) => {
        const method = item.decoded?.method_call?.split("(")[0] || "Unknown";
        const args: Record<string, string> = {};
        for (const p of item.decoded?.parameters || []) {
          args[p.name] = p.value;
        }
        return {
          type: method,
          txHash: item.transaction_hash,
          blockNumber: String(item.block_number),
          args,
          explorerUrl: `https://sepolia-explorer.giwa.io/tx/${item.transaction_hash}`,
        };
      })
      .sort((a: { blockNumber: string }, b: { blockNumber: string }) => Number(b.blockNumber) - Number(a.blockNumber));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Log fetch failed: ${message}` }, { status: 500 });
  }
}
