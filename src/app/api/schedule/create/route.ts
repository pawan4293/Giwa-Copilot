import { NextRequest, NextResponse } from "next/server";
import { getQStashClient, getTriggerUrl } from "@/lib/qstash";

// Called AFTER the user's on-chain deposit transaction confirms.
// Registers a recurring QStash schedule to call Scheduler.release(id).
// The keeper wallet (server-side) sends the release tx on each trigger.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      scheduleId:      string;
      intervalSeconds: number;
      occurrences:     number;
      owner:           string;
    };

    const { scheduleId, intervalSeconds, occurrences, owner } = body;

    if (!scheduleId || !intervalSeconds || !occurrences || !owner) {
      return NextResponse.json(
        { error: "Missing required fields: scheduleId, intervalSeconds, occurrences, owner" },
        { status: 400 }
      );
    }

    const qstash = getQStashClient();
    const triggerUrl = getTriggerUrl();

    // QStash cron-like schedule: repeat every N seconds, up to occurrences times
    // We use QStash's built-in scheduling with a delay
    const result = await qstash.publishJSON({
      url:   triggerUrl,
      delay: intervalSeconds,
      body:  { scheduleId, owner, intervalSeconds },
      retries: 3,
    });

    return NextResponse.json({
      success:    true,
      scheduleId,
      qstashId:   result.messageId,
      triggerUrl,
      nextTriggerIn: `${intervalSeconds}s`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("QSTASH_TOKEN")) {
      return NextResponse.json(
        { error: "QSTASH_TOKEN is not configured. Add it to your environment variables." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: `Schedule create failed: ${message}` }, { status: 500 });
  }
}
