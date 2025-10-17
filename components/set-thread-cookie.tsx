"use client";

import { useEffect } from "react";
import { setThreadIdInStorage } from "@/lib/config";

export function SetThreadCookie({ id }: { id: string }) {
  useEffect(() => {
    setThreadIdInStorage(id);
  }, [id]);
  return null;
}


