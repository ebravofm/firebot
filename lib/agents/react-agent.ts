import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, type UIMessage, stepCountIs } from "ai";
import { createRagSearchTool } from "@/lib/agents/tools/rag-search";
import { defaultRagSearchConfig } from "@/lib/agents/tools/rag-search-config";

export function streamReactAgent({ messages }: { messages: UIMessage[] }) {
  const ragSearch = createRagSearchTool(defaultRagSearchConfig);

  return streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    tools: {
      rag_search: ragSearch,
    },
    stopWhen: stepCountIs(10),
    system:
      "Eres un asistente que razona con el patrón ReAct. " +
      "Cuando lo necesites, usa la herramienta 'rag_search' para buscar contexto. " +
      "Incluye y cita brevemente los hallazgos relevantes en tu respuesta final. " +
      "Si no es necesario buscar, responde directamente.",
  });
}


