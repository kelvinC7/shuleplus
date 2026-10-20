'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ConfirmDialogOptions } from '../types';

interface DialogState extends ConfirmDialogOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useConfirm must be used within NotificationProvider');
  return ctx.confirm;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({ open: false, title: '', message: '' });

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, open: true, resolve });
    });
  }, []);

  function close(result: boolean) {
    dialog.resolve?.(result);
    setDialog((d) => ({ ...d, open: false, resolve: undefined }));
  }

  const isDanger = dialog.variant === 'danger';

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {dialog.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-montserrat text-lg font-bold text-navy">{dialog.title}</h3>
            <p className="mt-2 text-sm text-muted">{dialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-poppins-semibold text-navy hover:bg-navy/5"
              >
                {dialog.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-xl px-5 py-2.5 text-sm font-poppins-semibold text-white ${
                  isDanger ? 'bg-danger hover:bg-danger/90' : 'bg-navy hover:bg-navy-light'
                }`}
              >
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
