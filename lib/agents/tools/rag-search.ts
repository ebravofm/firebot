import { tool } from "ai";
import { z } from "zod";


export interface RagSearchConfig {
  maxResults: number;
}

export const defaultRagSearchConfig: RagSearchConfig = {
  maxResults: 3,
};

export function createRagSearchTool(config: RagSearchConfig) {
  return tool({
    description:
      "Busca documentos relevantes mediante RAG. Devuelve resultados con título, contenido y similaridad.",
    inputSchema: z.object({ query: z.string().min(1, "query requerida") }),
    // Hardcodeamos resultados de ejemplo por ahora
    execute: async ({ query }: { query: string }) => {
      const results = [
        {
          titulo: "Documento 1",
          contenido: "Contenido simulado relacionado con: " + query,
          similaridad: 0.91,
        },
        {
          titulo: "Documento 2",
          contenido: "Otro contenido simulado sobre: " + query,
          similaridad: 0.84,
        },
        {
          titulo: "Documento 3",
          contenido: "Más contenido simulado referente a: " + query,
          similaridad: 0.77,
        },
      ].slice(0, config.maxResults);

      // Devolvemos una estructura simple como texto
      const formatted = results
        .map((r, idx) => {
          return (
            `documento ${idx + 1}:\n` +
            `titulo: ${r.titulo}\n` +
            `contenido: ${r.contenido}\n` +
            `similaridad: ${r.similaridad}`
          );
        })
        .join("\n\n");

      return formatted;
    },
  });
}


