// lib/storage.ts
"use client";

// Helpers para localStorage. Se añade "if (typeof window !== 'undefined')" 
// para evitar errores durante el Server-Side Rendering (SSR), ya que 
// localStorage solo existe en el navegador.

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

  // --- Thread ID ---
  getThreadId: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('thread_id');
    }
    return null;
  },
  setThreadId: (id: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thread_id', id);
    }
  },

  // --- Font Size (Zoom) ---
  getFontSize: (): number => {
    if (typeof window !== 'undefined') {
      const size = localStorage.getItem('fontSize');
      return size ? parseInt(size, 10) : 16; // Default 16px
    }
    return 16;
  },
  setFontSize: (size: number): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fontSize', size.toString());
    }
  },
  
  // --- Limpiar todo ---
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt');
      localStorage.removeItem('thread_id');
      localStorage.removeItem('fontSize');
    }
  },
};
