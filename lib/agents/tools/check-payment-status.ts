import { tool } from "ai";
import { z } from "zod";
import { ENV_CONFIG } from "@/lib/env";

const GENERIC_PAYMENT_ERROR =
  "Hubo un error con el pago, vuelve a intentar más tarde.";

export function createCheckPaymentStatusTool({
  threadId,
}: {
  threadId?: string;
} = {}) {
  return tool({
    description:
      "Check whether a previously generated payment link was paid. " +
      "Use when the buyer says they completed the payment or asks to confirm it. " +
      "Pass the external_reference returned by generate_payment_link for that link. " +
      "Do not invent an external_reference.",
    inputSchema: z.object({
      external_reference: z
        .string()
        .min(1)
        .describe(
          "external_reference of the payment link to verify (from generate_payment_link)",
        ),
    }),
    execute: async ({ external_reference }) => {
      if (!threadId) {
        return GENERIC_PAYMENT_ERROR;
      }
      if (!ENV_CONFIG.BACKEND_URL) {
        console.error("BACKEND_URL no está definido");
        return GENERIC_PAYMENT_ERROR;
      }

      try {
        const response = await fetch(
          `${ENV_CONFIG.BACKEND_URL}/integrations/mercadopago/payment-links/thread/status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              thread_id: threadId,
              external_reference,
            }),
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
          external_reference?: string;
        };

        const status = data.status || "not_found";

        if (status === "not_found") {
          return [
            "Payment link not found for this conversation.",
            "Tell the buyer you could not find a payment to verify and offer to generate a new link if needed.",
          ].join("\n");
        }

        return [
          `Payment status: ${status}`,
          data.title ? `Title: ${data.title}` : "",
          data.amount != null
            ? `Amount: ${data.amount} ${data.currency_id || "CLP"}`
            : "",
          data.external_reference
            ? `external_reference: ${data.external_reference}`
            : "",
          status === "approved"
            ? 'Tell the buyer something like: "Hemos recibido tu pago, ¡gracias!"'
            : status === "pending"
              ? "Tell the buyer the payment does not appear yet and to try again in a moment."
              : "Tell the buyer the payment was not confirmed and offer to retry or generate a new link.",
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
