import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, type UIMessage, stepCountIs } from "ai";
import { createRagSearchTool } from "@/lib/agents/tools/rag-search";
import { getChatbotConfig, getChatbotConfigFromThread } from "@/lib/config";

export async function streamReactAgent({ 
  messages, 
  jwtToken,
  chatId 
}: { 
  messages: UIMessage[];
  jwtToken?: string | null;
  chatId?: string;
}) {
  // Crear la herramienta RAG con threadId si está disponible
  const ragSearch = createRagSearchTool({ threadId: chatId });

  // Obtener configuración del chatbot para el system prompt.
  // Prioridad: si hay chatId, usar Supabase directamente (evita JWT/backend en servidor).
  // Fallback: getChatbotConfig con JWT (fetch al backend).
  const chatbotConfig = chatId
    ? await getChatbotConfigFromThread(chatId)
    : await getChatbotConfig(jwtToken);
  const systemPrompt = chatbotConfig?.system_prompt || 
    "Eres un asistente que razona con el patrón ReAct. " +
    "Cuando lo necesites, usa la herramienta 'rag_search' para buscar contexto. " +
    "Incluye y cita brevemente los hallazgos relevantes en tu respuesta final. " +
    "Si no es necesario buscar, responde directamente.";

  return streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    tools: {
      rag_search: ragSearch,
    },
    stopWhen: stepCountIs(10),
    system: systemPrompt,
  });
}


