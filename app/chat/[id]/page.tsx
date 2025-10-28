"use client";

import { UIMessage } from "ai/react";
import { useEffect, useState } from "react";
import { Assistant } from "@/app/assistant";
import { storage } from "@/lib/storage";
import { getChatbotConfig, ChatbotConfig } from "@/lib/config";
import { loadChat } from "@/lib/chat-store";
import { redirect } from "next/navigation";

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


export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
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
      storage.setThreadId(id);

      const loadedMessages = await loadChat(id);
      setMessages(loadedMessages);
      setIsLoading(false);
    }

    fetchData();
  }, [id]);

  if (isLoading || !chatbotConfig) {
    return <div>Cargando...</div>; // O un componente Skeleton
  }

  const welcomeMessage = chatbotConfig?.welcome_message || "Hola!\n¿En qué puedo ayudarte hoy?";
  const firstLine = welcomeMessage.split('\n')[0] || welcomeMessage;
  const remainingLines = welcomeMessage.split('\n').slice(1).join('\n') || '';
  const welcomeSuggestions = chatbotConfig?.welcome_suggestions || [];

  return (
    <Assistant 
      chatId={id} 
      initialMessages={messages}
      welcomeTitle={firstLine}
      welcomeSubtitle={remainingLines}
      welcomeSuggestions={welcomeSuggestions}
      openingMessage={chatbotConfig?.initial_message}
    />
  );
}


