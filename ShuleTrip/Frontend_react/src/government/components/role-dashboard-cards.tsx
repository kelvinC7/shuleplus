import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGovernmentAuth } from '@/contexts/government-auth-context';
import { canAccessHref, primaryGovPersona, resolveGovPersonas } from '@/government/config/roles';

type FocusLink = { label: string; href: string; detail: string };

const FOCUS_BY_PERSONA: Record<string, FocusLink[]> = {
  intake_reviewer: [
    { label: 'Intake workspace', href: '/government/intake', detail: '' },
    { label: 'Documents', href: '/government/documents', detail: '' },
  ],
  education_reviewer: [
    { label: 'Education workspace', href: '/government/education-review', detail: '' },
    { label: 'Documents', href: '/government/documents', detail: '' },
  ],
  transport_reviewer: [
    { label: 'Transport workspace', href: '/government/safety', detail: '' },
    { label: 'Documents', href: '/government/documents', detail: '' },
  ],
  checkpoint_inspector: [
    { label: 'Checkpoint', href: '/government/checkpoint', detail: '' },
    { label: 'Approved trips', href: '/government/approved', detail: '' },
  ],
  final_approval_officer: [
    { label: 'Final workspace', href: '/government/final-approval', detail: '' },
    { label: 'Approved trips', href: '/government/approved', detail: '' },
  ],
  monitoring_officer: [
    { label: 'Monitoring', href: '/government/monitoring', detail: '' },
    { label: 'Incidents', href: '/government/incidents', detail: '' },
  ],
  national_administrator: [
    { label: 'Action queue', href: '/government/review-queue', detail: '' },
    { label: 'Applications', href: '/government/applications', detail: '' },
  ],
  district_education_officer: [
    { label: 'Education', href: '/government/education-review', detail: '' },
    { label: 'Final approval', href: '/government/final-approval', detail: '' },
  ],
  sector_education_inspector: [
    { label: 'Education', href: '/government/education-review', detail: '' },
    { label: 'Monitoring', href: '/government/monitoring', detail: '' },
  ],
  super_admin: [
    { label: 'Users', href: '/government/admin/users', detail: '' },
    { label: 'Workflow', href: '/government/admin/workflow', detail: '' },
  ],
};

export function RoleDashboardCards() {
  const { user } = useGovernmentAuth();
  const personas = useMemo(() => resolveGovPersonas(user?.roles ?? []), [user?.roles]);
  const persona = useMemo(() => primaryGovPersona(personas), [personas]);
  const links = useMemo(() => {
    const base = FOCUS_BY_PERSONA[persona] ?? FOCUS_BY_PERSONA.monitoring_officer;
    return base.filter((item) => canAccessHref(item.href, personas, user));
  }, [persona, personas, user]);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-navy shadow-sm transition hover:border-navy/25 hover:shadow-md"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
