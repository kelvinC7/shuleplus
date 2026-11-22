import { Check } from 'lucide-react';
import { cn } from '@/shared/cn';

export function TripWizardStepper({
  steps,
  current,
  onStep,
}: {
  steps: string[];
  current: number;
  onStep: (index: number) => void;
}) {
  const progress = Math.round(((current + 1) / steps.length) * 100);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Application progress</p>
          <p className="text-sm font-semibold text-navy">
            Step {current + 1} of {steps.length} · {steps[current]}
          </p>
        </div>
        <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">{progress}%</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber to-amber transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <ol className="flex min-w-[720px] items-center gap-0 overflow-x-auto pb-1">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => onStep(i)}
                className={cn('group flex min-w-0 flex-1 flex-col items-center gap-2 px-1 text-center', !active && !done && 'opacity-75')}
              >
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold shadow-sm transition',
                    active && 'bg-amber text-navy ring-4 ring-amber/20',
                    done && !active && 'bg-emerald-500 text-white',
                    !active && !done && 'border-2 border-slate-200 bg-white text-slate-400 group-hover:border-amber/40'
                  )}
                >
                  {done && !active ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn('hidden max-w-[96px] truncate text-[10px] font-bold leading-tight sm:block', active ? 'text-navy' : 'text-slate-500')}>
                  {label}
                </span>
              </button>
              {i < steps.length - 1 ? (
                <div className={cn('mx-0.5 h-1 min-w-[8px] flex-1 rounded-full', i < current ? 'bg-emerald-400' : 'bg-slate-200')} aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
