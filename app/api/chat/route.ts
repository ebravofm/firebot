import { UIMessage, createIdGenerator } from "ai";
import { saveChat } from "@/lib/chat-store";
import { streamReactAgent } from "@/lib/agents/react-agent";

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatId: string | undefined = body.chatId ?? body.id;
  const agentParams = { messages };
  const result = streamReactAgent({ messages: agentParams.messages });

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
