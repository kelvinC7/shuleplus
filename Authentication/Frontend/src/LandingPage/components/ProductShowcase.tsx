'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, Reveal } from './ui/Primitives';

type ModuleItem = {
  name: string;
  blurb: string;
  svg: string;
};

type ModuleSuite = {
  id: string;
  name: string;
  modules: ModuleItem[];
};

const suites: ModuleSuite[] = [
  {
    id: 'education',
    name: 'Education',
    modules: [
      { name: 'Student Management', blurb: 'Enrolment & profiles', svg: '/svg-shapes/student-management.svg' },
      { name: 'Students', blurb: 'Learner records', svg: '/svg-shapes/students.svg' },
      { name: 'Classes', blurb: 'Streams & grades', svg: '/svg-shapes/classes.svg' },
      { name: 'Subjects', blurb: 'Curriculum map', svg: '/svg-shapes/subjects.svg' },
      { name: 'Examinations', blurb: 'Assessments', svg: '/svg-shapes/examination.svg' },
      { name: 'Marks Entry', blurb: 'Score capture', svg: '/svg-shapes/marks-entry.svg' },
      { name: 'Report Cards', blurb: 'Term reports', svg: '/svg-shapes/report-cards.svg' },
      { name: 'Graduation', blurb: 'Completions', svg: '/svg-shapes/graduation.svg' },
      { name: 'Timetable', blurb: 'Smart scheduling', svg: '/svg-shapes/timetable.svg' },
      { name: 'Attendance', blurb: 'Daily presence', svg: '/svg-shapes/attendance.svg' },
      { name: 'Student Discipline', blurb: 'Behavior & gates', svg: '/svg-shapes/examination.svg' },
      { name: 'Teacher Portal', blurb: 'Classroom tools', svg: '/svg-shapes/graduation.svg' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    modules: [
      { name: 'School Fees', blurb: 'Billing & payments', svg: '/svg-shapes/fee-collection.svg' },
      { name: 'School Budget', blurb: 'Plans vs actuals', svg: '/svg-shapes/finance.svg' },
      { name: 'Finance', blurb: 'Ledgers & treasury', svg: '/svg-shapes/finance.svg' },
      { name: 'Payroll', blurb: 'Salaries & payslips', svg: '/svg-shapes/payroll.svg' },
      { name: 'Procurement MIS', blurb: 'Purchase flows', svg: '/svg-shapes/procurement.svg' },
      { name: 'Circulars', blurb: 'Babyeyi notices', svg: '/svg-shapes/circular-management.svg' },
    ],
  },
  {
    id: 'people',
    name: 'People & portals',
    modules: [
      { name: 'HR Management', blurb: 'Staff directory', svg: '/svg-shapes/hr-management.svg' },
      { name: 'Leave', blurb: 'Policies & requests', svg: '/svg-shapes/leave-management.svg' },
      { name: 'KaziAdvance', blurb: 'Workforce advances', svg: '/svg-shapes/leave-management.svg' },
      { name: 'Parents Portal', blurb: 'Fees & results', svg: '/svg-shapes/student-management.svg' },
      { name: 'Student Portal', blurb: 'Self-service', svg: '/svg-shapes/students.svg' },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    modules: [
      { name: 'Assets', blurb: 'School property', svg: '/svg-shapes/asset-management.svg' },
      { name: 'Inventory', blurb: 'Stock control', svg: '/svg-shapes/inventory.svg' },
      { name: 'Cafeteria', blurb: 'Meals & canteen', svg: '/svg-shapes/inventory.svg' },
      { name: 'Task MIS', blurb: 'Work & follow-ups', svg: '/svg-shapes/dashboard.svg' },
      { name: 'Action Plan', blurb: 'School initiatives', svg: '/svg-shapes/dashboard.svg' },
      { name: 'Transport', blurb: 'Routes & fleet', svg: '/svg-shapes/transport.svg' },
      { name: 'Library', blurb: 'Books & loans', svg: '/svg-shapes/library.svg' },
    ],
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    modules: [
      { name: 'Dashboard', blurb: 'Live overview', svg: '/svg-shapes/dashboard.svg' },
      { name: 'Analytics', blurb: 'Trends & KPIs', svg: '/svg-shapes/analytics.svg' },
      { name: 'NESA Dashboard', blurb: 'Policy & oversight', svg: '/svg-shapes/analytics.svg' },
      { name: 'AI Assistant', blurb: 'Predictions', svg: '/svg-shapes/ai-assistant.svg' },
      { name: 'Settings', blurb: 'School config', svg: '/svg-shapes/settings.svg' },
    ],
  },
];

const totalModules = suites.reduce((n, s) => n + s.modules.length, 0);

export function ProductShowcase() {
  const [activeSuite, setActiveSuite] = useState<string>('all');

  const visibleSuites = useMemo(() => {
    if (activeSuite === 'all') return suites;
    return suites.filter((s) => s.id === activeSuite);
  }, [activeSuite]);

  return (
    <section id="modules" className="relative overflow-hidden bg-[#F6F7FA] py-14 sm:py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent"
      />

      <Container>
        <Reveal>
          <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-700/45">
                Module catalog
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl lg:text-4xl">
                Every school operation. One Shule+ workspace.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-navy-700/65 sm:text-base">
                Academics, finance, people, logistics and intelligence — browse the full register
                by suite.
              </p>
            </div>
            <div className="flex items-center gap-3 border-t border-navy-900/10 pt-4 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <p className="font-display text-2xl font-semibold tabular-nums text-navy-900 sm:text-3xl">
                {totalModules}
              </p>
              <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-navy-700/45">
                Modules
                <br className="hidden sm:block" /> on record
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal index={1}>
          <div className="sticky top-0 z-10 -mx-4 mt-10 bg-[#F6F7FA]/95 px-4 backdrop-blur sm:mt-12 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
            <div
              role="tablist"
              aria-label="Filter modules by suite"
              className="scrollbar-none flex gap-x-1 overflow-x-auto border-b border-navy-900/10 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <FilterTab
                active={activeSuite === 'all'}
                onClick={() => setActiveSuite('all')}
                label="All suites"
                count={totalModules}
              />
              {suites.map((suite) => (
                <FilterTab
                  key={suite.id}
                  active={activeSuite === suite.id}
                  onClick={() => setActiveSuite(suite.id)}
                  label={suite.name}
                  count={suite.modules.length}
                />
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-8 space-y-10 sm:mt-10 sm:space-y-12">
          <AnimatePresence mode="wait">
            {visibleSuites.map((suite, si) => (
              <motion.div
                key={suite.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: si * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-4 flex items-baseline gap-3 sm:mb-5">
                  <h3 className="font-display text-base font-semibold text-navy-900 sm:text-lg">
                    {suite.name}
                  </h3>
                  <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-navy-700/55">
                    {suite.modules.length} modules
                  </span>
                </div>

                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {suite.modules.map((m, mi) => (
                    <li key={`${suite.id}-${m.name}`}>
                      <motion.a
                        href="#get-started"
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{
                          duration: 0.4,
                          delay: Math.min(mi, 8) * 0.03,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-navy-900/[0.06] bg-white px-3.5 py-3 outline-none transition-shadow duration-200 hover:shadow-[0_14px_30px_-18px_rgba(0,4,53,0.35)] focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-4 sm:py-4"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900/[0.04] sm:h-11 sm:w-11">
                          <Image
                            src={m.svg}
                            alt=""
                            width={22}
                            height={22}
                            className="h-5 w-5 object-contain sm:h-6 sm:w-6"
                            unoptimized
                          />
                        </span>
                        <span className="mt-2.5 line-clamp-2 font-display text-[13px] font-semibold leading-snug text-navy-900 sm:mt-3 sm:text-[15px]">
                          {m.name}
                        </span>
                        <span className="mt-1 line-clamp-1 text-[11px] leading-snug text-navy-700/50 sm:text-[12px]">
                          {m.blurb}
                        </span>
                        <span className="mt-auto flex items-center gap-1 pt-2.5 text-[11px] font-semibold text-amber-600 opacity-100 transition-opacity duration-200 sm:pt-3 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                          Get started
                          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                        </span>
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative -mb-px flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg border border-transparent px-3.5 py-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-4 sm:py-2.5 sm:text-sm ${
        active
          ? 'border-navy-900/10 border-b-white bg-white text-navy-900'
          : 'text-navy-700/55 hover:text-navy-900'
      }`}
    >
      {active && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] rounded-t-full bg-amber-500" />
      )}
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          active ? 'bg-navy-900/[0.06] text-navy-700/60' : 'bg-navy-900/[0.04] text-navy-700/40'
        }`}
      >
        {count}
      </span>
    </button>
  );
}