import { supabase } from "./supabase-client";

export type SalesConfig = {
  paymentLinksEnabled: boolean;
  collectBuyerName: boolean;
  collectBuyerPhone: boolean;
  collectBuyerEmail: boolean;
  collectShippingAddress: boolean;
  confirmBeforeLink: boolean;
};

export const DEFAULT_SALES_CONFIG: SalesConfig = {
  paymentLinksEnabled: true,
  collectBuyerName: true,
  collectBuyerPhone: true,
  collectBuyerEmail: false,
  collectShippingAddress: true,
  confirmBeforeLink: true,
};

export async function fetchSalesConfig(
  workspaceId: number,
): Promise<SalesConfig> {
  try {
    const { data, error } = await supabase
      .from("sales_config")
      .select(
        "payment_links_enabled, collect_buyer_name, collect_buyer_phone, collect_buyer_email, collect_shipping_address, confirm_before_link",
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_SALES_CONFIG;
    }

    return {
      paymentLinksEnabled: data.payment_links_enabled !== false,
      collectBuyerName: data.collect_buyer_name !== false,
      collectBuyerPhone: data.collect_buyer_phone !== false,
      collectBuyerEmail: data.collect_buyer_email === true,
      collectShippingAddress: data.collect_shipping_address !== false,
      confirmBeforeLink: data.confirm_before_link !== false,
    };
  } catch {
    return DEFAULT_SALES_CONFIG;
  }
}

export function buildPaymentLinkInstructions(cfg: SalesConfig): string {
  if (!cfg.paymentLinksEnabled) {
    return `

---
PAGOS:
No ofrezcas ni generes links de pago. Si el comprador quiere pagar, indica que por ahora no está disponible y ofrece ayuda con productos/consultas.`;
  }

  const fields: string[] = [];
  if (cfg.collectBuyerName) fields.push("nombre completo");
  if (cfg.collectBuyerPhone) fields.push("teléfono de contacto");
  if (cfg.collectBuyerEmail) fields.push("email");
  if (cfg.collectShippingAddress) {
    fields.push("dirección de envío (texto completo)");
  }

  const collectBlock = fields.length
    ? `Antes de llamar generate_payment_link, pide y confirma estos datos: ${fields.join(", ")}. No inventes ninguno.`
    : `No pidas datos extra del comprador; con título y monto basta.`;

  const confirmBlock = cfg.confirmBeforeLink
    ? `Antes de llamar la herramienta, resume título, monto y los datos recolectados y espera confirmación explícita del comprador.`
    : `Cuando tengas título, monto y los datos requeridos, genera el link.`;

  return `

---
LINKS DE PAGO (herramienta generate_payment_link):
1. Úsala cuando el comprador quiera pagar y ya tengas título y monto (de tus instrucciones o confirmados). No inventes precios.
2. ${collectBlock}
3. ${confirmBlock}
4. Si la herramienta devuelve URL, envíasela claramente.
5. Si falla, di: "Hubo un error con el pago, vuelve a intentar más tarde." Sin mencionar Mercado Pago ni integraciones.`;
}
