// Tipos para la base de datos de Supabase

export interface Database {
  public: {
    Tables: {
      threads: {
        Row: {
          id: string;
          workspace_id: number; // NUEVO
          chat_user_id: string | null; // NUEVO
          chatbot_id: number | null; // NUEVO
          user_rating: number | null; // NUEVO
          ai_summary: string | null; // NUEVO
          flag: boolean; // NUEVO
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: number; // NUEVO
          chat_user_id?: string | null; // NUEVO
          chatbot_id?: number | null; // NUEVO
          user_rating?: number | null; // NUEVO
          ai_summary?: string | null; // NUEVO
          flag?: boolean; // NUEVO
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: number; // NUEVO
          chat_user_id?: string | null; // NUEVO
          chatbot_id?: number | null; // NUEVO
          user_rating?: number | null; // NUEVO
          ai_summary?: string | null; // NUEVO
          flag?: boolean; // NUEVO
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          thread_id: string | null; // CAMBIADO: ahora puede ser null
          role: string;
          content: string; // Mantener como string para compatibilidad
          parts: unknown[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string | null; // CAMBIADO: ahora puede ser null
          role: string;
          content: string;
          parts: unknown[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string | null; // CAMBIADO: ahora puede ser null
          role?: string;
          content?: string;
          parts?: unknown[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Tipos para mensajes de chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts: unknown[];
  timestamp: Date;
}

// Tipos para threads/conversaciones
export interface ChatThread {
  id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
  message_count: number;
}
