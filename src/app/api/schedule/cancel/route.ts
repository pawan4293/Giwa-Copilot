import { NextRequest, NextResponse } from "next/server";
import { getQStashClient } from "@/lib/qstash";

// Called when user clicks "Cancel & Refund" in the Schedule UI.
// Deletes the QStash job (no more keeper triggers).
// The actual Scheduler.cancel() on-chain tx is signed client-side by the user's wallet.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      qstashMessageId?: string;
      scheduleId:       string;
    };

    const { qstashMessageId, scheduleId } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: "Missing scheduleId" }, { status: 400 });
    }

    // If we have a QStash message ID, attempt to cancel it
    if (qstashMessageId) {
      try {
        const qstash = getQStashClient();
        await qstash.messages.delete(qstashMessageId);
      } catch (qErr) {
        // Log but don't fail — the on-chain cancel is more important
        console.warn("QStash delete failed (may already be delivered):", qErr);
      }
    }

    return NextResponse.json({
      success:    true,
      scheduleId,
      qstashCancelled: !!qstashMessageId,
      note: "Sign the on-chain cancel tx with your wallet to receive the refund.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Cancel failed: ${message}` }, { status: 500 });
  }
}
