export type ConversationTone =
  | "neutral"
  | "formal"
  | "amigable"
  | "profesional"
  | "empatico"
  | "conciso"
  | "expresivo"
  | "otro"
  | string
  | null
  | undefined;

const TONE_BLOCKS: Record<string, string> = {
  formal: `Adopta un tono formal y respetuoso en todas tus respuestas.
- Dirígete al usuario de usted.
- Evita muletillas, jerga, emojis y expresiones coloquiales.
- Sé preciso, ordenado y cortés.
- Mantén este tono aunque el usuario escriba de forma informal.`,

  amigable: `Habla de forma cercana y cálida, de tú.
- Sé claro, útil y humano.
- Puedes usar un toque ligero, sin ser infantil.
- No abuses de emojis; prioriza claridad.
- Mantén este tono de forma consistente en toda la conversación.`,

  profesional: `Usa un tono corporativo, confiable y profesional.
- Sé directo, estructurado y orientado a resolver.
- Evita jerga informal y emojis.
- Mantén este tono de forma consistente en toda la conversación.`,

  empatico: `Prioriza la escucha y la contención emocional.
- Valida la preocupación del usuario antes de ofrecer una solución.
- Usa un lenguaje calmado y humano, sin dramatizar.
- Mantén este tono de forma consistente en toda la conversación.`,

  conciso: `Responde de forma corta y al punto.
- Prefiere viñetas o pasos breves cuando ayuden.
- Evita rodeos, repeticiones y relleno.
- Mantén este tono de forma consistente en toda la conversación.`,

  expresivo: `Habla de forma cercana y natural, de tú.
Puedes usar emojis con moderación (como máximo 1 o 2 por respuesta) solo cuando aporten claridad o calidez.
No satures el mensaje con emojis ni los uses en cada frase.
Prioriza siempre ser útil y claro.
Mantén este tono de forma consistente en toda la conversación.`,
};

/**
 * Builds conversational tone instructions for the agent system prompt.
 * Returns empty string for neutral/missing tone or invalid custom tone.
 */
export function buildToneInstructions(
  tone: ConversationTone,
  custom?: string | null,
): string {
  const normalized = (tone || "neutral").trim().toLowerCase();
  if (!normalized || normalized === "neutral") {
    return "";
  }

  if (normalized === "otro") {
    const customText = custom?.trim();
    if (!customText) return "";
    return `

---
TONO CONVERSACIONAL:
Sigue estas instrucciones de tono:
${customText}
Mantén este tono de forma consistente en toda la conversación.`;
  }

  const block = TONE_BLOCKS[normalized];
  if (!block) return "";

  return `

---
TONO CONVERSACIONAL:
${block}`;
}
