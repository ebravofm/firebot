import { storage } from './storage';
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

export type JWTPayload = {
  chatbot_id: number;
  [key: string]: unknown;
};

// ============================================================================
// FUNCIONES DE JWT
// ============================================================================
/**
 * Decodifica un JWT y extrae el payload.
 * Esta función es universal (cliente/servidor).
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

function getChatbotIdFromJWT(jwtToken: string): string | null {
  if (!jwtToken) {
    console.log('getChatbotIdFromJWT: no JWT token provided');
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

// ============================================================================
// SISTEMA DE CACHÉ
// ============================================================================
let configCache: ChatbotConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN DEL CHATBOT
// ============================================================================
export async function getChatbotConfig(jwtToken?: string | null): Promise<ChatbotConfig | null> {
  try {
    // Verificar caché
    const now = Date.now();
    if (configCache && now - lastFetchTime < CACHE_TTL) {
      console.log('getChatbotConfig: usando caché');
      return configCache;
    }

    // El token debe ser provisto explícitamente o se obtiene de localStorage en el cliente.
    // Si jwtToken es null/undefined, la llamada a storage.getJWT() solo funcionará
    // en un entorno de cliente.
    const token = jwtToken ?? (typeof window !== 'undefined' ? storage.getJWT() : null);
    
    if (!token) {
      console.error('❌ getChatbotConfig: No JWT token found');
      return null;
    }

    const chatbotId = getChatbotIdFromJWT(token);
    
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
        "Authorization": `Bearer ${token}`,
        ...(typeof document !== 'undefined' && document.referrer
          ? { "X-Embedding-Origin": document.referrer }
          : {}),
      },
    });

    if (!response.ok) {
      console.log('getChatbotConfig: error HTTP:', response.status, response.statusText);
      return null;
    }

    const data: ChatbotConfig = await response.json();
    
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
