import { type UIMessage } from "ai";
import { supabase } from "../lib/supabase-client";
import { setThreadIdInStorage, getChatbotConfig } from "../lib/config";

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

export async function createChat(): Promise<string> {
  // Obtener la configuración del chatbot para obtener el workspace_id
  const chatbotConfig = await getChatbotConfig();
  
  if (!chatbotConfig) {
    throw new Error("No se pudo obtener la configuración del chatbot");
  }

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

  // Guardar el thread_id en localStorage del navegador
  setThreadIdInStorage(data.id);

  return data.id;
}

export async function loadChat(id: string): Promise<UIMessage[]> {
  console.log(`[loadChat] Attempting to load chat with ID: ${id}`);
  
  // Determinar si el thread está tomado por humano
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, taken_by_user_system")
    .eq("id", id)
    .single();

  if (threadError) {
    console.error("[loadChat] Error fetching thread:", threadError);
    throw new Error(threadError.message);
  }

  const isTakenByHuman = thread?.taken_by_user_system != null;
  
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

  const isAIProvider = (parts: unknown[]): boolean => {
    if (!Array.isArray(parts)) return false;
    return parts.some((p: unknown) => {
      if (!p || typeof p !== 'object') return false;
      const obj = p as { providerMetadata?: { openai?: unknown }; type?: string };
      return !!(obj.providerMetadata && 'openai' in obj.providerMetadata) || obj.type === 'step-start';
    });
  };

  // Filtrar coherentemente según quién responde
  const relevant = messages.filter((m) => {
    const isRelevantRole = m.role === 'user' || m.role === 'assistant';
    if (!isRelevantRole) return false;
    const text = extractTextContent(m).trim();
    if (text.length === 0) return false;

    // Si está tomado por humano, solo mostrar mensajes del humano (assistant con metadata human)
    if (isTakenByHuman) {
      if (m.role === 'assistant') {
        return isHumanProvider(m.parts as unknown[]);
      }
      return true; // Los mensajes de usuario siempre se muestran
    }

    // Si responde IA, solo mostrar assistant con metadata IA
    if (m.role === 'assistant') {
      return isAIProvider(m.parts as unknown[]);
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
  console.log(`[saveChat] Attempting to save ${messages.length} messages one by one for chatId: ${chatId}`);
  
  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{id: string, error: string}>
  };

  for (const message of messages) {
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("id", message.id)
        .single();

      if (existing) {
        results.skipped++;
        console.log(`[saveChat] Message ${message.id} already exists, skipping`);
        continue;
      }

      // Insertar mensaje individual
      const { error } = await supabase
        .from("messages")
        .insert({
          id: message.id,
          thread_id: chatId,
          role: message.role,
          content: extractTextContent(message),
          parts: message.parts,
        });

      if (error) {
        throw error;
      }

      results.successful++;
      console.log(`[saveChat] Successfully saved message ${message.id}`);
      
    } catch (error) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push({
        id: message.id,
        error: errorMessage
      });
      console.error(`[saveChat] Failed to save message ${message.id}:`, errorMessage);
    }
  }

  // Log final
  console.log(`[saveChat] Completed: ${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed`);
  if (results.errors.length > 0) {
    console.warn(`[saveChat] Errors:`, results.errors);
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


