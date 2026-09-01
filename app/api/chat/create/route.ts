import { NextRequest, NextResponse } from "next/server";
import { createChat } from "@/lib/chat-store";
import { ENV_CONFIG } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Crea un hilo nuevo del lado servidor.
 *
 * Antes el navegador insertaba el thread directo en Supabase con la clave anon. Con RLS
 * activo eso deja de funcionar (y era parte de la fuga). El widget llama aquí con su JWT;
 * la inserción ocurre con service_role del lado servidor.
 */
export async function POST(request: NextRequest) {
  const jwt =
    request.headers.get("authorization")?.replace("Bearer ", "") ?? "";

  if (!jwt) {
    return NextResponse.json({ error: "NO_JWT" }, { status: 401 });
  }

  try {
    const chatId = await createChat(jwt);

    // Avisa al panel de que hay una conversación nueva. Va sin await y con su propio catch:
    // el visitante no debe esperar por esto, y si el aviso falla el backend igual lo detecta
    // en su repaso periódico. Se reenvía el mismo JWT del widget, que ya viene acotado al
    // workspace del chatbot.
    void fetch(`${ENV_CONFIG.BACKEND_URL}/push/thread-opened`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ threadId: chatId }),
    }).catch((err) => {
      console.warn("[api/chat/create] no se pudo avisar del hilo nuevo:", err);
    });

    return NextResponse.json({ chatId });
  } catch (error) {
    // Límite del plan Free: el cliente lo traduce a la pantalla /error-limit.
    if (error instanceof Error && error.message.startsWith("CONVERSATION_LIMIT_REACHED")) {
      const [, used, limit] = error.message.split(":");
      return NextResponse.json(
        { error: "CONVERSATION_LIMIT_REACHED", used, limit },
        { status: 429 },
      );
    }
    console.error("[api/chat/create] error:", error);
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
