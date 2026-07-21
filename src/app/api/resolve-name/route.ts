import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

// .up.id names are ENS subdomains registered on Ethereum Sepolia L1 (not GIWA)
// We resolve them using viem's ENS utilities against Ethereum Sepolia

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Missing name parameter" }, { status: 400 });
  }

  // Normalise: add .up.id suffix if not present
  const fullName = name.endsWith(".up.id") ? name : `${name}.up.id`;

  try {
    // ENS lives on Ethereum L1 — use Sepolia for testnet resolution
    const sepoliaRpc =
      process.env.ETHEREUM_SEPOLIA_RPC || "https://rpc.sepolia.org";

    const l1Client = createPublicClient({
      chain: sepolia,
      transport: http(sepoliaRpc),
    });

    const address = await l1Client.getEnsAddress({ name: fullName });

    if (!address) {
      return NextResponse.json(
        { error: `Name not found: ${fullName}`, name: fullName },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: fullName,
      address,
      resolver: "ENS on Ethereum Sepolia",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Resolution failed: ${message}`, name: fullName },
      { status: 500 }
    );
  }
}
