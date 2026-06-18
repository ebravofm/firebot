import { ENV_CONFIG } from "@/lib/env";

export interface RespondWatchdog {
  markComplete: (meta?: Record<string, unknown>) => void;
}

/**
 * Emite logs si generateText tarda más de lo esperado (debug staging / WhatsApp 3b).
 */
export function startRespondWatchdog(args: {
  chatId: string;
  label?: string;
}): RespondWatchdog {
  const label = args.label ?? "generateReactAgent";
  const startedAt = Date.now();
  const startIso = new Date(startedAt).toISOString();
  const warnMs = ENV_CONFIG.CHAT_RESPOND_SLOW_WARN_MS;
  const criticalMs = ENV_CONFIG.CHAT_RESPOND_CRITICAL_MS;

  console.log(
    `[${startIso}] [respond:watchdog:START] chatId=${args.chatId} label=${label} warnMs=${warnMs} criticalMs=${criticalMs}`,
  );

  const warnTimer = setTimeout(() => {
    const elapsed = Date.now() - startedAt;
    console.warn(
      `[${new Date().toISOString()}] [respond:watchdog:SLOW] chatId=${args.chatId} label=${label} elapsedMs=${elapsed} — agent still running (check OpenAI/RAG/tools)`,
    );
  }, warnMs);

  const criticalTimer = setTimeout(() => {
    const elapsed = Date.now() - startedAt;
    console.error(
      `[${new Date().toISOString()}] [respond:watchdog:CRITICAL] chatId=${args.chatId} label=${label} elapsedMs=${elapsed} — approaching route timeout; agent may fail soon`,
    );
  }, criticalMs);

  let finished = false;

  return {
    markComplete(meta) {
      if (finished) return;
      finished = true;
      clearTimeout(warnTimer);
      clearTimeout(criticalTimer);
      const elapsed = Date.now() - startedAt;
      const level = elapsed >= criticalMs ? "warn" : "log";
      const line = `[${new Date().toISOString()}] [respond:watchdog:DONE] chatId=${args.chatId} label=${label} elapsedMs=${elapsed}${meta ? ` meta=${JSON.stringify(meta)}` : ""}`;
      if (level === "warn") console.warn(line);
      else console.log(line);
    },
  };
}
