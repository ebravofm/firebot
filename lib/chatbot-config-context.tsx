"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ChatbotConfig, ResolvedUIConfig } from "./config";
import { resolveUIConfig } from "./config";

const ChatbotConfigContext = createContext<{
  config: ChatbotConfig | null;
  ui: ResolvedUIConfig;
} | null>(null);

export function ChatbotConfigProvider({
  config,
  children,
}: {
  config: ChatbotConfig | null;
  children: ReactNode;
}) {
  const ui = resolveUIConfig(config);
  return (
    <ChatbotConfigContext.Provider value={{ config, ui }}>
      {children}
    </ChatbotConfigContext.Provider>
  );
}

export function useChatbotConfig() {
  const ctx = useContext(ChatbotConfigContext);
  return ctx ?? { config: null, ui: resolveUIConfig(null) };
}
