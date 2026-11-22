import { cn } from '@/shared/cn';

export function SchoolApprovalPipeline({
  stages,
}: {
  stages: Array<{ stageKey: string; label: string; count: number }>;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {stages.map((stage, i) => {
        const h = Math.max(12, Math.round((stage.count / max) * 72));
        const isLast = i === stages.length - 1;
        return (
          <div key={stage.stageKey} className="flex min-w-0 flex-1 flex-col items-center text-center">
            <span className="mb-1 text-lg font-extrabold text-navy">{stage.count}</span>
            <div
              className={cn(
                'w-full max-w-[72px] rounded-t-lg transition-all',
                stage.stageKey === 'approved' && 'bg-emerald-500',
                stage.stageKey === 'rejected' && 'bg-red-400',
                stage.stageKey === 'corrections' && 'bg-amber',
                !['approved', 'rejected', 'corrections'].includes(stage.stageKey) && 'bg-navy/80'
              )}
              style={{ height: h }}
            />
            <p className="mt-2 text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-600">
              {stage.label}
            </p>
            {!isLast ? (
              <span className="mt-1 hidden text-slate-300 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
