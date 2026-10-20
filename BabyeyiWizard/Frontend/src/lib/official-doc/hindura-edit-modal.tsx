'use client';

import { useState } from 'react';
import { X, Languages, Loader2 } from 'lucide-react';
import {
  resolveLocalizedClassReqs,
  resolveLocalizedLeaders,
  resolveLocalizedOtherInfos,
  resolveLocalizedPayments,
  resolveLocalizedRequirements,
  resolveParentMessage,
} from '@/lib/official-doc/tokens';
import { patchContentI18nRw, type HinduraPatch } from '@/services/babyeyi-api';
import type { Circular } from '@/types';
import { useToast } from '@/shared/notifications';

interface HinduraEditModalProps {
  circular: Circular;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * "Hindura" — lets a school admin manually correct the machine-translated Kinyarwanda
 * text for a circular (parent letter, payment names, requirements, notes, leader roles)
 * without touching the English source.
 */
export function HinduraEditModal({ circular, onClose, onSaved }: HinduraEditModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [parentMessage, setParentMessage] = useState(resolveParentMessage(circular, 'rw'));
  const [payments, setPayments] = useState(resolveLocalizedPayments(circular, 'rw'));
  const [requirements, setRequirements] = useState(resolveLocalizedRequirements(circular, 'rw'));
  const [otherInfos, setOtherInfos] = useState(resolveLocalizedOtherInfos(circular, 'rw'));
  const [classReqs, setClassReqs] = useState(resolveLocalizedClassReqs(circular, 'rw'));
  const [leaders, setLeaders] = useState(resolveLocalizedLeaders(circular, 'rw'));

  async function handleSave() {
    setSaving(true);
    try {
      const patch: HinduraPatch = {
        parentMessage,
        payments: payments.map((p, index) => ({ index, name: p.name })),
        requirements: requirements.map((r, index) => ({ index, item: r.item, description: r.description })),
        otherInfos: otherInfos.map((o, index) => ({ index, item: o.item })),
        classReqs: classReqs.map((n, index) => ({ index, item: n.item })),
        leaders: leaders.map((l, index) => ({ index, role: l.role })),
      };
      await patchContentI18nRw(circular.id, patch);
      toast.success('Kinyarwanda content updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to save Kinyarwanda edits');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-bold text-navy">Hindura — Kinyarwanda content</h3>
              <p className="text-xs text-muted">Correct the machine translation without changing the English original.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-navy/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <Field label="Ubutumwa ku Babyeyi (Parent message)">
            <textarea
              className="input min-h-[110px] w-full resize-y"
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
            />
          </Field>

          {payments.length > 0 && (
            <FieldGroup label="Amafaranga (Payments)">
              {payments.map((p, i) => (
                <input
                  key={i}
                  className="input w-full"
                  value={p.name}
                  onChange={(e) =>
                    setPayments((prev) => prev.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))
                  }
                />
              ))}
            </FieldGroup>
          )}

          {requirements.length > 0 && (
            <FieldGroup label="Ibikenewe (Requirements)">
              {requirements.map((r, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input w-full"
                    placeholder="Item"
                    value={r.item}
                    onChange={(e) =>
                      setRequirements((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, item: e.target.value } : row))
                      )
                    }
                  />
                  <input
                    className="input w-full"
                    placeholder="Description"
                    value={r.description ?? ''}
                    onChange={(e) =>
                      setRequirements((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, description: e.target.value } : row))
                      )
                    }
                  />
                </div>
              ))}
            </FieldGroup>
          )}

          {otherInfos.length > 0 && (
            <FieldGroup label="Andi Makuru (Other information)">
              {otherInfos.map((o, i) => (
                <input
                  key={i}
                  className="input w-full"
                  value={o.item}
                  onChange={(e) =>
                    setOtherInfos((prev) => prev.map((row, idx) => (idx === i ? { ...row, item: e.target.value } : row)))
                  }
                />
              ))}
            </FieldGroup>
          )}

          {classReqs.length > 0 && (
            <FieldGroup label="Inyandiko (Class notes)">
              {classReqs.map((n, i) => (
                <input
                  key={i}
                  className="input w-full"
                  value={n.item}
                  onChange={(e) =>
                    setClassReqs((prev) => prev.map((row, idx) => (idx === i ? { ...row, item: e.target.value } : row)))
                  }
                />
              ))}
            </FieldGroup>
          )}

          {leaders.length > 0 && (
            <FieldGroup label="Ubuyobozi bw'Ishuri (Leader roles)">
              {leaders.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs text-muted">{l.name}</span>
                  <input
                    className="input w-full"
                    value={l.role}
                    onChange={(e) =>
                      setLeaders((prev) => prev.map((row, idx) => (idx === i ? { ...row, role: e.target.value } : row)))
                    }
                  />
                </div>
              ))}
            </FieldGroup>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            Bika (Save)
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase text-muted">{label}</label>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase text-muted">{label}</label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
