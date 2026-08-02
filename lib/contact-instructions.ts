/**
 * Formats business contact lines for agent prompt blocks.
 * Returns empty array when both phone and email are missing/blank.
 */
export function formatContactLines(
  phone?: string | null,
  email?: string | null,
): string[] {
  const contactPhone = phone?.trim() || "";
  const contactEmail = email?.trim() || "";
  const lines: string[] = [];
  if (contactPhone) {
    lines.push(`- Teléfono: ${contactPhone}`);
  }
  if (contactEmail) {
    lines.push(`- Correo: ${contactEmail}`);
  }
  return lines;
}

/**
 * Builds optional last-resort contact instructions for the agent system prompt.
 * Returns empty string when both phone and email are missing/blank.
 */
export function buildContactInstructions(
  phone?: string | null,
  email?: string | null,
): string {
  const lines = formatContactLines(phone, email);
  if (lines.length === 0) {
    return "";
  }

  return `

---
CONTACTO DE RESPALDO:
Si no puedes resolver la consulta del usuario con la información disponible,
o tras intentar ayudar sigue sin quedar resuelta, ofrece estos canales
como último recurso (no los menciones en cada mensaje):
${lines.join("\n")}`;
}
