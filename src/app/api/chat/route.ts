import { NextRequest, NextResponse } from "next/server";
import { getGrokClient, GROK_MODEL, FALLBACK_MODEL, SYSTEM_PROMPT } from "@/lib/grokClient";
import { TOOLS, executeTool } from "@/lib/tools";
import type OpenAI from "openai";

// Maximum tool-call rounds per request to prevent runaway loops
const MAX_TOOL_ROUNDS = 5;

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { messages: ChatMessage[]; connectedAddress?: string | null };
    const { messages, connectedAddress } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const client = getGrokClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Build conversation with system prompt
    const walletContext = connectedAddress
      ? `\n\nThe user's currently connected wallet address is ${connectedAddress}. If they ask about "my balance", "my wallet", or similar, use this address — do not ask them to provide one.`
      : "";

    const conversation: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + walletContext },
      ...messages,
    ];

    let rounds = 0;

    // Agentic loop: run until no more tool calls or max rounds hit
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      let response;
      try {
        response = await client.chat.completions.create({
          model: GROK_MODEL,
          messages: conversation,
          tools: TOOLS,
          tool_choice: "auto",
        });
      } catch (toolErr) {
        // Groq occasionally fails to generate a valid tool call — retry once
        // without forcing tool use, on a smaller model, rather than erroring out.
        const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
        if (msg.includes("Failed to call a function") || msg.includes("failed_generation")) {
          response = await client.chat.completions.create({
            model: FALLBACK_MODEL,
            messages: conversation,
            tools: TOOLS,
            tool_choice: "auto",
          });
        } else {
          throw toolErr;
        }
      }

      const choice = response.choices[0];
      if (!choice) break;

      const assistantMsg = choice.message;
      conversation.push(assistantMsg as ChatMessage);

      // No tool calls — we have a final response
      const toolCalls = assistantMsg.tool_calls;
      if (
        choice.finish_reason === "stop" ||
        !toolCalls ||
        toolCalls.length === 0
      ) {
        return NextResponse.json({
          content:       assistantMsg.content ?? "",
          toolCallsMade: rounds - 1,
        });
      }

      // Execute all tool calls in parallel
      const toolResults: ChatMessage[] = await Promise.all(
        toolCalls.map(async (tc) => {
          // tc is ChatCompletionMessageToolCall which has .function
          const fn = (tc as { id: string; function: { name: string; arguments: string } }).function;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fn.arguments);
          } catch {
            args = {};
          }

          const result = await executeTool(fn.name, args, baseUrl);

          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: result,
          };
        })
      );

      conversation.push(...toolResults);
    }

    // Fallback if max rounds hit
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
