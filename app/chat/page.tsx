"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/chat-store";
import { storage } from "@/lib/storage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function CreateChatPage() {
  const router = useRouter();

  useEffect(() => {
    async function initializeChat() {
      // Primero, nos aseguramos de tener un JWT. Si no, no podemos crear un chat.
      const jwt = storage.getJWT();
      if (!jwt) {
        console.error("No JWT found in storage, redirecting to error page.");
        router.replace("/error-access");
        return;
      }
      
      try {
        const id = await createChat();
        router.replace(`/chat/${id}`);
      } catch (error) {
        console.error("Failed to create chat:", error);

        // Límite de conversaciones del plan Free alcanzado
        if (error instanceof Error && error.message.startsWith("CONVERSATION_LIMIT_REACHED")) {
          const [, used, limit] = error.message.split(":");
          router.replace(`/error-limit?used=${used}&limit=${limit}`);
          return;
        }

        router.replace("/error-access");
      }
    }

    initializeChat();
  }, [router]);

  return <LoadingSpinner message="Creando nuevo chat..." />;
}


