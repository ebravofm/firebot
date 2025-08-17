// Tipos para la base de datos de Supabase

export interface Database {
  public: {
    Tables: {
      threads: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          role: string;
          content: string;
          parts: unknown[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          role: string;
          content: string;
          parts: unknown[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
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
