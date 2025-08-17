import { generateId, type UIMessage } from "ai";
import { supabase } from "../lib/supabase-client";
import { setThreadIdInBrowserCookies } from "../lib/config";

interface DatabaseMessage {
  id: string;
  role: string;
  content: any;
  parts: any[];
}

// Función helper para extraer el contenido de texto de un UIMessage
function extractTextContent(message: UIMessage): string {
  const textParts = message.parts.filter(part => part.type === 'text');
  return textParts.map(part => (part as any).text).join(' ');
}

function normalizeMessageSignature(message: UIMessage): string {
  const role = message.role ?? "";
  const text = extractTextContent(message).trim();
  return `${role}|${text}`;
}

export async function createChat(): Promise<string> {
  const { data, error } = await supabase
    .from("threads")
    .insert({})
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
  console.log(`[saveChat] Attempting to save chat with ID: ${chatId}`);
  console.log(`[saveChat] Total messages received:`, messages.length);
  
  // Obtener mensajes existentes para evitar duplicados
  const existingMessages = await loadChat(chatId);
  console.log(`[saveChat] Existing messages in DB:`, existingMessages.length);

  // Construir firmas normalizadas de los mensajes existentes (por rol + texto)
  const existingSignatures = new Set(
    existingMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(normalizeMessageSignature)
  );

  // 1) Deduplicar por id dentro del lote recibido
  const seenIds = new Set<string>();
  const uniqueById = messages.filter((m) => {
    if (!m.id) return true;
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  // 2) Filtrar solo mensajes relevantes (user/assistant) y con texto no vacío
  const relevant = uniqueById.filter((m) => {
    const isRelevantRole = m.role === 'user' || m.role === 'assistant';
    if (!isRelevantRole) return false;
    const text = extractTextContent(m).trim();
    return text.length > 0;
  });

  // 3) Deduplicar dentro del mismo lote por firma (rol + texto)
  const seenSignaturesInBatch = new Set<string>();
  const uniqueInBatch = relevant.filter((m) => {
    const signature = normalizeMessageSignature(m);
    if (seenSignaturesInBatch.has(signature)) return false;
    seenSignaturesInBatch.add(signature);
    return true;
  });

  // 4) Excluir los que ya existen en la BD por firma (evita duplicados por steps/herramientas)
  const newMessages = uniqueInBatch.filter((m) => !existingSignatures.has(normalizeMessageSignature(m)));

  console.log(`[saveChat] New messages to save after filtering:`, newMessages.length);

  if (newMessages.length === 0) {
    console.log(`[saveChat] No new messages to save`);
    return;
  }

  // Preparar mensajes para insertar en la BD
  const messagesToInsert = newMessages.map(msg => ({
    thread_id: chatId,
    role: msg.role,
    content: extractTextContent(msg), // Extraer contenido de texto para búsquedas
    parts: msg.parts, // Guardar las partes completas del mensaje
  }));

  console.log(`[saveChat] Inserting messages:`, messagesToInsert);

  const { error } = await supabase.from("messages").insert(messagesToInsert);

  if (error) {
    console.error("[saveChat] Database error:", error);
    throw new Error(error.message);
  }

  console.log(`[saveChat] Successfully saved ${messagesToInsert.length} new messages`);
}


