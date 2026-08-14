import "server-only";
import { supabaseServer as supabase } from "./supabase-server";
import {
  normalizeThreadChannel,
  type ChatbotConfig,
  type ChatbotConfigFromThread,
  type RagCollection,
} from "./config";

/**
 * Acceso a datos de configuración que toca la BD directamente. Vive aparte de lib/config.ts
 * porque usa el cliente service_role (server-only) y no debe entrar nunca en el bundle del
 * navegador. lib/config.ts queda con solo helpers puros y fetches al backend, importable
 * desde componentes cliente.
 */

/**
 * Configuración del chatbot a partir del threadId. Usa thread.chatbot_id para consultar
 * chatbot_config directamente, evitando depender del JWT. Devuelve también threads.channel
 * para las instrucciones de formato por canal.
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

/**
 * Colecciones RAG disponibles para un workspace.
 */
export async function getCollectionsByWorkspace(workspaceId: number): Promise<RagCollection[]> {
  try {
    const { data, error } = await supabase
      .from("rag_collections")
      .select("id, name, description, kind")
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
      kind: col.kind === "products" ? "products" : "user",
    }));
  } catch (error) {
    console.error("Error en getCollectionsByWorkspace:", error instanceof Error ? error.message : "unknown");
    return [];
  }
}
