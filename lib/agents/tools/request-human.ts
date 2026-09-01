import { tool } from "ai";
import { z } from "zod";
import { ENV_CONFIG } from "@/lib/env";

/**
 * Traspaso a una persona.
 *
 * El agente la usa cuando el visitante pide hablar con alguien real, o cuando ve que no
 * puede resolver el problema. Avisa al equipo por todos los medios configurados —navegador,
 * Slack, la campana del panel— para que alguien tome la conversación.
 *
 * Devuelve texto para el modelo, no un error técnico: lo que diga aquí es lo que el visitante
 * va a leer, y "no pude avisar" es información que merece saber.
 */
export function createRequestHumanTool({
  threadId,
  jwtToken,
}: {
  threadId?: string;
  jwtToken?: string;
} = {}) {
  return tool({
    description:
      "Escala la conversación a una persona del equipo. " +
      "Úsala cuando el visitante pida hablar con un humano, un asesor o soporte, " +
      "cuando muestre frustración con las respuestas automáticas, " +
      "o cuando su caso necesite a alguien con acceso a información o decisiones que tú no tienes " +
      "(reclamos, cobros, datos de su cuenta). " +
      "No la uses para preguntas que puedas responder tú mismo con la información disponible.",
    inputSchema: z.object({
      motivo: z
        .string()
        .min(1)
        .describe(
          "Resumen breve de por qué se necesita a una persona, en las palabras del visitante.",
        ),
    }),
    execute: async ({ motivo }) => {
      if (!threadId || !jwtToken) {
        return "No se pudo avisar al equipo por un problema técnico. Pide disculpas y ofrece el contacto directo del negocio si lo tienes.";
      }

      try {
        const res = await fetch(`${ENV_CONFIG.BACKEND_URL}/push/human-requested`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ threadId, motivo }),
        });

        if (!res.ok) {
          return "No se pudo avisar al equipo por un problema técnico. Pide disculpas y ofrece el contacto directo del negocio si lo tienes.";
        }

        const data = (await res.json()) as { avisado?: boolean };

        // `avisado: false` significa que ya se había pedido antes en esta misma conversación:
        // no se vuelve a avisar para no repetir la alerta, pero el visitante sigue en espera.
        return data.avisado
          ? "Listo: el equipo fue avisado y alguien tomará la conversación. " +
              "Dile al visitante que espere un momento, que ya viene una persona, y sigue " +
              "acompañándolo mientras tanto si tiene más preguntas."
          : "El equipo ya estaba avisado de esta conversación. " +
              "Confírmale al visitante que su solicitud sigue en curso y que alguien lo atenderá.";
      } catch {
        return "No se pudo avisar al equipo por un problema técnico. Pide disculpas y ofrece el contacto directo del negocio si lo tienes.";
      }
    },
  });
}
