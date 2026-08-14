import { NextRequest, NextResponse } from "next/server";
import { loadChat } from "@/lib/chat-store";

export const runtime = "nodejs";

/**
 * Historial de mensajes de un hilo, para pintar la conversación al cargar.
 *
 * Antes el navegador leía `messages` directo con la clave anon (parte de la fuga). Ahora
 * lee del lado servidor con service_role. El visitante solo pide su propio hilo por id.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  try {
    const messages = await loadChat(id);
    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/chat/[id]/messages] error:", error);
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
