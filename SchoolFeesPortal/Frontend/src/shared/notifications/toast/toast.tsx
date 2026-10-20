'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ToastOptions, ToastType } from '../types';

interface ToastItem extends Required<Omit<ToastOptions, 'title' | 'action'>> {
  id: string;
  title?: string;
  action?: ToastOptions['action'];
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
  warning: (description: string, title?: string) => void;
  loading: (description: string, title?: string) => string;
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within NotificationProvider');
  return ctx;
}

const DEFAULT_DURATION = 5_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: options.title,
        description: options.description ?? '',
        type: options.type ?? 'info',
        duration: options.duration ?? DEFAULT_DURATION,
        action: options.action,
      },
    ]);
    return id;
  }, []);

  const loading = useCallback(
    (description: string, title?: string) =>
      toast({ description, title: title ?? 'Loading', type: 'loading', duration: 600_000 }),
    [toast]
  );

  const promise = useCallback(
    async <T,>(p: Promise<T>, messages: { loading: string; success: string; error: string }) => {
      const id = loading(messages.loading);
      try {
        const result = await p;
        dismiss(id);
        toast({ description: messages.success, type: 'success' });
        return result;
      } catch {
        dismiss(id);
        toast({ description: messages.error, type: 'error' });
        throw new Error(messages.error);
      }
    },
    [dismiss, loading, toast]
  );

  const value: ToastContextValue = {
    toast,
    dismiss,
    success: (description, title) => toast({ description, title, type: 'success' }),
    error: (description, title) => toast({ description, title, type: 'error' }),
    info: (description, title) => toast({ description, title, type: 'info' }),
    warning: (description, title) => toast({ description, title, type: 'warning' }),
    loading,
    promise,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const BASE_STYLES: Record<
  'success' | 'error' | 'warning' | 'info' | 'loading' | 'action',
  { ring: string; bar: string; iconBg: string; icon: React.ReactNode; label: string }
> = {
  success: {
    ring: 'border-primary/40',
    bar: 'bg-primary',
    iconBg: 'bg-primary/15 text-navy',
    label: 'Success',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    ring: 'border-danger/30',
    bar: 'bg-danger',
    iconBg: 'bg-danger/10 text-danger',
    label: 'Error',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    ring: 'border-amber-500/30',
    bar: 'bg-amber-500',
    iconBg: 'bg-amber-500/10 text-amber-600',
    label: 'Warning',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
  },
  info: {
    ring: 'border-navy/20',
    bar: 'bg-navy',
    iconBg: 'bg-navy/10 text-navy',
    label: 'Info',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  loading: {
    ring: 'border-primary/30',
    bar: 'bg-primary',
    iconBg: 'bg-primary/10 text-navy',
    label: 'Loading',
    icon: (
      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  action: {
    ring: 'border-navy/20',
    bar: 'bg-navy',
    iconBg: 'bg-navy/10 text-navy',
    label: 'Action Required',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
  },
};

function resolveStyle(type: ToastType) {
  if (type === 'promise') return BASE_STYLES.loading;
  return BASE_STYLES[type] ?? BASE_STYLES.info;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const style = resolveStyle(toast.type);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(toast.duration / 1000));
  const [paused, setPaused] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef(Date.now() + toast.duration);
  const isPersistent = toast.type === 'loading';

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }, [onDismiss, toast.id]);

  const scheduleClose = useCallback(
    (ms: number) => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      endTimeRef.current = Date.now() + ms;
      closeTimerRef.current = setTimeout(close, ms);
    },
    [close]
  );

  useEffect(() => {
    requestAnimationFrame(() => setEntered(true));
  }, []);

  useEffect(() => {
    if (isPersistent) return;

    scheduleClose(toast.duration);

    tickRef.current = setInterval(() => {
      const left = Math.max(0, endTimeRef.current - Date.now());
      setSecondsLeft(Math.ceil(left / 1000));
    }, 200);

    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPersistent, scheduleClose, toast.duration]);

  function handlePause() {
    if (isPersistent) return;
    setPaused(true);
    const remaining = Math.max(0, endTimeRef.current - Date.now());
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    endTimeRef.current = Date.now() + remaining;
  }

  function handleResume() {
    if (isPersistent) return;
    setPaused(false);
    const remaining = Math.max(0, endTimeRef.current - Date.now());
    scheduleClose(remaining);
  }

  const timeLabel = isPersistent ? '...' : `${secondsLeft}s`;

  return (
    <div
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      className={`pointer-events-auto overflow-hidden rounded-2xl border bg-white shadow-[0_12px_40px_rgba(0,4,53,0.16)] backdrop-blur transition-all duration-250 ${style.ring} ${
        entered && !leaving ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy">{toast.title ?? style.label}</p>
            <span className="shrink-0 rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
              {timeLabel}
            </span>
          </div>
          {toast.description ? (
            <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{toast.description}</p>
          ) : null}
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                close();
              }}
              className="mt-2 text-xs font-semibold text-navy underline"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-lg p-1 text-navy/30 transition hover:bg-navy/5 hover:text-navy"
          aria-label="Dismiss"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-navy/5">
        {isPersistent ? (
          <div className={`h-full w-full ${style.bar} opacity-60`} />
        ) : (
          <div
            className={`toast-progress-bar h-full w-full ${style.bar}`}
            style={{
              ['--toast-duration' as string]: `${toast.duration}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        )}
      </div>
    </div>
  );
}
