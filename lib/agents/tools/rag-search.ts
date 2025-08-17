import { tool } from "ai";
import { z } from "zod";
import { searchRAG, DEFAULT_WORKSPACE_ID, DEFAULT_COLLECTION_IDS } from "@/lib/api/rag";

export function createRagSearchTool({ maxResults = 3 }: { maxResults?: number } = {}) {
  return tool({
    description:
      "Search relevant documents via RAG. Returns a plain-text list with title, content, and similarity.",
    inputSchema: z.object({ query: z.string().min(1, "query required") }),
    execute: async ({ query }: { query: string }) => {
      try {
        const response = await searchRAG({
          query,
          top_k: maxResults,
          workspace_id: DEFAULT_WORKSPACE_ID,
          collection_ids: DEFAULT_COLLECTION_IDS,
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


