import { redirect } from "next/navigation";
import { createChat } from "@/lib/chat-store";
import { getChatbotConfig } from "@/lib/config";

// Forzar renderizado dinámico para evitar errores de prerenderizado
export const dynamic = 'force-dynamic';

export default async function Page() {
  // Verificar configuración antes de crear chat
  const chatbotConfig = await getChatbotConfig();
  if (!chatbotConfig) {
    console.error('❌ No chatbot config available - redirecting to error page');
    redirect('/error-access');
  }
  
  // Crear chat y redirigir (sin try-catch para no interceptar NEXT_REDIRECT)
  const id = await createChat();
  redirect(`/chat/${id}`);
}


