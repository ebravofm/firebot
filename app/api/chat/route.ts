import { UIMessage, createIdGenerator } from "ai";
import { saveChat } from "@/lib/chat-store";
import { supabase } from "@/lib/supabase-client";
import { streamReactAgent } from "@/lib/agents/react-agent";

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatId: string | undefined = body.chatId ?? body.id;
  
  console.log(`[API] POST /api/chat called with chatId: ${chatId}`);
  console.log(`[API] Received ${messages.length} messages:`, messages.map(m => ({ id: m.id, role: m.role, content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) })));
  
  // Switch: si el hilo está tomado por humano, no generar respuesta de IA
  if (chatId) {
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id, taken_by_user_system")
      .eq("id", chatId)
      .single();

    if (threadError) {
      console.error("[API] Error fetching thread:", threadError);
      return new Response(JSON.stringify({ error: threadError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isTakenByHuman = thread?.taken_by_user_system != null;
    if (isTakenByHuman) {
      console.log(`[API] Thread ${chatId} is taken by human. Persisting user message and skipping AI.`);
      // Persistir los mensajes (deduplication en saveChat evita duplicados)
      if (chatId) {
        try {
          await saveChat({ chatId, messages });
        } catch (e) {
          console.error("[API] Failed to save messages while human taken:", e);
        }
      }

      // Responder OK sin stream para que el cliente no intente renderizar IA
      return new Response(JSON.stringify({ status: "HUMAN_TAKEN" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  
  const agentParams = { messages };
  const result = await streamReactAgent({ messages: agentParams.messages });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ size: 16 }),
    onFinish: ({ messages }) => {
      console.log(`[API] onFinish called with ${messages.length} messages for chatId: ${chatId}`);
      console.log(`[API] Messages in onFinish:`, messages.map(m => ({ id: m.id, role: m.role, content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) })));
      
      if (chatId) {
        void saveChat({ chatId, messages });
      }
    },
  });
}
