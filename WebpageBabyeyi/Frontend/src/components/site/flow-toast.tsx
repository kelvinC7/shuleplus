'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type FlowToastType = 'info' | 'success' | 'warning' | 'error';

type FlowToastItem = {
  id: number;
  type: FlowToastType;
  title: string;
  message: string;
};

const STYLES: Record<FlowToastType, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

export function useFlowToast() {
  const [items, setItems] = useState<FlowToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: FlowToastType, title: string, message: string) => {
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-2), { id, type, title, message }]);
      window.setTimeout(() => dismiss(id), 6000);
      return id;
    },
    [dismiss]
  );

  const toast = useCallback(
    {
      info: (message: string, title = 'Notice') => push('info', title, message),
      success: (message: string, title = 'Success') => push('success', title, message),
      warning: (message: string, title = 'Heads up') => push('warning', title, message),
      error: (message: string, title = 'Something went wrong') => push('error', title, message),
    },
    [push]
  );

  function FlowToastStack() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || items.length === 0) return null;

    return createPortal(
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="alert"
            className={cn(
              'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-[0_16px_40px_-20px_rgba(0,4,53,0.35)]',
              STYLES[item.type]
            )}
          >
            <p className="text-[13px] font-semibold">{item.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug opacity-90">{item.message}</p>
          </div>
        ))}
      </div>,
      document.body
    );
  }

  return { toast, FlowToastStack };
}
