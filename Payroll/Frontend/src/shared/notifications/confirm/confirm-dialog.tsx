'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within NotificationProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...options, resolve });
    });
  }, []);

  function close(confirmed: boolean) {
    request?.resolve(confirmed);
    setRequest(null);
  }

  useEffect(() => {
    if (!request) return;
    const active = request;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        active.resolve(false);
        setRequest(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request]);

  const isDanger = request?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {request ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[#000435]/40 backdrop-blur-[2px]"
            onClick={() => close(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="relative w-full max-w-md motion-safe:animate-scale-in rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_24px_64px_-16px_rgba(0,4,53,0.35)]"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isDanger ? 'bg-red-50 text-red-600' : 'bg-[#FCB038]/15 text-[#000435]'
                }`}
              >
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-dialog-title" className="text-lg font-semibold text-[#000435]">
                  {request.title}
                </h2>
                {request.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{request.description}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="inline-flex items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#000435] transition-colors hover:bg-slate-50"
              >
                {request.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`inline-flex items-center justify-center rounded-[14px] px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                  isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#000435] hover:bg-[#000435]/90'
                }`}
              >
                {request.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
