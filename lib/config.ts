import { cookies } from 'next/headers';
import { ENV_CONFIG } from './env';

// ============================================================================
// TIPOS
// ============================================================================
export type ChatbotConfig = {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  primary_language_id: number;
  created_at: string;
  updated_at: string;
  system_prompt: string;
  welcome_message: string;
  initial_message: string;
  welcome_suggestions: Array<{
    label: string;
    title: string;
    action: string;
  }>;
  rag_collections: number[];
};

// ============================================================================
// FUNCIONES DE COOKIES
// ============================================================================
export async function getTokenFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt')?.value || null;
  console.log('Token from cookies:', token);
  return token;
}

export async function getChatbotIdFromCookies() {
  const cookieStore = await cookies();
  const chatbotId = cookieStore.get('chatbot_id')?.value || null;
  console.log('Chatbot ID from cookies:', chatbotId);
  return chatbotId;
}

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

export function removeThreadIdFromBrowserCookies(): void {
  if (typeof window !== 'undefined') {
    document.cookie = 'thread_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

// ============================================================================
// SISTEMA DE CACHÉ
// ============================================================================
let configCache: ChatbotConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN DEL CHATBOT
// ============================================================================
export async function getChatbotConfig(): Promise<ChatbotConfig | null> {
  try {
    // Verificar caché
    const now = Date.now();
    if (configCache && now - lastFetchTime < CACHE_TTL) {
      console.log('getChatbotConfig: usando caché');
      return configCache;
    }

    // Obtener JWT y chatbot_id de las cookies
    const jwtToken = await getTokenFromCookies();
    const chatbotId = await getChatbotIdFromCookies();
    
    console.log('getChatbotConfig: jwt:', !!jwtToken, 'chatbot_id:', chatbotId);
    
    // Verificar que tenemos JWT token
    if (!jwtToken) {
      console.log('getChatbotConfig: error - no JWT token');
      return null;
    }

    // Verificar que tenemos chatbot_id
    if (!chatbotId) {
      console.log('getChatbotConfig: error - no chatbot_id');
      return null;
    }

    const url = `${ENV_CONFIG.BACKEND_URL}/chatbot-config/${chatbotId}`;
    console.log('getChatbotConfig: llamando a:', url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      console.log('getChatbotConfig: error HTTP:', response.status, response.statusText);
      return null;
    }

    const data: ChatbotConfig = await response.json();
    
    // Actualizar caché
    configCache = data;
    lastFetchTime = now;
    
    console.log('getChatbotConfig: configuración obtenida exitosamente');
    return data;
  } catch (error) {
    console.log('getChatbotConfig: error:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

export function clearChatbotConfigCache(): void {
  configCache = null;
  lastFetchTime = 0;
}
