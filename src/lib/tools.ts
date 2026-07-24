import type OpenAI from "openai";

// Tool definitions for Grok function-calling
// Each tool maps to a real API route — no synthetic data is ever returned

export const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "resolve_name",
      description:
        "Resolve a .up.id Upbit Web3 Name to a wallet address via ENS on Ethereum Sepolia L1. " +
        "Always call this before proposing any send transaction.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The .up.id name to resolve, e.g. 'alice.up.id'",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_verified",
      description:
        "Check whether a wallet address has a valid Verified Address attestation " +
        "(Dojang / Upbit Korea KYC) on GIWA Sepolia. Returns a real boolean from on-chain.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The 0x wallet address to check",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_balance",
      description:
        "Get the live ETH balance of a wallet address on GIWA Sepolia (chain ID 91342). " +
        "Returns the real balance fetched from the RPC — never a cached or estimated value.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The 0x wallet address to check",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_eth",
      description:
        "Prepare a one-time ETH transfer for the user to confirm and sign. This does NOT send anything by itself — " +
        "it only opens a confirmation dialog. Always call resolve_name first if the recipient is a .up.id name.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Resolved 0x recipient address",
          },
          displayName: {
            type: "string",
            description: "The .up.id name or address as typed by the user, shown for confirmation",
          },
          amountEth: {
            type: "string",
            description: "Amount of ETH to send, e.g. '0.001'",
          },
        },
        required: ["to", "displayName", "amountEth"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_schedule",
      description:
        "Create a recurring payment schedule on the GIWA Sepolia Scheduler contract. " +
        "This prepares the schedule parameters — the user must sign the actual deposit transaction client-side.",
      parameters: {
        type: "object",
        properties: {
          recipient: {
            type: "string",
            description: "Recipient wallet address (0x…) or resolved .up.id",
          },
          amountPerReleaseEth: {
            type: "string",
            description: "ETH amount to send each interval, e.g. '0.01'",
          },
          intervalSeconds: {
            type: "number",
            description: "Seconds between each release, e.g. 86400 for daily",
          },
          occurrences: {
            type: "number",
            description: "Total number of releases to schedule",
          },
          endsAt: {
            type: "number",
            description: "Unix timestamp of hard deadline (after which no releases occur)",
          },
        },
        required: ["recipient", "amountPerReleaseEth", "intervalSeconds", "occurrences", "endsAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_wallet_history",
      description:
        "Get the FULL real transaction history for a wallet address on GIWA Sepolia — including plain ETH sends, not just Scheduler activity. " +
        "Fetched live from the GIWA Blockscout explorer API. Use this whenever the user asks for their transaction history.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The 0x wallet address to check",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity",
      description:
        "Get real on-chain Scheduler activity (Deposited/Released/Cancelled events) for a wallet address on GIWA Sepolia. " +
        "This is the closest thing to 'transaction history' this app can show — it does not include unrelated wallet transfers, only Scheduler contract events.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The 0x wallet address to check",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_schedule",
      description:
        "Cancel an existing schedule by ID. The owner receives a refund of all unpaid ETH. " +
        "This is an on-chain operation — the user must sign the cancel transaction client-side.",
      parameters: {
        type: "object",
        properties: {
          scheduleId: {
            type: "string",
            description: "The numeric schedule ID to cancel",
          },
        },
        required: ["scheduleId"],
      },
    },
  },
];

// Execute a tool call and return a string result
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  baseUrl: string
): Promise<string> {
  try {
    switch (name) {
      case "resolve_name": {
        const res = await fetch(
          `${baseUrl}/api/resolve-name?name=${encodeURIComponent(String(args.name))}`
        );
        const data = await res.json();
        if (data.error) return `Error resolving name: ${data.error}`;
        return JSON.stringify(data);
      }

      case "check_verified": {
        const res = await fetch(
          `${baseUrl}/api/verify?address=${encodeURIComponent(String(args.address))}`
        );
        const data = await res.json();
        if (data.error) return `Error checking verification: ${data.error}`;
        return JSON.stringify(data);
      }

      case "get_balance": {
        const res = await fetch(
          `${baseUrl}/api/activity?address=${encodeURIComponent(String(args.address))}&type=balance`
        );
        const data = await res.json();
        if (data.error) return `Error fetching balance: ${data.error}`;
        return JSON.stringify(data);

    
      }

      case "get_wallet_history": {
        const addr = String(args.address).toLowerCase();
        const res = await fetch(
          `https://sepolia-explorer.giwa.io/api/v2/addresses/${encodeURIComponent(addr)}/transactions`
        );
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];

        function timeAgo(iso: string): string {
          const diffMs = Date.now() - new Date(iso).getTime();
          const mins = Math.floor(diffMs / 60000);
          if (mins < 1) return "just now";
          if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
          const hours = Math.floor(mins / 60);
          if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
          const days = Math.floor(hours / 24);
          return `${days} day${days === 1 ? "" : "s"} ago`;
        }

        async function resolveName(address: string): Promise<string | null> {
          try {
            const r = await fetch(`${baseUrl}/api/resolve-address?address=${address}`);
            const d = await r.json();
            return d.name || null;
          } catch {
            return null;
          }
        }

        const nameCache: Record<string, string | null> = {};
        const simplified = await Promise.all(
          items.slice(0, 10).map(async (tx: Record<string, unknown>) => {
            const from = String((tx.from as Record<string, unknown>)?.hash || "").toLowerCase();
            const to = String((tx.to as Record<string, unknown>)?.hash || "").toLowerCase();
            const outgoing = from === addr;
            const counterparty = outgoing ? to : from;

            if (!(counterparty in nameCache)) {
              nameCache[counterparty] = await resolveName(counterparty);
            }

            return {
              direction: outgoing ? "sent" : "received",
              counterpartyAddress: counterparty,
              counterpartyName: nameCache[counterparty],
              amountEth: tx.value ? (Number(tx.value) / 1e18).toString() : "0",
              timeAgo: tx.timestamp ? timeAgo(String(tx.timestamp)) : "unknown time",
              hash: tx.hash,
            };
          })
        );

        return JSON.stringify({ transactions: simplified });
      }

      case "get_activity": {
        const res = await fetch(
          `${baseUrl}/api/activity?address=${encodeURIComponent(String(args.address))}&type=logs`
        );
        const data = await res.json();
        if (data.error) return `Error fetching activity: ${data.error}`;
        return JSON.stringify(data);
      }

      case "send_eth": {
        return JSON.stringify({
          action: "open_send_modal",
          to: args.to,
          displayName: args.displayName,
          amountEth: args.amountEth,
        });
      }

      case "create_schedule": {
        // Return schedule params for the frontend to pick up and open ScheduleForm
        return JSON.stringify({
          action: "open_schedule_form",
          params: args,
        });
      }

      case "cancel_schedule": {
        return JSON.stringify({
          action: "open_cancel_dialog",
          scheduleId: args.scheduleId,
        });
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool execution error: ${String(err)}`;
  }
}
