"use client";

import { useEffect } from "react";
import { setTokenInStorage, getTokenFromStorage } from "@/lib/config";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Componente que inicializa el JWT desde la URL y lo guarda en localStorage
 */
export function InitJWT() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Obtener JWT de la URL
    const jwtFromUrl = searchParams.get("jwt");
    
    if (jwtFromUrl) {
      // Guardar en localStorage
      setTokenInStorage(jwtFromUrl);
      console.log("✅ JWT guardado en localStorage desde URL");
      
      // Limpiar la URL para no exponer el JWT
      const url = new URL(window.location.href);
      url.searchParams.delete("jwt");
      window.history.replaceState({}, "", url.toString());
    } else {
      // Verificar que tengamos JWT en localStorage
      const existingToken = getTokenFromStorage();
      if (!existingToken) {
        console.error("❌ No JWT found - redirecting to error page");
        router.push("/error-access");
      }
    }
  }, [searchParams, router]);

  return null;
}

