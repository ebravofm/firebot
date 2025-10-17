"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/chat-store";
import { getChatbotConfig } from "@/lib/config";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    async function initChat() {
      try {
        // Verificar configuración antes de crear chat
        const chatbotConfig = await getChatbotConfig();
        if (!chatbotConfig) {
          console.error('❌ No chatbot config available - redirecting to error page');
          router.push('/error-access');
          return;
        }
        
        // Crear chat y redirigir
        const id = await createChat();
        router.push(`/chat/${id}`);
      } catch (error) {
        console.error('Error creating chat:', error);
        router.push('/error-access');
      }
    }

    initChat();
  }, [router]);

  return <div className="flex items-center justify-center h-screen">Creando chat...</div>;
}


