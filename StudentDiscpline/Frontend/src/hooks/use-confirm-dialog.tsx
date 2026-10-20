'use client';

import { useCallback, useState } from 'react';
import {
  DisciplineConfirmDialog,
  type DisciplineConfirmOptions,
} from '@/components/discipline-confirm-dialog';

type PendingConfirm = DisciplineConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: DisciplineConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setPending((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const dialog = pending ? (
    <DisciplineConfirmDialog
      open
      title={pending.title}
      subtitle={pending.subtitle}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      tone={pending.tone}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null;

  return { confirm, dialog };
}
