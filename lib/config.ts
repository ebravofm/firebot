export function setThreadIdInBrowserCookies(threadId: string): void {
  if (typeof window !== 'undefined') {
    document.cookie = `thread_id=${threadId}; path=/; max-age=31536000`; // 1 año
  }
}

export function getThreadIdFromBrowserCookies(): string | null {
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split(';');
    const threadCookie = cookies.find(cookie => cookie.trim().startsWith('thread_id='));
    if (threadCookie) {
      return threadCookie.split('=')[1];
    }
  }
  return null;
}

export function getJWTFromBrowserCookies(): string | null {
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split(';');
    const jwtCookie = cookies.find(cookie => cookie.trim().startsWith('jwt='));
    if (jwtCookie) {
      return jwtCookie.split('=')[1];
    }
  }
  return null;
}

export function removeThreadIdFromBrowserCookies(): void {
  if (typeof window !== 'undefined') {
    document.cookie = 'thread_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

// Configuración de entorno
export const BACKEND_URL: string = process.env.BACKEND_URL || 'http://localhost:8080';
