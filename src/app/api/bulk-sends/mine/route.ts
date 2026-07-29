import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bulkSends, bulkSendRecipients } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.toLowerCase();

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const mySends = await db
      .select()
      .from(bulkSends)
      .where(sql`lower(${bulkSends.senderAddress}) = ${address}`)
      .orderBy(desc(bulkSends.createdAt));

    const results = await Promise.all(
      mySends.map(async (send) => {
        const recipients = await db
          .select()
          .from(bulkSendRecipients)
          .where(sql`${bulkSendRecipients.bulkSendId} = ${send.id}`);

        return {
          id: send.id,
          description: send.description,
          totalAmountEth: send.totalAmountEth,
          txHash: send.txHash,
          createdAt: send.createdAt,
          explorerUrl: `https://sepolia-explorer.giwa.io/tx/${send.txHash}`,
          recipients: recipients.map((r) => ({
            identifier: r.identifier,
            amountEth: r.amountEth,
          })),
        };
      })
    );

    return NextResponse.json({ bulkSends: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch bulk sends: ${message}` }, { status: 500 });
  }
}