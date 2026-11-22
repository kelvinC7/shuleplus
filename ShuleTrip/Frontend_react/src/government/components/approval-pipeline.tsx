import { cn } from '@/shared/cn';

export function ApprovalPipeline({
  stages,
}: {
  stages: Array<{ stageKey: string; label: string; count: number }>;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.stageKey} className="flex items-center gap-3">
          <span className="w-6 text-center text-xs font-bold text-slate-400">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{stage.label}</p>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-navy">{stage.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full bg-navy transition-all', stage.count === 0 && 'bg-slate-200')}
                style={{ width: `${Math.round((stage.count / max) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
