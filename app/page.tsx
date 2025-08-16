import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const threadId = cookieStore.get("thread_id")?.value;
  if (threadId) {
    redirect(`/chat/${threadId}`);
  }
  redirect("/chat");
}
