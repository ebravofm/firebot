import { tool } from "ai";
import { z } from "zod";
import { ENV_CONFIG } from "@/lib/env";
import type { SalesConfig } from "@/lib/sales-config";

const GENERIC_PAYMENT_ERROR =
  "Hubo un error con el pago, vuelve a intentar más tarde.";

function buildInputSchema(salesConfig: SalesConfig) {
  return z
    .object({
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
    })
    .superRefine((data, ctx) => {
      if (salesConfig.collectBuyerName && !data.buyer_name?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["buyer_name"],
          message: "buyer_name required",
        });
      }
      if (salesConfig.collectBuyerPhone && !data.buyer_phone?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["buyer_phone"],
          message: "buyer_phone required",
        });
      }
      if (salesConfig.collectBuyerEmail && !data.buyer_email?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["buyer_email"],
          message: "buyer_email required",
        });
      }
      if (
        salesConfig.collectShippingAddress &&
        !data.shipping_address?.trim()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["shipping_address"],
          message: "shipping_address required",
        });
      }
    });
}

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
    inputSchema: buildInputSchema(salesConfig),
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
        return GENERIC_PAYMENT_ERROR;
      }
      if (!ENV_CONFIG.BACKEND_URL) {
        console.error("BACKEND_URL no está definido");
        return GENERIC_PAYMENT_ERROR;
      }

      try {
        const body: Record<string, unknown> = {
          thread_id: threadId,
          title,
          amount,
          currency_id: currency_id || "CLP",
          quantity: quantity || 1,
        };
        if (salesConfig.collectBuyerName && buyer_name) {
          body.buyer_name = buyer_name;
        }
        if (salesConfig.collectBuyerPhone && buyer_phone) {
          body.buyer_phone = buyer_phone;
        }
        if (salesConfig.collectBuyerEmail && buyer_email) {
          body.buyer_email = buyer_email;
        }
        if (salesConfig.collectShippingAddress && shipping_address) {
          body.shipping_address = shipping_address;
        }

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
