import { loadChat } from "@/lib/chat-store";
import { Assistant } from "@/app/assistant";
import { SetThreadCookie } from "../../../components/set-thread-cookie";
import { getChatbotConfig } from "@/lib/config";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const messages = await loadChat(id);
  
  // Cargar configuración del chatbot
  const chatbotConfig = await getChatbotConfig();
  
  // Separar el welcome message en dos partes
  const welcomeMessage = chatbotConfig?.welcome_message || "Hola!\n¿En qué puedo ayudarte hoy?";
  const firstLine = welcomeMessage.split('\n')[0] || welcomeMessage;
  const remainingLines = welcomeMessage.split('\n').slice(1).join('\n') || '';
  
  // Obtener welcome suggestions
  const welcomeSuggestions = chatbotConfig?.welcome_suggestions || [];
  
  return (
    <>
      <SetThreadCookie id={id} />
      <Assistant 
        chatId={id} 
        initialMessages={messages}
        welcomeTitle={firstLine}
        welcomeSubtitle={remainingLines}
        welcomeSuggestions={welcomeSuggestions}
        openingMessage={chatbotConfig?.initial_message}
      />
    </>
  );
}


