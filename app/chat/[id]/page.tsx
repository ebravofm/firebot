"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadChat } from "@/lib/chat-store";
import { Assistant } from "@/app/assistant";
import { SetThreadCookie } from "../../../components/set-thread-cookie";
import { getChatbotConfig } from "@/lib/config";
import type { UIMessage } from "ai";
import type { ChatbotConfig } from "@/lib/config";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Resolver params
        const resolvedParams = await params;
        setId(resolvedParams.id);
        
        // Cargar configuración del chatbot
        const config = await getChatbotConfig();
        
        // Si no hay configuración (por JWT inválido), redirigir a error
        if (!config) {
          console.error('❌ No chatbot config available - redirecting to error page');
          router.push('/error-access');
          return;
        }
        
        setChatbotConfig(config);
        
        // Cargar mensajes del chat
        const loadedMessages = await loadChat(resolvedParams.id);
        setMessages(loadedMessages);
      } catch (error) {
        console.error('Error loading chat:', error);
        router.push('/error-access');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, router]);

  if (loading || !chatbotConfig || !id) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }
  
  // Separar el welcome message en dos partes
  const welcomeMessage = chatbotConfig.welcome_message || "Hola!\n¿En qué puedo ayudarte hoy?";
  const firstLine = welcomeMessage.split('\n')[0] || welcomeMessage;
  const remainingLines = welcomeMessage.split('\n').slice(1).join('\n') || '';
  
  // Obtener welcome suggestions
  const welcomeSuggestions = chatbotConfig.welcome_suggestions || [];
  
  return (
    <>
      <SetThreadCookie id={id} />
      <Assistant 
        chatId={id} 
        initialMessages={messages}
        welcomeTitle={firstLine}
        welcomeSubtitle={remainingLines}
        welcomeSuggestions={welcomeSuggestions}
        openingMessage={chatbotConfig.initial_message}
      />
    </>
  );
}


