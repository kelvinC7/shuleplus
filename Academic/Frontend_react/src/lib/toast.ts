export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
  duration: number;
};

type Listener = (toasts: ToastItem[]) => void;

const listeners = new Set<Listener>();
let toasts: ToastItem[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  const snapshot = toasts;
  listeners.forEach((listener) => listener(snapshot));
}

function uid() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function push(kind: ToastKind, title: string, duration = 4200, detail?: string) {
  const message = title.trim();
  if (!message) return;
  const sub = detail?.trim() || undefined;
  const last = toasts[toasts.length - 1];
  if (last && last.kind === kind && last.title === message && last.detail === sub) {
    dismissToast(last.id);
  }
  const item: ToastItem = { id: uid(), kind, title: message, detail: sub, duration };
  toasts = [...toasts.slice(-4), item];
  emit();
  timers.set(item.id, setTimeout(() => dismissToast(item.id), duration));
}

export const toast = {
  success: (title: string, detail?: string) => push('success', title, 4200, detail),
  error: (title: string, detail?: string) => push('error', title, 6400, detail),
  info: (title: string, detail?: string) => push('info', title, 4800, detail),
  warning: (title: string, detail?: string) => push('warning', title, 5200, detail),
};

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const e = err as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
    code?: string;
  };
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
}

export function isAxiosError(err: unknown) {
  return Boolean((err as { isAxiosError?: boolean; response?: unknown })?.response);
}
