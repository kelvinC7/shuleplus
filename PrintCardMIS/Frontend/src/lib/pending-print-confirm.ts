import type { PersonKind } from '@/services/print-card-api';

const STORAGE_KEY = 'printcard:pending-confirm';

export type PendingPrintConfirm = {
  batchId: string;
  schoolId: string;
  personKind: PersonKind;
};

export function savePendingPrintConfirm(payload: PendingPrintConfirm) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readPendingPrintConfirm(): PendingPrintConfirm | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPrintConfirm;
    if (!parsed.batchId || !parsed.schoolId || !parsed.personKind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPrintConfirm() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
