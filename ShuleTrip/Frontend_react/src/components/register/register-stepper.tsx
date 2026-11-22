import { Building2, Check, ClipboardCheck, FileText, MapPin, UserRound } from 'lucide-react';
import { cn } from '@/shared/cn';

export const REGISTER_STEPS = [
  { id: 1, label: 'School', icon: Building2 },
  { id: 2, label: 'Location', icon: MapPin },
  { id: 3, label: 'Administration', icon: UserRound },
  { id: 4, label: 'Documents', icon: FileText },
  { id: 5, label: 'Account', icon: ClipboardCheck },
] as const;

export function RegisterStepper({ step }: { step: number }) {
  const current = REGISTER_STEPS.find((s) => s.id === step) ?? REGISTER_STEPS[0];

  return (
    <div>
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            Step {step} of {REGISTER_STEPS.length}
          </span>
          <span className="font-semibold text-navy">{current.label}</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-navy/10">
          <div
            className="h-full rounded-full bg-amber transition-all duration-300"
            style={{ width: `${(step / REGISTER_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-start sm:flex">
        {REGISTER_STEPS.map((s, i) => {
          const active = step === s.id;
          const done = step > s.id;
          const Icon = s.icon;
          return (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                <span className={cn('h-px flex-1', i === 0 ? 'opacity-0' : done || active ? 'bg-amber' : 'bg-line')} />
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm transition-all',
                    done && 'bg-amber text-white shadow-md',
                    active && !done && 'bg-navy text-white shadow-md',
                    !active && !done && 'bg-slate-100 text-slate-400'
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={cn('h-px flex-1', i === REGISTER_STEPS.length - 1 ? 'opacity-0' : done ? 'bg-amber' : 'bg-line')} />
              </div>
              <span className={cn('text-[11px] font-semibold', active ? 'text-navy' : 'text-slate-400')}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
