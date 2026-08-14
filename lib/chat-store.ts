import { type UIMessage } from "ai";
import { supabaseServer as supabase } from "../lib/supabase-server";
import { getChatbotConfig } from "../lib/config";
import { storage } from "./storage";
import { ENV_CONFIG } from "./env";

interface DatabaseMessage {
  id: string;
  role: string;
  content: string;
  parts: unknown[];
}

// Función helper para extraer el contenido de texto de un UIMessage
function extractTextContent(message: UIMessage): string {
  const textParts = message.parts.filter(part => part.type === 'text');
  return textParts.map(part => (part as { text: string }).text).join(' ');
}

function normalizeMessageSignature(message: UIMessage): string {
  const role = message.role ?? "";
  const text = extractTextContent(message).trim();
  return `${role}|${text}`;
}

export async function createChat(jwt: string): Promise<string> {
  // Corre en el servidor (ruta /api/chat/create). El JWT del widget llega explícito
  // porque ya no hay storage del navegador aquí.
  const chatbotConfig = await getChatbotConfig(jwt);

  if (!chatbotConfig) {
    throw new Error("No se pudo obtener la configuración del chatbot");
  }

  // ── Límite de conversaciones Free ──────────────────────────────────────────
  // Verificar si el workspace puede iniciar una nueva conversación antes de
  // crear el thread. Solo aplica al plan Free (30 conversaciones/mes).
  // El token JWT del widget autentica esta llamada.
  try {
    if (jwt) {
      const usageUrl = `${ENV_CONFIG.BACKEND_URL}/billing/workspace/${chatbotConfig.workspace_id}/usage`;
      const usageRes = await fetch(usageUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });
      if (usageRes.ok) {
        const usage = await usageRes.json() as {
          allowed: boolean;
          used: number;
          limit: number | null;
          plan: string;
        };
        if (!usage.allowed) {
          throw new Error(
            `CONVERSATION_LIMIT_REACHED:${usage.used}:${usage.limit}`,
          );
        }
      }
      // Si la llamada falla (red, 4xx, etc.) dejamos continuar — evitamos
      // bloquear al usuario por errores del servicio de billing.
    }
  } catch (err) {
    // Re-lanzar solo si es un límite de conversaciones alcanzado
    if (err instanceof Error && err.message.startsWith("CONVERSATION_LIMIT_REACHED")) {
      throw err;
    }
    // Otros errores de red: loguear y continuar
    console.warn("[createChat] No se pudo verificar el límite de conversaciones:", err);
  }
  // ──────────────────────────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from("threads")
    .insert({ 
      workspace_id: chatbotConfig.workspace_id,
      chatbot_id: chatbotConfig.id,
      flag: false // valor por defecto
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating chat:", error);
    throw new Error(error.message);
  }

  // El thread_id se guarda en localStorage del lado cliente, tras recibir la respuesta
  // de /api/chat/create (aquí ya no hay navegador).
  return data.id;
}

