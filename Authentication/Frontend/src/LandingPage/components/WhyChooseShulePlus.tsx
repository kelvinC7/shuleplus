'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Zap,
  Smartphone,
  BarChart3,
  Blocks,
  Bell,
  Users,
  Cloud,
  Layers,
  GraduationCap,
  FileStack,
  ClipboardList,
  Banknote,
  Clock,
  MessageSquareOff,
  Unplug,
  Package,
  Bus,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Counter } from './ui/Counter';

function BrushWord({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-1">
      <span className="relative z-10 text-navy-900">{children}</span>
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -inset-x-3 bottom-[0.12em] z-0 h-[0.62em] origin-left -rotate-2 rounded-sm bg-amber-400/75"
        aria-hidden
      />
    </span>
  );
}

const features: {
  title: string;
  body: string;
  icon: LucideIcon;
  href: string;
}[] = [
  {
    title: 'All-in-One Platform',
    body: 'Admissions, academics, finance, HR, and reports in one place.',
    icon: Building2,
    href: '/#modules',
  },
  {
    title: 'Enterprise-Level Security',
    body: 'Encrypted storage, role-based access, backups, and audit logs.',
    icon: ShieldCheck,
    href: '/#why-choose-shuleplus',
  },
  {
    title: 'Fast Implementation',
    body: 'Go live quickly with guided onboarding.',
    icon: Zap,
    href: '/onboard',
  },
  {
    title: 'Parent & Teacher Experience',
    body: 'Fees, attendance, report cards, and notices for parents and staff.',
    icon: Smartphone,
    href: '/payments',
  },
  {
    title: 'Analytics',
    body: 'Dashboards for performance, finance, attendance, and operations.',
    icon: BarChart3,
    href: '/#why-choose-shuleplus',
  },
  {
    title: 'Modular System',
    body: 'Enable the modules you need and add more later.',
    icon: Blocks,
    href: '/#modules',
  },
];

const stats = [
  { value: 250, suffix: '+', label: 'Schools' },
  { value: 98, suffix: '%', label: 'Customer Satisfaction' },
  { value: 2, suffix: 'M+', label: 'Notifications Delivered', displayOverride: true },
  { value: 99.9, suffix: '%', label: 'System Availability', decimals: 1 },
];

const trustOrgs = [
  'Private Schools',
  'Public Schools',
  'TVET Institutions',
  'International Schools',
  'NGO Academies',
  'Multi-Campus Networks',
];

const floatingBadges = [
  { label: 'Cloud Based', icon: Cloud },
  { label: 'All-in-One', icon: Layers },
  { label: 'Mobile Ready', icon: Smartphone },
  { label: 'Secure', icon: ShieldCheck },
  { label: 'Fast', icon: Zap },
  { label: 'Modular', icon: Blocks },
];

type BeforeVisualType =
  | 'paper'
  | 'attendance'
  | 'cash'
  | 'reports'
  | 'communication'
  | 'systems'
  | 'assets'
  | 'inventory'
  | 'transport';

type TransformItem = {
  id: string;
  before: { title: string; desc: string; visual: BeforeVisualType };
  after: { title: string; desc: string; svg: string; accent: string };
};

