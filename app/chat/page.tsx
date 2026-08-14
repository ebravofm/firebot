"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
        // La creación del hilo ocurre en el servidor (/api/chat/create), que inserta
        // con service_role. El navegador ya no toca la BD directo.
        const res = await fetch("/api/chat/create", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          router.replace(`/error-limit?used=${body.used ?? ""}&limit=${body.limit ?? ""}`);
          return;
        }
        if (!res.ok) {
          throw new Error(`create failed: ${res.status}`);
        }

        const { chatId } = (await res.json()) as { chatId: string };
        // El thread_id se persiste ahora en el cliente (antes lo hacía createChat).
        storage.setThreadId(chatId);
        router.replace(`/chat/${chatId}`);
      } catch (error) {
        console.error("Failed to create chat:", error);
        router.replace("/error-access");
      }
    }

    initializeChat();
  }, [router]);

  return <LoadingSpinner message="Creando nuevo chat..." />;
}


