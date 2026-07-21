import { NextRequest, NextResponse } from "next/server";
import { getGrokClient, GROK_MODEL, FALLBACK_MODELS, SYSTEM_PROMPT } from "@/lib/grokClient";
import { TOOLS, executeTool } from "@/lib/tools";
import type OpenAI from "openai";

const MAX_TOOL_ROUNDS = 5;

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages: ChatMessage[];
      connectedAddress?: string | null;
    };
    const { messages, connectedAddress } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const client = getGrokClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const walletContext = connectedAddress
      ? `\n\nThe user's currently connected wallet address is ${connectedAddress}. If they ask about "my balance", "my wallet", "my transaction history", or similar, use this address directly — do not ask them to provide one.`
      : "";

    const conversation: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + walletContext },
      ...messages,
    ];

    let rounds = 0;
    let pendingAction: Record<string, unknown> | null = null;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      const modelsToTry = [GROK_MODEL, ...FALLBACK_MODELS];
      let response;
      let lastErr: unknown;

      for (const model of modelsToTry) {
        try {
          response = await client.chat.completions.create({
            model,
            messages: conversation,
            tools: TOOLS,
            tool_choice: "auto",
          });
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isRetryable =
            msg.includes("Failed to call a function") ||
            msg.includes("failed_generation") ||
            msg.includes("429") ||
            msg.includes("Rate limit");
          if (!isRetryable) throw err;
          // otherwise try the next model in the list
        }
      }

      if (!response) throw lastErr;

      const choice = response.choices[0];
      if (!choice) break;

      const assistantMsg = choice.message;
      conversation.push(assistantMsg as ChatMessage);

      const toolCalls = assistantMsg.tool_calls;
      if (choice.finish_reason === "stop" || !toolCalls || toolCalls.length === 0) {
        return NextResponse.json({
          content: assistantMsg.content ?? "",
          toolCallsMade: rounds - 1,
          pendingAction,
        });
      }

      const toolResults: ChatMessage[] = await Promise.all(
        toolCalls.map(async (tc) => {
          const fn = (tc as { id: string; function: { name: string; arguments: string } }).function;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fn.arguments);
          } catch {
            args = {};
          }

          const result = await executeTool(fn.name, args, baseUrl);

          if (fn.name === "send_eth" || fn.name === "create_schedule" || fn.name === "cancel_schedule") {
            try {
              pendingAction = JSON.parse(result);
            } catch {
              // ignore
            }
          }

          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: result,
          };
        })
      );

      conversation.push(...toolResults);
    }

    return NextResponse.json({
      content: "I reached the maximum number of tool calls. Please try rephrasing your request.",
      toolCallsMade: rounds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured. Please add it to your environment variables." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: `Chat error: ${message}` }, { status: 500 });
  }
}