const transformations: TransformItem[] = [
  {
    id: 'records',
    before: {
      title: 'Paper Registers',
      desc: 'Student files stacked in cabinets, easy to lose or damage.',
      visual: 'paper',
    },
    after: {
      title: 'Digital Records',
      desc: 'Secure cloud profiles searchable in seconds.',
      svg: '/svg-shapes/students.svg',
      accent: '#2355FF',
    },
  },
  {
    id: 'attendance',
    before: {
      title: 'Manual Attendance',
      desc: 'Teachers mark paper lists  slow, inaccurate, no alerts.',
      visual: 'attendance',
    },
    after: {
      title: 'Digital Smart Card Attendance',
      desc: 'RFID & QR check-in with instant parent notifications.',
      svg: '/svg-shapes/attendance.svg',
      accent: '#20D6C7',
    },
  },
  {
    id: 'payments',
    before: {
      title: 'Cash Payments',
      desc: 'Long queues, lost receipts, and unclear balances.',
      visual: 'cash',
    },
    after: {
      title: 'Online Payments',
      desc: 'MoMo, cards, and digital receipts from the parent portal.',
      svg: '/svg-shapes/fee-collection.svg',
      accent: '#FCB038',
    },
  },
  {
    id: 'reports',
    before: {
      title: 'Delayed Reports',
      desc: 'Term-end spreadsheets compiled weeks after data is needed.',
      visual: 'reports',
    },
    after: {
      title: 'Real-Time Dashboards',
      desc: 'Live KPIs for leadership, finance, and academics.',
      svg: '/svg-shapes/analytics.svg',
      accent: '#8640AA',
    },
  },
  {
    id: 'communication',
    before: {
      title: 'Poor Communication',
      desc: 'WhatsApp threads and paper notices parents never see.',
      visual: 'communication',
    },
    after: {
      title: 'Parent Portal & Notifications',
      desc: 'SMS, in-app alerts, circulars, and report cards in one place.',
      svg: '/svg-shapes/circular-management.svg',
      accent: '#2355FF',
    },
  },
  {
    id: 'assets',
    before: {
      title: 'Spreadsheet Asset Tracking',
      desc: 'Laptops, furniture, and equipment tracked in disconnected files.',
      visual: 'assets',
    },
    after: {
      title: 'Assets Management',
      desc: 'Register, assign, maintain, and audit every school asset.',
      svg: '/svg-shapes/asset-management.svg',
      accent: '#FCB038',
    },
  },
  {
    id: 'inventory',
    before: {
      title: 'Manual Stock Records',
      desc: 'Store counts on paper with no visibility across departments.',
      visual: 'inventory',
    },
    after: {
      title: 'Inventory Management',
      desc: 'Track stock, requisitions, and usage across the institution.',
      svg: '/svg-shapes/inventory.svg',
      accent: '#20D6C7',
    },
  },
  {
    id: 'transport',
    before: {
      title: 'Paper Transport Logs',
      desc: 'Bus routes and pupil lists managed on clipboards.',
      visual: 'transport',
    },
    after: {
      title: 'Transport Management',
      desc: 'Routes, drivers, student assignments, and live trip visibility.',
      svg: '/svg-shapes/transport.svg',
      accent: '#2355FF',
    },
  },
  {
    id: 'systems',
    before: {
      title: 'Separate Systems',
      desc: 'Fees in one tool, HR in another  nothing connected.',
      visual: 'systems',
    },
    after: {
      title: 'One Connected Ecosystem',
      desc: 'Every module shares one login, one database, one truth.',
      svg: '/svg-shapes/dashboard.svg',
      accent: '#000435',
    },
  },
];

const beforeIconMap: Record<BeforeVisualType, LucideIcon> = {
  paper: FileStack,
  attendance: ClipboardList,
  cash: Banknote,
  reports: Clock,
  communication: MessageSquareOff,
  systems: Unplug,
  assets: Package,
  inventory: Package,
  transport: Bus,
};

const boardFloatingBadges = [
  { label: 'Cloud', icon: Cloud, pos: 'left-[2%] top-[8%]' },
  { label: 'Secure', icon: ShieldCheck, pos: 'right-[2%] top-[10%]' },
  { label: 'Mobile', icon: Smartphone, pos: 'right-[4%] bottom-[18%]' },
  { label: 'Modular', icon: Blocks, pos: 'left-[4%] bottom-[16%]' },
];

