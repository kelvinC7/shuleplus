import { AlertCircle, CheckCircle2, Clock3, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { box: string; icon: typeof Info; iconClass: string }
> = {
  success: {
    box: 'border-emerald-200 bg-white shadow-[0_12px_40px_rgba(16,185,129,0.15)]',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  error: {
    box: 'border-red-200 bg-white shadow-[0_12px_40px_rgba(239,68,68,0.12)]',
    icon: AlertCircle,
    iconClass: 'text-red-600',
  },
  warning: {
    box: 'border-amber-200 bg-white shadow-[0_12px_40px_rgba(245,158,11,0.18)]',
    icon: Clock3,
    iconClass: 'text-amber-600',
  },
  info: {
    box: 'border-sky-200 bg-white shadow-[0_12px_40px_rgba(14,165,233,0.12)]',
    icon: Info,
    iconClass: 'text-sky-600',
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  const styles = VARIANT_STYLES[toast.variant];
  const Icon = styles.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast.durationMs, toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto w-full max-w-sm animate-[toast-in_0.28s_ease-out] rounded-2xl border p-4',
        styles.box
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [
      ...current,
      {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? 'info',
        durationMs: input.durationMs ?? 8000,
      },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-0 z-[200] flex flex-col items-end justify-start gap-3 p-4 sm:top-4 sm:p-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
