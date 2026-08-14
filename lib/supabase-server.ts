import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el LADO SERVIDOR de firebot.
 *
 * Usa la clave service_role, que ignora RLS. Va en un env sin prefijo NEXT_PUBLIC_ para
 * que jamás se inline en el bundle del navegador — el import de "server-only" hace fallar
 * el build si algún componente cliente lo importa por error.
 *
 * Se instancia de forma perezosa (al primer uso), no al importar: así `next build` puede
 * recolectar las rutas sin exigir la clave, y la falta de clave solo falla en runtime,
 * con un mensaje claro.
 *
 * Todo el acceso a datos del servidor (chat-store, config-server, rutas /api) pasa por aquí.
 */
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY) para el cliente de servidor",
    );
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Proxy perezoso: mantiene la API `supabaseServer.from(...)` sin instanciar al importar.
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
