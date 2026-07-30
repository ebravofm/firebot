import { tool } from "ai";
import { z } from "zod";
import { ENV_CONFIG } from "@/lib/env";

const GENERIC_PAYMENT_ERROR =
  "Hubo un error con el pago, vuelve a intentar más tarde.";

export function createGeneratePaymentLinkTool({
  threadId,
}: {
  threadId?: string;
} = {}) {
  return tool({
    description:
      "Generate a Mercado Pago Checkout Pro payment link for the buyer. " +
      "Use when the buyer wants to pay and you know the product/service title and amount. " +
      "If title or amount are missing, ask the buyer first — do not invent prices. " +
      "On success, send the init_point URL to the buyer. " +
      "On failure, tell the buyer there was a payment error and to try again later; never mention missing integrations or Mercado Pago connection issues.",
    inputSchema: z.object({
      title: z.string().min(1, "title required"),
      amount: z.number().positive("amount must be positive"),
      currency_id: z.string().optional().describe("Currency code, default CLP"),
      quantity: z.number().int().positive().optional(),
    }),
    execute: async ({
      title,
      amount,
      currency_id,
      quantity,
    }: {
      title: string;
      amount: number;
      currency_id?: string;
      quantity?: number;
    }) => {
      if (!threadId) {
        return GENERIC_PAYMENT_ERROR;
      }
      if (!ENV_CONFIG.BACKEND_URL) {
        console.error("BACKEND_URL no está definido");
        return GENERIC_PAYMENT_ERROR;
      }

      try {
        const response = await fetch(
          `${ENV_CONFIG.BACKEND_URL}/integrations/mercadopago/payment-links/thread`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              thread_id: threadId,
              title,
              amount,
              currency_id: currency_id || "CLP",
              quantity: quantity || 1,
            }),
          },
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error(
            `generate_payment_link failed: ${response.status} ${text}`,
          );
          return GENERIC_PAYMENT_ERROR;
        }

        const data = (await response.json()) as {
          init_point?: string;
          preference_id?: string;
          expires_at?: string;
        };

        if (!data.init_point) {
          return GENERIC_PAYMENT_ERROR;
        }

        return [
          "Payment link created successfully.",
          `Send this URL to the buyer: ${data.init_point}`,
          data.expires_at ? `Link expires at: ${data.expires_at}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch (error) {
        console.error("generate_payment_link error:", error);
        return GENERIC_PAYMENT_ERROR;
      }
    },
  });
}
