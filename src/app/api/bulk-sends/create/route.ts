import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bulkSends, bulkSendRecipients } from "@/db/schema";
import { isAddress } from "viem";

interface RecipientInput {
  identifier: string;
  address: string;
  amountEth: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      senderAddress,
      description,
      recipients,
      txHash,
    }: {
      senderAddress: string;
      description?: string;
      recipients: RecipientInput[];
      txHash: string;
    } = body;

    if (!senderAddress || !isAddress(senderAddress)) {
      return NextResponse.json({ error: "Invalid sender address" }, { status: 400 });
    }
    if (!recipients || recipients.length === 0 || !txHash) {
      return NextResponse.json({ error: "Missing recipients or txHash" }, { status: 400 });
    }

    const total = recipients.reduce((a, r) => a + parseFloat(r.amountEth), 0).toString();

    const [newBulkSend] = await db
      .insert(bulkSends)
      .values({
        senderAddress,
        description: description || null,
        totalAmountEth: total,
        txHash,
      })
      .returning();

    await db.insert(bulkSendRecipients).values(
      recipients.map((r) => ({
        bulkSendId: newBulkSend.id,
        identifier: r.identifier,
        resolvedAddress: r.address,
        amountEth: r.amountEth,
      }))
    );

    return NextResponse.json({ id: newBulkSend.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to record bulk send: ${message}` }, { status: 500 });
  }
}