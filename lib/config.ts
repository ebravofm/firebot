import { storage } from './storage';
import { ENV_CONFIG } from './env';
import { supabase } from './supabase-client';

// ============================================================================
// TIPOS
// ============================================================================
export type ChatbotConfig = {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  primary_language_id: number;
  created_at: string;
  updated_at: string;
  system_prompt: string;
  welcome_message: string;
  initial_message: string;
  welcome_suggestions: Array<{
    label: string;
    title: string;
    action: string;
  }>;
  rag_collections: number[];
  // UI del widget (null/undefined = fallback a env)
  show_sidebar?: boolean | null;
  show_header?: boolean | null;
  show_attach_file?: boolean | null;
  show_edit_button?: boolean | null;
  show_assistant_action_bar?: boolean | null;
  composer_placeholder?: string | null;
  enable_tool_fallback?: boolean | null;
  show_rag_results?: boolean | null;
  assistant_icon_url?: string | null;
  openai_model?: string | null;
};

// ============================================================================
// RESOLUCIÓN DE CONFIG UI (BD preponderante, env fallback)
// ============================================================================
export function resolveUIConfig(config: ChatbotConfig | null) {
  return {
    show_sidebar: config?.show_sidebar ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_SIDEBAR,
    show_header: config?.show_header ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_HEADER,
    show_attach_file: config?.show_attach_file ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_ATTACH_FILE,
    show_edit_button: config?.show_edit_button ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_EDIT_BUTTON,
    show_assistant_action_bar: config?.show_assistant_action_bar ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_ASSISTANT_ACTION_BAR,
    composer_placeholder: config?.composer_placeholder ?? ENV_CONFIG.NEXT_PUBLIC_COMPOSER_PLACEHOLDER,
    enable_tool_fallback: config?.enable_tool_fallback ?? ENV_CONFIG.NEXT_PUBLIC_ENABLE_TOOL_FALLBACK,
    show_rag_results: config?.show_rag_results ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_RAG_RESULTS,
    assistant_icon_url: config?.assistant_icon_url ?? ENV_CONFIG.NEXT_PUBLIC_ASSISTANT_ICON_URL ?? '',
  };
}

export type ResolvedUIConfig = ReturnType<typeof resolveUIConfig>;

export type JWTPayload = {
  chatbot_id: number;
  [key: string]: unknown;
};

// ============================================================================
// FUNCIONES DE JWT
// ============================================================================
/**
 * Decodifica un JWT y extrae el payload.
 * Esta función es universal (cliente/servidor).
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    // Un JWT tiene la estructura: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT inválido');
    }
    
    // Decodificar la parte del payload (base64url)
    const payload = parts[1];
    // Convertir base64url a base64 estándar
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Agregar padding si es necesario
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    // Decodificar y parsear JSON
    const decoded = JSON.parse(atob(padded));
    return decoded;
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
}

function getChatbotIdFromJWT(jwtToken: string): string | null {
  if (!jwtToken) {
    console.log('getChatbotIdFromJWT: no JWT token provided');
    return null;
  }
  
  const payload = decodeJWT(jwtToken);
  if (!payload) {
    console.log('getChatbotIdFromJWT: failed to decode JWT');
    return null;
  }
  
  const chatbotId = payload.chatbot_id;
  console.log('Chatbot ID extraído del JWT:', chatbotId);
  return chatbotId ? chatbotId.toString() : null;
}

// ============================================================================
// SISTEMA DE CACHÉ
// ============================================================================
let configCache: ChatbotConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN DEL CHATBOT
// ============================================================================

/**
 * Obtiene la configuración del chatbot desde Supabase usando el threadId.
 * Usa thread.chatbot_id para consultar chatbot_config directamente.
 * Esta ruta evita la dependencia del JWT y del backend HTTP en el servidor.
 */
