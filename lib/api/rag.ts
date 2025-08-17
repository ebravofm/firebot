import { BACKEND_URL, getChatbotConfig, getTokenFromCookies } from "@/lib/config";

export interface RAGSearchResult {
  title: string;
  similarity: number;
  content: string;
}

export interface RAGSearchResponse {
  success: boolean;
  data: RAGSearchResult[];
  total: number;
  query: string;
  workspace_id: number;
  collection_ids: number[];
  response_format: string;
}

export interface RAGSearchParams {
  query: string;
  top_k?: number;
  similarity_threshold?: number;
  response_format?: string;
}

export async function searchRAG(
  params: RAGSearchParams
): Promise<RAGSearchResponse> {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL no está definido");
  }
  
  const authToken = await getTokenFromCookies();
  if (!authToken) {
    throw new Error("JWT no encontrado en las cookies");
  }

  // Obtener configuración del chatbot para workspace_id y collection_ids
  const chatbotConfig = await getChatbotConfig();
  
  if (!chatbotConfig) {
    throw new Error("No se pudo obtener la configuración del chatbot");
  }

  const body = {
    top_k: 5,
    similarity_threshold: 0,
    response_format: "minimal",
    ...params,
    workspace_id: chatbotConfig.workspace_id,
    collection_ids: chatbotConfig.rag_collections,
  };

  const response = await fetch(`${BACKEND_URL}/rag/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Error ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as RAGSearchResponse;
  return data;
}


