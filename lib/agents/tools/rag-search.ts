import { tool } from "ai";
import { z } from "zod";
import { searchRAG } from "@/lib/api/rag";

export function createRagSearchTool({ 
  maxResults = 3,
  threadId 
}: { 
  maxResults?: number;
  threadId?: string;
} = {}) {
  return tool({
    description:
      "Search relevant documents via RAG. Returns a plain-text list with title, content, and similarity. Optionally specify collection_ids to search in specific collections.",
    inputSchema: z.object({ 
      query: z.string().min(1, "query required"),
      collection_ids: z.array(z.number()).optional()
    }),
    execute: async ({ query, collection_ids }: { query: string; collection_ids?: number[] }) => {
      try {
        const response = await searchRAG({
          query,
          top_k: maxResults,
          threadId, // Pasar threadId si está disponible
          collection_ids, // Pasar collection_ids si se proporciona
        });

        const results = response.data || [];

        if (results.length === 0) {
          return `Search results for: "${query}"\n\nNo results found.`;
        }

        const lines: string[] = [];
        lines.push(`Search results for: "${query}"`);
        lines.push("");

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const similarity = typeof r.similarity === "number" ? r.similarity.toFixed(2) : String(r.similarity);
          lines.push(`${i + 1}. ${r.title} (similarity: ${similarity})`);
          lines.push(`   ${r.content}`);
          if (i < results.length - 1) {
            lines.push("");
          }
        }

        return lines.join("\n");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `RAG search failed: ${message}`;
      }
    },
  });
}


