import { type UIMessage } from "ai";
import { generateReactAgent } from "@/lib/agents/react-agent";
import { startRespondWatchdog } from "@/lib/agents/respond-watchdog";
import { loadChat } from "@/lib/chat-store";
import { assertInternalToken } from "@/lib/internal-auth";
import { supabase } from "@/lib/supabase-client";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RespondBody {
  chatId?: string;
  id?: string;
  messages?: UIMessage[];
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  const authError = assertInternalToken(req);
  if (authError) return authError;

  let body: RespondBody;
  try {
    body = (await req.json()) as RespondBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const chatId = body.chatId?.trim() || body.id?.trim();
  if (!chatId) {
    return jsonError("chatId is required", 400);
  }

  console.log(
    `[${timestamp}] [respond:START] chatId=${chatId} messagesInBody=${body.messages?.length ?? 0}`,
  );

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, taken_by_user_system, workspace_id, chatbot_id, channel")
    .eq("id", chatId)
    .single();

  if (threadError || !thread) {
    console.error(`[respond:ERROR] thread not found chatId=${chatId}`, threadError);
    return jsonError("Thread not found", 404);
  }

  if (thread.taken_by_user_system != null) {
    console.log(
      `[respond:HUMAN] chatId=${chatId} taken_by=${thread.taken_by_user_system} — skipping agent`,
    );
    return Response.json({
      status: "HUMAN_TAKEN",
      chatId,
      text: "",
    });
  }

  let messages: UIMessage[] = body.messages ?? [];
  if (messages.length === 0) {
    console.log(`[respond:LOAD] loading messages from DB chatId=${chatId}`);
    try {
      messages = await loadChat(chatId);
    } catch (err) {
      console.error(`[respond:ERROR] loadChat failed chatId=${chatId}`, err);
      return jsonError("Failed to load thread messages", 500);
    }
  }

  if (messages.length === 0) {
    return jsonError("No messages to respond to", 400);
  }

  console.log(
    `[respond:INPUT] chatId=${chatId} messageCount=${messages.length} roles=${messages.map((m) => m.role).join(",")}`,
  );

  const watchdog = startRespondWatchdog({ chatId, label: "generateReactAgent" });

  try {
    const result = await generateReactAgent({ messages, chatId });

    watchdog.markComplete({
      finishReason: result.finishReason,
      stepCount: result.stepCount,
      textLength: result.text.length,
    });

    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[${new Date().toISOString()}] [respond:SUCCESS] chatId=${chatId} elapsedMs=${elapsedMs} steps=${result.stepCount} finishReason=${result.finishReason} textLen=${result.text.length}`,
    );

    if (!result.text) {
      console.warn(`[respond:EMPTY] chatId=${chatId} agent returned empty text`);
    }

    return Response.json({
      ok: true,
      chatId,
      text: result.text,
      finishReason: result.finishReason,
      stepCount: result.stepCount,
      modelId: result.modelId,
      workspaceId: result.workspaceId,
      chatbotId: result.chatbotId,
      elapsedMs,
    });
  } catch (err) {
    watchdog.markComplete({ error: true });
    const elapsedMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[${new Date().toISOString()}] [respond:ERROR] chatId=${chatId} elapsedMs=${elapsedMs} error=${message}`,
      err,
    );
    return jsonError(message, 500);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
