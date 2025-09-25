"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from "ai";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { ENV_CONFIG } from "@/lib/env";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenuOptions } from "@/components/DropdownMenuOptions";
import { InfoModal } from "@/components/InfoModal";
import { supabase } from "@/lib/supabase-client";

export const Assistant = ({
  chatId,
  initialMessages,
  welcomeTitle,
  welcomeSubtitle,
  welcomeSuggestions,
  openingMessage,
}: {
  chatId?: string;
  initialMessages?: UIMessage[];
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeSuggestions: Array<{ label: string; title: string; action: string }>;
  openingMessage?: string;
}) => {
  const chat = useChat({ id: chatId, messages: initialMessages });
  const runtime = useAISDKRuntime(chat);
  const router = useRouter();
  const [takenByHuman, setTakenByHuman] = useState<boolean>(false);

  // Estado: tamaño de fuente (zoom)
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cookies = document.cookie.split(';');
      const fontSizeCookie = cookies.find(cookie => cookie.trim().startsWith('fontSize='));
      return fontSizeCookie ? parseInt(fontSizeCookie.split('=')[1], 10) : 16;
    }
    return 16;
  });

  // Estado: modal de información
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Aplicar zoom al body y persistir en cookies
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.fontSize = `${fontSize}px`;
      document.cookie = `fontSize=${fontSize}; path=/; max-age=31536000`;
    }
  }, [fontSize]);

  const handleZoomIn = () => setFontSize((prev) => Math.min(prev + 2, 32));
  const handleZoomOut = () => setFontSize((prev) => Math.max(prev - 2, 10));

  // Reiniciar chat: limpiar cookies y navegar a /chat para crear nuevo thread
  const handleResetChat = async () => {
    if (typeof window !== 'undefined') {
      document.cookie = 'thread_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
      if (typeof document !== "undefined") {
      document.cookie = 'fontSize=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    router.push("/chat");
  };

  const handleShowInfo = () => setIsInfoModalOpen(true);
  const handleCloseInfoModal = () => setIsInfoModalOpen(false);

  // Simular un mensaje de streaming simple cuando el thread es nuevo
  const welcomeStartedRef = useRef(false);

  useEffect(() => {
    console.log(`[Assistant] useEffect triggered with chat.id: ${chat.id}, openingMessage: ${openingMessage?.substring(0, 30)}`);
    console.log(`[Assistant] initialMessages length: ${initialMessages?.length || 0}`);
    console.log(`[Assistant] welcomeStartedRef.current: ${welcomeStartedRef.current}`);
    
    const isNewThread = !initialMessages || initialMessages.length === 0;
    if (!isNewThread || welcomeStartedRef.current || !openingMessage?.trim()) {
      console.log(`[Assistant] useEffect early return - isNewThread: ${isNewThread}, welcomeStarted: ${welcomeStartedRef.current}, hasOpeningMessage: ${!!openingMessage?.trim()}`);
      return;
    }

    console.log(`[Assistant] Starting welcome message simulation`);
    welcomeStartedRef.current = true;

    const simulateStreamingMessage = async (text: string) => {
      const messageId = "opening-message";
      const tokens = text.split(" ");

      // Crear el mensaje inicial vacío
      console.log(`[Assistant] Creating initial empty message with ID: ${messageId}`);
      chat.setMessages([
        {
          id: messageId,
          role: "assistant",
          parts: [{ type: "text", text: "" }],
        },
      ]);

      // Rellenar progresivamente el contenido
      for (let i = 0; i < tokens.length; i += 2) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        chat.setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  parts: [
                    { type: "text", text: tokens.slice(0, Math.min(i + 2, tokens.length)).join(" ") },
                  ],
                }
              : m
          )
        );
      }
    };

    simulateStreamingMessage(openingMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, openingMessage]);

  // Suscripción en tiempo real a nuevos mensajes y cambios del thread
  useEffect(() => {
    if (!chatId) return;

    let isMounted = true;
    let messagesChannel: ReturnType<typeof supabase.channel> | null = null;
    let threadChannel: ReturnType<typeof supabase.channel> | null = null;

    // Cargar estado inicial del thread
    (async () => {
      try {
        const { data } = await supabase
          .from('threads')
          .select('id, taken_by_user_system')
          .eq('id', chatId)
          .single();
        if (!isMounted) return;
        setTakenByHuman(!!data?.taken_by_user_system);
      } catch (e) {
        console.warn('[Assistant] failed to fetch initial thread state', e);
      }
    })();

    const isHumanProvider = (parts: unknown[]): boolean => {
      if (!Array.isArray(parts)) return false;
      return parts.some((p: unknown) => {
        if (!p || typeof p !== 'object') return false;
        const pm = (p as { providerMetadata?: { human?: unknown } }).providerMetadata;
        return !!(pm && 'human' in pm);
      });
    };

    const isAIProvider = (parts: unknown[]): boolean => {
      if (!Array.isArray(parts)) return false;
      return parts.some((p: unknown) => {
        if (!p || typeof p !== 'object') return false;
        const obj = p as { providerMetadata?: { openai?: unknown }; type?: string };
        return !!(obj.providerMetadata && 'openai' in obj.providerMetadata) || obj.type === 'step-start';
      });
    };

    const hasTextPart = (parts: unknown[]): boolean => {
      if (!Array.isArray(parts)) return false;
      return parts.some((p: unknown) => {
        if (!p || typeof p !== 'object') return false;
        const obj = p as { type?: string; text?: string };
        return obj.type === 'text' && typeof obj.text === 'string' && obj.text.length > 0;
      });
    };

    const coerceParts = (raw: unknown): unknown[] => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try { const parsed = JSON.parse(trimmed); return Array.isArray(parsed) ? parsed : [parsed]; } catch { /* fallthrough */ }
        }
        // string plano: crear part de texto
        return [{ type: 'text', text: raw }];
      }
      if (raw && typeof raw === 'object') return [raw as unknown];
      return [];
    };

    // Primero, suscribir a cambios del thread (por si cambia el control humano)
    threadChannel = supabase
      .channel(`thread-${chatId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'threads', filter: `id=eq.${chatId}` }, (payload) => {
        if (!isMounted) return;
        const newRow = payload.new as { taken_by_user_system?: number | null };
        const taken = newRow?.taken_by_user_system != null;
        setTakenByHuman(taken);
        console.log('[Assistant] thread updated, taken_by_user_system:', taken);
      })
      .subscribe();

    // Luego, suscribir a inserts de mensajes del hilo
    messagesChannel = supabase
      .channel(`messages-thread-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${chatId}` }, (payload) => {
        if (!isMounted) return;
        const row = payload.new as { id: string; role: string; parts: unknown; content?: string };
        const parts = coerceParts(row.parts ?? row.content);

        // Filtrar coherente con la lógica del cliente: mostrar user siempre; assistant según proveedor
        if (row.role === 'assistant') {
          if (takenByHuman) {
            // Humano activo: solo mensajes con metadata humana
            if (!isHumanProvider(parts)) return;
          } else {
            // IA activa: permitir cualquier assistant; si no hay parts válidos, crear desde content
            // No filtramos por provider para no perder mensajes que lleguen solo con texto
            if (!hasTextPart(parts)) {
              // si no hay part de texto, intentar crear uno desde content ya hecho por coerceParts
            }
          }
        }

        // Asegurar que siempre haya al menos un part de texto visible
        const contentText = (() => {
          const candidate = (payload.new as { content?: unknown })?.content;
          return typeof candidate === 'string' ? candidate : '';
        })();
        const finalParts = hasTextPart(parts)
          ? parts
          : [{ type: 'text', text: contentText }];

        const incoming = {
          id: row.id,
          role: (row.role as 'system' | 'user' | 'assistant'),
          parts: finalParts,
        } as UIMessage;

        // Evitar duplicados por id
        chat.setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (messagesChannel) supabase.removeChannel(messagesChannel);
      if (threadChannel) supabase.removeChannel(threadChannel);
    };
  }, [chat, chatId, takenByHuman]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          {ENV_CONFIG.NEXT_PUBLIC_SHOW_SIDEBAR && <AppSidebar />}
          <SidebarInset>
            {ENV_CONFIG.NEXT_PUBLIC_SHOW_HEADER && (
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                {ENV_CONFIG.NEXT_PUBLIC_SHOW_SIDEBAR && (
                  <>
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                  </>
                )}
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="https://firebot.cl" target="_blank" rel="noopener noreferrer">
                          FireBot Assistant
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>AI Chat Interface</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </header>
            )}
            <div className="flex-1 overflow-hidden">
              <Thread 
                welcomeTitle={welcomeTitle} 
                welcomeSubtitle={welcomeSubtitle}
                welcomeSuggestions={welcomeSuggestions}
              />
            </div>
          </SidebarInset>
        </div>

        {/* Botón flotante de opciones */}
        <div className="fixed top-4 right-4 z-50">
          <DropdownMenuOptions 
            onReset={handleResetChat}
            onInfo={handleShowInfo}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        </div>

        {/* Modal de información */}
        <InfoModal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} />
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
