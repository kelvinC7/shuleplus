import { TrendingDown, TrendingUp } from 'lucide-react';

function Kpi({ label, value, accent = '#000435' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
      <p className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

export default function AssessmentPerformancePanel({ performance, maxMark }) {
  if (!performance) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-sm text-slate-500">Performance stats appear once marks are entered.</p>
      </div>
    );
  }

  const distMax = Math.max(...performance.distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6 p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Average" value={`${performance.average}%`} />
        <Kpi label="Pass rate" value={`${performance.passRate}%`} accent="#2563eb" />
        <Kpi label="Highest" value={`${performance.highest}%`} accent="#059669" />
        <Kpi label="Lowest" value={`${performance.lowest}%`} accent="#dc2626" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Score distribution</p>
        <div className="mt-4 flex flex-col gap-3">
          {performance.distribution.map((d) => (
            <div key={d.label} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">{d.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full min-w-0 rounded-full bg-gradient-to-r from-[#FCB038] to-[#000435]"
                  style={{
                    width: d.count > 0 ? `${Math.max((d.count / distMax) * 100, 6)}%` : '0%',
                  }}
                />
              </div>
              <span className="text-right text-sm font-extrabold tabular-nums text-[#000435]">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={20} />
            <p className="text-sm font-extrabold text-[#000435]">Strong performers</p>
          </div>
          {performance.top.length === 0 ? (
            <p className="text-sm text-slate-500">No scored marks yet.</p>
          ) : (
            <ul className="divide-y divide-emerald-200/60">
              {performance.top.map((row) => (
                <li key={row.student.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm font-semibold text-[#000435]">{row.student.fullName}</span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-emerald-700">
                    {row.score}/{maxMark} ({Math.round(row.pct)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="text-red-600" size={20} />
            <p className="text-sm font-extrabold text-[#000435]">Needs support</p>
          </div>
          {performance.weak.length === 0 ? (
            <p className="text-sm text-slate-500">No scored marks yet.</p>
          ) : (
            <ul className="divide-y divide-red-200/60">
              {performance.weak.map((row) => (
                <li key={row.student.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm font-semibold text-[#000435]">{row.student.fullName}</span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-red-700">
                    {row.score}/{maxMark} ({Math.round(row.pct)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Based on {performance.ranked.length} student{performance.ranked.length !== 1 ? 's' : ''} with marks entered.
      </p>
    </div>
  );
}
