"use client";

/**
 * Pie de la conversación cerrada.
 *
 * Sustituye al compositor cuando alguien del equipo cierra el hilo. El historial se queda
 * arriba, a la vista: cerrar no es borrar, y el visitante suele querer releer lo que le
 * dijeron. Debajo, la única acción que tiene sentido ahí: empezar de nuevo.
 */
export function ConversationClosed({
  onNewConversation,
  primaryColor,
}: {
  onNewConversation: () => void;
  primaryColor?: string;
}) {
  return (
    <div className="shrink-0 border-t bg-background px-4 py-4">
      <div className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-foreground">Conversación finalizada</p>
        <p className="text-xs text-muted-foreground">
          Puedes revisar el historial más arriba. Si necesitas algo más, empieza una nueva.
        </p>
        <button
          type="button"
          onClick={onNewConversation}
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor ?? "var(--primary)" }}
        >
          Iniciar conversación nueva
        </button>
      </div>
    </div>
  );
}

/**
 * Aviso mientras la petición de humano está en cola.
 *
 * Va arriba, como banda, no como mensaje del chat: es estado, no algo que alguien dijo, y
 * mezclarlo con los mensajes haría que se pierda al seguir conversando. Mientras espera, el
 * bot sigue respondiendo; por eso el texto no promete silencio, solo que alguien viene.
 */
export function WaitingForHuman({ primaryColor }: { primaryColor?: string }) {
  return (
    <div
      className="shrink-0 px-4 py-2 text-center text-xs font-medium"
      style={{
        backgroundColor: primaryColor ? `${primaryColor}1a` : "var(--muted)",
        color: primaryColor ?? "var(--foreground)",
        borderBottom: `1px solid ${primaryColor ? `${primaryColor}33` : "var(--border)"}`,
      }}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ backgroundColor: primaryColor ?? "currentColor" }}
        />
        Avisamos al equipo. Alguien se suma a la conversación en breve.
      </span>
    </div>
  );
}
