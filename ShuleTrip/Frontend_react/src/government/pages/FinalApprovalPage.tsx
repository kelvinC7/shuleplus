import { ChevronDown, Stamp } from 'lucide-react';
import { useState } from 'react';
import { GovApplicationsWorkspace } from '@/government/components/gov-applications-workspace';
import { useGovernmentAuth } from '@/contexts/government-auth-context';
import { cn } from '@/shared/cn';

const CHECKLIST = [
  'All prior gates signed',
  'Documents verified',
  'Safety checks clear',
  'Manifest matches capacity',
  'No open corrections',
];

export default function FinalApprovalPage() {
  const { user } = useGovernmentAuth();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const canIssue =
    user?.canFinalApprove ||
    user?.roles?.includes('super_admin') ||
    user?.roles?.includes('national_administrator');

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-8">
      {!canIssue ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Final authorization is not enabled on your account. Ask a super admin to enable{' '}
          <strong>Can issue final trip authorization</strong>.
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3">
          <Stamp className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          <p className="text-sm text-slate-800">
            You can issue official authorization. Use <strong>Approve</strong> on each application and upload signature + stamp.
          </p>
        </div>
      )}

      <GovApplicationsWorkspace
        title="Final authorization"
        description="Applications ready for your decision."
        stage="final"
        signActionLabel="Review & authorize"
        emptyMessage="No applications ready for final decision."
      />

      <div className="rounded-2xl border border-line bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setChecklistOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left sm:px-5"
        >
          <span className="text-sm font-bold text-navy">Before you approve</span>
          <ChevronDown className={cn('size-5 text-slate-500 transition', checklistOpen && 'rotate-180')} />
        </button>
        {checklistOpen ? (
          <ul className="grid gap-2 border-t border-line px-4 py-3 sm:grid-cols-2 sm:px-5 sm:pb-4">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
