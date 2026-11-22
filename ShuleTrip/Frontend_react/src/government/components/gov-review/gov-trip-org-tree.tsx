import { Building2, ChevronRight, Landmark, MapPin, School } from 'lucide-react';

export function GovTripOrgTree({
  schoolName,
  schoolCode,
  district,
  sector,
  tripReference,
  tripTitle,
}: {
  schoolName: string;
  schoolCode?: string | null;
  district?: string | null;
  sector?: string | null;
  tripReference: string;
  tripTitle: string;
}) {
  const levels = [
    { icon: Landmark, label: 'Government of Rwanda', sub: 'ShuleTrip · School trip authorization' },
    district
      ? { icon: MapPin, label: district, sub: 'District' }
      : { icon: MapPin, label: 'District not set on school', sub: 'Assign in IAM org profile' },
    sector ? { icon: Building2, label: sector, sub: 'Sector' } : null,
    {
      icon: School,
      label: schoolName,
      sub: schoolCode ? `School code ${schoolCode}` : 'School organization',
    },
    { icon: ChevronRight, label: tripReference, sub: tripTitle },
  ].filter(Boolean) as Array<{ icon: typeof School; label: string; sub: string }>;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#000435]/10 bg-gradient-to-br from-[#000435] via-[#0a1654] to-[#000435] text-white shadow-lg">
      <div className="border-b border-white/10 px-4 py-3 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">Organizational context</p>
        <p className="mt-1 text-sm text-white/80">Jurisdiction chain for this application file</p>
      </div>
      <ol className="space-y-0 px-2 py-3 sm:px-4 sm:py-4">
        {levels.map((level, i) => {
          const Icon = level.icon;
          const isLast = i === levels.length - 1;
          return (
            <li key={`${level.label}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast ? (
                <span className="absolute left-[1.15rem] top-9 h-[calc(100%-1rem)] w-px bg-white/20" aria-hidden />
              ) : null}
              <span
                className={`relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  isLast ? 'bg-[#FCB038] text-[#000435]' : 'bg-white/10 text-[#FCB038]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={`truncate font-bold ${isLast ? 'text-base text-white' : 'text-sm text-white/95'}`}>
                  {level.label}
                </p>
                <p className="text-xs text-white/60">{level.sub}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
