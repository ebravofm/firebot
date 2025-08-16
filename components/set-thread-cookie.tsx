"use client";

import { useEffect } from "react";

export function SetThreadCookie({ id }: { id: string }) {
  useEffect(() => {
    document.cookie = `thread_id=${id}; path=/; max-age=31536000`;
  }, [id]);
  return null;
}


