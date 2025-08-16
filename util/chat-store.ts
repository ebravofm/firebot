import { generateId, type UIMessage } from "ai";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import path from "path";

function getChatFile(id: string): string {
  const chatDir = path.join(process.cwd(), ".chats");
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true });
  return path.join(chatDir, `${id}.json`);
}

export async function createChat(): Promise<string> {
  const id = generateId();
  await writeFile(getChatFile(id), "[]");
  return id;
}

export async function loadChat(id: string): Promise<UIMessage[]> {
  try {
    const content = await readFile(getChatFile(id), "utf8");
    return JSON.parse(content) as UIMessage[];
  } catch {
    return [];
  }
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const content = JSON.stringify(messages, null, 2);
  await writeFile(getChatFile(chatId), content, "utf8");
}


