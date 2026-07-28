import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { publicClient } from "@/lib/viemClient";
import { getKeeperWalletClient } from "@/lib/keeperWallet";
import { SCHEDULER_ABI, getSchedulerAddress } from "@/lib/contracts";

// QStash trigger endpoint — called by QStash on schedule
// MUST verify QStash signature before doing anything
// Keeper wallet calls Scheduler.release(id) on-chain

export async function POST(req: NextRequest) {
  // ── 1. Verify QStash signature ─────────────────────────────────
  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (!signingKey) {
    console.error("QSTASH_CURRENT_SIGNING_KEY not set");
    return NextResponse.json({ error: "Signing key not configured" }, { status: 503 });
  }

  const receiver = new Receiver({ currentSigningKey: signingKey, nextSigningKey: signingKey });

  const rawBody = await req.text();
  const signature = req.headers.get("upstash-signature") ?? "";

  try {
    await receiver.verify({ signature, body: rawBody });
  } catch {
    console.warn("QStash signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 2. Parse payload ───────────────────────────────────────────
  let payload: { scheduleId?: string; owner?: string; intervalSeconds?: number };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scheduleId, intervalSeconds } = payload;
  if (!scheduleId) {
    return NextResponse.json({ error: "Missing scheduleId in payload" }, { status: 400 });
  }

  const schedulerAddress = getSchedulerAddress();
  if (schedulerAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "Scheduler contract not configured" }, { status: 503 });
  }

  // ── 3. Check schedule is still active and due ──────────────────
  try {
    const schedule = await publicClient.readContract({
      address: schedulerAddress,
      abi: SCHEDULER_ABI,
      functionName: "schedules",
      args: [BigInt(scheduleId)],
    }) as readonly [string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean];

    const [, , , , , , , nextReleaseAt, , active] = schedule;

    if (!active) {
      return NextResponse.json({
        skipped: true,
        reason: "Schedule is inactive",
        scheduleId,
      });
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now < nextReleaseAt) {
      return NextResponse.json({
        skipped: true,
        reason: `Not yet due. Next release at ${nextReleaseAt.toString()}`,
        scheduleId,
      });
    }

    // ── 4. Call release() via keeper wallet ──────────────────────
    const { walletClient, account } = getKeeperWalletClient();

    const txHash = await walletClient.writeContract({
      address: schedulerAddress,
      abi: SCHEDULER_ABI,
      functionName: "release",
      args: [BigInt(scheduleId)],
      account,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Re-check schedule state after release — if still active, register the next trigger
    let reregistered = false;
    if (intervalSeconds) {
      const updated = await publicClient.readContract({
        address: schedulerAddress,
        abi: SCHEDULER_ABI,
        functionName: "schedules",
        args: [BigInt(scheduleId)],
      }) as readonly [string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean];

      const [, , , , , , , , , stillActive] = updated;

      if (stillActive) {
        const { getQStashClient, getTriggerUrl } = await import("@/lib/qstash");
        const qstash = getQStashClient();
        await qstash.publishJSON({
          url: getTriggerUrl(),
          delay: intervalSeconds,
          body: { scheduleId, owner: payload.owner, intervalSeconds },
          retries: 3,
        });
        reregistered = true;
      }
    }

    return NextResponse.json({
      success:    true,
      scheduleId,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      status:      receipt.status,
      explorerUrl: `https://sepolia-explorer.giwa.io/tx/${txHash}`,
      reregistered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Trigger release failed:", message);
    return NextResponse.json({ error: `Release failed: ${message}` }, { status: 500 });
  }
}
