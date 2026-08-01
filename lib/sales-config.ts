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

export async function fetchMercadoPagoConnected(
  workspaceId: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("mercadopago_connection")
      .select("status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) return false;
    return data.status === "connected";
  } catch {
    return false;
  }
}

export function buildPaymentLinkInstructions(
  paymentsActive: boolean,
  cfg: SalesConfig,
): string {
  if (!paymentsActive) {
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
LINKS DE PAGO:
1. Usa generate_payment_link cuando el comprador quiera pagar y ya tengas título y monto (de tus instrucciones o confirmados). No inventes precios.
2. ${collectBlock}
3. ${confirmBlock}
4. Cuando la herramienta devuelva la URL, envíasela claramente al comprador y pide algo como: "Favor avísame cuando hayas completado el pago." Guarda el external_reference que devuelve la herramienta (no se lo muestres al comprador); lo necesitarás para verificar el pago.
5. Cuando el comprador diga que ya pagó o pida confirmar el pago, usa check_payment_status con el external_reference del link correspondiente (si hubo varios links, el del cobro en cuestión).
6. Si check_payment_status indica approved: responde en tono "Hemos recibido tu pago, ¡gracias!" sin jerga técnica.
7. Si sigue pending: indica que aún no aparece el pago y que reintente en un momento.
8. Si es rejected u otro estado: indica amablemente que no se confirmó y ofrece reintentar o generar un nuevo link.
9. Si generate_payment_link o check_payment_status fallan, di: "Hubo un error con el pago, vuelve a intentar más tarde." Sin mencionar Mercado Pago ni integraciones.`;
}
