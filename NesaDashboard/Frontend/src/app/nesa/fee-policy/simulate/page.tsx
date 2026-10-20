'use client';

import { useState } from 'react';
import { ModulePage } from '@/components/ui/module-page';
import { nesaApi } from '@/services/nesa-api';
import {
  EDUCATION_LEVELS,
  STUDENT_TYPES,
  type PolicyResolveResult,
} from '@/lib/policy-constants';

type FormState = {
  ownershipType: string;
  feeTargetStudents: string;
  academicYear: string;
  term: number;
  educationLevel: string;
  studentType: string;
  classLabel: string;
  enteredTuitionRwf: string;
  enteredGeneralAssemblyRwf: string;
};

const initial: FormState = {
  ownershipType: 'Government',
  feeTargetStudents: 'public',
  academicYear: '2027-2028',
  term: 1,
  educationLevel: 'PRIMARY',
  studentType: 'DAY',
  classLabel: 'P5',
  enteredTuitionRwf: '25000',
  enteredGeneralAssemblyRwf: '7000',
};

export default function PolicySimulatePage() {
  const [form, setForm] = useState<FormState>(initial);
  const [result, setResult] = useState<PolicyResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    try {
      const res = await nesaApi.simulatePolicy({
        ownershipType: form.ownershipType,
        feeTargetStudents: form.feeTargetStudents,
        academicYear: form.academicYear,
        term: form.term,
        educationLevel: form.educationLevel,
        studentType: form.studentType,
        classLabel: form.classLabel,
        enteredTuitionRwf: Number(form.enteredTuitionRwf) || 0,
        enteredGeneralAssemblyRwf: Number(form.enteredGeneralAssemblyRwf) || 0,
      });
      setResult(res.data.data as PolicyResolveResult);
    } catch (err) {
      setResult(null);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Simulation failed'
      );
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    result?.status === 'VALID'
      ? 'text-success'
      : result?.status === 'NOT_ALLOWED'
        ? 'text-danger'
        : 'text-navy/60';

  return (
    <ModulePage
      title="Policy simulation"
      subtitle="Preview tuition + General Assembly ceilings before publishing a circular."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-navy/10 bg-white p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-[12px] font-semibold">
              Ownership
              <select
                className="nesa-input"
                value={form.ownershipType}
                onChange={(e) => setForm({ ...form, ownershipType: e.target.value })}
              >
                <option value="Government">Government</option>
                <option value="Government Aided">Government Aided</option>
                <option value="Private">Private</option>
              </select>
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Student cohort
              <select
                className="nesa-input"
                value={form.feeTargetStudents}
                onChange={(e) => setForm({ ...form, feeTargetStudents: e.target.value })}
              >
                <option value="public">Public students</option>
                <option value="private">Private students</option>
              </select>
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Academic year
              <input
                className="nesa-input"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Term
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
            <label className="space-y-1.5 text-[12px] font-semibold">
              Education level
              <select
                className="nesa-input"
                value={form.educationLevel}
                onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
              >
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Student type
              <select
                className="nesa-input"
                value={form.studentType}
                onChange={(e) => setForm({ ...form, studentType: e.target.value })}
              >
                {STUDENT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Class
              <input
                className="nesa-input"
                value={form.classLabel}
                onChange={(e) => setForm({ ...form, classLabel: e.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Entered tuition
              <input
                className="nesa-input"
                type="number"
                value={form.enteredTuitionRwf}
                onChange={(e) => setForm({ ...form, enteredTuitionRwf: e.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-[12px] font-semibold">
              Entered General Assembly
              <input
                className="nesa-input"
                type="number"
                value={form.enteredGeneralAssemblyRwf}
                onChange={(e) =>
                  setForm({ ...form, enteredGeneralAssemblyRwf: e.target.value })
                }
              />
            </label>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void run()}
            className="rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Running…' : 'Run simulation'}
          </button>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-white via-white to-navy/[0.03] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy/45">
            Result
          </p>
          {!result ? (
            <p className="mt-4 text-sm text-navy/50">Run a simulation to see policy totals.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[12px] text-navy/50">Applies</p>
                <p className="text-lg font-bold text-navy">{result.applies ? 'Yes' : 'No'}</p>
                <p className="text-[12px] text-navy/45">{result.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-navy/10 p-3">
                  <p className="text-[11px] text-navy/45">Tuition max</p>
                  <p className="font-bold">
                    {result.tuitionMaxRwf != null
                      ? `${result.tuitionMaxRwf.toLocaleString()} RWF`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-navy/10 p-3">
                  <p className="text-[11px] text-navy/45">General Assembly</p>
                  <p className="font-bold">
                    {result.generalAssemblyMaxRwf != null
                      ? `${result.generalAssemblyMaxRwf.toLocaleString()} RWF`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-navy/10 p-3">
                  <p className="text-[11px] text-navy/45">Total max</p>
                  <p className="font-bold">
                    {result.totalMaxRwf != null
                      ? `${result.totalMaxRwf.toLocaleString()} RWF`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-navy/10 p-3">
                  <p className="text-[11px] text-navy/45">Difference</p>
                  <p className="font-bold">
                    {result.differenceRwf != null
                      ? `${result.differenceRwf.toLocaleString()} RWF`
                      : '—'}
                  </p>
                </div>
              </div>
              <div>
                <p className={`text-2xl font-bold ${statusColor}`}>{result.status ?? '—'}</p>
                <p className="mt-1 text-sm text-navy/60">{result.message}</p>
                {result.requestApproval ? (
                  <p className="mt-3 rounded-lg bg-danger/5 px-3 py-2 text-[13px] font-semibold text-danger">
                    Request approval → DEO → NESA
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
