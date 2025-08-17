import { BACKEND_URL } from "@/lib/config";

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
  workspace_id: number;
  collection_ids: number[];
  query: string;
  top_k?: number;
  similarity_threshold?: number;
  response_format?: string;
}

export async function searchRAG(
  params: RAGSearchParams,
  authToken: string
): Promise<RAGSearchResponse> {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL no está definido");
  }
  if (!authToken) {
    throw new Error("authToken es requerido");
  }

  const body = {
    top_k: 5,
    similarity_threshold: 0,
    response_format: "minimal",
    ...params,
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


