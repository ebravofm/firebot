import { UIMessage, createIdGenerator } from "ai";
import { saveChat } from "@/lib/chat-store";
import { streamReactAgent } from "@/lib/agents/react-agent";

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatId: string | undefined = body.chatId ?? body.id;
  
  console.log(`[API] POST /api/chat called with chatId: ${chatId}`);
  console.log(`[API] Received ${messages.length} messages:`, messages.map(m => ({ id: m.id, role: m.role, content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) })));
  
  const agentParams = { messages };
  const result = await streamReactAgent({ messages: agentParams.messages });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ size: 16 }),
    onFinish: ({ messages }) => {
      console.log(`[API] onFinish called with ${messages.length} messages for chatId: ${chatId}`);
      console.log(`[API] Messages in onFinish:`, messages.map(m => ({ id: m.id, role: m.role, content: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) })));
      
      if (chatId) {
        void saveChat({ chatId, messages });
      }
    },
  });
}
