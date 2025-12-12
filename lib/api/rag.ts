import { ENV_CONFIG } from "@/lib/env";
import { getChatbotConfig } from "@/lib/config";
import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase-client";

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
  threadId?: string; // Nuevo parámetro opcional
}

/**
 * Obtiene workspace_id y rag_collections desde Supabase usando thread_id
 */
async function getWorkspaceAndCollectionsFromThread(
  threadId: string
): Promise<{ workspace_id: number; rag_collections: number[] } | null> {
  try {
    // Obtener el thread con su chatbot_id
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("workspace_id, chatbot_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      console.error("Error obteniendo thread:", threadError);
      return null;
    }

    // Si no hay chatbot_id, usar solo workspace_id (sin collections)
    if (!thread.chatbot_id) {
      return {
        workspace_id: thread.workspace_id,
        rag_collections: [],
      };
    }

    // Obtener la configuración del chatbot para obtener rag_collections
    const { data: chatbotConfig, error: configError } = await supabase
      .from("chatbot_config")
      .select("workspace_id, rag_collections")
      .eq("id", thread.chatbot_id)
      .single();

    if (configError || !chatbotConfig) {
      console.error("Error obteniendo chatbot_config:", configError);
      // Fallback: usar workspace_id del thread sin collections
      return {
        workspace_id: thread.workspace_id,
        rag_collections: [],
      };
    }

    return {
      workspace_id: chatbotConfig.workspace_id,
      rag_collections: chatbotConfig.rag_collections || [],
    };
  } catch (error) {
    console.error("Error en getWorkspaceAndCollectionsFromThread:", error);
    return null;
  }
}

export async function searchRAG(
  params: RAGSearchParams
): Promise<RAGSearchResponse> {
  if (!ENV_CONFIG.BACKEND_URL) {
    throw new Error("BACKEND_URL no está definido");
  }

  let workspace_id: number;
  let collection_ids: number[];
  let authToken: string | null = null;

  // Si se proporciona threadId, usar Supabase directamente
  if (params.threadId) {
    const config = await getWorkspaceAndCollectionsFromThread(params.threadId);
    if (!config) {
      throw new Error("No se pudo obtener la configuración desde el thread");
    }
    workspace_id = config.workspace_id;
    collection_ids = config.rag_collections;
  } else {
    // Fallback: usar JWT (solo funciona en cliente)
    authToken = typeof window !== 'undefined' ? storage.getJWT() : null;
    if (!authToken) {
      throw new Error("JWT no encontrado en localStorage y no se proporcionó threadId");
    }

    // Obtener configuración del chatbot para workspace_id y collection_ids
    const chatbotConfig = await getChatbotConfig(authToken);
    
    if (!chatbotConfig) {
      throw new Error("No se pudo obtener la configuración del chatbot");
    }

    workspace_id = chatbotConfig.workspace_id;
    collection_ids = chatbotConfig.rag_collections;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  let url: string;
  let body: Record<string, unknown>;

  // Si tenemos threadId, usar el endpoint público sin JWT
  if (params.threadId) {
    url = `${ENV_CONFIG.BACKEND_URL}/rag/search/thread`;
    body = {
      thread_id: params.threadId,
      query: params.query,
      top_k: params.top_k || 5,
      similarity_threshold: params.similarity_threshold || 0,
      response_format: params.response_format || "minimal",
    };
  } else {
    // Usar endpoint con JWT (fallback)
    url = `${ENV_CONFIG.BACKEND_URL}/rag/search`;
    body = {
      top_k: 5,
      similarity_threshold: 0,
      response_format: "minimal",
      ...params,
      workspace_id,
      collection_ids,
    };
    // Remover threadId del body
    delete (body as { threadId?: string }).threadId;
    
    // Agregar Authorization si tenemos token
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Error ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as RAGSearchResponse;
  return data;
}


