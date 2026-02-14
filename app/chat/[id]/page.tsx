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

// Definimos una versión cliente de getChatbotConfig
async function getChatbotConfigClient(): Promise<ChatbotConfig | null> {
  const jwt = storage.getJWT();
  if (!jwt) return null;
  
  // Como getChatbotConfig ahora necesita leer de cookies en el servidor,
  // y nosotros lo tenemos en localStorage, necesitamos o bien una API route
  // o refactorizar getChatbotConfig para que pueda funcionar en cliente.
  // Por simplicidad, vamos a refactorizar getChatbotConfig para que acepte el token.
  
  // Esta llamada fallará si getChatbotConfig usa `next/headers`.
  // Es necesario un refactor mayor. Por ahora, asumiré que podemos crear una función
  // que no dependa de `cookies()`.
  
  // Vamos a crear una nueva función en config.ts que acepte el token.
  const config = await getChatbotConfig(jwt);
  return config;
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


