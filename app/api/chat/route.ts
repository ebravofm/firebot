import { UIMessage, createIdGenerator } from "ai";
import { saveChat } from "@/lib/chat-store";
import { supabase } from "@/lib/supabase-client";
import { streamReactAgent } from "@/lib/agents/react-agent";

// Configurar runtime para Vercel (Node.js tiene mejor soporte para tareas en segundo plano)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos máximo para funciones Pro

// Tipo para waitUntil de Vercel
type WaitUntilFunction = (promise: Promise<unknown>) => void;

// Helper para obtener waitUntil en Vercel (compatible con diferentes entornos)
function getWaitUntil(): WaitUntilFunction | undefined {
  // En Vercel, waitUntil puede estar disponible en diferentes lugares según el runtime
  // Intentar múltiples formas de acceso usando type guards seguros
  const globalObj = globalThis as unknown as Record<string, unknown>;
  if (typeof globalObj.waitUntil === 'function') {
    return globalObj.waitUntil as WaitUntilFunction;
  }
  // En algunos casos puede estar en process.env o en el contexto de la request
  const processObj = process as unknown as Record<string, unknown>;
  if (typeof processObj.waitUntil === 'function') {
    return processObj.waitUntil as WaitUntilFunction;
  }
  // Fallback: retornar undefined si no está disponible (desarrollo local)
  return undefined;
}

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

  // Obtener waitUntil si está disponible (Vercel)
  const waitUntil = getWaitUntil();

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ size: 16 }),
    onFinish: ({ messages }) => {
      console.log(`[API] onFinish called with ${messages.length} messages for chatId: ${chatId}`);
      console.log(`[API] Messages in onFinish:`, messages.map(m => ({ id: m.id, role: m.role, content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) })));
      
      if (chatId) {
        // Crear una promesa para el guardado con manejo de errores mejorado
        const savePromise = saveChat({ chatId, messages }).catch((error) => {
          console.error(`[API] Error saving messages in onFinish for chatId ${chatId}:`, error);
          // Re-lanzar para que waitUntil pueda detectar el error si es necesario
          throw error;
        });

        // En Vercel, usar waitUntil para asegurar que complete antes de que termine la función
        if (waitUntil) {
          waitUntil(savePromise);
        } else {
          // En desarrollo local, usar void pero con mejor logging
          void savePromise;
        }
      }
    },
  });
}
