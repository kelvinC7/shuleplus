'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { DisciplineModal } from '@/components/discipline-modal';

export type ConfirmTone = 'default' | 'warning' | 'danger';

export interface DisciplineConfirmOptions {
  title: string;
  message: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface DisciplineConfirmDialogProps extends DisciplineConfirmOptions {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneConfig: Record<
  ConfirmTone,
  { icon: ReactNode; buttonClass: string }
> = {
  default: {
    icon: <HelpCircle size={18} />,
    buttonClass: 'btn-primary',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    buttonClass: 'btn-primary',
  },
  danger: {
    icon: <Trash2 size={18} />,
    buttonClass: 'rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50',
  },
};

export function DisciplineConfirmDialog({
  open,
  title,
  subtitle,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading,
  onConfirm,
  onCancel,
}: DisciplineConfirmDialogProps) {
  const cfg = toneConfig[tone];

  return (
    <DisciplineModal
      open={open}
      onClose={onCancel}
      title={title}
      subtitle={subtitle}
      icon={cfg.icon}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={cfg.buttonClass} disabled={loading} onClick={onConfirm}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </DisciplineModal>
  );
}
