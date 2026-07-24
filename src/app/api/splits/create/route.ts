import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { splits, splitRecipients } from "@/db/schema";
import { isAddress } from "viem";

interface RecipientInput {
  identifier: string;
  amountEth: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorAddress,
      description,
      totalAmountEth,
      recipients,
      baseUrl,
    }: {
      creatorAddress: string;
      description: string;
      totalAmountEth: string;
      recipients: RecipientInput[];
      baseUrl: string;
    } = body;

    if (!creatorAddress || !isAddress(creatorAddress)) {
      return NextResponse.json({ error: "Invalid creator address" }, { status: 400 });
    }
    if (!description || !totalAmountEth || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve each identifier to a real address
    const resolvedRecipients: { identifier: string; resolvedAddress: string; amountEth: string }[] = [];

    for (const r of recipients) {
      let resolvedAddress: string;

      if (isAddress(r.identifier)) {
        resolvedAddress = r.identifier;
      } else {
        const res = await fetch(
          `${baseUrl}/api/resolve-name?name=${encodeURIComponent(r.identifier)}`
        );
        const data = await res.json();
        if (data.error || !data.address) {
          return NextResponse.json(
            { error: `Could not resolve "${r.identifier}"` },
            { status: 400 }
          );
        }
        resolvedAddress = data.address;
      }

      resolvedRecipients.push({
        identifier: r.identifier,
        resolvedAddress,
        amountEth: r.amountEth,
      });
    }

    // Sanity check: amounts should sum to totalAmountEth (small float tolerance)
    const sum = resolvedRecipients.reduce((acc, r) => acc + parseFloat(r.amountEth), 0);
    const total = parseFloat(totalAmountEth);
    if (Math.abs(sum - total) > 0.0000001) {
      return NextResponse.json(
        { error: `Recipient amounts (${sum}) don't match total (${total})` },
        { status: 400 }
      );
    }

    const [newSplit] = await db
      .insert(splits)
      .values({
        creatorAddress,
        description,
        totalAmountEth,
      })
      .returning();

    await db.insert(splitRecipients).values(
      resolvedRecipients.map((r) => ({
        splitId: newSplit.id,
        identifier: r.identifier,
        resolvedAddress: r.resolvedAddress,
        amountEth: r.amountEth,
      }))
    );

    return NextResponse.json({
      splitId: newSplit.id,
      shareUrl: `${baseUrl}/split/${newSplit.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to create split: ${message}` }, { status: 500 });
  }
}