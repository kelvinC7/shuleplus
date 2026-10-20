'use client';

import type { AlertVariant } from '../types';

const STYLES: Record<AlertVariant, string> = {
  success: 'border-primary/40 bg-primary/10 text-navy',
  error: 'border-danger/30 bg-danger/5 text-danger',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700',
  info: 'border-navy/20 bg-navy/5 text-navy',
};

export function AlertBanner({
  variant = 'info',
  title,
  message,
  onDismiss,
}: {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${STYLES[variant]}`}>
      <div>
        {title && <p className="font-poppins-semibold text-sm">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
