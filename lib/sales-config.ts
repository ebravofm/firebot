import { ENV_CONFIG } from "@/lib/env";

export type SalesConfig = {
  paymentLinksEnabled: boolean;
  collectBuyerName: boolean;
  collectBuyerPhone: boolean;
  collectBuyerEmail: boolean;
  collectShippingAddress: boolean;
  confirmBeforeLink: boolean;
  freeMode: boolean;
};

/** Safe fallback when agent-context is unavailable: payments stay off. */
export const INACTIVE_SALES_CONFIG: SalesConfig = {
  paymentLinksEnabled: false,
  collectBuyerName: true,
  collectBuyerPhone: true,
  collectBuyerEmail: false,
  collectShippingAddress: true,
  confirmBeforeLink: true,
  freeMode: false,
};

export type AgentSalesContext = {
  salesConfig: SalesConfig;
  mpConnected: boolean;
  paymentsActive: boolean;
};

/**
 * Single backend round-trip for sales config + MP connection.
 * Replaces direct Supabase reads of sales_config / mercadopago_connection.
 */
export async function fetchAgentSalesContext(
  threadId: string,
): Promise<AgentSalesContext> {
  const inactive: AgentSalesContext = {
    salesConfig: INACTIVE_SALES_CONFIG,
    mpConnected: false,
    paymentsActive: false,
  };

  if (!ENV_CONFIG.BACKEND_URL) {
    console.error("BACKEND_URL no está definido");
    return inactive;
  }

  try {
    const response = await fetch(
      `${ENV_CONFIG.BACKEND_URL}/integrations/mercadopago/agent-context`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`agent-context failed: ${response.status} ${text}`);
      return inactive;
    }

    const data = (await response.json()) as {
      salesConfig?: Partial<SalesConfig>;
      mpConnected?: boolean;
      paymentsActive?: boolean;
    };

    const salesConfig: SalesConfig = {
      paymentLinksEnabled: data.salesConfig?.paymentLinksEnabled === true,
      collectBuyerName: data.salesConfig?.collectBuyerName !== false,
      collectBuyerPhone: data.salesConfig?.collectBuyerPhone !== false,
      collectBuyerEmail: data.salesConfig?.collectBuyerEmail === true,
      collectShippingAddress:
        data.salesConfig?.collectShippingAddress !== false,
      confirmBeforeLink: data.salesConfig?.confirmBeforeLink !== false,
      freeMode: data.salesConfig?.freeMode === true,
    };

    const mpConnected = data.mpConnected === true;
    const paymentsActive =
      typeof data.paymentsActive === "boolean"
        ? data.paymentsActive
        : salesConfig.paymentLinksEnabled && mpConnected;

    return { salesConfig, mpConnected, paymentsActive };
  } catch (error) {
    console.error("fetchAgentSalesContext error:", error);
    return inactive;
  }
}

export function buildCatalogInstructions(freeMode: boolean): string {
  if (freeMode) {
    return `

---
PRODUCTOS (MODO LIBRE):
No hay catálogo de productos. No uses rag_search para buscar productos o precios del negocio.
Cuando el comprador quiera comprar o pagar:
1. Pregúntale qué quiere comprar (título/descripción del producto o servicio).
2. Pregúntale el precio/monto.
3. Confirma ambos datos con el comprador. No inventes precios ni nombres.
4. Con título y monto confirmados, continúa con el flujo de pago si está disponible.`;
  }

  return `

---
PRODUCTOS:
Cuando el comprador pregunte por productos, precios o disponibilidad, usa rag_search sobre la colección Productos (si está listada) para obtener la información. No inventes precios ni disponibilidad.`;
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
