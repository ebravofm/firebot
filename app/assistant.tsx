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
import { useChatbotConfig } from "@/lib/chatbot-config-context";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenuOptions } from "@/components/DropdownMenuOptions";
import { InfoModal } from "@/components/InfoModal";
import { ChatHeader } from "@/components/ChatHeader";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { storage } from "@/lib/storage";
import { RatingOverlay } from "@/components/RatingOverlay";

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
  const { ui, config: chatbotConfig } = useChatbotConfig();
  const wa = ui.widget_appearance;
  // Obtener JWT una vez al montar el componente
  // const jwtToken = storage.getJWT();
  
  const chat = useChat({ 
    id: chatId, 
    messages: initialMessages,
  });
  const runtime = useAISDKRuntime(chat);
  const router = useRouter();
  const [takenByHuman, setTakenByHuman] = useState<boolean>(false);

  // Estado: tamaño de fuente (zoom)
  const [fontSize, setFontSize] = useState<number>(storage.getFontSize());

  // Estado: modal de información
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Estado: rating/valoración
  const [showRating, setShowRating] = useState(false);
  const [ratingConfig, setRatingConfig] = useState<{ enabled: boolean; autoCloseTime: number } | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Detectar si viene del widget externo (source=widget) vs plataforma (preview/test)
  const [isExternalWidget, setIsExternalWidget] = useState(false);
  const [showResetButton, setShowResetButton] = useState(false);
  const showPoweredBy = ui.show_powered_by;
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isExternal = params.get('source') === 'widget';
      setIsExternalWidget(isExternal);
      console.log(`[Assistant] Source: ${isExternal ? 'widget externo' : 'plataforma (test)'}`);
    }
  }, []);

  useEffect(() => {
    if (!chatbotConfig?.workspace_id) return;
    import('@/lib/config').then(({ fetchWidgetBehavior }) => {
      fetchWidgetBehavior(chatbotConfig.workspace_id).then((b) => {
        setShowResetButton(b.show_reset_button);
      });
    });
  }, [chatbotConfig?.workspace_id]);

  // Detectar si estamos en un iframe (widget embebido)
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Barra superior en móvil embebido (widget fullscreen)
  const [showMobileBar, setShowMobileBar] = useState(false);
  useEffect(() => {
    const embedded = typeof window !== "undefined" && window.self !== window.top;
    setIsEmbedded(embedded);
    const mql = window.matchMedia("(max-width: 480px)");
    const update = () => setShowMobileBar(embedded && mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Recargar cuando el dashboard notifica que la config fue actualizada
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CONFIG_UPDATED') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch rating config via API route (evita CORS con backend directo)
  useEffect(() => {
    if (!chatbotConfig?.workspace_id) return;
    const jwt = storage.getJWT();

    const fetchRatingConfig = async () => {
      try {
        const res = await fetch(`/api/rating-config?workspace_id=${chatbotConfig.workspace_id}`, {
          headers: {
            ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          console.log('[Assistant] Rating config response:', data);
          if (data?.is_enabled) {
            console.log('[Assistant] Rating config loaded:', data);
            setRatingConfig({
              enabled: true,
              autoCloseTime: parseFloat(data.auto_close_time || '1'),
            });
          } else {
            console.log('[Assistant] Rating not enabled or no config found');
          }
        } else {
          console.warn('[Assistant] Rating config fetch failed:', res.status);
        }
      } catch (err) {
        console.warn('[Assistant] Could not fetch rating config:', err);
      }
    };
    fetchRatingConfig();
  }, [chatbotConfig?.workspace_id]);

  // Aplicar zoom al body y persistir en localStorage
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.fontSize = `${fontSize}px`;
      storage.setFontSize(fontSize);
    }
  }, [fontSize]);

  const handleZoomIn = () => setFontSize((prev) => Math.min(prev + 2, 32));
  const handleZoomOut = () => setFontSize((prev) => Math.max(prev - 2, 10));

  // Reiniciar chat: eliminar solo thread_id y navegar a /chat para crear nuevo thread
  const handleResetChat = async () => {
    storage.removeThreadId();
    router.push("/chat");
  };

  const handleShowInfo = () => setIsInfoModalOpen(true);
  const handleCloseInfoModal = () => setIsInfoModalOpen(false);
  const handleCloseWidget = () => window.parent?.postMessage?.({ type: "CLOSE_WIDGET" }, "*");

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

  // Lógica de inactividad para mostrar rating automáticamente
  // Se activa cada vez que cambia el número de mensajes
  const messageCount = chat.messages?.length || 0;
  useEffect(() => {
    if (!ratingConfig?.enabled || ratingSubmitted || showRating) return;
    // Solo activar timer si hay al menos 2 mensajes (usuario + asistente)
    if (messageCount < 2) return;

    const delayMs = (ratingConfig.autoCloseTime || 1) * 60 * 1000;
    console.log(`[Assistant] Rating timer started: ${delayMs / 1000}s after ${messageCount} messages`);

    const timer = setTimeout(() => {
      console.log('[Assistant] Rating timer fired! Showing overlay');
      setShowRating(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [messageCount, ratingConfig, ratingSubmitted, showRating]);

  // Handler para enviar la valoración
  const handleRatingSubmit = async (rating: number, comment: string) => {
    // Solo guardar en BD si viene del widget externo (no desde la plataforma/test)
    if (!isExternalWidget) {
      console.log('[Assistant] Rating desde plataforma (test) - no se guarda en BD');
      setRatingSubmitted(true);
      return;
    }

    const jwt = storage.getJWT();
    try {
      await fetch('/api/rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({
          workspace_id: chatbotConfig?.workspace_id,
          thread_id: chatId || null,
          chatbot_id: chatbotConfig?.id || null,
          rating,
          comment: comment || null,
          user_session_id: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('scrivot-session-id') : null,
        }),
      });
      setRatingSubmitted(true);
      console.log('[Assistant] Rating submitted successfully (widget externo)');
    } catch (err) {
      console.error('[Assistant] Error submitting rating:', err);
      throw err;
    }
  };

  // Al cerrar el rating → reiniciar el chat de forma instantánea
  const handleRatingClose = () => {
    // Limpiar mensajes inmediatamente para que no se vea el chat anterior
    chat.setMessages([]);
    setShowRating(false);
    setRatingSubmitted(false);
    // Navegar a nuevo chat
    storage.removeThreadId();
    router.replace("/chat");
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          {ui.show_sidebar && <AppSidebar />}
          <SidebarInset>
            {/* Widget-style header: always show when embedded, use ChatHeader */}
            {isEmbedded ? (
              <ChatHeader
                onClose={handleCloseWidget}
                onReset={showResetButton ? handleResetChat : undefined}
              />
            ) : ui.show_header ? (
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                {ui.show_sidebar && (
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
            ) : null}
            {/* Banner de notificación si está configurado */}
            {ui.banner_text_enable && ui.banner_text && (
              <div
                className="px-4 py-2 text-xs text-center font-medium shrink-0"
                style={{
                  backgroundColor: wa?.primary_color ? `${wa.primary_color}1a` : 'var(--muted)',
                  color: wa?.primary_color ?? 'var(--foreground)',
                  borderBottom: `1px solid ${wa?.primary_color ? `${wa.primary_color}33` : 'var(--border)'}`,
                }}
              >
                {ui.banner_text}
              </div>
            )}

            <div className="flex-1 overflow-hidden relative">
              <Thread
                welcomeTitle={welcomeTitle}
                welcomeSubtitle={welcomeSubtitle}
                welcomeSuggestions={welcomeSuggestions}
                showPoweredBy={showPoweredBy}
              />
              {/* Rating overlay - se muestra sobre el chat */}
              {showRating && (
                <RatingOverlay
                  onClose={handleRatingClose}
                  onSubmit={handleRatingSubmit}
                  primaryColor={wa?.primary_color ?? undefined}
                />
              )}
            </div>
          </SidebarInset>
        </div>

        {/* Botón flotante de opciones cuando no estamos embebidos */}
        {!isEmbedded && (
          <div className="fixed top-4 right-4 z-50">
            <DropdownMenuOptions
              onReset={handleResetChat}
              onInfo={handleShowInfo}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          </div>
        )}

        {/* Modal de información */}
        <InfoModal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} />
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
