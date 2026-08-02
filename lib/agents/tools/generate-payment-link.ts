import { tool } from "ai";
import { z } from "zod";
import { ENV_CONFIG } from "@/lib/env";
import type { SalesConfig } from "@/lib/sales-config";

const PAYMENT_ERROR =
  "Hubo un error con el pago, vuelve a intentar más tarde.";

export function createGeneratePaymentLinkTool({
  threadId,
  salesConfig,
}: {
  threadId?: string;
  salesConfig: SalesConfig;
}) {
  const requiredFields = [
    salesConfig.collectBuyerName ? "buyer_name" : null,
    salesConfig.collectBuyerPhone ? "buyer_phone" : null,
    salesConfig.collectBuyerEmail ? "buyer_email" : null,
    salesConfig.collectShippingAddress ? "shipping_address" : null,
  ].filter(Boolean);

  // Buyer field validation is authoritative on the backend.
  // Schema keeps fields optional; instructions + description guide the model.
  return tool({
    description:
      "Generate a Mercado Pago Checkout Pro payment link for the buyer. " +
      "Use when the buyer wants to pay and you know the product/service title and amount. " +
      (requiredFields.length
        ? `Required buyer fields before calling: ${requiredFields.join(", ")}. `
        : "No extra buyer fields required. ") +
      "If title or amount are missing, ask the buyer first — do not invent prices. " +
      "On success, send the init_point URL to the buyer. " +
      "On failure, tell the buyer there was a payment error and to try again later; never mention missing integrations or Mercado Pago connection issues.",
    inputSchema: z.object({
      title: z.string().min(1, "title required"),
      amount: z.number().positive("amount must be positive"),
      currency_id: z
        .string()
        .optional()
        .describe("Currency code, default CLP"),
      quantity: z.number().int().positive().optional(),
      buyer_name: z
        .string()
        .min(1)
        .optional()
        .describe("Full name of the buyer"),
      buyer_phone: z
        .string()
        .min(1)
        .optional()
        .describe("Buyer contact phone number"),
      buyer_email: z
        .string()
        .email()
        .optional()
        .describe("Buyer email address"),
      shipping_address: z
        .string()
        .min(1)
        .optional()
        .describe("Full shipping address as free text"),
    }),
    execute: async ({
      title,
      amount,
      currency_id,
      quantity,
      buyer_name,
      buyer_phone,
      buyer_email,
      shipping_address,
    }) => {
      if (!threadId) {
        return PAYMENT_ERROR;
      }
      if (!ENV_CONFIG.BACKEND_URL) {
        console.error("BACKEND_URL no está definido");
        return PAYMENT_ERROR;
      }

      try {
        const body: Record<string, unknown> = {
          thread_id: threadId,
          title,
          amount,
          currency_id: currency_id || "CLP",
          quantity: quantity || 1,
        };
        if (buyer_name) body.buyer_name = buyer_name;
        if (buyer_phone) body.buyer_phone = buyer_phone;
        if (buyer_email) body.buyer_email = buyer_email;
        if (shipping_address) body.shipping_address = shipping_address;

        const response = await fetch(
          `${ENV_CONFIG.BACKEND_URL}/integrations/mercadopago/payment-links/thread`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error(
            `generate_payment_link failed: ${response.status} ${text}`,
          );
          return PAYMENT_ERROR;
        }

        const data = (await response.json()) as {
          init_point?: string;
          preference_id?: string;
        };

        if (!data.init_point) {
          return PAYMENT_ERROR;
        }

        return [
          "Payment link created successfully.",
          `Send this URL to the buyer: ${data.init_point}`,
          "When sending the URL, ask the buyer to let you know when they have completed the payment.",
          data.preference_id
            ? `preference_id (for check_payment_status; do not show to buyer): ${data.preference_id}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch (error) {
        console.error("generate_payment_link error:", error);
        return PAYMENT_ERROR;
      }
    },
  });
}
