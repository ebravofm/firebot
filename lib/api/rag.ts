import { BACKEND_URL, getJWTFromBrowserCookies } from "@/lib/config";

// Constantes hardcodeadas para RAG
export const DEFAULT_WORKSPACE_ID = 1;
export const DEFAULT_COLLECTION_IDS = [1];

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
  params: RAGSearchParams
): Promise<RAGSearchResponse> {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL no está definido");
  }
  
  const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsInVzZXJfaWQiOjIsImlkIjoyLCJlbWFpbCI6ImVicmF2b0BkYXRhcHVsc2UuY2wiLCJ3b3Jrc3BhY2VfaWQiOjEsInJvbGVfaWQiOjIsInR5cGUiOiJwZXJtYW5lbnQiLCJpYXQiOjE3NTUyMTY3OTB9.DNj6RYUiCwdAOupYla786iTSPMuvOZIpM-LetcMtuzk"
  if (!authToken) {
    throw new Error("JWT no encontrado en las cookies");
  }

  const body = {
    top_k: 5,
    similarity_threshold: 0,
    response_format: "minimal",
    ...params,
    workspace_id: DEFAULT_WORKSPACE_ID,
    collection_ids: DEFAULT_COLLECTION_IDS,
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


