import type { ThreadChannel } from "@/lib/config";

const WIDGET_FORMATTING = `Usa markdown GFM en tus respuestas (el cliente lo renderiza):
- Negrita: **texto**
- Cursiva: *texto*
- Listas con - o 1.
- Enlaces: [texto](https://url)
- Código inline con backticks cuando ayude
No uses HTML.`;

const WHATSAPP_FORMATTING = `Esta conversación es por WhatsApp. Usa SOLO el formato nativo de WhatsApp:
- Negrita: *texto* (un solo asterisco a cada lado; NUNCA uses **texto**)
- Cursiva: _texto_
- Tachado: ~texto~
- Monospace: \`\`\`texto\`\`\`
- Listas con - o 1.
- URLs en texto plano (WhatsApp las convierte en enlaces)
Prohibido: markdown GFM (**negrita**, headings con #, tablas, HTML, enlaces [texto](url)).`;

const INSTAGRAM_FORMATTING = `Esta conversación es por Instagram Direct. Usa texto plano legible en DMs:
- Puedes usar *negrita* con un solo asterisco si hace falta
- Listas con - o 1.
- URLs en texto plano
- Mantén mensajes cortos (Instagram limita ~1000 caracteres)
Prohibido: markdown GFM (**negrita**, headings con #, tablas, HTML, enlaces [texto](url)).`;

/**
 * Builds channel-specific formatting instructions for the agent system prompt.
 */
export function buildFormattingInstructions(channel: ThreadChannel): string {
  const block =
    channel === "whatsapp"
      ? WHATSAPP_FORMATTING
      : channel === "instagram"
        ? INSTAGRAM_FORMATTING
        : WIDGET_FORMATTING;

  const label =
    channel === "whatsapp"
      ? "WhatsApp"
      : channel === "instagram"
        ? "Instagram Direct"
        : "widget web";

  return `

---
FORMATO DE RESPUESTA (${label}):
${block}`;
}
