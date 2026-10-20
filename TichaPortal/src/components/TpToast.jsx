import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastSeq = 0;

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200/80 bg-white/95 text-emerald-900 shadow-emerald-500/10',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-200/80 bg-white/95 text-red-900 shadow-red-500/10',
    iconClass: 'text-red-500',
  },
  info: {
    icon: Info,
    className: 'border-slate-200/80 bg-white/95 text-[#000435] shadow-slate-500/10',
    iconClass: 'text-[#000435]/60',
  },
};

function ToastItem({ id, message, variant, onDismiss }) {
  const cfg = VARIANTS[variant] || VARIANTS.info;
  const Icon = cfg.icon;
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md animate-[tpToastIn_.35s_ease-out] ${cfg.className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.iconClass}`} aria-hidden />
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded-lg p-1 text-current opacity-50 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TpToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'info', duration = 4500) => {
      const id = ++toastSeq;
      setItems((prev) => [...prev.slice(-4), { id, message: String(message), variant }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show: push,
      success: (msg, duration) => push(msg, 'success', duration ?? 4500),
      error: (msg, duration) => push(msg, 'error', duration ?? 6500),
      info: (msg, duration) => push(msg, 'info', duration ?? 4500),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="pointer-events-none fixed right-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-[250] flex w-[min(100%,22rem)] flex-col items-stretch gap-2 sm:right-6 sm:top-6">
              {items.map((t) => (
                <ToastItem key={t.id} {...t} onDismiss={dismiss} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useTpToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {},
      success: () => {},
      error: (msg) => {
        if (msg) console.error(msg);
      },
      info: () => {},
    };
  }
  return ctx;
}
