"use client";

/**
 * Pie de la conversación cerrada.
 *
 * Sustituye al compositor cuando la conversación termina. El historial se queda arriba, a la
 * vista: cerrar no es borrar, y el visitante suele querer releer lo que le dijeron. Debajo, la
 * única acción que tiene sentido ahí: empezar de nuevo.
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

/** Quién está atendiendo ahora mismo. */
export type ModoAtencion =
  | { tipo: "bot" }
  | { tipo: "esperando" }
  | { tipo: "humano"; nombre: string | null };

/**
 * Franja de estado bajo la cabecera.
 *
 * Lo que importa no es recordarle al visitante que habla con un bot —eso ocupa espacio en el
 * caso normal y se lee como advertencia legal—, sino que se entere del CAMBIO cuando entra una
 * persona. Por eso el estado de bot es la línea más discreta de las tres, y las otras dos
 * llevan color: son las que traen novedad.
 */
export function ModoBanda({
  modo,
  primaryColor,
}: {
  modo: ModoAtencion;
  primaryColor?: string;
}) {
  if (modo.tipo === "bot") {
    return (
      <div className="shrink-0 border-b border-border/60 px-4 py-1.5 text-center text-[11px] text-muted-foreground">
        Te responde el asistente virtual
      </div>
    );
  }

  if (modo.tipo === "esperando") {
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

  // Alguien del equipo está atendiendo. Va en verde y no en el color de la marca: el verde
  // dice "hay alguien en línea" sin que haya que leer la frase, y se distingue de la espera.
  return (
    <div className="shrink-0 border-b border-emerald-600/20 bg-emerald-50 px-4 py-2 text-center text-xs font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {modo.nombre ? `Te atiende ${modo.nombre}` : "Te atiende una persona del equipo"}
      </span>
    </div>
  );
}
