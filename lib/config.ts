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

/**
 * Decodifica un JWT y extrae el payload
 */
function decodeJWT(token: string): any {
  try {
    // Un JWT tiene la estructura: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT inválido');
    }
    
    // Decodificar la parte del payload (base64url)
    const payload = parts[1];
    // Convertir base64url a base64 estándar
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Agregar padding si es necesario
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    // Decodificar y parsear JSON
    const decoded = JSON.parse(atob(padded));
    return decoded;
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
}

export async function getChatbotIdFromJWT() {
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get('jwt')?.value || null;
  
  if (!jwtToken) {
    console.log('getChatbotIdFromJWT: no JWT token found');
    return null;
  }
  
  const payload = decodeJWT(jwtToken);
  if (!payload) {
    console.log('getChatbotIdFromJWT: failed to decode JWT');
    return null;
  }
  
  const chatbotId = payload.chatbot_id;
  console.log('Chatbot ID extraído del JWT:', chatbotId);
  return chatbotId ? chatbotId.toString() : null;
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

    // Obtener JWT token (que contiene el chatbot_id embebido)
    const jwtToken = await getTokenFromCookies();
    
    // Verificar que tenemos JWT token
    if (!jwtToken) {
      console.error('❌ getChatbotConfig: No JWT token found');
      return null;
    }

    // Extraer chatbot_id del JWT
    const chatbotId = await getChatbotIdFromJWT();
    
    console.log('🔍 getChatbotConfig: jwt:', !!jwtToken, 'chatbot_id extraído del JWT:', chatbotId);
    
    // Verificar que pudimos extraer chatbot_id del JWT
    if (!chatbotId) {
      console.error('❌ getChatbotConfig: No se pudo extraer chatbot_id del JWT - token inválido');
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
