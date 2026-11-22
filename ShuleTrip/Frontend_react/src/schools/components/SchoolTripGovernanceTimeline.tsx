import { CheckCircle2, Circle, Clock, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';
import type { TripDetail, TripApprovalFeedback } from '@/schools/types/trip';
import { SCHOOL_GOV_PIPELINE } from '@/schools/config/gov-pipeline';
import { cn } from '@/shared/cn';
import { tripStatusLabel } from '@/shared/trip-status';

type StepState = 'pending' | 'active' | 'done' | 'correction' | 'rejected';

function approvalForStage(approvals: TripApprovalFeedback[] | undefined, approvalStageKey: string) {
  return approvals?.find((a) => a.stageKey === approvalStageKey);
}

function stepState(
  trip: Pick<TripDetail, 'status' | 'currentStageKey' | 'approvals'>,
  stageKey: string,
  approvalStageKey: string,
  index: number
): StepState {
  const record = approvalForStage(trip.approvals, approvalStageKey);
  if (record?.decision === 'REJECTED') return 'rejected';
  if (record?.decision === 'CORRECTION_REQUESTED') return 'correction';
  if (record?.decision === 'APPROVED') return 'done';

  if (trip.status === 'REJECTED' && trip.currentStageKey === stageKey) return 'rejected';
  if (trip.status === 'CORRECTION_REQUESTED' && trip.currentStageKey === stageKey) return 'correction';

  const order = SCHOOL_GOV_PIPELINE.map((s) => s.key);
  const currentIdx = order.indexOf((trip.currentStageKey ?? '') as (typeof order)[number]);
  if (currentIdx > index) return 'done';
  if (currentIdx === index && trip.status !== 'DRAFT' && trip.status !== 'APPROVED') return 'active';

  if (trip.status === 'APPROVED') return 'done';

  return 'pending';
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (state === 'active') return <Clock className="h-5 w-5 text-[#FCB038]" />;
  if (state === 'correction') return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  if (state === 'rejected') return <XCircle className="h-5 w-5 text-red-600" />;
  return <Circle className="h-5 w-5 text-slate-300" />;
}

const STATE_LABEL: Record<StepState, string> = {
  pending: 'Waiting',
  active: 'In progress',
  done: 'Signed & released',
  correction: 'Corrections requested',
  rejected: 'Rejected',
};

export function SchoolTripGovernanceTimeline({ trip }: { trip: TripDetail }) {
  if (trip.status === 'DRAFT') return null;

  const submitted = Boolean(trip.submittedAt);
  const authorized = trip.status === 'APPROVED';

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line bg-gradient-to-r from-[#000435] to-[#0a1654] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">Government process</p>
            <h3 className="mt-1 text-base font-extrabold text-white">Where your trip is in the chain</h3>
            <p className="mt-1 text-xs text-white/70">
              Each gate must sign and stamp before the file moves to the next office.
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-center text-xs font-bold leading-tight text-white">
            {tripStatusLabel(trip.status)}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <ol className="relative space-y-0">
          {submitted ? (
            <li className="relative flex gap-4 pb-8 sm:pb-10">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 ring-4 ring-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </span>
                <span className="mt-2 hidden w-px flex-1 bg-slate-200 sm:block" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm font-bold text-navy">Submitted to government</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {trip.submittedAt
                    ? new Date(trip.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Submission recorded'}
                </p>
              </div>
            </li>
          ) : null}

          {SCHOOL_GOV_PIPELINE.map((stage, index) => {
            const state = stepState(trip, stage.key, stage.approvalStageKey, index);
            const record = approvalForStage(trip.approvals, stage.approvalStageKey);
            const isLast = index === SCHOOL_GOV_PIPELINE.length - 1;

            return (
              <li key={stage.key} className={cn('relative flex gap-4', !isLast && 'pb-8 sm:pb-10')}>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-full ring-4 ring-white',
                      state === 'done' && 'bg-emerald-50',
                      state === 'active' && 'bg-amber-50',
                      state === 'correction' && 'bg-amber-100',
                      state === 'rejected' && 'bg-red-50',
                      state === 'pending' && 'bg-slate-50'
                    )}
                  >
                    <StepIcon state={state} />
                  </span>
                  {!isLast ? <span className="mt-2 hidden min-h-[2rem] w-px flex-1 bg-slate-200 sm:block" aria-hidden /> : null}
                </div>
                <div
                  className={cn(
                    'min-w-0 flex-1 rounded-xl border px-4 py-3 transition',
                    state === 'active' && 'border-[#FCB038]/50 bg-amber-50/40 shadow-sm',
                    state === 'done' && 'border-emerald-200/80 bg-emerald-50/30',
                    state === 'correction' && 'border-amber-300 bg-amber-50/50',
                    state === 'rejected' && 'border-red-200 bg-red-50/40',
                    state === 'pending' && 'border-line bg-slate-50/50'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-navy">{stage.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{stage.subtitle}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        state === 'done' && 'bg-emerald-100 text-emerald-800',
                        state === 'active' && 'bg-[#FCB038]/25 text-amber-950',
                        state === 'correction' && 'bg-amber-200 text-amber-950',
                        state === 'rejected' && 'bg-red-100 text-red-800',
                        state === 'pending' && 'bg-slate-200 text-slate-600'
                      )}
                    >
                      {STATE_LABEL[state]}
                    </span>
                  </div>

                  {record?.decidedByName || record?.decidedAt ? (
                    <p className="mt-2 text-xs text-slate-600">
                      {record.decidedByName ? <span className="font-semibold">{record.decidedByName}</span> : null}
                      {record.decidedAt ? (
                        <span>
                          {record.decidedByName ? ' · ' : ''}
                          {new Date(record.decidedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  {record?.reason && (state === 'correction' || state === 'rejected') ? (
                    <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-800">{record.reason}</p>
                  ) : null}

                  {state === 'active' ? (
                    <p className="mt-2 text-xs font-semibold text-[#000435]/80">
                      Currently with: <span className="text-navy">{stage.title}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}

          {authorized ? (
            <li className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 ring-4 ring-white">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </span>
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-900">Trip authorized</p>
                <p className="mt-0.5 text-xs text-emerald-800">All government gates complete — you may proceed to trip day operations.</p>
              </div>
            </li>
          ) : null}
        </ol>
      </div>
    </section>
  );
}
