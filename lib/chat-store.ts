import { type UIMessage } from "ai";
import { supabase } from "../lib/supabase-client";
import { setThreadIdInBrowserCookies, getChatbotConfig } from "../lib/config";

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

  // Guardar el thread_id en cookies del navegador
  setThreadIdInBrowserCookies(data.id);

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

  // Filtrar y desduplicar: solo roles relevantes y texto no vacío
  const relevant = messages.filter((m) => {
    const isRelevantRole = m.role === 'user' || m.role === 'assistant';
    if (!isRelevantRole) return false;
    const text = extractTextContent(m).trim();
    return text.length > 0;
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


