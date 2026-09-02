import { UIMessage, createIdGenerator } from "ai";
import { saveChat } from "@/lib/chat-store";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { streamReactAgent } from "@/lib/agents/react-agent";
import {
  pideAtencionHumana,
  textoDelUltimoMensajeDelUsuario,
} from "@/lib/human-request-detector";
import { verifyWidgetToken } from "@/lib/verify-widget-token";
import { ENV_CONFIG } from "@/lib/env";

// Configurar runtime para Vercel (Node.js tiene mejor soporte para tareas en segundo plano)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos máximo para funciones Pro

// ── Rate limiter en memoria (ventana deslizante) ──────────────────────────────
// Se limita por WORKSPACE del token verificado, no por el chatId del body: el chatId lo
// controla el cliente y bastaba con variarlo (u omitirlo) para saltar el límite. La clave
// por workspace acota el gasto de IA aun con un token filtrado.
//
// En memoria: firebot corre en un único contenedor en Railway, así que el Map basta. Con
// múltiples instancias habría que mover esto a un store compartido (Redis/DB).
const WINDOW_MS = 60_000;   // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 40; // 40 mensajes/min por workspace

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return false;
}

// Limpiar entradas antiguas cada 5 minutos para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60_000);
// ─────────────────────────────────────────────────────────────────────────────

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
  const jwtToken: string | undefined = body.jwtToken ?? req.headers.get('authorization')?.replace('Bearer ', '');

  // ── Autenticación: exigir un token de widget válido ───────────────────────
  // Antes este endpoint generaba respuestas de IA sin ninguna credencial: cualquiera
  // podía quemar los tokens de OpenAI con un curl. Ahora se verifica la firma del token
  // widget (HS256, emitido por el backend) antes de invocar el modelo.
  const claims = verifyWidgetToken(jwtToken);
  if (!claims) {
    console.warn(`[${timestamp}] [API:AUTH] token de widget ausente o inválido — rechazado`);
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Rate limiting por workspace del token ─────────────────────────────────
  if (isRateLimited(`ws:${claims.workspace_id}`)) {
    console.warn(`[${timestamp}] [API:RATE_LIMIT] workspace ${claims.workspace_id} superó el límite`);
    return new Response(
      JSON.stringify({ error: 'Demasiadas solicitudes. Espera un momento antes de continuar.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Cuota de mensajes del widget, configurable por plan ───────────────────
  // El rate limit de arriba frena ráfagas; esto aplica la cuota de negocio del plan.
  // Se consulta al backend porque LimitsService vive en Nest y esta ruta corre en Next.
  // Ante un fallo de red se permite: un problema de infraestructura no debe cortarle el
  // servicio a un cliente que paga.
  try {
    const quotaUrl = `${ENV_CONFIG.BACKEND_URL}/billing/workspace/${claims.workspace_id}/usage?key=messages_widget_month`;
    const quotaRes = await fetch(quotaUrl, {
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
    });
    if (quotaRes.ok) {
      const quota = (await quotaRes.json()) as { allowed: boolean; used: number; limit: number | null };
      if (!quota.allowed) {
        console.warn(
          `[${timestamp}] [API:QUOTA] workspace ${claims.workspace_id} alcanzó su cuota de mensajes del widget (${quota.used}/${quota.limit})`,
        );
        return new Response(
          JSON.stringify({
            error: 'Alcanzaste el límite de mensajes de tu plan.',
            code: 'MESSAGE_LIMIT_REACHED',
            used: quota.used,
            limit: quota.limit,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
  } catch (e) {
    console.warn(`[${timestamp}] [API:QUOTA] no se pudo verificar la cuota, se permite:`, e);
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`[${timestamp}] [API:INPUT] chatId: ${chatId}, messages count: ${messages.length}, workspace: ${claims.workspace_id}`);

  // Switch: si el hilo está tomado por humano, no generar respuesta de IA
  if (chatId) {
    console.log(`[${Date.now() - startTime}ms] [API:THREAD] Checking thread status for: ${chatId}`);
    // maybeSingle: un chatId inexistente (hilo borrado, localStorage viejo) devuelve null
    // en vez de lanzar error. Antes .single() daba 500 en ese caso.
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id, taken_by_user_system, workspace_id, closed_at")
      .eq("id", chatId)
      .maybeSingle();

    if (threadError) {
      console.error(`[${Date.now() - startTime}ms] [API:ERROR] Thread fetch error:`, threadError);
      return new Response(JSON.stringify({ error: threadError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // El hilo debe existir y pertenecer al workspace del token: así un token de widget no
    // opera sobre conversaciones de otro workspace, y un chatId inválido se rechaza limpio
    // (403) en vez de reventar. El cliente, ante 403, arranca un chat nuevo.
    if (!thread || thread.workspace_id !== claims.workspace_id) {
      console.warn(`[${Date.now() - startTime}ms] [API:AUTH] chatId ${chatId} (ws ${thread?.workspace_id ?? 'inexistente'}) no válido para el workspace del token (${claims.workspace_id})`);
      return new Response(JSON.stringify({ error: 'Conversación no válida', code: 'INVALID_CHAT' }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[${Date.now() - startTime}ms] [API:THREAD] Thread data:`, {
      id: thread?.id,
      taken_by_user_system: thread?.taken_by_user_system
    });

    // Un mensaje nuevo en un hilo cerrado lo reabre. En el widget no debería pasar (ahí el
    // compositor se reemplaza por el botón de conversación nueva), pero por WhatsApp o
    // Instagram el cliente escribe cuando quiere: dejar el hilo marcado como cerrado mientras
    // sigue llegando conversación mostraría un estado falso en el panel.
    if (thread?.closed_at) {
      console.log(`[${Date.now() - startTime}ms] [API:HANDOFF] Mensaje nuevo en hilo cerrado ${chatId}: se reabre`);
      await supabase
        .from("threads")
        .update({ closed_at: null, closed_by: null })
        .eq("id", chatId);
    }

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
  
  // Aviso de conversación nueva.
  //
  // Se dispara aquí y no al crear el hilo: crear el hilo solo significa que alguien abrió el
  // widget, y avisar de eso llena la campana de gente que pasó de largo. El backend solo
  // alerta la primera vez (notified_at), así que llamar en cada mensaje no duplica nada, y de
  // paso el aviso puede decir qué preguntaron.
  if (chatId && jwtToken) {
    const primerTexto = textoDelUltimoMensajeDelUsuario(
      messages as Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>,
    );
    void fetch(`${ENV_CONFIG.BACKEND_URL}/push/thread-opened`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}` },
      body: JSON.stringify({ threadId: chatId, texto: primerTexto.slice(0, 200) }),
    }).catch((err) => console.warn("[API:AVISO] no se pudo avisar del hilo nuevo:", err));
  }

  // Red de seguridad del traspaso a humano: el modelo tiene la herramienta 'request_human' y
  // normalmente la llama, pero si falla en llamarla perdemos a alguien que pidió ayuda de
  // verdad. Ante una petición explícita se avisa igual, sin esperar la respuesta: el backend
  // ignora el segundo aviso del mismo hilo, así que los dos caminos no duplican nada.
  if (chatId && jwtToken) {
    const ultimoDelVisitante = textoDelUltimoMensajeDelUsuario(
      messages as Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>,
    );
    if (pideAtencionHumana(ultimoDelVisitante)) {
      console.log(`[${Date.now() - startTime}ms] [API:HANDOFF] Petición explícita de atención humana en ${chatId}`);
      void fetch(`${ENV_CONFIG.BACKEND_URL}/push/human-requested`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ threadId: chatId, motivo: ultimoDelVisitante.slice(0, 200) }),
      }).catch((e) => console.error("[API:HANDOFF] No se pudo avisar al equipo:", e));
    }
  }

  console.log(`[${Date.now() - startTime}ms] [API:AGENT] Starting streamReactAgent...`);
  const agentParams = { messages, jwtToken, chatId };
  const result = await streamReactAgent({ 
    messages: agentParams.messages, 
    jwtToken: agentParams.jwtToken,
    chatId: agentParams.chatId 
  });
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

        // Espejo a Slack del último intercambio.
        //
        // Va aquí porque es el único punto donde están las dos mitades: lo que preguntó el
        // visitante y lo que acabó respondiendo el asistente. El backend solo escribe si esa
        // conversación ya tiene hilo en Slack, así que en cuentas sin la integración esto no
        // cuesta más que una llamada que devuelve cero.
        if (jwtToken) {
          const ultimos = messages.slice(-2).map((m) => ({
            rol: m.role,
            texto: (m.parts ?? [])
              .filter((p: any) => p?.type === "text" && typeof p.text === "string")
              .map((p: any) => p.text as string)
              .join(" ")
              .trim(),
          })).filter((m) => m.texto.length > 0);

          if (ultimos.length > 0) {
            void fetch(`${ENV_CONFIG.BACKEND_URL}/push/mirror`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}` },
              body: JSON.stringify({ threadId: chatId, mensajes: ultimos }),
            }).catch((err) => console.warn("[API:ESPEJO] no se pudo reflejar en Slack:", err));
          }
        }
        
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
