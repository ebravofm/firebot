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
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useChatbotConfig } from "@/lib/chatbot-config-context";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenuOptions } from "@/components/DropdownMenuOptions";
import { InfoModal } from "@/components/InfoModal";
import { ConversationClosed, WaitingForHuman } from "@/components/ConversationClosed";
import { ChatHeader } from "@/components/ChatHeader";
import { X } from "lucide-react";
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
    // El token del widget viaja en cada petición a /api/chat, que ahora lo exige y verifica
    // antes de invocar la IA. Sin esto el endpoint quedaba abierto a cualquiera.
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: (): Record<string, string> => {
        const jwt = storage.getJWT();
        return jwt ? { Authorization: `Bearer ${jwt}` } : {};
      },
    }),
  });
  const runtime = useAISDKRuntime(chat);
  const router = useRouter();
  const [takenByHuman, setTakenByHuman] = useState<boolean>(false);
  // El visitante pidió una persona y todavía nadie toma la conversación.
  const [esperandoHumano, setEsperandoHumano] = useState<boolean>(false);
  // Fecha de cierre. Null mientras siga abierta.
  const [cerradaEn, setCerradaEn] = useState<string | null>(null);

  // Estado: tamaño de fuente (zoom)
  const [fontSize, setFontSize] = useState<number>(storage.getFontSize());

  // Estado: modal de información
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Estado: rating/valoración
  const [showRating, setShowRating] = useState(false);
  const [ratingConfig, setRatingConfig] = useState<{ enabled: boolean; autoCloseTime: number } | null>(null);
  // La valoración ya se resolvió en esta conversación: se envió o el visitante la descartó.
  // Evita volver a ofrecérsela y separa "la respondió" de "no quiso responderla".
  const [valoracionResuelta, setValoracionResuelta] = useState(false);

  // Detectar si viene del widget externo (source=widget) vs plataforma (preview/test)
  const [isExternalWidget, setIsExternalWidget] = useState(false);
  const [showResetButton, setShowResetButton] = useState(true);
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
    // Se limpia el estado del traspaso antes de navegar: si no, el pie de "conversación
    // finalizada" queda pintado sobre la conversación nueva hasta el siguiente polling.
    setCerradaEn(null);
    setEsperandoHumano(false);
    setTakenByHuman(false);
    setShowRating(false);
    setValoracionResuelta(false);
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

  // Estado en vivo del hilo por polling al servidor de firebot.
  //
  // Antes esto era una suscripción realtime de Supabase con la clave anon en el navegador,
  // que exponía toda la BD (fuga cross-tenant). El visitante es anónimo y ya no toca la BD:
  // consulta /api/thread-status, que lee con service_role del lado servidor. El polling
  // cubre lo mismo que el realtime: detectar el takeover humano (para pausar la IA) y pintar
  // en vivo los mensajes que escribe el agente.
  useEffect(() => {
    if (!chatId) return;

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Marca del último mensaje ya visto, para pedir solo lo nuevo.
    let lastSeenAt: string | null = null;

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
        return [{ type: 'text', text: raw }];
      }
      if (raw && typeof raw === 'object') return [raw as unknown];
      return [];
    };

    type ThreadStatus = {
      taken_by_user_system: number | null;
      human_requested_at: string | null;
      closed_at: string | null;
      messages: Array<{ id: string; role: string; parts: unknown; content?: string; created_at?: string }>;
    };

    const applyMessage = (row: { id: string; role: string; parts: unknown; content?: string }, humanActive: boolean) => {
      const parts = coerceParts(row.parts ?? row.content);
      // Mismo filtro que antes: con humano activo solo se pintan los mensajes marcados
      // como humanos; con IA activa el propio stream ya trae los del asistente.
      if (row.role === 'assistant' && humanActive && !isHumanProvider(parts)) return;

      const contentText = typeof row.content === 'string' ? row.content : '';
      const finalParts = hasTextPart(parts) ? parts : [{ type: 'text', text: contentText }];
      const incoming = {
        id: row.id,
        role: row.role as 'system' | 'user' | 'assistant',
        parts: finalParts,
      } as UIMessage;

      chat.setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    };

    const poll = async () => {
      try {
        const url = `/api/thread-status?chatId=${encodeURIComponent(chatId)}${lastSeenAt ? `&after=${encodeURIComponent(lastSeenAt)}` : ''}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = (await res.json()) as ThreadStatus;
          const humanActive = data.taken_by_user_system != null;
          setTakenByHuman(humanActive);
          setEsperandoHumano(data.human_requested_at != null && !humanActive);
          setCerradaEn(data.closed_at ?? null);
          for (const row of data.messages) {
            if (row.created_at && (!lastSeenAt || row.created_at > lastSeenAt)) {
              lastSeenAt = row.created_at;
            }
            applyMessage(row, humanActive);
          }
        }
      } catch (e) {
        console.warn('[Assistant] poll thread-status falló', e);
      } finally {
        if (isMounted) timer = setTimeout(poll, 4000);
      }
    };

    // La primera lectura fija el estado inicial de takeover; a partir de ahí pide solo lo nuevo.
    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [chat, chatId]);

  // Lógica de inactividad para mostrar rating automáticamente
  // Se activa cada vez que cambia el número de mensajes
  const messageCount = chat.messages?.length || 0;
  useEffect(() => {
    if (!ratingConfig?.enabled || valoracionResuelta || showRating) return;
    // Solo activar timer si hay al menos 2 mensajes (usuario + asistente)
    if (messageCount < 2) return;

    const delayMs = (ratingConfig.autoCloseTime || 1) * 60 * 1000;
    console.log(`[Assistant] Rating timer started: ${delayMs / 1000}s after ${messageCount} messages`);

    const timer = setTimeout(() => {
      console.log('[Assistant] Rating timer fired! Showing overlay');
      setShowRating(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [messageCount, ratingConfig, valoracionResuelta, showRating]);

  // Cerrar la conversación es el momento natural para pedir la valoración: la atención
  // terminó y el visitante todavía está mirando. Si el negocio no la tiene activa, o ya
  // valoró, no se muestra nada y el pie de "finalizada" queda solo.
  useEffect(() => {
    if (!cerradaEn) return;
    if (!ratingConfig?.enabled || valoracionResuelta) return;
    setShowRating(true);
  }, [cerradaEn, ratingConfig, valoracionResuelta]);

  // Handler para enviar la valoración
  const handleRatingSubmit = async (rating: number, comment: string) => {
    // Solo guardar en BD si viene del widget externo (no desde la plataforma/test)
    if (!isExternalWidget) {
      console.log('[Assistant] Rating desde plataforma (test) - no se guarda en BD');
      setValoracionResuelta(true);
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
      setValoracionResuelta(true);
      console.log('[Assistant] Rating submitted successfully (widget externo)');
    } catch (err) {
      console.error('[Assistant] Error submitting rating:', err);
      throw err;
    }
  };

  // Al cerrar el rating → reiniciar el chat de forma instantánea
  const handleRatingClose = () => {
    // Cerrar la valoración no arranca una conversación nueva. Antes sí lo hacía, y eso le
    // borraba el historial al visitante sin que lo hubiera pedido: si la conversación terminó
    // verá el aviso de finalizada con el botón para empezar de nuevo, y si no terminó puede
    // seguir escribiendo donde estaba. Empezar de cero es una decisión suya, no del temporizador.
    setShowRating(false);
    setValoracionResuelta(true);
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

            {/* Mientras la petición de humano está en cola. Desaparece sola cuando alguien
                la toma o cuando se cierra la conversación. */}
            {esperandoHumano && !cerradaEn && (
              <WaitingForHuman primaryColor={wa?.primary_color ?? undefined} />
            )}

            <div className="flex-1 overflow-hidden relative">
              <Thread
                welcomeTitle={welcomeTitle}
                welcomeSubtitle={welcomeSubtitle}
                welcomeSuggestions={welcomeSuggestions}
                showPoweredBy={showPoweredBy}
                footerOverride={
                  cerradaEn ? (
                    <ConversationClosed
                      onNewConversation={() => void handleResetChat()}
                      primaryColor={wa?.primary_color ?? undefined}
                    />
                  ) : undefined
                }
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
