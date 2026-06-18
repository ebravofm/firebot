import { ENV_CONFIG } from "@/lib/env";

/**
 * Valida X-Internal-Token para endpoints server-to-server (WhatsApp 3b, etc.).
 * Si FIREBOT_INTERNAL_TOKEN no está definido, permite la petición con warning (dev).
 */
export function assertInternalToken(req: Request): Response | null {
  const expected = ENV_CONFIG.FIREBOT_INTERNAL_TOKEN;
  if (!expected) {
    console.warn(
      "[internal-auth] FIREBOT_INTERNAL_TOKEN not set — internal endpoints are unauthenticated",
    );
    return null;
  }

  const token = req.headers.get("x-internal-token");
  if (token !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
