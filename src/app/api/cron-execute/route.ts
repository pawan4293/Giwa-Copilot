import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "@/lib/viemClient";
import { getKeeperWalletClient } from "@/lib/keeperWallet";
import { SCHEDULER_ABI, getSchedulerAddress } from "@/lib/contracts";

// Called by a single QStash cron job every 2 minutes.
// Scans ALL schedules on-chain, releases any that are due and active.
// Auth: shared secret forwarded by QStash as a normal Authorization header.

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedulerAddress = getSchedulerAddress();
  if (schedulerAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "Scheduler not configured" }, { status: 503 });
  }

  const nextId = await publicClient.readContract({
    address: schedulerAddress,
    abi: SCHEDULER_ABI,
    functionName: "nextId",
  }) as bigint;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const { walletClient, account } = getKeeperWalletClient();
  const results: Record<string, string> = {};

  for (let id = BigInt(0); id < nextId; id++) {
    try {
      const schedule = await publicClient.readContract({
        address: schedulerAddress,
        abi: SCHEDULER_ABI,
        functionName: "schedules",
        args: [id],
      }) as readonly [string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];

      const [, , , , , , nextReleaseAt, , active] = schedule;

      if (!active || now < nextReleaseAt) {
        results[id.toString()] = "skipped";
        continue;
      }

      const txHash = await walletClient.writeContract({
        address: schedulerAddress,
        abi: SCHEDULER_ABI,
        functionName: "release",
        args: [id],
        account,
      });
      results[id.toString()] = txHash;
    } catch (e) {
      results[id.toString()] = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({ checked: nextId.toString(), results });
}