const orbitModules = [
  { svg: '/svg-shapes/students.svg', label: 'Students', x: '8%', y: '12%', delay: 0 },
  { svg: '/svg-shapes/fee-collection.svg', label: 'Fees', x: '78%', y: '8%', delay: 0.4 },
  { svg: '/svg-shapes/analytics.svg', label: 'Analytics', x: '82%', y: '55%', delay: 0.8 },
  { svg: '/svg-shapes/hr-management.svg', label: 'HR', x: '6%', y: '58%', delay: 1.2 },
  { svg: '/svg-shapes/attendance.svg', label: 'Attendance', x: '42%', y: '2%', delay: 0.6 },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const Icon = feature.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group relative flex flex-col rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_40px_-16px_rgba(0,4,53,0.12)] transition-all duration-300 hover:-translate-y-2 hover:border-amber-500/40 hover:shadow-[0_24px_50px_-14px_rgba(0,4,53,0.18)]"
    >
      <motion.span
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600"
        whileHover={{ rotate: 8, scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </motion.span>
      <h3 className="mt-4 text-lg font-bold text-[#000435]">{feature.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#667085]">{feature.body}</p>
      <div className="my-4 h-px bg-[#E5E7EB]" />
      <Link
        href={feature.href}
        className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 transition-all group-hover:gap-3"
      >
        Learn more
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.article>
  );
}

function LaptopIllustration() {
  return (
    <div className="relative mx-auto aspect-square max-w-[520px] lg:max-w-none">
      {floatingBadges.map((badge, i) => {
        const Icon = badge.icon;
        const positions = [
          'left-0 top-[18%]',
          'right-0 top-[10%]',
          'left-[4%] bottom-[22%]',
          'right-[2%] bottom-[30%]',
          'left-[28%] top-0',
          'right-[22%] bottom-[6%]',
        ];
        return (
          <motion.div
            key={badge.label}
            className={`absolute z-20 hidden items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-navy-900 shadow-[0_8px_24px_-8px_rgba(0,4,53,0.2)] backdrop-blur-sm sm:flex ${positions[i]}`}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="h-3.5 w-3.5 text-amber-500" />
            {badge.label}
          </motion.div>
        );
      })}

      {orbitModules.map((mod) => (
        <motion.div
          key={mod.label}
          className="absolute z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_10px_30px_-10px_rgba(0,4,53,0.15)]"
          style={{ left: mod.x, top: mod.y }}
          animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 5, delay: mod.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src={mod.svg} alt={mod.label} width={24} height={24} className="h-6 w-6" />
        </motion.div>
      ))}

      <motion.div
        className="absolute right-[8%] top-[38%] z-20 flex max-w-[140px] items-start gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_12px_32px_-12px_rgba(0,4,53,0.2)]"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
          <Bell className="h-4 w-4 text-amber-600" />
        </span>
        <div>
          <p className="text-[10px] font-bold text-navy-900">Fee reminder sent</p>
          <p className="mt-0.5 text-[9px] text-[#667085]">Parent portal · 2m ago</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[18%] left-[6%] z-20 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Users className="h-4 w-4 text-emerald-700" />
        <span className="text-[10px] font-bold text-emerald-800">Parents Portal</span>
      </motion.div>

      <motion.div
        className="absolute bottom-[8%] right-[10%] z-20 flex items-center gap-2 rounded-2xl border border-[#2355FF]/20 bg-[#2355FF]/10 px-3 py-2"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <GraduationCap className="h-4 w-4 text-[#2355FF]" />
        <span className="text-[10px] font-bold text-[#2355FF]">Teacher Portal</span>
      </motion.div>

      <div className="absolute inset-x-[8%] bottom-[8%] top-[18%]">
        <div className="relative h-full rounded-[20px] border border-[#E5E7EB] bg-gradient-to-b from-[#1a1f3a] to-[#000435] p-3 shadow-[0_40px_80px_-24px_rgba(0,4,53,0.45)]">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="ml-2 text-[9px] font-medium text-white/40">app.shuleplus.com</span>
          </div>
          <div className="h-[calc(100%-28px)] overflow-hidden rounded-xl bg-[#FAFBFC] p-3">
            <div className="flex items-center justify-between">
              <Image src="/logo.png" alt="Shule+" width={72} height={22} className="h-5 w-auto" />
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
                Live
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Students', val: '1,248', color: 'bg-[#2355FF]/10 text-[#2355FF]' },
                { label: 'Collections', val: '94%', color: 'bg-amber-500/15 text-amber-700' },
                { label: 'Attendance', val: '97%', color: 'bg-emerald-500/15 text-emerald-700' },
                { label: 'Modules', val: '12', color: 'bg-violet-500/15 text-violet-700' },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-lg p-2 ${kpi.color}`}>
                  <p className="text-[8px] font-medium opacity-80">{kpi.label}</p>
                  <p className="text-sm font-bold">{kpi.val}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-white p-2">
              <p className="text-[8px] font-semibold uppercase tracking-wide text-[#667085]">
                Weekly analytics
              </p>
              <div className="mt-2 flex h-12 items-end gap-1">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-amber-500 to-amber-300"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-1 h-3 w-[88%] rounded-b-xl bg-gradient-to-b from-[#2a3055] to-[#1a1f3a]" />
      </div>
    </div>
  );
}

function useCycle(length: number, intervalMs = 4000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);
  return [index, setIndex] as const;
}

function PersonBoardSvg({
  variant,
  label,
  title,
  subtitle,
  icon: Icon,
  moduleSvg,
}: {
  variant: 'before' | 'after';
  label: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  moduleSvg?: string;
}) {
  const isBefore = variant === 'before';
  const skin = isBefore ? '#FDBA74' : '#FCD34D';
  const shirt = isBefore ? '#FDA4AF' : '#FCB038';
  const boardFill = isBefore ? '#FFF1F2' : '#FFFBEB';
  const boardStroke = isBefore ? '#FECDD3' : '#FDE68A';
  const frame = '#000435';

  return (
    <div className="flex flex-col items-center">
      <p
        className={`mb-2 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs ${
          isBefore ? 'text-rose-600' : 'text-amber-600'
        }`}
      >
        {label}
      </p>
      <svg viewBox="0 0 240 170" className="h-auto w-full max-w-[240px]" aria-hidden>
        {/* Smart board */}
        <rect x="72" y="8" width="148" height="88" rx="8" fill={boardFill} stroke={boardStroke} strokeWidth="2" />
        <rect x="72" y="8" width="148" height="12" rx="8" fill={frame} />
        <rect x="72" y="14" width="148" height="6" fill={frame} />
        <circle cx="82" cy="14" r="1.8" fill="#FCA5A5" opacity={isBefore ? 1 : 0.45} />
        <circle cx="90" cy="14" r="1.8" fill="#FCD34D" />
        <circle cx="98" cy="14" r="1.8" fill="#86EFAC" opacity={isBefore ? 0.45 : 1} />
        <text x="146" y="16" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="600">
          {isBefore ? 'School  Problem' : 'Shule+  Solution'}
        </text>
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x="84"
            y={30 + i * 13}
            width={isBefore ? 78 - i * 10 : 98}
            height="5"
            rx="2.5"
            fill={isBefore ? '#FECDD3' : '#FDE68A'}
            opacity={0.9 - i * 0.15}
          />
        ))}
        <rect x="178" y="32" width="28" height="28" rx="7" fill="white" stroke={boardStroke} strokeWidth="1.5" />
        {isBefore ? (
          <foreignObject x="178" y="32" width="28" height="28">
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.75} />
            </div>
          </foreignObject>
        ) : (
          <image href={moduleSvg} x="181" y="35" width="22" height="22" />
        )}
        <rect x="136" y="96" width="10" height="22" rx="2" fill="#CBD5E1" />
        <rect x="122" y="116" width="38" height="5" rx="2.5" fill="#94A3B8" />
        {/* Person beside board */}
        <circle cx="38" cy="118" r="12" fill={skin} />
        <path d="M 26 118 Q 38 108 50 118 L 50 136 Q 38 142 26 136 Z" fill={shirt} />
        <circle cx="35" cy="116" r="1.2" fill="#000435" />
        <circle cx="41" cy="116" r="1.2" fill="#000435" />
        {isBefore ? (
          <path d="M 35 121 Q 38 123 41 121" stroke="#BE123C" strokeWidth="1" fill="none" />
        ) : (
          <path d="M 34 121 Q 38 124 42 121" stroke="#000435" strokeWidth="1" fill="none" />
        )}
        <path d="M 50 128 L 78 72" stroke={skin} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <ellipse cx="28" cy="140" rx="10" ry="3" fill="#000435" opacity="0.08" />
      </svg>
      <div className="mt-1 max-w-[210px] text-center">
        <p className={`text-sm font-bold leading-snug ${isBefore ? 'text-rose-950/90' : 'text-navy-900'}`}>
          {title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#667085]">{subtitle}</p>
      </div>
    </div>
  );
}

function SmartBoardIllustration({ items }: { items: TransformItem[] }) {
  const [activeIndex, setActiveIndex] = useCycle(items.length, 5000);
  const active = items[activeIndex];
  const BeforeIcon = beforeIconMap[active.before.visual];
  const [phase, setPhase] = useState<'before' | 'processing' | 'after'>('before');

  useEffect(() => {
    setPhase('before');
    const t1 = setTimeout(() => setPhase('processing'), 1400);
    const t2 = setTimeout(() => setPhase('after'), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeIndex]);

  return (
    <div className="relative mx-auto mt-8 max-w-3xl lg:mt-10">
      {boardFloatingBadges.map((b, i) => {
        const BadgeIcon = b.icon;
        return (
          <motion.div
            key={b.label}
            className={`pointer-events-none absolute z-20 hidden items-center gap-1 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-navy-900 shadow-md backdrop-blur-sm sm:flex ${b.pos}`}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BadgeIcon className="h-3 w-3 text-amber-500" />
            {b.label}
          </motion.div>
        );
      })}

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white/90 p-4 shadow-[0_24px_60px_-24px_rgba(0,4,53,0.18)] backdrop-blur-sm sm:p-6"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <motion.div
            animate={phase === 'before' ? { opacity: 1, scale: 1 } : { opacity: 0.55, scale: 0.97 }}
            transition={{ duration: 0.35 }}
          >
            <PersonBoardSvg
              variant="before"
              label="School"
              title={active.before.title}
              subtitle={active.before.desc}
              icon={BeforeIcon}
            />
          </motion.div>

          <div className="relative flex flex-col items-center gap-2 px-1">
            <div className="relative h-px w-10 sm:w-16">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-300 via-amber-300 to-amber-400" />
              {[0, 1].map((p) => (
                <motion.span
                  key={p}
                  className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-500"
                  animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.6, delay: p * 0.6, repeat: Infinity, ease: 'linear' }}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              {phase === 'processing' ? (
                <motion.span
                  key="proc"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                </motion.span>
              ) : (
                <motion.span
                  key={phase}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] font-bold uppercase tracking-wide text-amber-600"
                >
                  {phase === 'after' ? 'Solved' : 'Problem'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            animate={phase === 'after' ? { opacity: 1, scale: 1 } : { opacity: 0.55, scale: 0.97 }}
            transition={{ duration: 0.35 }}
          >
            <PersonBoardSvg
              variant="after"
              label="Shule+"
              title={active.after.title}
              subtitle={active.after.desc}
              icon={BeforeIcon}
              moduleSvg={active.after.svg}
            />
          </motion.div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 border-t border-[#E5E7EB] pt-4">
          {items.map((item, i) => {
            const Icon = beforeIconMap[item.before.visual];
            const isActive = i === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold transition-all sm:text-[10px] ${
                  isActive
                    ? 'border-amber-400 bg-amber-500/10 text-navy-900'
                    : 'border-[#E5E7EB] bg-[#FAFBFC] text-[#667085]'
                }`}
              >
                <Icon className={`h-2.5 w-2.5 ${isActive ? 'text-amber-600' : ''}`} strokeWidth={2} />
                <span className="max-w-[88px] truncate sm:max-w-none">{item.after.title}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function BeforeAfterSection() {
  return (
    <div className="relative mt-14 lg:mt-16">
      {/* Distinct patterned panel  my_bg + waves */}
      <div className="relative overflow-hidden rounded-[32px] border border-navy-900/[0.06] shadow-[0_24px_60px_-24px_rgba(0,4,53,0.12)]">
        <Image
          src="/my_bg.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-[0.55]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/94 via-white/88 to-[#F8FAFC]/92" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #000435 0, #000435 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />

        {/* Top wave into navy accent strip */}
        <div className="pointer-events-none absolute inset-x-0 top-0 leading-[0]" aria-hidden>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="block h-8 w-full sm:h-10">
            <path
              d="M0,0 L0,24 C360,48 720,0 1080,24 C1260,36 1380,30 1440,24 L1440,0 Z"
              fill="#000435"
              fillOpacity="0.06"
            />
          </svg>
        </div>

        <div className="relative z-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#667085]">The transformation</p>
            <h3 className="mt-2 font-script text-2xl font-semibold text-navy-900 sm:text-3xl lg:text-4xl">
              School before vs after Shule+
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              A teacher at the board  problem on the left, Shule+ solution on the right.
            </p>
          </div>

          <SmartBoardIllustration items={transformations} />
        </div>

        {/* Bottom wave */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="block h-10 w-full sm:h-14">
            <path
              d="M0,64 L0,32 C240,8 480,48 720,28 C960,8 1200,52 1440,24 L1440,64 Z"
              fill="#FCB038"
              fillOpacity="0.08"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function WhyChooseShulePlus() {
  return (
    <section id="why-choose-shuleplus" className="relative overflow-hidden bg-[#F8FAFC] py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(252,176,56,0.06),transparent_45%)]" />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-[0.22em] text-[#667085]"
          >
            Why choose us
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-4 font-script text-[2.5rem] font-semibold leading-[1.1] text-navy-900 sm:text-5xl lg:text-[4rem]"
          >
            Why schools
            <br />
            <BrushWord>choose</BrushWord>
            <br />
            Shule+.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#667085] sm:text-lg"
          >
            More than software Shule+ is a complete digital ecosystem designed to simplify school
            management, improve communication, and help institutions grow with confidence.
          </motion.p>
        </div>

        <div className="mt-16 grid items-start gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <LaptopIllustration />
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>

   

        <BeforeAfterSection />

      

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-col items-center text-center sm:mt-20"
        >
          <Link
            href="/onboard"
            className="group inline-flex items-center gap-2 rounded-full bg-[#FCB038] px-8 py-4 text-base font-semibold text-white shadow-[0_16px_40px_-12px_rgba(252,176,56,0.55)] transition-all hover:bg-amber-400"
          >
            Get started today
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}