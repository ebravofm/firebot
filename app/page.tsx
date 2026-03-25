"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isReadyForRedirect, setIsReadyForRedirect] = useState(false);

  useEffect(() => {
    // 1. JWT: leer también desde window.location (más fiable que useSearchParams en la primera carga / iframe)
    const fromWindow =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("jwt")
        : null
    const jwtFromUrl = fromWindow ?? searchParams.get("jwt")

    if (jwtFromUrl) {
      console.log("Home Page: JWT found in URL, saving to localStorage.")
      storage.setJWT(jwtFromUrl)

      if (typeof window !== "undefined") {
        const u = new URL(window.location.href)
        u.searchParams.delete("jwt")
        const next = `${u.pathname}${u.search}${u.hash}`
        window.history.replaceState({}, document.title, next)
      }
    }

    setIsReadyForRedirect(true)
  }, [searchParams])

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
