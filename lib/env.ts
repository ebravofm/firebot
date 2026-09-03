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
  // Langfuse NO se configura desde aquí. El SDK lee sus propias variables del entorno
  // (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY y LANGFUSE_BASE_URL) al arrancar, en
  // instrumentation.ts. Antes había tres constantes aquí que nadie leía, y una de ellas
  // nombraba LANGFUSE_HOST: quien la viera pondría esa variable en Railway y no pasaría nada,
  // porque el SDK v4 usa LANGFUSE_BASE_URL.
  /** Token compartido con scrivot-backend para POST /api/chat/respond (WhatsApp 3b) */
  FIREBOT_INTERNAL_TOKEN: process.env.FIREBOT_INTERNAL_TOKEN || '',
  /** Log warning si generateText supera este umbral (ms) */
  CHAT_RESPOND_SLOW_WARN_MS: Number(process.env.CHAT_RESPOND_SLOW_WARN_MS) || 15_000,
  /** Log crítico antes del timeout de la ruta (maxDuration 60s) */
  CHAT_RESPOND_CRITICAL_MS: Number(process.env.CHAT_RESPOND_CRITICAL_MS) || 45_000,
} as const;
