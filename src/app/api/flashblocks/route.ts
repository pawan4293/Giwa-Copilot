import { NextRequest, NextResponse } from "next/server";

// Poll Flashblocks RPC for a preconfirmation receipt, then fall back to standard RPC
// All timing is real — measured server-side with Date.now() deltas

const FLASHBLOCKS_RPC = "https://sepolia-rpc-flashblocks.giwa.io";
const STANDARD_RPC    = "https://sepolia-rpc.giwa.io";

async function rpcRequest(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txHash = searchParams.get("hash")?.trim();

  if (!txHash) {
    return NextResponse.json({ error: "Missing hash parameter" }, { status: 400 });
  }

  // Try Flashblocks first
  const flashStart = Date.now();
  try {
    const flashResponse = await rpcRequest(
      FLASHBLOCKS_RPC,
      "eth_getTransactionReceipt",
      [txHash]
    );
    const flashLatency = Date.now() - flashStart;

    if (flashResponse.result) {
      return NextResponse.json({
        receipt:         flashResponse.result,
        source:          "flashblocks",
        latencyMs:       flashLatency,
        preconfirmed:    true,
        finalised:       false,
        txHash,
      });
    }
  } catch {
    // Flashblocks unavailable — fall through to standard RPC
  }

  // Fall back to standard RPC
  const standardStart = Date.now();
  try {
    const standardResponse = await rpcRequest(
      STANDARD_RPC,
      "eth_getTransactionReceipt",
      [txHash]
    );
    const standardLatency = Date.now() - standardStart;

    if (standardResponse.result) {
      return NextResponse.json({
        receipt:      standardResponse.result,
        source:       "standard",
        latencyMs:    standardLatency,
        preconfirmed: false,
        finalised:    true,
        txHash,
      });
    }

    // Not found yet in either RPC
    return NextResponse.json({
      receipt:      null,
      source:       "pending",
      latencyMs:    standardLatency,
      preconfirmed: false,
      finalised:    false,
      txHash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `RPC error: ${message}` }, { status: 500 });
  }
}