export async function loadChat(id: string): Promise<UIMessage[]> {
  console.log(`[loadChat] Attempting to load chat with ID: ${id}`);

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, parts")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[loadChat] Database error:", error);
    throw new Error(error.message);
  }

  console.log(`[loadChat] Raw data from database:`, data);
  console.log(`[loadChat] Number of messages found: ${data?.length || 0}`);

  // Convertir los datos de la BD a UIMessage
  const messages = data.map((d: DatabaseMessage) => ({
    id: d.id,
    role: d.role as 'system' | 'user' | 'assistant',
    parts: d.parts,
  })) as UIMessage[];

  const isHumanProvider = (parts: unknown[]): boolean => {
    if (!Array.isArray(parts)) return false;
    return parts.some((p: unknown) => {
      if (!p || typeof p !== 'object') return false;
      const pm = (p as { providerMetadata?: { human?: unknown } }).providerMetadata;
      return !!(pm && 'human' in pm);
    });
  };

  const isWhatsAppProvider = (parts: unknown[]): boolean => {
    if (!Array.isArray(parts)) return false;
    return parts.some((p: unknown) => {
      if (!p || typeof p !== 'object') return false;
      const pm = (p as { providerMetadata?: { whatsapp?: unknown } }).providerMetadata;
      return !!(pm && 'whatsapp' in pm);
    });
  };

  const isAIProvider = (parts: unknown[]): boolean => {
    if (!Array.isArray(parts)) return false;
    return parts.some((p: unknown) => {
      if (!p || typeof p !== 'object') return false;
      const obj = p as { providerMetadata?: { openai?: unknown }; type?: string };
      return !!(obj.providerMetadata && 'openai' in obj.providerMetadata) || obj.type === 'step-start';
    });
  };

  // Filtrar mensajes relevantes: siempre mostrar la conversación completa
  // (tanto respuestas de IA como de operadores humanos)
  const relevant = messages.filter((m) => {
    const isRelevantRole = m.role === 'user' || m.role === 'assistant';
    if (!isRelevantRole) return false;
    const text = extractTextContent(m).trim();
    if (text.length === 0) return false;

    // Los mensajes de usuario siempre se muestran
    if (m.role === 'user') return true;

    // El mensaje de apertura (opening) siempre se muestra; no tiene metadata de proveedor
    if (m.id === 'opening-message' && m.role === 'assistant') return true;

    // Mensajes assistant: IA (widget), operador humano, o respuestas WhatsApp Cloud API
    if (m.role === 'assistant') {
      return (
        isAIProvider(m.parts as unknown[]) ||
        isHumanProvider(m.parts as unknown[]) ||
        isWhatsAppProvider(m.parts as unknown[])
      );
    }
    return true;
  });

  const seenSignatures = new Set<string>();
  const deduped = relevant.filter((m) => {
    const signature = normalizeMessageSignature(m);
    if (seenSignatures.has(signature)) return false;
    seenSignatures.add(signature);
    return true;
  });

  console.log(`[loadChat] Processed messages (deduped):`, deduped);
  return deduped;
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const saveStartTime = Date.now();
  const saveTimestamp = new Date().toISOString();
  
  console.log(`[${saveTimestamp}] [saveChat:START] ========== saveChat STARTED (BATCH UPSERT) ==========`);
  console.log(`[${saveTimestamp}] [saveChat:INPUT] chatId: ${chatId}, messages count: ${messages.length}`);
  console.log(`[${saveTimestamp}] [saveChat:INPUT] message IDs:`, messages.map(m => m.id));

  if (messages.length === 0) {
    console.log(`[${saveTimestamp}] [saveChat:COMPLETE] No messages to save.`);
    return;
  }

  try {
    const messagesToUpsert = messages.map(message => ({
      id: message.id,
      thread_id: chatId,
      role: message.role,
      content: extractTextContent(message),
      parts: message.parts,
    }));

    console.log(`[${saveTimestamp}] [saveChat:BATCH] Upserting ${messagesToUpsert.length} messages in a single call...`);
    const upsertStartTime = Date.now();

    const { error } = await supabase
      .from("messages")
      .upsert(messagesToUpsert, { onConflict: 'id' });

    const upsertDuration = Date.now() - upsertStartTime;

    if (error) {
      console.error(`[${saveTimestamp}] [saveChat:BATCH] Upsert failed after ${upsertDuration}ms:`, error);
      throw error;
    }

    const totalDuration = Date.now() - saveStartTime;
    const finalTimestamp = new Date().toISOString();
    
    console.log(`[${finalTimestamp}] [saveChat:COMPLETE] ========== saveChat COMPLETED ==========`);
    console.log(`[${finalTimestamp}] [saveChat:COMPLETE] Successfully upserted ${messages.length} messages in ${upsertDuration}ms`);
    console.log(`[${finalTimestamp}] [saveChat:COMPLETE] Total duration: ${totalDuration}ms`);

  } catch (error) {
    const totalDuration = Date.now() - saveStartTime;
    const finalTimestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[${finalTimestamp}] [saveChat:ERROR] Failed to save messages after ${totalDuration}ms:`, errorMessage);
    if (error instanceof Error && error.stack) {
      console.error(`[${finalTimestamp}] [saveChat:ERROR] Error stack:`, error.stack);
    }
    throw error;
  }
}


// Tipado básico del registro de la tabla `threads`
type ThreadRow = {
  id: string;
  workspace_id: number;
  chat_user_id: string | null;
  chatbot_id: number | null;
  user_rating: number | null;
  ai_summary: string | null;
  flag: boolean;
  created_at: string;
  updated_at: string;
  taken_by_user_system?: number | null;
};

// Obtener un thread por su ID
export async function getThreadById(id: string): Promise<ThreadRow | null> {
  console.log(`[getThreadById] Fetching thread ${id}`);

  const { data, error } = await supabase
    .from("threads")
    .select(
      "id, workspace_id, chat_user_id, chatbot_id, user_rating, ai_summary, flag, created_at, updated_at, taken_by_user_system"
    )
    .eq("id", id)
    .single();

  if (error) {
    // Si no existe, devolver null; para otros errores, propagar
    if ((error as unknown as { code?: string }).code === "PGRST116") {
      // No rows returned
      return null;
    }
    console.error("[getThreadById] Database error:", error);
    throw new Error(error.message);
  }

  return data as ThreadRow;
}

// Listar threads con filtros comunes (workspace y/o usuario), con paginación
export async function listThreads(params: {
  workspaceId?: number;
  chatUserId?: string;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
} = {}): Promise<ThreadRow[]> {
  const {
    workspaceId,
    chatUserId,
    limit = 50,
    offset = 0,
    order = "desc",
  } = params;

  console.log(
    `[listThreads] Fetching threads (workspaceId=${workspaceId}, chatUserId=${chatUserId}, limit=${limit}, offset=${offset}, order=${order})`
  );

  let query = supabase
    .from("threads")
    .select(
      "id, workspace_id, chat_user_id, chatbot_id, user_rating, ai_summary, flag, created_at, updated_at, taken_by_user_system",
      { count: "exact" }
    )
    .order("created_at", { ascending: order === "asc" })
    .range(offset, Math.max(offset + limit - 1, offset));

  if (typeof workspaceId === "number") {
    query = query.eq("workspace_id", workspaceId);
  }
  if (typeof chatUserId === "string" && chatUserId.length > 0) {
    query = query.eq("chat_user_id", chatUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listThreads] Database error:", error);
    throw new Error(error.message);
  }

  return (data || []) as ThreadRow[];
}


