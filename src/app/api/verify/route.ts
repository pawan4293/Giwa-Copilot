import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { publicClient } from "@/lib/viemClient";
import {
  CONTRACTS,
  EAS_ABI,
  ATTESTATION_INDEXER,
  ATTESTATION_INDEXER_ABI,
  VERIFIED_ADDRESS_SCHEMA,
  PLAYGROUND_ATTESTER,
} from "@/lib/contracts";

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
    const uid = await publicClient.readContract({
      address: ATTESTATION_INDEXER,
      abi: ATTESTATION_INDEXER_ABI,
      functionName: "getAttestationUid",
      args: [VERIFIED_ADDRESS_SCHEMA, PLAYGROUND_ATTESTER, address as `0x${string}`],
    });

    const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (uid === ZERO) {
      return NextResponse.json({ address, verified: false });
    }

    const attestation = await publicClient.readContract({
      address: CONTRACTS.EAS as `0x${string}`,
      abi: EAS_ABI,
      functionName: "getAttestation",
      args: [uid],
    });

    const now = BigInt(Math.floor(Date.now() / 1000));
    const zero = BigInt(0);
    const revoked = attestation.revocationTime !== zero;
    const expired = attestation.expirationTime !== zero && attestation.expirationTime < now;

    return NextResponse.json({
      address,
      verified: !revoked && !expired,
      attestationUid: uid,
      contract: ATTESTATION_INDEXER,
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
