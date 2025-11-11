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
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [API:START] ========== POST /api/chat STARTED ==========`);
  
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatId: string | undefined = body.chatId ?? body.id;
  
  console.log(`[${timestamp}] [API:INPUT] chatId: ${chatId}, messages count: ${messages.length}`);
  console.log(`[${timestamp}] [API:INPUT] messages:`, messages.map(m => ({ 
    id: m.id, 
    role: m.role, 
    content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) 
  })));
  
  // Switch: si el hilo está tomado por humano, no generar respuesta de IA
  if (chatId) {
    console.log(`[${Date.now() - startTime}ms] [API:THREAD] Checking thread status for: ${chatId}`);
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id, taken_by_user_system")
      .eq("id", chatId)
      .single();

    if (threadError) {
      console.error(`[${Date.now() - startTime}ms] [API:ERROR] Thread fetch error:`, threadError);
      return new Response(JSON.stringify({ error: threadError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[${Date.now() - startTime}ms] [API:THREAD] Thread data:`, { 
      id: thread?.id, 
      taken_by_user_system: thread?.taken_by_user_system 
    });

    const isTakenByHuman = thread?.taken_by_user_system != null;
    if (isTakenByHuman) {
      console.log(`[${Date.now() - startTime}ms] [API:HUMAN] Thread ${chatId} is taken by human. Saving messages synchronously.`);
      // Persistir los mensajes (deduplication en saveChat evita duplicados)
      if (chatId) {
        try {
          console.log(`[${Date.now() - startTime}ms] [API:HUMAN] Calling saveChat BEFORE await...`);
          await saveChat({ chatId, messages });
          console.log(`[${Date.now() - startTime}ms] [API:HUMAN] saveChat completed successfully`);
        } catch (e) {
          console.error(`[${Date.now() - startTime}ms] [API:ERROR] Failed to save messages while human taken:`, e);
        }
      }

      console.log(`[${Date.now() - startTime}ms] [API:HUMAN] Returning HUMAN_TAKEN response`);
      // Responder OK sin stream para que el cliente no intente renderizar IA
      return new Response(JSON.stringify({ status: "HUMAN_TAKEN" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  
  console.log(`[${Date.now() - startTime}ms] [API:AGENT] Starting streamReactAgent...`);
  const agentParams = { messages };
  const result = await streamReactAgent({ messages: agentParams.messages });
  console.log(`[${Date.now() - startTime}ms] [API:AGENT] streamReactAgent completed, creating response stream`);

  // Obtener waitUntil si está disponible (Vercel)
  const waitUntil = getWaitUntil();
  console.log(`[${Date.now() - startTime}ms] [API:WAITUNTIL] waitUntil available: ${waitUntil ? 'YES' : 'NO'}`);
  if (waitUntil) {
    console.log(`[${Date.now() - startTime}ms] [API:WAITUNTIL] waitUntil function found, will use it for background tasks`);
  } else {
    console.warn(`[${Date.now() - startTime}ms] [API:WAITUNTIL] WARNING: waitUntil NOT available - background tasks may not complete in Vercel`);
  }

  console.log(`[${Date.now() - startTime}ms] [API:STREAM] Creating stream response with onFinish callback`);
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ size: 16 }),
    onFinish: ({ messages }) => {
      const onFinishTime = Date.now();
      const onFinishTimestamp = new Date().toISOString();
      const elapsed = onFinishTime - startTime;
      
      console.log(`[${onFinishTimestamp}] [API:ONFINISH:START] ========== onFinish CALLBACK TRIGGERED ==========`);
      console.log(`[${onFinishTimestamp}] [API:ONFINISH] Elapsed time since POST start: ${elapsed}ms`);
      console.log(`[${onFinishTimestamp}] [API:ONFINISH] chatId: ${chatId}`);
      console.log(`[${onFinishTimestamp}] [API:ONFINISH] Messages count: ${messages.length}`);
      console.log(`[${onFinishTimestamp}] [API:ONFINISH] Messages:`, messages.map(m => ({ 
        id: m.id, 
        role: m.role, 
        content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) 
      })));
      
      if (chatId) {
        console.log(`[${onFinishTimestamp}] [API:ONFINISH] chatId exists, preparing to save...`);
        
        // Crear una promesa para el guardado con manejo de errores mejorado
        console.log(`[${onFinishTimestamp}] [API:ONFINISH] Creating savePromise...`);
        const savePromise = saveChat({ chatId, messages })
          .then(() => {
            const saveCompleteTime = Date.now();
            console.log(`[${saveCompleteTime}] [API:ONFINISH:SUCCESS] saveChat promise RESOLVED after ${saveCompleteTime - onFinishTime}ms`);
          })
          .catch((error) => {
            const saveErrorTime = Date.now();
            console.error(`[${saveErrorTime}] [API:ONFINISH:ERROR] saveChat promise REJECTED after ${saveErrorTime - onFinishTime}ms:`, error);
            // Re-lanzar para que waitUntil pueda detectar el error si es necesario
            throw error;
          });

        // En Vercel, usar waitUntil para asegurar que complete antes de que termine la función
        if (waitUntil) {
          console.log(`[${onFinishTimestamp}] [API:ONFINISH] Using waitUntil to ensure saveChat completes`);
          try {
            waitUntil(savePromise);
            console.log(`[${onFinishTimestamp}] [API:ONFINISH] waitUntil called successfully`);
          } catch (waitError) {
            console.error(`[${onFinishTimestamp}] [API:ONFINISH:ERROR] Error calling waitUntil:`, waitError);
          }
        } else {
          console.warn(`[${onFinishTimestamp}] [API:ONFINISH:WARNING] waitUntil NOT available - using void (may not complete in Vercel)`);
          // En desarrollo local, usar void pero con mejor logging
          void savePromise;
        }
        
        console.log(`[${onFinishTimestamp}] [API:ONFINISH] savePromise created and scheduled`);
      } else {
        console.warn(`[${onFinishTimestamp}] [API:ONFINISH:WARNING] No chatId, skipping saveChat`);
      }
      
      console.log(`[${onFinishTimestamp}] [API:ONFINISH:END] ========== onFinish CALLBACK COMPLETED ==========`);
    },
  });
}
