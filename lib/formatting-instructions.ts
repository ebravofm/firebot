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

/**
 * Builds channel-specific formatting instructions for the agent system prompt.
 */
export function buildFormattingInstructions(channel: ThreadChannel): string {
  const block = channel === "whatsapp" ? WHATSAPP_FORMATTING : WIDGET_FORMATTING;

  return `

---
FORMATO DE RESPUESTA (${channel === "whatsapp" ? "WhatsApp" : "widget web"}):
${block}`;
}
