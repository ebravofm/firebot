import { tool } from "ai";
import { z } from "zod";
import { ENV_CONFIG } from "@/lib/env";
import { formatContactLines } from "@/lib/contact-instructions";

const GENERIC_PAYMENT_ERROR =
  "Hubo un error con el pago, vuelve a intentar más tarde.";

export function createCheckPaymentStatusTool({
  threadId,
  contactPhone,
  contactEmail,
}: {
  threadId?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
} = {}) {
  const contactLines = formatContactLines(contactPhone, contactEmail);
  const unresolvedGuidance =
    contactLines.length > 0
      ? [
          "Tell the buyer the payment was not confirmed.",
          "Share this business contact so they can resolve it (do not offer a new payment link):",
          ...contactLines,
        ].join("\n")
      : "Tell the buyer the payment was not confirmed. Do not offer to generate a new payment link.";

  return tool({
    description:
      "Check whether a previously generated payment link was paid. " +
      "Use when the buyer says they completed the payment or asks to confirm it. " +
      "Pass the preference_id from the payment URL (pref_id=...) when known; " +
      "otherwise omit it and the latest link for this conversation will be checked.",
    inputSchema: z.object({
      preference_id: z
        .string()
        .min(1)
        .optional()
        .describe(
          "preference_id from the payment URL (pref_id query param). Optional — omit to check the latest link in this conversation.",
        ),
    }),
    execute: async ({ preference_id }) => {
      if (!threadId) {
        return GENERIC_PAYMENT_ERROR;
      }
      if (!ENV_CONFIG.BACKEND_URL) {
        console.error("BACKEND_URL no está definido");
        return GENERIC_PAYMENT_ERROR;
      }

      try {
        const body: Record<string, string> = { thread_id: threadId };
        if (preference_id) body.preference_id = preference_id;

        const response = await fetch(
          `${ENV_CONFIG.BACKEND_URL}/integrations/mercadopago/payment-links/thread/status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error(
            `check_payment_status failed: ${response.status} ${text}`,
          );
          return GENERIC_PAYMENT_ERROR;
        }

        const data = (await response.json()) as {
          status?: string;
          title?: string;
          amount?: number;
          currency_id?: string;
          preference_id?: string;
        };

        const status = data.status || "not_found";

        if (status === "not_found") {
          return [
            "Payment link not found for this conversation.",
            unresolvedGuidance,
          ].join("\n");
        }

        return [
          `Payment status: ${status}`,
          data.title ? `Title: ${data.title}` : "",
          data.amount != null
            ? `Amount: ${data.amount} ${data.currency_id || "CLP"}`
            : "",
          data.preference_id ? `preference_id: ${data.preference_id}` : "",
          status === "approved"
            ? 'Tell the buyer something like: "Hemos recibido tu pago, ¡gracias!"'
            : status === "pending"
              ? "Tell the buyer the payment does not appear yet and to try again in a moment."
              : unresolvedGuidance,
        ]
          .filter(Boolean)
          .join("\n");
      } catch (error) {
        console.error("check_payment_status error:", error);
        return GENERIC_PAYMENT_ERROR;
      }
    },
  });
}
