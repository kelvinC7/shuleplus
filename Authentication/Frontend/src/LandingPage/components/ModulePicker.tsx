'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

type PickerModule = {
  id: string;
  name: string;
  svg: string;
  blurb: string;
  description: string;
  features: string[];
  tier: 'core' | 'premium';
  suite: string;
};

/** Landing catalog: academic apps collapsed into one Academic module */
const catalog: PickerModule[] = [
  {
    id: 'academic',
    name: 'Academic',
    svg: '/svg-shapes/students.svg',
    blurb: 'Students, classes, exams & reports',
    description:
      'One academic workspace for enrolment, classes, subjects, examinations, marks, report cards, analytics and graduation — everything your school runs day to day.',
    features: [
      'Student enrolment & profiles',
      'Classes, streams & subjects',
      'Examinations & marks entry',
      'Report cards & academic analytics',
    ],
    tier: 'core',
    suite: 'Education',
  },
  {
    id: 'student-management',
    name: 'Student Management',
    svg: '/svg-shapes/student-management.svg',
    blurb: 'Enrolment, profiles & records',
    description:
      'Manage student master data from enrolment through graduation — profiles, classes, guardians, examinations and marks in one dedicated workspace.',
    features: [
      'Student profiles & enrolment',
      'Classes & combinations',
      'Examinations & marks',
      'Guardian links & student codes',
    ],
    tier: 'core',
    suite: 'Education',
  },
  {
    id: 'teacher-portal',
    name: 'Teacher Portal',
    svg: '/svg-shapes/classes.svg',
    blurb: 'Teaching workspace',
    description:
      'Give teachers a focused portal for classes, marks, attendance and communication with students and parents.',
    features: ['Class lists', 'Marks entry', 'Lesson notes', 'Parent messaging'],
    tier: 'core',
    suite: 'Education',
  },
  {
    id: 'school-fees',
    name: 'School Fees',
    svg: '/svg-shapes/fee-collection.svg',
    blurb: 'Billing & online payments',
    description:
      'Collect school fees with clear structures, student lookups, receipts and online payment flows parents can trust.',
    features: ['Fee structures & billing', 'Student fee lookup', 'Online payments', 'Receipts & arrears'],
    tier: 'core',
    suite: 'Finance',
  },
  {
    id: 'budget',
    name: 'Budget Management',
    svg: '/svg-shapes/analytics.svg',
    blurb: 'Plans & spending control',
    description:
      'Build annual budgets, track allocations by department and stay on top of planned versus actual spending.',
    features: ['Budget planning', 'Department allocations', 'Variance tracking', 'Approval workflows'],
    tier: 'core',
    suite: 'Finance',
  },
  {
    id: 'payroll',
    name: 'Payroll',
    svg: '/svg-shapes/payroll.svg',
    blurb: 'Salaries & payslips',
    description:
      'Run payroll for teaching and support staff with payslips, deductions and period close in one place.',
    features: ['Salary runs', 'Payslips', 'Deductions & allowances', 'Period close'],
    tier: 'core',
    suite: 'Finance',
  },
  {
    id: 'hr',
    name: 'HR',
    svg: '/svg-shapes/hr-management.svg',
    blurb: 'Staff directory & records',
    description:
      'Manage staff profiles, contracts and HR records so your institution always knows who is on the team.',
    features: ['Staff directory', 'Contracts & roles', 'Document vault', 'Org structure'],
    tier: 'core',
    suite: 'People',
  },
  {
    id: 'kaziavance',
    name: 'KaziAdvance',
    svg: '/svg-shapes/leave-management.svg',
    blurb: 'Staff salary advances',
    description:
      'Let staff request salary advances with approvals, repayment tracking and payroll sync — built for schools and HR teams.',
    features: [
      'Advance requests & approvals',
      'Repayment schedules',
      'Payroll integration',
      'Audit trail & receipts',
    ],
    tier: 'premium',
    suite: 'Finance',
  },
  {
    id: 'digital-attendance',
    name: 'Digital Attendance',
    svg: '/svg-shapes/attendance.svg',
    blurb: 'Live presence & gates',
    description:
      'Track student and staff entry and exit with devices, live monitoring, and parent notifications.',
    features: ['Digital attendance', 'Entry & exit logs', 'Live monitor', 'Parent alerts'],
    tier: 'core',
    suite: 'People',
  },
  {
    id: 'smart-transport',
    name: 'Smart Transport',
    svg: '/svg-shapes/transport.svg',
    blurb: 'RFID buses & student safety',
    description:
      'Track buses, RFID boarding and exits, live GPS, parent notifications and missing-student safety checks.',
    features: ['RFID boarding', 'Live trip control', 'Parent alerts', 'GPS + safety'],
    tier: 'core',
    suite: 'Operations',
  },
  {
    id: 'action-plan',
    name: 'Action Plan',
    svg: '/svg-shapes/circular-management.svg',
    blurb: 'Goals & follow-up',
    description:
      'Capture school action plans, assign owners, track progress and close the loop on institutional priorities.',
    features: ['Plan drafting', 'Owners & deadlines', 'Progress tracking', 'Status reports'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'procurement',
    name: 'Procurement',
    svg: '/svg-shapes/procurement.svg',
    blurb: 'Purchase flows',
    description:
      'Raise requests, approve purchases and track suppliers so school spending stays controlled.',
    features: ['Purchase requests', 'Approvals', 'Supplier tracking', 'Order history'],
    tier: 'premium',
    suite: 'Finance',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    svg: '/svg-shapes/inventory.svg',
    blurb: 'Stock control',
    description:
      'Know what is in store — stock levels, movements and low-stock alerts for school supplies.',
    features: ['Stock levels', 'Movements', 'Stores & locations', 'Low-stock alerts'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'school-uniform',
    name: 'School Uniform',
    svg: '/svg-shapes/uniform.svg',
    blurb: 'Uniforms, stock & sales',
    description:
      'Manage school uniform catalogues, student measurements, stock, sales, distributions and tailor workflows in one module.',
    features: [
      'Uniform products & packages',
      'Student measurements',
      'Stock & sales',
      'Distribution & tailor orders',
    ],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'assets',
    name: 'Assets',
    svg: '/svg-shapes/asset-management.svg',
    blurb: 'School property',
    description:
      'Register and track school assets from desks to devices with assignment and condition history.',
    features: ['Asset register', 'Assignments', 'Condition tracking', 'Maintenance notes'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'transport',
    name: 'Transport',
    svg: '/svg-shapes/transport.svg',
    blurb: 'Routes & fleet',
    description:
      'Plan bus routes, assign students and coordinate fleet operations for safer school transport.',
    features: ['Route planning', 'Student assignment', 'Fleet list', 'Trip logs'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'canteen',
    name: 'School Canteen',
    svg: '/svg-shapes/inventory.svg',
    blurb: 'Meals & cafeteria',
    description:
      'Run the school canteen with menus, meal plans, stock and simple sales tracking for students and staff.',
    features: ['Menus & meal plans', 'Cafeteria stock', 'Sales tracking', 'Daily reports'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'schoolmaterial',
    name: 'School Materials',
    svg: '/svg-shapes/inventory.svg',
    blurb: 'Uniforms, books & supplies',
    description:
      'Track school materials — uniforms, textbooks, lab kits and sports gear — with stock, issuance and term-based billing.',
    features: ['Material catalogue', 'Student issuance', 'Stock & reorders', 'Term billing'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'library',
    name: 'Library',
    svg: '/svg-shapes/library.svg',
    blurb: 'Books & loans',
    description:
      'Catalogue books, issue loans and follow returns so the school library stays organised.',
    features: ['Catalogue', 'Loans & returns', 'Due dates', 'Member records'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'timetable',
    name: 'Timetable',
    svg: '/svg-shapes/timetable.svg',
    blurb: 'Scheduling',
    description:
      'Build clash-free class schedules for teachers, rooms and streams across the week.',
    features: ['Weekly schedules', 'Teacher load', 'Room booking', 'Clash detection'],
    tier: 'premium',
    suite: 'Operations',
  },
  {
    id: 'mini-website',
    name: 'School Mini-Website',
    svg: '/svg-shapes/dashboard.svg',
    blurb: 'Public school site',
    description:
      'Publish a simple school website for news, admissions, galleries and contact — ready for parents and visitors.',
    features: ['Pages & news', 'Admissions info', 'Gallery', 'Contact forms'],
    tier: 'premium',
    suite: 'Intelligence',
  },
  {
    id: 'shulechat',
    name: 'ShuleChat',
    svg: '/svg-shapes/shulechat.svg',
    blurb: 'School messaging',
    description:
      'Connect teachers, parents and school staff with secure in-app chat, groups and announcements — keep everyone aligned in one place.',
    features: [
      'Direct & group messaging',
      'Staff–parent channels',
      'Class & department groups',
      'Notifications & read receipts',
    ],
    tier: 'premium',
    suite: 'Intelligence',
  },
  {
    id: 'circulars',
    name: 'Circulars',
    svg: '/svg-shapes/circular-management.svg',
    blurb: 'Notices & announcements',
    description:
      'Publish circulars to staff and parents with clear targeting and delivery history.',
    features: ['Compose & publish', 'Audience targeting', 'Delivery status', 'Archive'],
    tier: 'premium',
    suite: 'Intelligence',
  },
];

export function ModulePicker() {
  const [selected, setSelected] = useState<string[]>([
    'academic',
    'student-management',
    'school-fees',
    'hr',
    'digital-attendance',
    'smart-transport',
    'payroll',
  ]);
  const [detail, setDetail] = useState<PickerModule | null>(null);
  const [mobileToolkitOpen, setMobileToolkitOpen] = useState(false);

  const coreModules = useMemo(() => catalog.filter((m) => m.tier === 'core'), []);
  const premiumModules = useMemo(() => catalog.filter((m) => m.tier === 'premium'), []);
  const selectedModules = useMemo(
    () => catalog.filter((m) => selected.includes(m.id)),
    [selected]
  );

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  function toggleModule(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleContinue() {
    try {
      sessionStorage.setItem(
        'shuleplus-onboard-modules',
        JSON.stringify(
          selectedModules.map((m) => ({
            id: m.id,
            name: m.name,
            svg: m.svg,
            slug: m.id,
          }))
        )
      );
    } catch {
      /* ignore */
    }
    window.location.href = '/onboard';
  }

  return (
    <section
      id="modules"
      className="relative bg-[#f8f9fb] pb-32 pt-8 sm:pb-36 sm:pt-10 lg:pb-20"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-script text-3xl font-semibold text-navy-900 sm:text-4xl lg:text-[2.75rem]">
            Choose the right{' '}
            <span className="text-amber-500 underline decoration-amber-500/40 decoration-2 underline-offset-4">
              modules
            </span>{' '}
            for education business efficiency
          </h2>
          <p className="mt-3 text-sm text-navy-700/60 sm:text-base">
            Add modules to your Toolkit, then launch them together.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-12">
            <ModuleGroup
              title="Core Essentials"
              modules={coreModules}
              selected={selected}
              onToggle={toggleModule}
              onReadMore={setDetail}
            />
            <ModuleGroup
              title="Premium Modules"
              modules={premiumModules}
              selected={selected}
              onToggle={toggleModule}
              onReadMore={setDetail}
            />
          </div>

          {/* Desktop toolkit — sticky, visible while scrolling modules */}
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <div className="flex max-h-[min(640px,calc(100vh-8rem))] flex-col overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white shadow-[0_8px_30px_-12px_rgba(0,4,53,0.16)]">
              <div className="border-b border-navy-900/[0.06] px-5 py-4">
                <p className="text-[15px] font-semibold text-navy-900">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={selected.length}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      className="inline"
                    >
                      {selected.length}
                    </motion.span>
                  </AnimatePresence>{' '}
                  {selected.length === 1 ? 'app' : 'apps'} selected
                </p>
              </div>

              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
                {selectedModules.length === 0 ? (
                  <li className="px-2 py-8 text-center text-sm text-navy-700/45">
                    Select modules to build your toolkit
                  </li>
                ) : (
                  selectedModules.map((mod) => (
                    <li
                      key={mod.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-navy-900/[0.03]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900/[0.04]">
                        <Image src={mod.svg} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-900">
                        {mod.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className="rounded p-1 text-navy-700/35 transition-colors hover:bg-navy-900/[0.05] hover:text-navy-900"
                        aria-label={`Remove ${mod.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-auto space-y-3 border-t border-navy-900/[0.06] px-4 py-4">
                <div className="rounded-lg bg-amber-500/10 px-3 py-2.5 text-center text-[12px] font-medium leading-snug text-navy-800">
                  Get started free. No credit card required.
                </div>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#000435] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>

      </div>

      {/* Mobile toolkit — sticky bottom bar so the count & Continue button are never buried below 20 cards */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-900/[0.08] bg-white/95 px-4 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 pb-3">
          <button
            type="button"
            onClick={() => setMobileToolkitOpen((v) => !v)}
            className="flex flex-1 items-center justify-center gap-3 rounded-full bg-[#000435] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a0f52]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#000435]">
              {selected.length}
            </span>
            <span className="whitespace-nowrap text-white">{selected.length === 1 ? 'app' : 'apps'} selected</span>
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex shrink-0 items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-400"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile toolkit sheet */}
      <AnimatePresence>
        {mobileToolkitOpen ? (
          <motion.div
            className="fixed inset-0 z-40 flex items-end lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-navy-950/45"
              aria-label="Close toolkit"
              onClick={() => setMobileToolkitOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25 }}
              className="relative z-10 max-h-[70vh] w-full overflow-hidden rounded-t-2xl bg-white"
            >
              <div className="flex items-center justify-between border-b border-navy-900/[0.06] px-5 py-4">
                <p className="text-[15px] font-semibold text-navy-900">Your toolkit</p>
                <button
                  type="button"
                  onClick={() => setMobileToolkitOpen(false)}
                  className="rounded-full p-1.5 text-navy-700/50 hover:bg-navy-900/[0.05]"
                  aria-label="Close"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <ul className="max-h-[calc(70vh-64px)] space-y-1 overflow-y-auto px-3 py-3">
                {selectedModules.length === 0 ? (
                  <li className="px-2 py-8 text-center text-sm text-navy-700/45">
                    Select modules to build your toolkit
                  </li>
                ) : (
                  selectedModules.map((mod) => (
                    <li
                      key={mod.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-navy-900/[0.03]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900/[0.04]">
                        <Image src={mod.svg} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-900">
                        {mod.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className="rounded p-1 text-navy-700/35 transition-colors hover:bg-navy-900/[0.05] hover:text-navy-900"
                        aria-label={`Remove ${mod.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ModuleDetailModal
        module={detail}
        selected={detail ? selected.includes(detail.id) : false}
        onClose={() => setDetail(null)}
        onToggle={(id) => {
          toggleModule(id);
        }}
      />
    </section>
  );
}

function ModuleGroup({
  title,
  modules,
  selected,
  onToggle,
  onReadMore,
}: {
  title: string;
  modules: PickerModule[];
  selected: string[];
  onToggle: (id: string) => void;
  onReadMore: (mod: PickerModule) => void;
}) {
  return (
    <div>
      <h3 className="mb-5 font-montserrat text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => {
          const isOn = selected.includes(mod.id);
          return (
            <div
              key={mod.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(mod.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle(mod.id);
                }
              }}
              className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-[28px] border bg-white px-4 py-4 transition hover:shadow-sm ${
                isOn
                  ? 'border-[#000435] shadow-[0_6px_20px_-14px_rgba(0,4,53,0.4)]'
                  : 'border-navy-900/[0.08] hover:border-amber-400/50'
              }`}
            >
              {isOn ? (
                <span
                  className="absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#000435] text-white shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              ) : null}

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-900/[0.04] transition-colors group-hover:bg-amber-500/10">
                <Image src={mod.svg} alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold leading-tight text-navy-900">{mod.name}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReadMore(mod);
                    }}
                    className="shrink-0 rounded-full p-2 text-amber-600 transition-colors hover:bg-amber-500/10"
                    aria-label={`Learn more about ${mod.name}`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-500/70 text-[9px] font-semibold leading-none">
                      i
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleDetailModal({
  module,
  selected,
  onClose,
  onToggle,
}: {
  module: PickerModule | null;
  selected: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <AnimatePresence>
      {module ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/55 backdrop-blur-[2px]"
            aria-label="Close module details"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-detail-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-lift"
          >
            <div className="flex items-start gap-4 border-b border-navy-900/[0.06] bg-mist-50 px-5 py-4 sm:px-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20">
                <Image
                  src={module.svg}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600">
                  {module.suite} · {module.tier === 'core' ? 'Core' : 'Premium'}
                </p>
                <h3 id="module-detail-title" className="mt-1 text-xl font-semibold text-navy-900">
                  {module.name}
                </h3>
                <p className="mt-0.5 text-sm text-navy-700/60">{module.blurb}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-navy-700/50 transition-colors hover:bg-navy-900/[0.05] hover:text-navy-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <p className="text-sm leading-relaxed text-navy-700/75">{module.description}</p>
              <ul className="mt-4 space-y-2">
                {module.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-navy-900">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-navy-900/[0.06] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-navy-900/12 px-4 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900/[0.03]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onToggle(module.id)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selected
                    ? 'bg-[#000435] text-white hover:bg-navy-800'
                    : 'bg-amber-500 text-navy-900 hover:bg-amber-400'
                }`}
              >
                {selected ? 'Remove from Toolkit' : 'Add to Toolkit'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}