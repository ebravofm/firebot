// ============================================================================
// CONSTANTES DE ENTORNO DEL CLIENTE
// ============================================================================
// BACKEND_URL y WIDGET_URL: NEXT_PUBLIC_* se inlinan en el cliente (build); sin prefijo solo en servidor.
export const ENV_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8080',
  WIDGET_URL: process.env.NEXT_PUBLIC_WIDGET_URL || process.env.WIDGET_URL || 'http://localhost:3001',
  NEXT_PUBLIC_SHOW_SIDEBAR: process.env.NEXT_PUBLIC_SHOW_SIDEBAR === 'true' || false,
  NEXT_PUBLIC_SHOW_HEADER: process.env.NEXT_PUBLIC_SHOW_HEADER === 'true' || false,
  NEXT_PUBLIC_SHOW_ATTACH_FILE: process.env.NEXT_PUBLIC_SHOW_ATTACH_FILE === 'true' || false,
  NEXT_PUBLIC_SHOW_EDIT_BUTTON: process.env.NEXT_PUBLIC_SHOW_EDIT_BUTTON === 'true' || false,
  NEXT_PUBLIC_SHOW_ASSISTANT_ACTION_BAR: process.env.NEXT_PUBLIC_SHOW_ASSISTANT_ACTION_BAR === 'true' || false,
  NEXT_PUBLIC_COMPOSER_PLACEHOLDER: process.env.NEXT_PUBLIC_COMPOSER_PLACEHOLDER || 'Send a message...',
  NEXT_PUBLIC_ENABLE_TOOL_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_TOOL_FALLBACK === 'true' || false,
  NEXT_PUBLIC_SHOW_RAG_RESULTS: process.env.NEXT_PUBLIC_SHOW_RAG_RESULTS === 'true' || false,
  NEXT_PUBLIC_ASSISTANT_ICON_URL: process.env.NEXT_PUBLIC_ASSISTANT_ICON_URL || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
  // Langfuse configuration
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY || '',
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY || '',
  LANGFUSE_HOST: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
} as const;
