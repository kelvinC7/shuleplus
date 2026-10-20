export type ToastType = "success" | "error" | "warning" | "info" | "loading" | "promise" | "action";

export interface ToastOptions {
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}