export async function getChatbotConfigFromThread(threadId: string): Promise<ChatbotConfig | null> {
  try {
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("workspace_id, chatbot_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      console.error("getChatbotConfigFromThread: error obteniendo thread:", threadError);
      return null;
    }

    if (!thread.chatbot_id) {
      console.error("getChatbotConfigFromThread: thread sin chatbot_id");
      return null;
    }

    const { data: config, error: configError } = await supabase
      .from("chatbot_config")
      .select("id, workspace_id, name, description, primary_language_id, created_at, updated_at, system_prompt, welcome_message, initial_message, welcome_suggestions, rag_collections, show_sidebar, show_header, show_attach_file, show_edit_button, show_assistant_action_bar, composer_placeholder, enable_tool_fallback, show_rag_results, assistant_icon_url, openai_model")
      .eq("id", thread.chatbot_id)
      .single();

    if (configError || !config) {
      console.error("getChatbotConfigFromThread: error obteniendo chatbot_config:", configError);
      return null;
    }

    const result: ChatbotConfig = {
      id: config.id,
      workspace_id: config.workspace_id,
      name: config.name ?? "",
      description: config.description ?? "",
      primary_language_id: config.primary_language_id,
      created_at: config.created_at ?? "",
      updated_at: config.updated_at ?? "",
      system_prompt: config.system_prompt ?? "",
      welcome_message: config.welcome_message ?? "",
      initial_message: config.initial_message ?? "",
      welcome_suggestions: Array.isArray(config.welcome_suggestions) ? config.welcome_suggestions : [],
      rag_collections: config.rag_collections ?? [],
      show_sidebar: config.show_sidebar ?? undefined,
      show_header: config.show_header ?? undefined,
      show_attach_file: config.show_attach_file ?? undefined,
      show_edit_button: config.show_edit_button ?? undefined,
      show_assistant_action_bar: config.show_assistant_action_bar ?? undefined,
      composer_placeholder: config.composer_placeholder ?? undefined,
      enable_tool_fallback: config.enable_tool_fallback ?? undefined,
      show_rag_results: config.show_rag_results ?? undefined,
      assistant_icon_url: config.assistant_icon_url ?? undefined,
      openai_model: config.openai_model ?? undefined,
    };

    console.log("getChatbotConfigFromThread: configuración obtenida desde Supabase");
    return result;
  } catch (error) {
    console.error("getChatbotConfigFromThread: error:", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export async function getChatbotConfig(jwtToken?: string | null): Promise<ChatbotConfig | null> {
  try {
    // Verificar caché
    const now = Date.now();
    if (configCache && now - lastFetchTime < CACHE_TTL) {
      console.log('getChatbotConfig: usando caché');
      return configCache;
    }

    // El token debe ser provisto explícitamente o se obtiene de localStorage en el cliente.
    // Si jwtToken es null/undefined, la llamada a storage.getJWT() solo funcionará
    // en un entorno de cliente.
    const token = jwtToken ?? (typeof window !== 'undefined' ? storage.getJWT() : null);
    
    if (!token) {
      console.error('❌ getChatbotConfig: No JWT token found');
      return null;
    }

    const chatbotId = getChatbotIdFromJWT(token);
    
    if (!chatbotId) {
      console.error('❌ getChatbotConfig: No se pudo extraer chatbot_id del JWT - token inválido');
      return null;
    }

    const url = `${ENV_CONFIG.BACKEND_URL}/chatbot-config/${chatbotId}`;
    console.log('getChatbotConfig: llamando a:', url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(typeof document !== 'undefined' && document.referrer
          ? { "X-Embedding-Origin": document.referrer }
          : {}),
      },
    });

    if (!response.ok) {
      console.log('getChatbotConfig: error HTTP:', response.status, response.statusText);
      return null;
    }

    const data: ChatbotConfig = await response.json();
    
    configCache = data;
    lastFetchTime = now;
    
    console.log('getChatbotConfig: configuración obtenida exitosamente');
    return data;
  } catch (error) {
    console.log('getChatbotConfig: error:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

export function clearChatbotConfigCache(): void {
  configCache = null;
  lastFetchTime = 0;
}

// ============================================================================
// FUNCIONES DE COLECCIONES RAG
// ============================================================================

export interface RagCollection {
  id: number;
  name: string;
  description?: string;
}

/**
 * Obtiene las colecciones RAG disponibles para un workspace desde Supabase
 */
export async function getCollectionsByWorkspace(workspaceId: number): Promise<RagCollection[]> {
  try {
    const { data, error } = await supabase
      .from("rag_collections")
      .select("id, name, description")
      .eq("workspace_id", workspaceId)
      .order("name");

    if (error) {
      console.error("Error obteniendo colecciones:", error);
      return [];
    }

    return (data || []).map((col) => ({
      id: col.id,
      name: col.name ?? "",
      description: col.description ?? undefined,
    }));
  } catch (error) {
    console.error("Error en getCollectionsByWorkspace:", error instanceof Error ? error.message : "unknown");
    return [];
  }
}
