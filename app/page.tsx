"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getThreadIdFromStorage } from "@/lib/config";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const threadId = getThreadIdFromStorage();
    if (threadId) {
      router.push(`/chat/${threadId}`);
    } else {
      router.push("/chat");
    }
  }, [router]);

  return null;
}
