import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { splits, splitRecipients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.toLowerCase();

  const splitId = parseInt(id, 10);
  if (isNaN(splitId)) {
    return NextResponse.json({ error: "Invalid split ID" }, { status: 400 });
  }

  const [split] = await db.select().from(splits).where(eq(splits.id, splitId));
  if (!split) {
    return NextResponse.json({ error: "Split not found" }, { status: 404 });
  }

  const recipients = await db
    .select()
    .from(splitRecipients)
    .where(eq(splitRecipients.splitId, splitId));

  let creatorName: string | null = null;
  try {
    const nameRes = await fetch(`${new URL(req.url).origin}/api/resolve-address?address=${split.creatorAddress}`);
    const nameData = await nameRes.json();
    creatorName = nameData.name || null;
  } catch {
    // fallback to address only
  }

  const base = {
    description: split.description,
    totalAmountEth: split.totalAmountEth,
    creatorAddress: split.creatorAddress,
    creatorName,
    deadline: split.deadline,
    recipientCount: recipients.length,
  };

  if (!address) {
    return NextResponse.json({ ...base, matched: false });
  }

  const mine = recipients.find((r) => r.resolvedAddress.toLowerCase() === address);

  if (!mine) {
    return NextResponse.json({ ...base, matched: false });
  }

  return NextResponse.json({
    ...base,
    matched: true,
    yourAmountEth: mine.amountEth,
    yourIdentifier: mine.identifier,
    paid: mine.paid,
    paidTxHash: mine.paidTxHash,
    recipientId: mine.id,
  });
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const splitId = parseInt(id, 10);
  if (isNaN(splitId)) {
    return NextResponse.json({ error: "Invalid split ID" }, { status: 400 });
  }

  const { recipientId, txHash }: { recipientId: number; txHash: string } = await req.json();

  if (!recipientId || !txHash) {
    return NextResponse.json({ error: "recipientId and txHash are required" }, { status: 400 });
  }

  await db
    .update(splitRecipients)
    .set({ paid: true, paidTxHash: txHash })
    .where(eq(splitRecipients.id, recipientId));

  return NextResponse.json({ success: true });
}