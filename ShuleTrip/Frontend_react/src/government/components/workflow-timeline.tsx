import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { APPROVAL_TIMELINE_STAGES } from '@/government/config/workflow-stages';
import { cn } from '@/shared/cn';

export function WorkflowTimeline({ activeIndex = 2 }: { activeIndex?: number }) {
  return (
    <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
      {APPROVAL_TIMELINE_STAGES.map((stage, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <li key={stage.key} className="relative pb-8 last:pb-0">
            <span
              className={cn(
                'absolute -left-[1.65rem] grid h-8 w-8 place-items-center rounded-full border-2 bg-white',
                done && 'border-emerald-500 text-emerald-600',
                current && 'border-amber bg-amber-soft text-amber-950',
                !done && !current && 'border-slate-200 text-slate-400'
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : current ? <Clock className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
            </span>
            <p className="text-sm font-bold text-slate-900">{stage.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stage.description}</p>
            {current ? (
              <span className="mt-2 inline-block rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Current stage
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
