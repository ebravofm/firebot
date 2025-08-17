// ============================================================================
// CONSTANTES DE ENTORNO DEL CLIENTE
// ============================================================================
export const ENV_CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8080',
  NEXT_PUBLIC_SHOW_SIDEBAR: process.env.NEXT_PUBLIC_SHOW_SIDEBAR === 'true' || false,
  NEXT_PUBLIC_SHOW_HEADER: process.env.NEXT_PUBLIC_SHOW_HEADER === 'true' || false,
  NEXT_PUBLIC_SHOW_ATTACH_FILE: process.env.NEXT_PUBLIC_SHOW_ATTACH_FILE === 'true' || false,
  NEXT_PUBLIC_SHOW_EDIT_BUTTON: process.env.NEXT_PUBLIC_SHOW_EDIT_BUTTON === 'true' || false,
  NEXT_PUBLIC_SHOW_ASSISTANT_ACTION_BAR: process.env.NEXT_PUBLIC_SHOW_ASSISTANT_ACTION_BAR === 'true' || false,
  NEXT_PUBLIC_COMPOSER_PLACEHOLDER: process.env.NEXT_PUBLIC_COMPOSER_PLACEHOLDER || 'Send a message...',
  NEXT_PUBLIC_ENABLE_TOOL_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_TOOL_FALLBACK === 'true' || false,
} as const;
