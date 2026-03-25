"use client";

import type { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Assistant } from "@/app/assistant";
import { storage } from "@/lib/storage";
import { getChatbotConfig, ChatbotConfig } from "@/lib/config";
import { ChatbotConfigProvider } from "@/lib/chatbot-config-context";
import { loadChat } from "@/lib/chat-store";
import { redirect, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Definimos una versión cliente de getChatbotConfig con retry
async function getChatbotConfigClient(): Promise<ChatbotConfig | null> {
  let jwt = storage.getJWT();

  // Fallback: si no hay JWT en localStorage, intentar leer de la URL del iframe parent
  if (!jwt && typeof window !== 'undefined') {
    // Buscar JWT en los scripts del widget que nos cargaron
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const jwtFromUrl = urlParams.get('jwt');
      if (jwtFromUrl) {
        console.log('⚠️ getChatbotConfigClient: JWT found in URL, saving to localStorage');
        storage.setJWT(jwtFromUrl);
        jwt = jwtFromUrl;
      }
    } catch { /* ignore */ }
  }

  if (!jwt) {
    console.warn('⚠️ getChatbotConfigClient: No JWT in localStorage or URL');
    return null;
  }

  // Intentar hasta 3 veces con delay creciente (el backend puede estar arrancando)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const config = await getChatbotConfig(jwt);
      if (config) return config;
      console.warn(`⚠️ getChatbotConfigClient: Intento ${attempt}/3 - config null`);
    } catch (err) {
      console.warn(`⚠️ getChatbotConfigClient: Intento ${attempt}/3 - error:`, err);
    }
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
  return null;
}


export default function Page() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const config = await getChatbotConfigClient();
      if (!config) {
        console.error('❌ No chatbot config available - redirecting to error page');
        redirect('/error-access');
        return;
      }
      setChatbotConfig(config);

      // Aplicar estilos del widget_appearance como CSS variables
      if (config.widget_appearance) {
        const wa = config.widget_appearance;
        const root = document.documentElement;
        if (wa.primary_color) {
          root.style.setProperty('--primary', wa.primary_color);
          // También aplicar a accent y ring para coherencia visual
          root.style.setProperty('--accent', wa.primary_color);
          root.style.setProperty('--ring', wa.primary_color);
        }
        if (wa.text_color) {
          root.style.setProperty('--primary-foreground', wa.text_color);
        }
        if (wa.secondary_color) {
          root.style.setProperty('--secondary', wa.secondary_color);
        }
        if (wa.border_radius != null) {
          root.style.setProperty('--radius', `${Math.min(wa.border_radius, 12)}px`);
        }
      }

      // Solo guardar el threadId si es válido
      if (id) {
        storage.setThreadId(id);
        const loadedMessages = await loadChat(id);
        setMessages(loadedMessages);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [id]);

  const welcomeMessage = chatbotConfig?.welcome_message || "Hola!\n¿En qué puedo ayudarte hoy?";
  const firstLine = welcomeMessage.split('\n')[0] || welcomeMessage;
  const remainingLines = welcomeMessage.split('\n').slice(1).join('\n') || '';
  const welcomeSuggestions = chatbotConfig?.welcome_suggestions || [];

  return (
    <AnimatePresence mode="wait">
      {isLoading || !chatbotConfig ? (
        <LoadingSpinner key="loading" message="Cargando conversación..." />
      ) : (
        <motion.div
          key="assistant"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full w-full"
        >
          <ChatbotConfigProvider config={chatbotConfig}>
            <Assistant
              chatId={id}
              initialMessages={messages}
              welcomeTitle={firstLine}
              welcomeSubtitle={remainingLines}
              welcomeSuggestions={welcomeSuggestions}
              openingMessage={chatbotConfig?.initial_message}
            />
          </ChatbotConfigProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


