'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    messages: { loading: string; success: string; error: string },
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within NotificationProvider');
  return ctx;
}

const DEFAULT_DURATION = 5_000;

const TYPE_DURATION: Partial<Record<ToastType, number>> = {
  success: 4_500,
  error: 6_500,
  warning: 5_500,
  info: 5_000,
};

type StyleKey = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'action';

const TOAST_STYLES: Record<
  StyleKey,
  {
    label: string;
    card: string;
    accent: string;
    iconWrap: string;
    bar: string;
    Icon: typeof CheckCircle2;
    iconClass?: string;
  }
> = {
  success: {
    label: 'Success',
    card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 to-white',
    accent: 'bg-emerald-500',
    iconWrap: 'bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/20',
    bar: 'bg-emerald-500',
    Icon: CheckCircle2,
  },
  error: {
    label: 'Something went wrong',
    card: 'border-rose-200/70 bg-gradient-to-br from-rose-50/95 to-white',
    accent: 'bg-rose-500',
    iconWrap: 'bg-rose-500/12 text-rose-600 ring-1 ring-rose-500/20',
    bar: 'bg-rose-500',
    Icon: XCircle,
  },
  warning: {
    label: 'Warning',
    card: 'border-amber-200/70 bg-gradient-to-br from-amber-50/95 to-white',
    accent: 'bg-amber-500',
    iconWrap: 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20',
    bar: 'bg-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    label: 'Information',
    card: 'border-sky-200/60 bg-gradient-to-br from-sky-50/90 to-white',
    accent: 'bg-sky-500',
    iconWrap: 'bg-navy/8 text-navy ring-1 ring-navy/10',
    bar: 'bg-sky-500',
    Icon: Info,
  },
  loading: {
    label: 'Please wait',
    card: 'border-navy/10 bg-gradient-to-br from-slate-50/95 to-white',
    accent: 'bg-primary',
    iconWrap: 'bg-navy text-primary ring-1 ring-navy/10',
    bar: 'bg-primary',
    Icon: Loader2,
    iconClass: 'animate-spin',
  },
  action: {
    label: 'Action required',
    card: 'border-navy/12 bg-gradient-to-br from-[#fff8ea]/90 to-white',
    accent: 'bg-navy',
    iconWrap: 'bg-navy/8 text-navy ring-1 ring-navy/10',
    bar: 'bg-navy',
    Icon: AlertTriangle,
  },
};

function resolveStyle(type: ToastType) {
  if (type === 'promise') return TOAST_STYLES.loading;
  return TOAST_STYLES[type] ?? TOAST_STYLES.info;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const type = options.type ?? 'info';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: options.title,
        description: options.description ?? '',
        type,
        duration: options.duration ?? TYPE_DURATION[type] ?? DEFAULT_DURATION,
        action: options.action,
      },
    ]);
    return id;
  }, []);

  const loading = useCallback(
    (description: string, title?: string) =>
      toast({ description, title: title ?? 'Loading', type: 'loading', duration: 600_000 }),
    [toast],
  );

  const promise = useCallback(
    async <T,>(p: Promise<T>, messages: { loading: string; success: string; error: string }) => {
      const id = loading(messages.loading);
      try {
        const result = await p;
        dismiss(id);
        toast({ description: messages.success, title: 'Success', type: 'success' });
        return result;
      } catch {
        dismiss(id);
        toast({ description: messages.error, title: 'Error', type: 'error' });
        throw new Error(messages.error);
      }
    },
    [dismiss, loading, toast],
  );

  const success = useCallback(
    (description: string, title?: string) => {
      toast({ description, title: title ?? 'Success', type: 'success' });
    },
    [toast],
  );

  const error = useCallback(
    (description: string, title?: string) => {
      toast({ description, title: title ?? 'Error', type: 'error' });
    },
    [toast],
  );

  const info = useCallback(
    (description: string, title?: string) => {
      toast({ description, title, type: 'info' });
    },
    [toast],
  );

  const warning = useCallback(
    (description: string, title?: string) => {
      toast({ description, title, type: 'warning' });
    },
    [toast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss, success, error, info, warning, loading, promise }),
    [toast, dismiss, success, error, info, warning, loading, promise],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed z-[100] flex w-full flex-col gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] bottom-4 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-6 sm:top-6 sm:w-[min(100vw-3rem,24rem)] sm:gap-3 sm:px-0 sm:pb-0"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const style = resolveStyle(toast.type);
  const { Icon } = style;
  const [paused, setPaused] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimeRef = useRef(Date.now() + toast.duration);
  const isPersistent = toast.type === 'loading';

  const close = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  const scheduleClose = useCallback(
    (ms: number) => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      endTimeRef.current = Date.now() + ms;
      closeTimerRef.current = setTimeout(close, ms);
    },
    [close],
  );

  useEffect(() => {
    if (isPersistent) return;
    scheduleClose(toast.duration);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
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
    scheduleClose(Math.max(0, endTimeRef.current - Date.now()));
  }

  const title = toast.title ?? style.label;
  const hasDescription = Boolean(toast.description?.trim());

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-xl border shadow-[0_20px_50px_-16px_rgba(0,4,53,0.28)] backdrop-blur-md sm:rounded-2xl',
        style.card,
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', style.accent)} aria-hidden />

      <div className="flex items-start gap-3 py-3.5 pl-4 pr-3 sm:py-4 sm:pl-5">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10',
            style.iconWrap,
          )}
        >
          <Icon className={cn('h-[18px] w-[18px] sm:h-5 sm:w-5', style.iconClass)} strokeWidth={2.25} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[13px] font-semibold leading-snug text-navy sm:text-sm">{title}</p>
          {hasDescription ? (
            <p className="mt-1 break-words text-xs leading-relaxed text-slate-600 sm:text-[13px]">
              {toast.description}
            </p>
          ) : null}
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                close();
              }}
              className="mt-2.5 inline-flex items-center rounded-lg bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy/10"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-black/5 hover:text-navy"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>

      <div className="h-[3px] w-full overflow-hidden bg-black/[0.04]">
        {isPersistent ? (
          <div className={cn('toast-progress-indeterminate h-full w-1/3', style.bar)} />
        ) : (
          <div
            className={cn('toast-progress-bar h-full w-full', style.bar)}
            style={{
              ['--toast-duration' as string]: `${toast.duration}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
