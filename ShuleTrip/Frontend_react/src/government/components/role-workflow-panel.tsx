import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, GraduationCap, ShieldCheck, Stamp } from 'lucide-react';
import { useGovernmentAuth } from '@/contexts/government-auth-context';
import { primaryGovPersona, resolveGovPersonas } from '@/government/config/roles';
import { Card } from '@/components/ui/card';

const STAGE_LINKS = [
  { key: 'intake', label: 'Intake trips', href: '/government/intake', icon: ClipboardCheck, queueKey: 'intake' as const },
  { key: 'education', label: 'Education review', href: '/government/education-review', icon: GraduationCap, queueKey: 'education' as const },
  { key: 'transport', label: 'Transport & safety', href: '/government/safety', icon: ShieldCheck, queueKey: 'transport' as const },
  { key: 'final', label: 'Final authorization', href: '/government/final-approval', icon: Stamp, queueKey: 'final' as const },
];

export function RoleWorkflowPanel() {
  const { summary, user } = useGovernmentAuth();
  const persona = primaryGovPersona(resolveGovPersonas(user?.roles ?? []));
  const wq = summary?.workflowQueue;

  const visible =
    persona === 'super_admin' || persona === 'national_administrator'
      ? STAGE_LINKS
      : STAGE_LINKS.filter((s) => {
          if (persona === 'intake_reviewer') return s.key === 'intake';
          if (persona === 'education_reviewer' || persona === 'district_education_officer' || persona === 'sector_education_inspector')
            return s.key === 'education';
          if (persona === 'transport_reviewer') return s.key === 'transport';
          if (persona === 'final_approval_officer') return s.key === 'final';
          return false;
        });

  return (
    <Card className="overflow-hidden border-[#000435]/10 bg-gradient-to-br from-white to-slate-50">
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#FCB038]">Your workflow desk</p>
        <h2 className="mt-1 text-lg font-extrabold text-[#000435]">Stage-gated applications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Files appear here only when the previous officer has signed and stamped their gate.
        </p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {visible.map(({ key, label, href, icon: Icon, queueKey }) => {
          const count = wq?.[queueKey] ?? 0;
          return (
            <Link
              key={key}
              to={href}
              className="group flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-4 shadow-sm transition hover:border-[#FCB038]/50 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#000435] text-[#FCB038]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">{label}</p>
                  <p className="text-xs text-slate-500">{count} awaiting your action</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-navy" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
