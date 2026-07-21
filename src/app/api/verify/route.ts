import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { publicClient } from "@/lib/viemClient";
import { CONTRACTS, DOJANG_SCROLL_ABI, ATTESTER_IDS } from "@/lib/contracts";

// Live on-chain verified address check via DojangScroll contract
// Contract: 0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9 on GIWA Sepolia
// Attester: Upbit Korea (keccak256("dojang.dojangattesterids.upbitkorea"))

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
  }

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
  }

  try {
    const isVerified = await publicClient.readContract({
      address: CONTRACTS.DOJANG_SCROLL as `0x${string}`,
      abi: DOJANG_SCROLL_ABI,
      functionName: "isVerified",
      args: [address as `0x${string}`, ATTESTER_IDS.UPBIT_KOREA],
    });

    return NextResponse.json({
      address,
      verified: isVerified,
      attester: "Upbit Korea",
      attesterId: ATTESTER_IDS.UPBIT_KOREA,
      contract: CONTRACTS.DOJANG_SCROLL,
      chain: "GIWA Sepolia (91342)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Contract read failed: ${message}` },
      { status: 500 }
    );
  }
}
