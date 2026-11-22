import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Field } from '@/components/ui/form-field';
import { TRIP_STATUS_FILTERS } from '@/schools/types/trip-list';
import { cn } from '@/shared/cn';

export function TripStatusFilterBar({ className }: { className?: string }) {
  const [params, setSearchParams] = useSearchParams();
  const active = params.get('status') ?? 'ALL';

  function onChange(next: string) {
    const nextParams = new URLSearchParams(params);
    if (next === 'ALL') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', next);
    }
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <Field label="Filter by status" className={cn('mb-0 w-full min-w-[220px] sm:max-w-xs', className)}>
      <div className="relative">
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          value={active}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-line bg-white py-2.5 pl-10 pr-10 text-sm font-semibold text-navy shadow-sm outline-none transition hover:border-navy/20 focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25"
          aria-label="Filter trips by status"
        >
          {TRIP_STATUS_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </Field>
  );
}
