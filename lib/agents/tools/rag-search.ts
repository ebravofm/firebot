import { tool } from "ai";
import { z } from "zod";
import { searchRAG } from "@/lib/api/rag";
import { getCollectionsByWorkspace } from "@/lib/config";

export function createRagSearchTool({ 
  maxResults = 10,
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
        const collectionIds = response.collection_ids || [];

        // Obtener nombres de las colecciones si hay workspace_id
        let collectionsInfo = "";
        if (collectionIds.length > 0 && response.workspace_id) {
          try {
            const collections = await getCollectionsByWorkspace(response.workspace_id);
            const searchedCollections = collections.filter(col => collectionIds.includes(col.id));
            if (searchedCollections.length > 0) {
              const collectionNames = searchedCollections.map(col => col.name).join(", ");
              collectionsInfo = `\nColecciones buscadas: ${collectionNames}`;
            }
          } catch (error) {
            // Si falla obtener los nombres, solo mostrar los IDs
            collectionsInfo = `\nColecciones buscadas: ${collectionIds.join(", ")}`;
          }
        }

        if (results.length === 0) {
          return `Search results for: "${query}"${collectionsInfo}\n\nNo results found.`;
        }

        const lines: string[] = [];
        lines.push(`Search results for: "${query}"${collectionsInfo}`);
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


