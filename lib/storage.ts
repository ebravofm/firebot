// ============================================================================
// UTILIDADES DE LOCALSTORAGE (fallback para cookies en iframes)
// ============================================================================

/**
 * Guarda un valor en localStorage
 */
export function setItem(key: string, value: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error guardando en localStorage: ${key}`, error);
    }
  }
}

/**
 * Obtiene un valor de localStorage
 */
export function getItem(key: string): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error leyendo de localStorage: ${key}`, error);
      return null;
    }
  }
  return null;
}

/**
 * Elimina un valor de localStorage
 */
export function removeItem(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error eliminando de localStorage: ${key}`, error);
    }
  }
}

// ============================================================================
// CONSTANTES DE CLAVES
// ============================================================================
export const STORAGE_KEYS = {
  JWT: 'firebot_jwt',
  THREAD_ID: 'firebot_thread_id',
  FONT_SIZE: 'firebot_font_size',
} as const;

