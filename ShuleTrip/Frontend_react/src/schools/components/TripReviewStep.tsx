import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import type { ReadinessReport } from '@/schools/types/trip';
import { TripPassQr } from '@/components/trip-pass-qr';
import { cn } from '@/shared/cn';

type CheckRow = {
  id: string;
  label: string;
  step: number;
  state: 'complete' | 'blocker' | 'warning' | 'advisory' | 'pending';
  message?: string;
};

function buildRows(readiness: ReadinessReport | null): CheckRow[] {
  const blockerKeys = new Set(readiness?.blockers.map((b) => b.key) ?? []);
  const warningKeys = new Set(readiness?.warnings.map((w) => w.key) ?? []);
  const advisoryKeys = new Set(readiness?.advisories.map((a) => a.key) ?? []);

  const byKey = (key: string) => ({
    blocker: readiness?.blockers.find((b) => b.key === key),
    warning: readiness?.warnings.find((w) => w.key === key),
    advisory: readiness?.advisories.find((a) => a.key === key),
  });

  const defs: Array<{ id: string; label: string; step: number }> = [
    { id: 'title', label: 'Trip title', step: 0 },
    { id: 'destination', label: 'Destination', step: 0 },
    { id: 'departAt', label: 'Departure schedule', step: 0 },
    { id: 'participants', label: 'Student manifest', step: 1 },
    { id: 'trip_leader', label: 'Trip leader assigned', step: 2 },
    { id: 'transport', label: 'Transport & driver', step: 3 },
    { id: 'safety_plan', label: 'Safety & risk checklist', step: 4 },
    { id: 'documents', label: 'Supporting documents', step: 5 },
    { id: 'guardian_consent', label: 'Guardian consent', step: 5 },
    { id: 'guardian_contact', label: 'Guardian contact details', step: 1 },
    { id: 'supervision_ratio', label: 'Supervision ratio', step: 2 },
  ];

  return defs.map(({ id, label, step }) => {
    const { blocker, warning, advisory } = byKey(id);
    if (blocker || blockerKeys.has(id)) {
      return { id, label, step, state: 'blocker' as const, message: blocker?.message ?? 'Required before submit' };
    }
    if (warning || warningKeys.has(id)) {
      return { id, label, step, state: 'warning' as const, message: warning?.message };
    }
    if (advisory || advisoryKeys.has(id)) {
      return { id, label, step, state: 'advisory' as const, message: advisory?.message };
    }
    return { id, label, step, state: 'complete' as const };
  });
}

export function TripReviewStep({
  title,
  summary,
  readiness,
  onGoToStep,
  tripReference,
}: {
  title: string;
  summary: string;
  readiness: ReadinessReport | null;
  onGoToStep: (step: number) => void;
  tripReference?: string;
}) {
  const rows = buildRows(readiness);
  const blockers = rows.filter((r) => r.state === 'blocker');
  const warnings = rows.filter((r) => r.state === 'warning');
  const complete = rows.filter((r) => r.state === 'complete');
  const advisory = rows.filter((r) => r.state === 'advisory');
  const canSubmit = blockers.length === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-gradient-to-br from-navy to-navy-muted p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-white/60">Ready to submit</p>
            <h3 className="mt-1 text-xl font-extrabold">{title || 'Untitled trip'}</h3>
            {tripReference ? <p className="mt-1 text-sm font-semibold text-amber">{tripReference}</p> : null}
            <p className="mt-2 text-sm text-white/80">{summary}</p>
          </div>
          {tripReference ? (
            <div className="rounded-2xl bg-white p-2">
              <TripPassQr reference={tripReference} size={96} />
            </div>
          ) : null}
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-white/70">
            <span>Submission readiness</span>
            <span>{readiness?.score ?? 0}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className={cn('h-full rounded-full transition-all', canSubmit ? 'bg-emerald-400' : 'bg-amber')}
              style={{ width: `${readiness?.score ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {blockers.length > 0 ? (
        <section>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-800">
            <XCircle className="h-4 w-4" />
            Must fix before submit ({blockers.length})
          </h4>
          <ul className="space-y-2">
            {blockers.map((row) => (
              <ReviewRow key={row.id} row={row} onGoToStep={onGoToStep} />
            ))}
          </ul>
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <section>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Recommended fixes ({warnings.length})
          </h4>
          <ul className="space-y-2">
            {warnings.map((row) => (
              <ReviewRow key={row.id} row={row} onGoToStep={onGoToStep} />
            ))}
          </ul>
        </section>
      ) : null}

      {advisory.length > 0 ? (
        <section>
          <h4 className="mb-3 text-sm font-bold text-slate-600">Optional improvements ({advisory.length})</h4>
          <ul className="space-y-2">
            {advisory.map((row) => (
              <ReviewRow key={row.id} row={row} onGoToStep={onGoToStep} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Completed ({complete.length})
        </h4>
        <ul className="grid gap-2 sm:grid-cols-2">
          {complete.map((row) => (
            <li key={row.id} className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {row.label}
            </li>
          ))}
        </ul>
      </section>

      {canSubmit ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          All mandatory checks passed. You can submit this application to government review.
        </p>
      ) : null}
    </div>
  );
}

function ReviewRow({ row, onGoToStep }: { row: CheckRow; onGoToStep: (step: number) => void }) {
  const icon =
    row.state === 'blocker' ? (
      <XCircle className="h-5 w-5 shrink-0 text-red-600" />
    ) : row.state === 'warning' ? (
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
    ) : row.state === 'advisory' ? (
      <CircleDashed className="h-5 w-5 shrink-0 text-slate-400" />
    ) : (
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
    );

  const border =
    row.state === 'blocker'
      ? 'border-red-200 bg-red-50/60'
      : row.state === 'warning'
        ? 'border-amber/30 bg-amber-soft/40'
        : 'border-line bg-white';

  return (
    <li className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', border)}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{row.label}</p>
        {row.message ? <p className="mt-0.5 text-xs text-slate-600">{row.message}</p> : null}
      </div>
      <button type="button" className="shrink-0 text-xs font-bold text-navy hover:underline" onClick={() => onGoToStep(row.step)}>
        Fix →
      </button>
    </li>
  );
}
