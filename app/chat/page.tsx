import { redirect } from "next/navigation";
import { createChat } from "@/util/chat-store";

export default async function Page() {
  const id = await createChat();
  redirect(`/chat/${id}`);
}


