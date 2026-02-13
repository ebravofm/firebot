"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isReadyForRedirect, setIsReadyForRedirect] = useState(false);

  useEffect(() => {
    // 1. Capturar el JWT de la URL
    const jwtFromUrl = searchParams.get('jwt');
    if (jwtFromUrl) {
      console.log("Home Page: JWT found in URL, saving to localStorage.");
      storage.setJWT(jwtFromUrl);

      // 2. Limpiar la URL para que el JWT no quede visible
      const newUrl = window.location.pathname + window.location.search.replace(/(\?|&)jwt=[^&]*/, '');
      window.history.replaceState({}, document.title, newUrl);
    }

    // 3. Marcar como listo para la redirección
    setIsReadyForRedirect(true);

  }, [searchParams]);

  useEffect(() => {
    // 4. Redirigir solo cuando esté listo
    if (!isReadyForRedirect) {
      return;
    }

    const threadId = storage.getThreadId();
    if (threadId) {
      console.log(`Home Page: Redirecting to existing thread ${threadId}`);
      router.replace(`/chat/${threadId}`);
    } else {
      console.log("Home Page: Redirecting to create a new chat.");
      router.replace("/chat");
    }
  }, [isReadyForRedirect, router]);

  return null;
}
