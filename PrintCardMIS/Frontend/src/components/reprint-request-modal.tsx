'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CardRecord, PersonKind } from '@/services/print-card-api';
import { createReprintRequest, type ReprintReason } from '@/services/print-card-api';

const REASONS: { value: ReprintReason; label: string }[] = [
  { value: 'LOST', label: 'Lost' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'STORED', label: 'Stored / Misplaced' },
  { value: 'INCORRECT_INFORMATION', label: 'Incorrect Information' },
  { value: 'OTHER', label: 'Other' },
];

type Props = {
  open: boolean;
  record: CardRecord | null;
  kind: PersonKind;
  organizationId: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReprintRequestModal({ open, record, kind, organizationId, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState<ReprintReason>('LOST');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !record) return null;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await createReprintRequest({
        organizationId,
        cardRecordId: record!.id,
        reason,
        description: description.trim() || undefined,
      });
      onSubmitted();
      onClose();
      setDescription('');
      setReason('LOST');
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : e instanceof Error
            ? e.message
            : 'Failed to submit request';
      setError(msg ?? 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-navy">Request Reprint</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-navy">{record.fullName}</p>
            <p className="text-muted">{kind === 'STUDENT' ? 'Student' : 'Staff'} · {record.personCode}</p>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-muted">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value as ReprintReason)} className="input">
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-muted">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Explain why a replacement card is needed…"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
