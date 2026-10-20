'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModulePage } from '@/components/ui/module-page';
import { nesaApi } from '@/services/nesa-api';
import {
  EDUCATION_LEVELS,
  GA_ATTACHMENT_TYPES,
  OWNERSHIP_OPTIONS,
  STUDENT_TYPES,
} from '@/lib/policy-constants';

type FormState = {
  levels: string[];
  ownerships: string[];
  studentTypes: string[];
  maxAmountRwf: string;
  requireApproval: boolean;
  maxTimesPerTerm: number;
  allowMultipleCharges: boolean;
  requireAttachment: boolean;
  attachmentTypes: string[];
  status: 'ACTIVE' | 'DRAFT';
  effectiveDate: string;
  description: string;
};

const initial: FormState = {
  levels: ['ALL'],
  ownerships: ['GOVERNMENT', 'GOVERNMENT_AIDED'],
  studentTypes: ['ALL'],
  maxAmountRwf: '7000',
  requireApproval: true,
  maxTimesPerTerm: 1,
  allowMultipleCharges: false,
  requireAttachment: true,
  attachmentTypes: ['Meeting Minutes', 'Approval Letter'],
  status: 'ACTIVE',
  effectiveDate: '',
  description: '',
};

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${
        active
          ? 'border-navy bg-navy text-white'
          : 'border-navy/10 bg-white text-navy/70 hover:border-navy/25'
      }`}
    >
      {label}
    </button>
  );
}

function toggleInList(list: string[], value: string, exclusiveAll = true): string[] {
  if (value === 'ALL' && exclusiveAll) return ['ALL'];
  const withoutAll = list.filter((x) => x !== 'ALL');
  const has = withoutAll.includes(value);
  const next = has ? withoutAll.filter((x) => x !== value) : [...withoutAll, value];
  return next.length ? next : ['ALL'];
}

export default function CreateGaPolicyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    const max = Number(form.maxAmountRwf);
    if (!(max > 0)) {
      setError('Maximum amount must be greater than zero');
      return;
    }
    setSaving(true);
    try {
      await nesaApi.createGaPolicy({
        levels: form.levels,
        ownerships: form.ownerships,
        studentTypes: form.studentTypes,
        maxAmountRwf: max,
        requireApproval: form.requireApproval,
        maxTimesPerTerm: form.maxTimesPerTerm,
        allowMultipleCharges: form.allowMultipleCharges,
        requireAttachment: form.requireAttachment,
        attachmentTypes: form.attachmentTypes,
        status: form.status,
        effectiveDate: form.effectiveDate || null,
        description: form.description.trim() || null,
      });
      router.push('/nesa/general-assembly-policies');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to save policy'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePage
      title="Create General Assembly Policy"
      subtitle="Define add-on fee ceilings and attachment / approval rules."
    >
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_20px_60px_-40px_rgba(0,4,53,0.35)]">
          <div className="border-b border-navy/10 bg-gradient-to-br from-navy/[0.04] via-white to-primary/10 px-6 py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy/45">
              Fee Policy Engine
            </p>
            <h2 className="mt-1 text-lg font-bold text-navy">General Assembly add-on</h2>
          </div>
          <div className="space-y-6 p-6">
            {error ? (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <section className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Applicable Levels *
              </span>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="ALL"
                  active={form.levels.includes('ALL')}
                  onClick={() => setForm({ ...form, levels: ['ALL'] })}
                />
                {EDUCATION_LEVELS.map((l) => (
                  <Chip
                    key={l}
                    label={l}
                    active={!form.levels.includes('ALL') && form.levels.includes(l)}
                    onClick={() =>
                      setForm({ ...form, levels: toggleInList(form.levels, l) })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Applicable Ownership *
              </span>
              <div className="flex flex-wrap gap-2">
                {OWNERSHIP_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    active={form.ownerships.includes(o.value)}
                    onClick={() => {
                      const has = form.ownerships.includes(o.value);
                      const ownerships = has
                        ? form.ownerships.filter((x) => x !== o.value)
                        : [...form.ownerships, o.value];
                      setForm({ ...form, ownerships });
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Applicable Students *
              </span>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="ALL"
                  active={form.studentTypes.includes('ALL')}
                  onClick={() => setForm({ ...form, studentTypes: ['ALL'] })}
                />
                {STUDENT_TYPES.map((s) => (
                  <Chip
                    key={s.value}
                    label={s.label}
                    active={
                      !form.studentTypes.includes('ALL') && form.studentTypes.includes(s.value)
                    }
                    onClick={() =>
                      setForm({
                        ...form,
                        studentTypes: toggleInList(form.studentTypes, s.value),
                      })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Maximum Amount (RWF) *
                </span>
                <input
                  className="nesa-input"
                  type="number"
                  min={1}
                  value={form.maxAmountRwf}
                  onChange={(e) => setForm({ ...form, maxAmountRwf: e.target.value })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Maximum Times / Term
                </span>
                <input
                  className="nesa-input"
                  type="number"
                  min={1}
                  value={form.maxTimesPerTerm}
                  onChange={(e) =>
                    setForm({ ...form, maxTimesPerTerm: Number(e.target.value) || 1 })
                  }
                />
              </label>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['requireApproval', 'Require Approval'],
                  ['allowMultipleCharges', 'Allow Multiple Charges'],
                  ['requireAttachment', 'Require Attachment'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-navy/10 px-4 py-3"
                >
                  <span className="text-[13px] font-semibold text-navy">{label}</span>
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="h-4 w-4 accent-navy"
                  />
                </label>
              ))}
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Status
                </span>
                <select
                  className="nesa-input"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as FormState['status'] })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </label>
            </section>

            {form.requireAttachment ? (
              <section className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Attachment Types
                </span>
                <div className="flex flex-wrap gap-2">
                  {GA_ATTACHMENT_TYPES.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      active={form.attachmentTypes.includes(t)}
                      onClick={() => {
                        const has = form.attachmentTypes.includes(t);
                        setForm({
                          ...form,
                          attachmentTypes: has
                            ? form.attachmentTypes.filter((x) => x !== t)
                            : [...form.attachmentTypes, t],
                        });
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Description
              </span>
              <textarea
                className="nesa-input min-h-[96px] resize-y"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-navy/10 pt-4">
              <button
                type="button"
                onClick={() => router.push('/nesa/general-assembly-policies')}
                className="rounded-lg border border-navy/10 px-4 py-2.5 text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModulePage>
  );
}
