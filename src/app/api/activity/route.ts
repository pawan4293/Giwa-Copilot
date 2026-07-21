import { NextRequest, NextResponse } from "next/server";
import { isAddress, formatEther } from "viem";
import { publicClient } from "@/lib/viemClient";
import { getSchedulerAddress } from "@/lib/contracts";

// Returns either:
// - balance: live ETH balance for an address
// - logs: real activity for an address, sourced from the GIWA Blockscout explorer API
// Chain is always the source of truth — no local database

interface BlockscoutLogParam {
  name: string;
  value: string;
}

interface BlockscoutLogItem {
  transaction_hash: string;
  block_number: number;
  address?: { hash?: string };
  decoded?: {
    method_call?: string;
    parameters?: BlockscoutLogParam[];
  };
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
    const explorerRes = await fetch(
      `https://sepolia-explorer.giwa.io/api/v2/addresses/${address}/logs`
    );

    if (!explorerRes.ok) {
      return NextResponse.json(
        { error: `Explorer API returned ${explorerRes.status}`, events: [] },
        { status: 200 }
      );
    }

    const explorerData = await explorerRes.json();
    const items: BlockscoutLogItem[] = explorerData.items || [];

    const events = items
      .filter((item) => item.address?.hash?.toLowerCase() === schedulerAddress.toLowerCase())
      .map((item) => {
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
      .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

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