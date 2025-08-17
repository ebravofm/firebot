import { UIMessage, createIdGenerator } from "ai";
import { saveChat } from "@/util/chat-store";
import { streamReactAgent } from "@/lib/agents/react-agent";

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatId: string | undefined = body.chatId ?? body.id;

  const result = streamReactAgent({ messages });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    onFinish: ({ messages }) => {
      if (chatId) {
        void saveChat({ chatId, messages });
      }
    },
  });
}
