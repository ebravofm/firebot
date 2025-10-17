import { ENV_CONFIG } from './env';
import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';

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

export type JWTPayload = {
  chatbot_id: number;
  [key: string]: unknown;
};

// ============================================================================
// FUNCIONES DE JWT EN LOCALSTORAGE
// ============================================================================
export function getTokenFromStorage(): string | null {
  const token = getItem(STORAGE_KEYS.JWT);
  console.log('Token from localStorage:', token ? '***' : null);
  return token;
}

export function setTokenInStorage(token: string): void {
  setItem(STORAGE_KEYS.JWT, token);
  console.log('🎫 JWT guardado en localStorage');
}

export function removeTokenFromStorage(): void {
  removeItem(STORAGE_KEYS.JWT);
  console.log('🗑️ JWT eliminado de localStorage');
}

/**
 * Decodifica un JWT y extrae el payload
 */
function decodeJWT(token: string): JWTPayload | null {
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

export function getChatbotIdFromJWT(): string | null {
  const jwtToken = getTokenFromStorage();
  
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

export function setThreadIdInStorage(threadId: string): void {
  setItem(STORAGE_KEYS.THREAD_ID, threadId);
}

export function getThreadIdFromStorage(): string | null {
  return getItem(STORAGE_KEYS.THREAD_ID);
}

export function removeThreadIdFromStorage(): void {
  removeItem(STORAGE_KEYS.THREAD_ID);
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

    // Obtener JWT token de localStorage
    const jwtToken = getTokenFromStorage();
    
    // Verificar que tenemos JWT token
    if (!jwtToken) {
      console.error('❌ getChatbotConfig: No JWT token found');
      return null;
    }

    // Extraer chatbot_id del JWT
    const chatbotId = getChatbotIdFromJWT();
    
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
