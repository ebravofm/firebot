"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/chat-store";
import { storage } from "@/lib/storage";

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
        // Opcional: redirigir a una página de error más específica
        router.replace("/error-access");
      }
    }

    initializeChat();
  }, [router]);

  return <div>Creando nuevo chat...</div>; // O un spinner
}


