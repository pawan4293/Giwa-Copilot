import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { splits, splitRecipients } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.toLowerCase();

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const mySplits = await db
      .select()
      .from(splits)
      .where(sql`lower(${splits.creatorAddress}) = ${address}`)
      .orderBy(desc(splits.createdAt));

    const results = await Promise.all(
      mySplits.map(async (split) => {
        const recipients = await db
          .select()
          .from(splitRecipients)
          .where(sql`${splitRecipients.splitId} = ${split.id}`);

        return {
          id: split.id,
          description: split.description,
          totalAmountEth: split.totalAmountEth,
          createdAt: split.createdAt,
          recipients: recipients.map((r) => ({
            identifier: r.identifier,
            amountEth: r.amountEth,
            paid: r.paid,
            paidTxHash: r.paidTxHash,
          })),
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/split/${split.id}`,
        };
      })
    );

    return NextResponse.json({ splits: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch splits: ${message}` }, { status: 500 });
  }
}