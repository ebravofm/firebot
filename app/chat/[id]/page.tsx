import { loadChat } from "@/util/chat-store";
import { Assistant } from "@/app/assistant";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const messages = await loadChat(id);
  return <Assistant chatId={id} initialMessages={messages} />;
}


