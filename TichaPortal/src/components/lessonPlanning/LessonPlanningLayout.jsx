import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAVY = '#000435';

const TABS = [
  { path: '/lesson-planning/generate', label: 'Generate', short: 'New' },
  { path: '/lesson-planning/all', label: 'All plans', short: 'Plans' },
  { path: '/lesson-planning/book', label: 'Download book', short: 'Book' },
  { path: '/lesson-planning/performance', label: 'Performance', short: 'Stats' },
];

export default function LessonPlanningLayout({ title, subtitle, actions, children }) {
  const location = useLocation();

  return (
    <div className="space-y-5">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Lesson planning</p>
            <h1 className="mt-0.5 text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2 [&_button]:min-h-[40px]">{actions}</div> : null}
        </div>

        <nav
          className="mt-4 flex gap-4 overflow-x-auto text-sm scroll-smooth sm:gap-6"
          aria-label="Lesson planning sections"
        >
          {TABS.map((tab) => {
            const active = location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`shrink-0 border-b-2 pb-2 font-medium transition ${
                  active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                style={active ? { borderColor: NAVY, color: NAVY } : undefined}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
