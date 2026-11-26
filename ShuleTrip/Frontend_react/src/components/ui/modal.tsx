import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/cn';
import { Button } from '@/components/ui/button';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-md' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'animate-fade-up relative w-full overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl shadow-navy/25',
          maxW
        )}
      >
        <div className="h-1 bg-gradient-to-r from-navy via-navy-muted to-amber" />
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-lg font-extrabold tracking-tight text-navy">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 pb-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-slate-50/70 px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  loading,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  return (
    <>
      <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant="amber" type="button" onClick={onConfirm} disabled={loading}>
        {confirmLabel}
      </Button>
    </>
  );
}
