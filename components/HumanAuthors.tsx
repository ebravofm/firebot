"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Quién escribió cada mensaje, cuando no fue el bot.
 *
 * El nombre viaja con el mensaje desde el backend (`providerMetadata.human.name`), así que se
 * guarda por id de mensaje y no por conversación: si a lo largo del rato atienden dos personas
 * distintas, cada mensaje sigue mostrando quién lo escribió, y no el último que pasó por ahí.
 */
const HumanAuthorsContext = createContext<Record<string, string>>({});

export function HumanAuthorsProvider({
  value,
  children,
}: {
  value: Record<string, string>;
  children: ReactNode;
}) {
  return <HumanAuthorsContext.Provider value={value}>{children}</HumanAuthorsContext.Provider>;
}

/** Nombre de la persona que escribió ese mensaje, o null si lo escribió el bot. */
export function useHumanAuthor(messageId: string | undefined): string | null {
  const autores = useContext(HumanAuthorsContext);
  if (!messageId) return null;
  return autores[messageId] ?? null;
}
