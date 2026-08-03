import { storage } from './storage';
import { ENV_CONFIG } from './env';
import { supabase } from './supabase-client';

// ============================================================================
// TIPOS
// ============================================================================
export type WidgetAppearance = {
  primary_color: string | null;
  secondary_color: string | null;
  text_color: string | null;
  border_radius: number | null;
  position: string | null;
  widget_size: string | null;
  icon_url: string | null;
  animate_bubble_chatbot: boolean | null;
  enable_font_zoom: boolean | null;
  enable_high_contrast_toggle: boolean | null;
  custom_icon_preserve_original: boolean | null;
};

export type WidgetMessages = {
  header_title: string | null;
  header_subtitle: string | null;
  chat_placeholder: string | null;
  offline_message: string | null;
  banner_text: string | null;
  banner_text_enable: boolean | null;
  loading_message: string | null;
  error_message: string | null;
};

export type ChatbotConfig = {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  primary_language_id: number;
  created_at: string;
  updated_at: string;
  system_prompt: string;
  conversation_tone?: string | null;
  conversation_tone_custom?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
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
  widget_appearance: WidgetAppearance | null;
  widget_messages: WidgetMessages | null;
  show_powered_by?: boolean | null;
};

// ============================================================================
// RESOLUCIÓN DE CONFIG UI (BD preponderante, env fallback)
// ============================================================================
export function resolveUIConfig(config: ChatbotConfig | null) {
  // Usar icon_url de widget_appearance como fallback si assistant_icon_url no está definido
  const iconUrl = config?.assistant_icon_url
    ?? config?.widget_appearance?.icon_url
    ?? ENV_CONFIG.NEXT_PUBLIC_ASSISTANT_ICON_URL
    ?? '';

  const wm = config?.widget_messages;

  return {
    show_sidebar: config?.show_sidebar ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_SIDEBAR,
    show_header: config?.show_header ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_HEADER,
    show_attach_file: config?.show_attach_file ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_ATTACH_FILE,
    show_edit_button: config?.show_edit_button ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_EDIT_BUTTON,
    show_assistant_action_bar: config?.show_assistant_action_bar ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_ASSISTANT_ACTION_BAR,
    composer_placeholder: wm?.chat_placeholder ?? config?.composer_placeholder ?? ENV_CONFIG.NEXT_PUBLIC_COMPOSER_PLACEHOLDER,
    enable_tool_fallback: config?.enable_tool_fallback ?? ENV_CONFIG.NEXT_PUBLIC_ENABLE_TOOL_FALLBACK,
    show_rag_results: config?.show_rag_results ?? ENV_CONFIG.NEXT_PUBLIC_SHOW_RAG_RESULTS,
    assistant_icon_url: iconUrl,
    // Widget appearance properties
    widget_appearance: config?.widget_appearance ?? null,
    show_powered_by: config?.show_powered_by !== false,
    // Widget messages properties
    header_title: wm?.header_title ?? 'Asistente Virtual',
    header_subtitle: wm?.header_subtitle ?? '',
    banner_text: wm?.banner_text ?? '',
    banner_text_enable: wm?.banner_text_enable ?? false,
    loading_message: wm?.loading_message ?? 'Pensando...',
    loading_message_enable: Boolean((wm?.loading_message ?? '').trim()),
    error_message: wm?.error_message ?? 'Error al procesar tu mensaje',
    show_reset_button: true,
  };
}

