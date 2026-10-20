'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModulePage } from '@/components/ui/module-page';
import { nesaApi } from '@/services/nesa-api';
import {
  CLASS_BY_LEVEL,
  EDUCATION_LEVELS,
  OWNERSHIP_OPTIONS,
  STUDENT_TYPES,
  type FeePolicyRecord,
} from '@/lib/policy-constants';

type FormState = {
  academicYear: string;
  term: number;
  educationLevel: (typeof EDUCATION_LEVELS)[number];
  studentType: 'DAY' | 'BOARDING';
  ownerships: string[];
  applyToClasses: string[];
  maxTuitionRwf: string;
  status: 'ACTIVE' | 'DRAFT';
  effectiveDate: string;
  description: string;
};

const initial: FormState = {
  academicYear: '2027-2028',
  term: 1,
  educationLevel: 'PRIMARY',
  studentType: 'DAY',
  ownerships: ['GOVERNMENT', 'GOVERNMENT_AIDED'],
  applyToClasses: ['ALL'],
  maxTuitionRwf: '25000',
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

export default function CreateFeePolicyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const classOptions = useMemo(
    () => CLASS_BY_LEVEL[form.educationLevel] ?? [],
    [form.educationLevel]
  );

  function toggleOwnership(value: string) {
    setForm((prev) => {
      const has = prev.ownerships.includes(value);
      const ownerships = has
        ? prev.ownerships.filter((o) => o !== value)
        : [...prev.ownerships, value];
      return { ...prev, ownerships };
    });
  }

  function toggleClass(value: string) {
    setForm((prev) => {
      if (value === 'ALL') return { ...prev, applyToClasses: ['ALL'] };
      const withoutAll = prev.applyToClasses.filter((c) => c !== 'ALL');
      const has = withoutAll.includes(value);
      const applyToClasses = has
        ? withoutAll.filter((c) => c !== value)
        : [...withoutAll, value];
      return {
        ...prev,
        applyToClasses: applyToClasses.length ? applyToClasses : ['ALL'],
      };
    });
  }

  async function save() {
    setError('');
    if (!form.ownerships.length) {
      setError('Select at least one applicable ownership');
      return;
    }
    const max = Number(form.maxTuitionRwf);
    if (!(max > 0)) {
      setError('Maximum tuition fees must be greater than zero');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        academicYear: form.academicYear.trim(),
        term: form.term,
        educationLevel: form.educationLevel,
        studentType: form.studentType,
        ownerships: form.ownerships,
        applyToClasses: form.applyToClasses,
        maxTuitionRwf: max,
        status: form.status,
        effectiveDate: form.effectiveDate || null,
        description: form.description.trim() || null,
      };
      await nesaApi.createFeePolicy(payload);
      router.push('/nesa/fee-policy');
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
      title="Create Fee Policy"
      subtitle="National tuition ceiling for Government and Government-Aided public students."
      actions={
        <button
          type="button"
          onClick={() => router.push('/nesa/fee-policy')}
          className="rounded-lg border border-navy/10 px-4 py-2 text-[13px] font-semibold text-navy"
        >
          Back to dashboard
        </button>
      }
    >
      <div className="mx-auto max-w-3xl animate-[fadeInUp_0.4s_ease]">
        <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_20px_60px_-40px_rgba(0,4,53,0.35)]">
          <div className="border-b border-navy/10 bg-gradient-to-br from-navy/[0.04] via-white to-primary/10 px-6 py-5">
            <h2 className="text-lg font-bold text-navy">Tuition limit</h2>
            <p className="mt-1 text-[13px] text-navy/60">Government and Government-Aided schools.</p>
          </div>

          <div className="space-y-6 p-6">
            {error ? (
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Academic Year *
                </span>
                <input
                  className="nesa-input"
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  placeholder="2027-2028"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Term *
                </span>
                <select
                  className="nesa-input"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: Number(e.target.value) })}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>
            </section>

            <section className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Education Level *
              </span>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_LEVELS.map((level) => (
                  <Chip
                    key={level}
                    label={level}
                    active={form.educationLevel === level}
                    onClick={() =>
                      setForm({ ...form, educationLevel: level, applyToClasses: ['ALL'] })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Student Type *
              </span>
              <div className="flex flex-wrap gap-2">
                {STUDENT_TYPES.map((st) => (
                  <Chip
                    key={st.value}
                    label={st.label}
                    active={form.studentType === st.value}
                    onClick={() => setForm({ ...form, studentType: st.value })}
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
                    onClick={() => toggleOwnership(o.value)}
                  />
                ))}
              </div>
              <p className="text-[12px] text-navy/45">
                Government Aided applies to public students only — private cohorts are never checked.
              </p>
            </section>

            <section className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Apply Policy To *
              </span>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="ALL"
                  active={form.applyToClasses.includes('ALL')}
                  onClick={() => toggleClass('ALL')}
                />
                {classOptions.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={
                      !form.applyToClasses.includes('ALL') && form.applyToClasses.includes(c)
                    }
                    onClick={() => toggleClass(c)}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Maximum Tuition Fees (RWF) *
                </span>
                <input
                  className="nesa-input"
                  type="number"
                  min={1}
                  value={form.maxTuitionRwf}
                  onChange={(e) => setForm({ ...form, maxTuitionRwf: e.target.value })}
                />
              </label>
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
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                  Effective Date
                </span>
                <input
                  className="nesa-input"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                />
              </label>
            </section>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                Description
              </span>
              <textarea
                className="nesa-input min-h-[96px] resize-y"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional policy notes for DEO / NESA review"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-navy/10 pt-4">
              <button
                type="button"
                onClick={() => router.push('/nesa/fee-policy')}
                className="rounded-lg border border-navy/10 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModulePage>
  );
}

// Keep type export for any leftover imports
export type { FeePolicyRecord };
