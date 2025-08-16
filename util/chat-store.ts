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

  console.log(`[loadChat] Processed messages:`, messages);
  return messages;
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
  
  // Filtrar solo mensajes nuevos (que no están en la BD)
  const newMessages = messages.filter(msg => 
    !existingMessages.some(existing => 
      existing.id === msg.id
    )
  );
  
  console.log(`[saveChat] New messages to save:`, newMessages.length);

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