export async function fetchWidgetBehavior(workspaceId: number): Promise<{ show_reset_button: boolean }> {
  try {
    const { data } = await supabase
      .from('widget_behavior')
      .select('show_reset_button')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    return {
      show_reset_button: data?.show_reset_button !== false,
    };
  } catch {
    return { show_reset_button: true };
  }
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
    const raw =
      typeof token === 'string'
        ? token.trim().replace(/^Bearer\s+/i, '')
        : ''
    if (!raw || raw === 'null' || raw === 'undefined') {
      return null
    }
    // Un JWT tiene la estructura: header.payload.signature
    const parts = raw.split('.')
    if (parts.length !== 3) {
      console.error(
        'decodeJWT: el token no tiene 3 segmentos (¿JWT truncado, vacío o no es widget?). Longitud:',
        raw.length,
      )
      return null
    }
    
    // Decodificar la parte del payload (base64url)
    const payload = parts[1]
    // Convertir base64url a base64 estándar
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Agregar padding si es necesario
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    // Decodificar y parsear JSON
    const decoded = JSON.parse(atob(padded));
    return decoded;
  } catch (error) {
    console.error('Error decodificando JWT:', error)
    return null
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
  
  const chatbotId = payload.chatbot_id
  console.log('Chatbot ID extraído del JWT:', chatbotId)
  return chatbotId != null && String(chatbotId) !== '' ? String(chatbotId) : null
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

export type ThreadChannel = "widget" | "whatsapp";

export type ChatbotConfigFromThread = {
  config: ChatbotConfig | null;
  channel: ThreadChannel;
};

function normalizeThreadChannel(value: unknown): ThreadChannel {
  return value === "whatsapp" ? "whatsapp" : "widget";
}

/**
 * Obtiene la configuración del chatbot desde Supabase usando el threadId.
 * Usa thread.chatbot_id para consultar chatbot_config directamente.
 * Esta ruta evita la dependencia del JWT y del backend HTTP en el servidor.
 * También devuelve threads.channel para instrucciones de formato por canal.
 */
export async function getChatbotConfigFromThread(
  threadId: string,
): Promise<ChatbotConfigFromThread> {
  const empty: ChatbotConfigFromThread = { config: null, channel: "widget" };

  try {
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("workspace_id, chatbot_id, channel")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      console.error("getChatbotConfigFromThread: error obteniendo thread:", threadError);
      return empty;
    }

    const channel = normalizeThreadChannel(thread.channel);

    if (!thread.chatbot_id) {
      console.error("getChatbotConfigFromThread: thread sin chatbot_id");
      return { config: null, channel };
    }

    const { data: config, error: configError } = await supabase
      .from("chatbot_config")
      .select("id, workspace_id, description, primary_language_id, created_at, updated_at, system_prompt, conversation_tone, conversation_tone_custom, contact_phone, contact_email, welcome_message, initial_message, welcome_suggestions, rag_collections, show_sidebar, show_header, show_attach_file, show_edit_button, show_assistant_action_bar, composer_placeholder, enable_tool_fallback, show_rag_results, assistant_icon_url, openai_model, widget_token")
      .eq("id", thread.chatbot_id)
      .single();

    if (configError || !config) {
      console.error("getChatbotConfigFromThread: error obteniendo chatbot_config:", configError);
      return { config: null, channel };
    }

    // Fetch widget_appearance and widget_messages by workspace_id
    const [{ data: wa }, { data: wm }] = await Promise.all([
      supabase
        .from("widget_appearance")
        .select("primary_color, secondary_color, text_color, border_radius, position, widget_size, icon_url, animate_bubble_chatbot, enable_font_zoom, enable_high_contrast_toggle, custom_icon_preserve_original")
        .eq("workspace_id", thread.workspace_id)
        .maybeSingle(),
      supabase
        .from("widget_messages")
        .select("header_title, header_subtitle, chat_placeholder, offline_message, banner_text, banner_text_enable, loading_message, error_message")
        .eq("workspace_id", thread.workspace_id)
        .maybeSingle(),
    ]);

    const result: ChatbotConfig = {
      id: config.id,
      workspace_id: config.workspace_id,
      name: "",
      description: config.description ?? "",
      primary_language_id: config.primary_language_id,
      created_at: config.created_at ?? "",
      updated_at: config.updated_at ?? "",
      system_prompt: config.system_prompt ?? "",
      conversation_tone: config.conversation_tone ?? "neutral",
      conversation_tone_custom: config.conversation_tone_custom ?? null,
      contact_phone: config.contact_phone ?? null,
      contact_email: config.contact_email ?? null,
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
      widget_appearance: wa ?? null,
      widget_messages: wm ?? null,
    };

    console.log("getChatbotConfigFromThread: configuración obtenida desde Supabase");
    return { config: result, channel };
  } catch (error) {
    console.error("getChatbotConfigFromThread: error:", error instanceof Error ? error.message : "unknown");
    return empty;
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
        // Usar window.location.origin para indicar desde qué dominio se carga el widget.
        // document.referrer indica la página anterior, no el sitio actual donde está incrustado.
        ...(typeof window !== 'undefined' && window.location?.origin
          ? { "X-Embedding-Origin": window.location.origin }
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
