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


export function removeThreadIdFromBrowserCookies(): void {
  if (typeof window !== 'undefined') {
    document.cookie = 'thread_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

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

  // Estado: tamaño de fuente (zoom)
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fontSize");
      return stored ? parseInt(stored, 10) : 16;
    }
    return 16;
  });

  // Estado: modal de información
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Aplicar zoom al body y persistir
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.fontSize = `${fontSize}px`;
      localStorage.setItem("fontSize", String(fontSize));
    }
  }, [fontSize]);

  const handleZoomIn = () => setFontSize((prev) => Math.min(prev + 2, 32));
  const handleZoomOut = () => setFontSize((prev) => Math.max(prev - 2, 10));

  // Reiniciar chat: limpiar cookie y navegar a /chat para crear nuevo thread
  const handleResetChat = async () => {
    removeThreadIdFromBrowserCookies();
    router.push("/chat");
  };

  const handleShowInfo = () => setIsInfoModalOpen(true);
  const handleCloseInfoModal = () => setIsInfoModalOpen(false);

  // Simular un mensaje de streaming simple cuando el thread es nuevo
  const welcomeStartedRef = useRef(false);

  useEffect(() => {
    const isNewThread = !initialMessages || initialMessages.length === 0;
    if (!isNewThread || welcomeStartedRef.current || !openingMessage?.trim()) return;

    welcomeStartedRef.current = true;

    const simulateStreamingMessage = async (text: string) => {
      const messageId = "opening-message";
      const tokens = text.split(" ");

      // Crear el mensaje inicial vacío
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
