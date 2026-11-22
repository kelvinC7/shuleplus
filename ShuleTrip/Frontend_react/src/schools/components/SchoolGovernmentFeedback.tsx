import { AlertTriangle, Building2, Calendar, MessageSquareQuote } from 'lucide-react';
import type { TripApprovalFeedback, TripDetail } from '@/schools/types/trip';
import { StatusBadge } from '@/components/ui/badge';

function formatRole(role?: string | null) {
  if (!role) return 'Government reviewer';
  return role.replace(/_/g, ' ');
}

export function SchoolGovernmentFeedback({ trip }: { trip: TripDetail }) {
  if (trip.status !== 'CORRECTION_REQUESTED') return null;

  const corrections = (trip.approvals ?? []).filter((a) => a.decision === 'CORRECTION_REQUESTED');

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 bg-amber-100/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-amber-950">Government correction request</p>
            <p className="text-xs text-amber-900/80">Read the comments below, update your application, then resubmit.</p>
          </div>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {trip.correctionDueAt ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
            <Calendar className="h-3.5 w-3.5" />
            Respond by {new Date(trip.correctionDueAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </p>
        ) : null}

        {trip.correctionNote ? (
          <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              <MessageSquareQuote className="h-3.5 w-3.5" /> Latest instruction
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{trip.correctionNote}</p>
          </div>
        ) : null}

        {corrections.length > 0 ? (
          <ul className="space-y-3">
            {corrections.map((item: TripApprovalFeedback) => (
              <li key={item.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-navy">{item.stageLabel}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600">
                      <Building2 className="h-3 w-3" />
                      {item.authorityOffice ?? formatRole(item.officialRole)}
                    </p>
                  </div>
                  {item.decidedAt ? (
                    <time className="text-[10px] font-semibold text-slate-500">
                      {new Date(item.decidedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {item.decidedByName ?? 'Official'} · {formatRole(item.officialRole)}
                </p>
                {item.reason ? (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800">{item.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
