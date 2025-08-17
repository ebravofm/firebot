import { loadChat } from "@/lib/chat-store";
import { Assistant } from "@/app/assistant";
import { SetThreadCookie } from "../../../components/set-thread-cookie";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const messages = await loadChat(id);
  return (
    <>
      <SetThreadCookie id={id} />
      <Assistant chatId={id} initialMessages={messages} />
    </>
  );
}


