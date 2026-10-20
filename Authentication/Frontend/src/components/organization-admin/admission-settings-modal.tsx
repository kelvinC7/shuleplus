'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AdmissionSettings } from '@/lib/org-admin-api';

const LEVELS = ['Nursery', 'Primary', 'O-Level', 'A-Level', 'TVET'] as const;

interface AdmissionSettingsModalProps {
  open: boolean;
  settings: AdmissionSettings;
  saving: boolean;
  onClose: () => void;
  onSave: (settings: AdmissionSettings) => void;
}

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1, label: 'General', short: 'General' },
  { n: 2, label: 'Capacity', short: 'Places' },
  { n: 3, label: 'Review', short: 'Review' },
];

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function AdmissionSettingsModal({
  open,
  settings: initial,
  saving,
  onClose,
  onSave,
}: AdmissionSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<AdmissionSettings>(initial);
  const [newPlaceLevel, setNewPlaceLevel] = useState<string>('Primary');
  const [newPlaceCount, setNewPlaceCount] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setStep(1);
      setNewPlaceCount('');
    }
  }, [open, initial]);

  if (!open || !mounted) return null;

  function addPlace() {
    const count = Number.parseInt(newPlaceCount, 10);
    if (Number.isNaN(count) || count < 0) return;
    setDraft({
      ...draft,
      availablePlaces: { ...draft.availablePlaces, [newPlaceLevel]: count },
    });
    setNewPlaceCount('');
  }

  function removePlace(level: string) {
    const next = { ...draft.availablePlaces };
    delete next[level];
    setDraft({ ...draft, availablePlaces: next });
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15';
  const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Admission settings"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-navy/55 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[26px]">
        {/* Header — navy + amber (org admin brand) */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-navy via-[#000435] to-[#0A0F5C] px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
          <span aria-hidden className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
          <span aria-hidden className="absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-primary/15 blur-2xl" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                Admissions
              </span>
              <h2 className="mt-2 text-lg font-extrabold text-white sm:text-xl">Admission settings</h2>
              <p className="mt-0.5 text-xs text-white/65">Configure how parents apply on babyeyi.rw</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper */}
          <div className="relative z-10 mt-4 flex items-center gap-1.5 sm:gap-2">
            {STEPS.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <div key={s.n} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                      done ? 'bg-primary text-navy' : active ? 'bg-primary text-navy shadow-md shadow-primary/30' : 'bg-white/10 text-white/55'
                    }`}
                  >
                    {done ? <CheckIcon className="h-3 w-3" /> : s.n}
                  </div>
                  <span className={`hidden truncate text-[10px] font-bold sm:inline ${active ? 'text-white' : 'text-white/55'}`}>
                    {s.short}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span className={`h-[2px] min-w-[6px] flex-1 rounded-full ${done ? 'bg-primary' : 'bg-white/15'}`} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <p className="text-base font-bold text-navy">General information</p>
                <p className="mt-0.5 text-sm text-muted">Deadline, fees, and messages shown to parents</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Application deadline</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={draft.applicationDeadline ? draft.applicationDeadline.slice(0, 16) : ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        applicationDeadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Estimated admission fee (Frw)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    placeholder="e.g. 50000"
                    value={draft.estimatedFee ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        estimatedFee: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Welcome message</label>
                <textarea
                  rows={3}
                  className={`${inputClass} resize-y`}
                  placeholder="Shown at the start of the admission form on babyeyi.rw"
                  value={draft.welcomeMessage ?? ''}
                  onChange={(e) => setDraft({ ...draft, welcomeMessage: e.target.value || null })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Terms URL (optional)</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://..."
                    value={draft.termsUrl ?? ''}
                    onChange={(e) => setDraft({ ...draft, termsUrl: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Privacy policy URL (optional)</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://..."
                    value={draft.privacyUrl ?? ''}
                    onChange={(e) => setDraft({ ...draft, privacyUrl: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <p className="text-base font-bold text-navy">Available places</p>
                <p className="mt-0.5 text-sm text-muted">Show parents how many seats remain per level</p>
              </div>

              {Object.keys(draft.availablePlaces).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(draft.availablePlaces).map(([level, count]) => (
                    <span
                      key={level}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/15 py-1.5 pl-3 pr-1.5 text-xs font-bold text-navy ring-1 ring-primary/25"
                    >
                      {level}: {count}
                      <button
                        type="button"
                        onClick={() => removePlace(level)}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/30 text-navy hover:bg-primary/50"
                        aria-label={`Remove ${level}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-[#f8fafc] px-4 py-6 text-center text-sm text-muted">
                  No capacity limits set yet — add places per education level
                </div>
              )}

              <div className="rounded-2xl border border-border bg-[#f8fafc] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Add level capacity</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                    value={newPlaceLevel}
                    onChange={(e) => setNewPlaceLevel(e.target.value)}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    placeholder="Places"
                    className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                    value={newPlaceCount}
                    onChange={(e) => setNewPlaceCount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addPlace}
                    className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-primary hover:bg-[#0A0F5C]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div>
                <p className="text-base font-bold text-navy">Review settings</p>
                <p className="mt-0.5 text-sm text-muted">Confirm before saving to babyeyi.rw</p>
              </div>
              {[
                {
                  title: 'Deadline',
                  value: draft.applicationDeadline
                    ? new Date(draft.applicationDeadline).toLocaleString()
                    : 'No deadline',
                  edit: 1 as Step,
                },
                {
                  title: 'Estimated fee',
                  value: draft.estimatedFee != null ? `${draft.estimatedFee.toLocaleString()} Frw` : 'Not set',
                  edit: 1 as Step,
                },
                {
                  title: 'Welcome message',
                  value: draft.welcomeMessage?.trim() || 'None',
                  edit: 1 as Step,
                },
                {
                  title: 'Available places',
                  value: Object.entries(draft.availablePlaces).length
                    ? Object.entries(draft.availablePlaces).map(([l, c]) => `${l}: ${c}`).join(', ')
                    : 'None set',
                  edit: 2 as Step,
                },
              ].map((row) => (
                <div key={row.title} className="rounded-xl border border-border bg-[#f8fafc] p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{row.title}</p>
                    <button
                      type="button"
                      onClick={() => setStep(row.edit)}
                      className="text-[12px] font-bold text-primary hover:text-primary/80"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-navy">{row.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={saving}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-muted hover:bg-gray-100 disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="rounded-full bg-navy px-6 py-2.5 text-sm font-extrabold text-primary shadow-md hover:bg-[#0A0F5C]"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave(draft)}
              className="rounded-full bg-navy px-6 py-2.5 text-sm font-extrabold text-primary shadow-md hover:bg-[#0A0F5C] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
