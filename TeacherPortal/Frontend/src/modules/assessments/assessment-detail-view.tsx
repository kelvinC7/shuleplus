'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Loader2,
  PenLine,
  TrendingUp,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  assessmentApiError,
  fetchAssessment,
  fetchAssessmentStatistics,
  fetchClassStudents,
  updateAssessmentStatus,
} from '@/services/assessment-api';
import type {
  Assessment,
  AssessmentStatistics,
  StudentListItem,
} from '@/types/assessment';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  OPEN: 'bg-emerald-100 text-emerald-700',
  MARK_ENTRY: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  REVIEWED: 'bg-violet-100 text-violet-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-slate-200 text-slate-500',
};

export function AssessmentDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [stats, setStats] = useState<AssessmentStatistics | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, s] = await Promise.all([
        fetchAssessment(id),
        fetchAssessmentStatistics(id).catch(() => null),
      ]);
      setAssessment(a);
      setStats(s);
      if (a.classId) {
        const className = a.class
          ? [a.class.name, a.class.stream].filter(Boolean).join(' ')
          : undefined;
        fetchClassStudents(a.classId, className).then(setStudents).catch(() => {});
      }
    } catch (err) {
      setError(assessmentApiError(err, 'Could not load assessment'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: string) {
    if (!assessment) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await updateAssessmentStatus(assessment.id, status);
      setSuccess(`Assessment marked as ${status}`);
      await load();
    } catch (err) {
      setError(assessmentApiError(err, 'Failed to update status'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={load} className="text-sm font-semibold text-primary underline">
          Retry
        </button>
      </div>
    );
  }

  if (!assessment) return null;

  const badge = STATUS_COLORS[assessment.status] ?? STATUS_COLORS.DRAFT;
  const d = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy">{assessment.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge}`}>
              {assessment.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-muted">
            {assessment.subject?.name ?? '—'}
            {assessment.class
              ? ` · ${assessment.class.name}${assessment.class.stream ? ` ${assessment.class.stream}` : ''}`
              : ''}
          </p>
        </div>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Statistics cards */}
      {d && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Average" value={`${d.average}%`} tone="text-navy" />
          <StatCard label="Highest" value={`${d.highest}%`} tone="text-emerald-600" />
          <StatCard label="Lowest" value={`${d.lowest}%`} tone="text-red-600" />
          <StatCard label="Pass Rate" value={`${d.passRate}%`} tone="text-blue-600" />
        </div>
      )}

      {/* Completion progress */}
      {d && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Completion Status
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <CompletionStat icon={<Users className="h-4 w-4" />} label="Total" value={d.totalStudents} />
            <CompletionStat icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Completed" value={d.completedCount} />
            {d.absentCount > 0 && (
              <CompletionStat icon={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-600">A</span>} label="Absent" value={d.absentCount} />
            )}
            {d.missingCount > 0 && (
              <CompletionStat icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Missing" value={d.missingCount} />
            )}
            {d.excusedCount > 0 && (
              <CompletionStat icon={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-600">E</span>} label="Excused" value={d.excusedCount} />
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${d.totalStudents > 0 ? (d.completedCount / d.totalStudents) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Score distribution */}
      {d && d.distribution.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Score Distribution
          </p>
          <div className="space-y-2">
            {d.distribution.map((bucket) => {
              const maxCount = Math.max(...d.distribution.map((x) => x.count), 1);
              const barColor =
                bucket.min >= 80
                  ? 'bg-emerald-500'
                  : bucket.min >= 70
                    ? 'bg-blue-500'
                    : bucket.min >= 60
                      ? 'bg-amber-500'
                      : bucket.min >= 50
                        ? 'bg-yellow-400'
                        : 'bg-red-500';
              return (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-500">
                    {bucket.label}
                  </span>
                  <div className="flex-1 h-5 overflow-hidden rounded bg-slate-100">
                    <div
                      className={`h-full rounded ${barColor} transition-all duration-500`}
                      style={{
                        width: `${maxCount > 0 ? (bucket.count / maxCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-xs font-semibold text-navy">
                    {bucket.count} student{bucket.count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Students needing support */}
      {d && (() => {
        const below = d.distribution.find((x) => x.label === 'Below 50%');
        if (!below || below.count === 0) return null;
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Academic Attention — {below.count} student{below.count !== 1 ? 's' : ''} below 50%
              </p>
            </div>
            <p className="mt-1 text-xs text-amber-600/80">
              These students may need additional support or intervention.
            </p>
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/assessments/${assessment.id}/marks`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <PenLine className="h-4 w-4" />
          Enter / Edit Marks
        </Link>

        {assessment.status === 'DRAFT' && (
          <button
            onClick={() => handleStatusChange('OPEN')}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Open for Mark Entry
          </button>
        )}
        {assessment.status === 'OPEN' && (
          <button
            onClick={() => handleStatusChange('MARK_ENTRY')}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start Mark Entry
          </button>
        )}
        {assessment.status === 'MARK_ENTRY' && (
          <button
            onClick={() => handleStatusChange('SUBMITTED')}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Marks
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 text-center shadow-sm">
      <p className={`text-xl font-extrabold ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function CompletionStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-base font-bold text-navy">{value}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}
