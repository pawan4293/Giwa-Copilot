import { NextRequest, NextResponse } from "next/server";
import { isAddress, toHex, pad } from "viem";
import { publicClient } from "@/lib/viemClient";
import { CONTRACTS, UP_NAME_REGISTRY_ABI } from "@/lib/contracts";

// Reverse lookup: wallet address -> .up.id username
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid or missing address" }, { status: 400 });
  }

  try {
    const tokenId = await publicClient.readContract({
      address: CONTRACTS.UP_NAME_REGISTRY as `0x${string}`,
      abi: UP_NAME_REGISTRY_ABI,
      functionName: "ownedTokenId",
      args: [address as `0x${string}`],
    });

    const tokenIdBytes32 = pad(toHex(tokenId), { size: 32 });

    if (tokenId === BigInt(0)) {
      return NextResponse.json({ address, name: null });
    }

    const label = await publicClient.readContract({
      address: CONTRACTS.UP_NAME_REGISTRY as `0x${string}`,
      abi: UP_NAME_REGISTRY_ABI,
      functionName: "getLabel",
      args: [tokenIdBytes32],
    });

    if (!label || label.trim() === "") {
      return NextResponse.json({ address, name: null });
    }

    return NextResponse.json({ address, name: `${label}.up.id` });
  } catch {
    return NextResponse.json({ address, name: null });
  }
}