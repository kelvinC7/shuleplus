import { useMemo } from 'react';
import { useGovernmentAuth } from '@/contexts/government-auth-context';
import { primaryGovPersona, resolveGovPersonas, roleDefinition } from '@/government/config/roles';

export function RoleFocusBanner() {
  const { user, summary } = useGovernmentAuth();
  const persona = useMemo(() => primaryGovPersona(resolveGovPersonas(user?.roles ?? [])), [user?.roles]);
  const def = roleDefinition(persona);

  const jurisdiction =
    summary?.jurisdiction?.district || summary?.jurisdiction?.sector
      ? [summary.jurisdiction.district, summary.jurisdiction.sector].filter(Boolean).join(' · ')
      : 'National / full authorized scope';

  return (
    <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-navy via-navy to-[#1a2d6b] p-6 text-white md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">Your workspace</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{def.label}</h2>
          <p className="mt-2 max-w-xl text-sm text-white/80">{def.summary}</p>
          <p className="mt-4 text-xs font-semibold text-amber">{user?.name ?? user?.email ?? 'Official'}</p>
        </div>
        <div className="rounded-xl bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Jurisdiction</p>
          <p className="mt-1 text-sm font-bold">{jurisdiction}</p>
        </div>
      </div>
    </div>
  );
}
