// lib/storage.ts
"use client";

// Helpers para localStorage. Se añade "if (typeof window !== 'undefined')"
// para evitar errores durante el Server-Side Rendering (SSR), ya que
// localStorage solo existe en el navegador.

// Extrae el chatbot_id del payload del JWT almacenado y devuelve la clave
// namespaceada. Sin JWT o si el decode falla, devuelve la clave genérica
// para mantener compatibilidad.
function threadKey(): string {
  try {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return 'thread_id';
    const parts = jwt.trim().split('.');
    if (parts.length !== 3) return 'thread_id';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const chatbotId = payload?.chatbot_id;
    return chatbotId != null ? `thread_id:${chatbotId}` : 'thread_id';
  } catch {
    return 'thread_id';
  }
}

export const storage = {
  // --- JWT Token ---
  getJWT: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jwt');
    }
    return null;
  },
  setJWT: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwt', token);
    }
  },

  // --- Thread ID (namespaceado por chatbot_id del JWT) ---
  getThreadId: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(threadKey());
    }
    return null;
  },
  setThreadId: (id: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(threadKey(), id);
    }
  },
  removeThreadId: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(threadKey());
    }
  },

  // --- Font Size (Zoom) ---
  getFontSize: (): number => {
    if (typeof window !== 'undefined') {
      const size = localStorage.getItem('fontSize');
      return size ? parseInt(size, 10) : 16;
    }
    return 16;
  },
  setFontSize: (size: number): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fontSize', size.toString());
    }
  },

  // --- Limpiar todo ---
  // Elimina el thread activo, la clave genérica legacy y cualquier
  // thread_id:* huérfano de chatbots anteriores visitados en el mismo origen.
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt');
      localStorage.removeItem('thread_id');
      localStorage.removeItem('fontSize');
      const orphanKeys = Object.keys(localStorage).filter(k => k.startsWith('thread_id:'));
      orphanKeys.forEach(k => localStorage.removeItem(k));
    }
  },
};
