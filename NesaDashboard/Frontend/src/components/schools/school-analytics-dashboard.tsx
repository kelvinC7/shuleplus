'use client';

import { TrendingUp, TrendingDown, Minus, School, Users, Award, AlertCircle } from 'lucide-react';

const KPI = [
  { label: 'National index', value: '78.4', delta: '+2.1', up: true, icon: Award },
  { label: 'Schools tracked', value: '2,847', delta: '+18', up: true, icon: School },
  { label: 'Learners', value: '1.42M', delta: '0.4%', up: true, icon: Users },
  { label: 'At-risk schools', value: '146', delta: '-12', up: false, icon: AlertCircle },
] as const;

const TREND = [62, 65, 64, 68, 71, 70, 74, 76, 75, 78, 77, 78];

const PROVINCES = [
  { name: 'Kigali', score: 84 },
  { name: 'North', score: 76 },
  { name: 'South', score: 74 },
  { name: 'East', score: 72 },
  { name: 'West', score: 71 },
];

const DISTRIBUTION = [
  { label: 'Exceeding', pct: 22, color: '#20d6c7' },
  { label: 'On track', pct: 58, color: '#fcb038' },
  { label: 'Needs support', pct: 20, color: '#ef4444' },
];

const TOP_SCHOOLS = [
  { name: 'GS Kacyiru', index: 88, change: 4 },
  { name: 'EP Remera', index: 86, change: 2 },
  { name: 'GS Nyamirambo', index: 85, change: -1 },
  { name: 'GS Kimisagara', index: 84, change: 3 },
];

const ENROLLMENT = [88, 91, 90, 93, 95, 94, 96, 97, 98, 99, 100, 100];

const INSIGHTS = [
  { tag: 'Attendance', text: 'National average up 1.2% this week.', tone: 'good' as const },
  { tag: 'Fees', text: '12 schools flagged for policy review.', tone: 'warn' as const },
  { tag: 'Exams', text: 'P6 mock scores synced for 89% of districts.', tone: 'neutral' as const },
  { tag: 'Infrastructure', text: '3 new labs reported in Southern Province.', tone: 'good' as const },
];

function TrendIcon({ change }: { change: number }) {
  if (change > 0) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden />;
  if (change < 0) return <TrendingDown className="h-3.5 w-3.5 text-rose-500" aria-hidden />;
  return <Minus className="h-3.5 w-3.5 text-navy/40" aria-hidden />;
}

export function SchoolAnalyticsDashboard() {
  const maxProv = Math.max(...PROVINCES.map((p) => p.score));
  const trendPoints = TREND.map((y, i) => {
    const x = (i / (TREND.length - 1)) * 100;
    const py = 100 - ((y - 55) / 30) * 100;
    return `${x},${py}`;
  }).join(' ');

  let donutOffset = 0;
  const donutSegments = DISTRIBUTION.map((d) => {
    const dash = `${d.pct} ${100 - d.pct}`;
    const seg = { ...d, dash, offset: donutOffset };
    donutOffset -= d.pct;
    return seg;
  });

  const enrollPoints = ENROLLMENT.map((y, i) => {
    const x = (i / (ENROLLMENT.length - 1)) * 100;
    const py = 100 - ((y - 85) / 20) * 100;
    return `${x},${py}`;
  }).join(' ');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['This term', 'All provinces', 'Public'].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-navy/10 bg-white px-3 py-1 text-[11px] font-semibold text-navy/70 shadow-sm"
            >
              {chip}
            </span>
          ))}
        </div>
        <span className="text-[11px] font-medium text-navy/40">Updated 4 min ago</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/45">{k.label}</p>
              <k.icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-navy">{k.value}</p>
            <p
              className={`mt-1 flex items-center gap-1 text-[12px] font-semibold ${
                k.up ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {k.delta}
              <span className="font-normal text-navy/40">vs last term</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 lg:col-span-2 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]">
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold text-navy">Performance trend</h2>
              <p className="text-[12px] text-navy/45">12-month national index</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              +2.1 pts
            </span>
          </div>
          <svg viewBox="0 0 100 40" className="h-44 w-full" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="nesaTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcb038" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#fcb038" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon fill="url(#nesaTrendFill)" points={`0,40 ${trendPoints} 100,40`} />
            <polyline
              fill="none"
              stroke="#fcb038"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              points={trendPoints}
            />
          </svg>
        </div>

        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]">
          <h2 className="text-[15px] font-bold text-navy">Performance mix</h2>
          <p className="text-[12px] text-navy/45">Share of schools</p>
          <div className="relative mx-auto mt-4 h-36 w-36">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              {donutSegments.map((s) => (
                <circle
                  key={s.label}
                  r="15.9"
                  cx="18"
                  cy="18"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3.2"
                  strokeDasharray={s.dash}
                  strokeDashoffset={s.offset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-navy">78</span>
              <span className="text-[10px] font-semibold uppercase text-navy/40">Index</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {DISTRIBUTION.map((d) => (
              <li key={d.label} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-navy/70">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.label}
                </span>
                <span className="font-bold tabular-nums text-navy">{d.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]">
          <h2 className="text-[15px] font-bold text-navy">By province</h2>
          <p className="mb-4 text-[12px] text-navy/45">Average school index</p>
          <ul className="space-y-3">
            {PROVINCES.map((p) => (
              <li key={p.name}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="font-medium text-navy/80">{p.name}</span>
                  <span className="font-bold tabular-nums text-navy">{p.score}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-navy/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy to-primary"
                    style={{ width: `${(p.score / maxProv) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]">
          <h2 className="text-[15px] font-bold text-navy">Top movers</h2>
          <p className="mb-4 text-[12px] text-navy/45">Highest index this month</p>
          <ul className="divide-y divide-navy/[0.06]">
            {TOP_SCHOOLS.map((s, i) => (
              <li key={s.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy/[0.05] text-[12px] font-bold text-navy">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-navy">{s.name}</p>
                  <p className="text-[11px] text-navy/45">Index {s.index}</p>
                </div>
                <span className="flex items-center gap-1 text-[12px] font-bold tabular-nums text-navy">
                  <TrendIcon change={s.change} />
                  {s.change > 0 ? `+${s.change}` : s.change}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 lg:col-span-2 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[15px] font-bold text-navy">Enrollment capacity</h2>
            <span className="text-2xl font-bold tabular-nums text-navy">96%</span>
          </div>
          <svg viewBox="0 0 100 32" className="h-28 w-full" preserveAspectRatio="none" aria-hidden>
            <polyline
              fill="none"
              stroke="#20d6c7"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              points={enrollPoints}
            />
          </svg>
        </div>

        <div className="rounded-2xl border border-navy/[0.06] bg-gradient-to-br from-navy/[0.02] to-primary/[0.08] p-5 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.35)]">
          <h2 className="text-[15px] font-bold text-navy">Live insights</h2>
          <ul className="mt-3 space-y-2.5">
            {INSIGHTS.map((item) => (
              <li
                key={item.tag}
                className="rounded-xl border border-navy/[0.06] bg-white/90 px-3 py-2.5 text-[12px] leading-snug text-navy/75"
              >
                <span
                  className={`mr-2 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    item.tone === 'good'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : item.tone === 'warn'
                        ? 'bg-amber-500/10 text-amber-800'
                        : 'bg-navy/[0.06] text-navy/55'
                  }`}
                >
                  {item.tag}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
