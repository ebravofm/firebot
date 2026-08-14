import "server-only";
import crypto from "node:crypto";

/**
 * Verifica la firma de un token widget (HS256, emitido por el backend con JWT_SECRET).
 *
 * El token viaja en la URL del script del widget, así que es semipúblico: verificar la
 * firma NO impide que alguien que lo copie de un sitio lo reuse, pero SÍ bloquea el abuso
 * anónimo (un curl sin token). Combinado con el rate limit por workspace en /api/chat,
 * acota el gasto de tokens de IA aun con un token filtrado.
 *
 * Se valida localmente (firebot comparte JWT_SECRET con el backend) para no depender de un
 * round-trip por cada mensaje.
 */

export interface WidgetClaims {
  workspace_id: number;
  chatbot_id: number | null;
}

function base64urlToBuffer(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function verifyWidgetToken(token: string | null | undefined): WidgetClaims | null {
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[verifyWidgetToken] Falta JWT_SECRET");
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payloadPart, signature] = parts;

  // Firma HS256 sobre `header.payload`, comparada en tiempo constante.
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payloadPart}`)
    .digest();
  const actual = base64urlToBuffer(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64urlToBuffer(payloadPart).toString("utf8"));
  } catch {
    return null;
  }

  // Debe ser un token de widget (no de usuario/servicio) y traer workspace.
  if (payload.type !== "widget") return null;
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  if (payload.workspace_id == null) return null;

  return {
    workspace_id: Number(payload.workspace_id),
    chatbot_id: payload.chatbot_id != null ? Number(payload.chatbot_id) : null,
  };
}
