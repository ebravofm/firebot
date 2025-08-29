import { redirect } from "next/navigation";
import { createChat } from "@/lib/chat-store";

// Forzar renderizado dinámico para evitar errores de prerenderizado
export const dynamic = 'force-dynamic';

export default async function Page() {
  const id = await createChat();
  redirect(`/chat/${id}`);
}


