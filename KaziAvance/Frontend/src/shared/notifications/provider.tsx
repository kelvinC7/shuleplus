"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "./toast";

export function NotificationProvider({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
