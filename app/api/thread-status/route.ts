import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Estado en vivo de un hilo para el widget del navegador, por polling.
 *
 * Reemplaza la suscripción realtime que el widget hacía con la clave anon de Supabase
 * (que exponía toda la BD). El visitante es anónimo y no debe tener ningún acceso directo
 * a la BD; en su lugar consulta esto, que lee con service_role del lado servidor.
 *
 * Devuelve:
 *  - taken_by_user_system: si un humano tomó el chat (para pausar la IA en el cliente)
 *  - human_requested_at: el visitante pidió hablar con una persona y todavía nadie la toma
 *  - closed_at: la conversación se cerró; el widget muestra el aviso de finalizada, deja el
 *    historial a la vista y ofrece empezar una nueva
 *  - messages: los mensajes del hilo creados después de `after` (ISO), para pintar en vivo
 *    lo que responde el agente humano. Vacío si no hay novedades.
 *
 * Solo lee del hilo pedido por id; no enumera nada. El id del hilo ya lo tiene el visitante
 * (es su propia conversación), así que no expone información de otros.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");
  const after = searchParams.get("after"); // ISO timestamp del último mensaje visto

  if (!chatId) {
    return NextResponse.json({ error: "chatId requerido" }, { status: 400 });
  }

  try {
    const { data: thread, error: threadError } = await supabaseServer
      .from("threads")
      .select("taken_by_user_system, human_requested_at, closed_at")
      .eq("id", chatId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "thread no encontrado" }, { status: 404 });
    }

    let messagesQuery = supabaseServer
      .from("messages")
      .select("id, role, parts, content, created_at")
      .eq("thread_id", chatId)
      .order("created_at", { ascending: true });

    if (after) {
      messagesQuery = messagesQuery.gt("created_at", after);
    }

    const { data: messages } = await messagesQuery;

    return NextResponse.json(
      {
        taken_by_user_system: thread.taken_by_user_system ?? null,
        human_requested_at: thread.human_requested_at ?? null,
        closed_at: thread.closed_at ?? null,
        messages: messages ?? [],
      },
      // Sin caché: es estado en vivo.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[thread-status] error:", e);
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}
