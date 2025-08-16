import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages, createIdGenerator } from "ai";
import { saveChat } from "@/util/chat-store";

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatId: string | undefined = body.chatId ?? body.id;

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
  });

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
