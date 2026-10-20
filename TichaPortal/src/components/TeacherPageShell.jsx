import React from 'react';
import TeacherOrangeHero from './TeacherOrangeHero';

/** Dashboard-style floating stat strip (2×2 mobile, 4 cols desktop). */
export const tpActionBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm text-[#000435] hover:bg-slate-50 transition-colors disabled:opacity-50';
export const tpActionBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-sm text-white hover:bg-[#000650] transition-colors disabled:opacity-50';

export function TeacherStatGrid({ stats = [] }) {
  if (!stats.length) return null;

  const gridClass =
    stats.length === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : stats.length === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : stats.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`tp-stat-grid shadow-sm !grid ${gridClass}`}>
      {stats.map((stat, i) => {
        const isLast = i === stats.length - 1;
        const isOddCol = i % 2 === 0;
        const showBottomBorder = stats.length > 2 && i < stats.length - (stats.length % 2 === 0 ? 2 : 1);

        return (
          <div
            key={stat.label}
            className={`tp-stat-cell border-black/[0.05]
              ${!isLast && isOddCol && stats.length > 1 ? 'border-r' : ''}
              ${showBottomBorder ? 'border-b sm:border-b-0' : ''}
              ${i < stats.length - 1 ? 'sm:border-r' : ''}`}
          >
            <span className="tp-stat-value">{stat.value}</span>
            <p className="tp-stat-label">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dashboard-aligned layout: hero → stat grid → optional actions → content (no heavy wrapper).
 */
export default function TeacherPageShell({
  title,
  subtitle,
  stats = [],
  actions = null,
  children,
  badgeLabel = 'ShuleTicha · Secure',
}) {
  return (
    <div className="min-h-full animate-in fade-in duration-500 pb-24 lg:pb-10">
      <TeacherOrangeHero title={title} subtitle={subtitle} badgeLabel={badgeLabel} />

      <div className="relative z-20 mx-auto max-w-[1300px] space-y-5 px-4 pb-10 sm:px-6 lg:px-8 -mt-8">
        <TeacherStatGrid stats={stats} />

        {actions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
