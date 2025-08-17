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

export const Assistant = ({
  chatId,
  initialMessages,
  welcomeTitle,
  welcomeSubtitle,
  welcomeSuggestions,
}: {
  chatId?: string;
  initialMessages?: UIMessage[];
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeSuggestions: Array<{ label: string; title: string; action: string }>;
}) => {
  const chat = useChat({ id: chatId, messages: initialMessages });
  const runtime = useAISDKRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
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
            <div className="flex-1 overflow-hidden">
              <Thread 
                welcomeTitle={welcomeTitle} 
                welcomeSubtitle={welcomeSubtitle}
                welcomeSuggestions={welcomeSuggestions}
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
