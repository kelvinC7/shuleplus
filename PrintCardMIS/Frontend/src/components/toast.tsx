'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastHostProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

function toneStyles(tone: ToastTone) {
  if (tone === 'success') {
    return {
      wrap: 'border-emerald-200 bg-white shadow-lg shadow-emerald-900/5',
      icon: 'text-emerald-600',
      Icon: CheckCircle2,
    };
  }
  if (tone === 'error') {
    return {
      wrap: 'border-red-200 bg-white shadow-lg shadow-red-900/5',
      icon: 'text-red-600',
      Icon: XCircle,
    };
  }
  return {
    wrap: 'border-sky-200 bg-white shadow-lg shadow-sky-900/5',
    icon: 'text-sky-600',
    Icon: Info,
  };
}

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const style = toneStyles(t.tone);
        const Icon = style.Icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 ${style.wrap}`}
            role="status"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-navy">{t.title}</p>
              {t.message ? <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{t.message}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
    return id;
  }, []);

  const success = useCallback((title: string, message?: string) => push('success', title, message), [push]);
  const error = useCallback((title: string, message?: string) => push('error', title, message), [push]);
  const info = useCallback((title: string, message?: string) => push('info', title, message), [push]);

  return { toasts, dismiss, success, error, info };
}
