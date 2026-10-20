import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  Building2,
  HeartPulse,
  Church,
  Factory,
  Landmark,
  Users,
  Wallet,
  Briefcase,
  Boxes,
  BarChart3,
  BrainCircuit,
  Shield,
  KeyRound,
  Network,
  MessageSquare,
  FileText,
  ClipboardList,
  Sparkles,
  Languages,
  LineChart,
  Bot,
  School,
  Layers,
  Database,
  Radio,
} from 'lucide-react';

type AccentKey = 'emerald' | 'indigo' | 'violet' | 'blue' | 'amber' | 'cyan' | 'rose';

export const accentMap: Record<
  AccentKey,
  { grad: string; bg: string; ring: string; text: string }
> = {
  emerald: {
    grad: 'from-emerald-accent/30 to-emerald-accent/5',
    bg: 'bg-emerald-accent/10',
    ring: 'ring-emerald-accent/25',
    text: 'text-emerald-accent',
  },
  indigo: {
    grad: 'from-indigo-accent/30 to-indigo-accent/5',
    bg: 'bg-indigo-accent/10',
    ring: 'ring-indigo-accent/25',
    text: 'text-indigo-accent',
  },
  violet: {
    grad: 'from-violet-accent/30 to-violet-accent/5',
    bg: 'bg-violet-accent/10',
    ring: 'ring-violet-accent/25',
    text: 'text-violet-accent',
  },
  blue: {
    grad: 'from-blue-accent/30 to-blue-accent/5',
    bg: 'bg-blue-accent/10',
    ring: 'ring-blue-accent/25',
    text: 'text-blue-accent',
  },
  amber: {
    grad: 'from-amber-400/30 to-amber-400/5',
    bg: 'bg-amber-400/10',
    ring: 'ring-amber-400/25',
    text: 'text-amber-600',
  },
  cyan: {
    grad: 'from-cyan-accent/30 to-cyan-accent/5',
    bg: 'bg-cyan-accent/10',
    ring: 'ring-cyan-accent/25',
    text: 'text-cyan-accent',
  },
  rose: {
    grad: 'from-rose-accent/30 to-rose-accent/5',
    bg: 'bg-rose-accent/10',
    ring: 'ring-rose-accent/25',
    text: 'text-rose-accent',
  },
};

export const stats = [
  { label: 'Organizations', value: 1200, suffix: '+' },
  { label: 'Active Users', value: 2.4, suffix: 'M' },
  { label: 'Modules', value: 52, suffix: '+' },
  { label: 'Countries', value: 8, suffix: '' },
  { label: 'API Calls / day', value: 18, suffix: 'M' },
  { label: 'Uptime', value: 99.99, suffix: '%' },
];

export const orgTypes: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'Schools', icon: School },
  { name: 'Universities', icon: GraduationCap },
  { name: 'NGOs', icon: HeartPulse },
  { name: 'Hospitals', icon: Building2 },
  { name: 'Churches', icon: Church },
  { name: 'Factories', icon: Factory },
  { name: 'Government', icon: Landmark },
  { name: 'Businesses', icon: Briefcase },
];

export type LandingModule = {
  name: string;
  svg: string;
  blurb?: string;
};

export const suites: Array<{
  id: string;
  name: string;
  tagline: string;
  accent: AccentKey;
  stat: string;
  statLabel: string;
  modules: LandingModule[];
}> = [
  {
    id: 'education',
    name: 'Education',
    tagline: 'Students, classes, exams, marks and national compliance.',
    accent: 'indigo',
    stat: '8',
    statLabel: 'apps',
    modules: [
      { name: 'Students', svg: '/svg-shapes/students.svg', blurb: 'Enrolment & profiles' },
      { name: 'Classes', svg: '/svg-shapes/classes.svg', blurb: 'Streams & grades' },
      { name: 'Subjects', svg: '/svg-shapes/subjects.svg', blurb: 'Curriculum map' },
      { name: 'Examinations', svg: '/svg-shapes/examination.svg', blurb: 'Assessments' },
      { name: 'Marks Entry', svg: '/svg-shapes/marks-entry.svg', blurb: 'Score capture' },
      { name: 'Report Cards', svg: '/svg-shapes/report-cards.svg', blurb: 'Term reports' },
      { name: 'Analytics', svg: '/svg-shapes/analytics.svg', blurb: 'Performance' },
      { name: 'Graduation', svg: '/svg-shapes/graduation.svg', blurb: 'Completions' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    tagline: 'Fee collection, payroll, budgets and audit-ready money flows.',
    accent: 'emerald',
    stat: '6',
    statLabel: 'apps',
    modules: [
      { name: 'School Fees', svg: '/svg-shapes/fee-collection.svg', blurb: 'Billing & payments' },
      { name: 'Finance', svg: '/svg-shapes/finance.svg', blurb: 'Ledgers & treasury' },
      { name: 'Payroll', svg: '/svg-shapes/payroll.svg', blurb: 'Salaries & payslips' },
      { name: 'Procurement', svg: '/svg-shapes/procurement.svg', blurb: 'Purchase flows' },
      { name: 'Inventory', svg: '/svg-shapes/inventory.svg', blurb: 'Stock control' },
      { name: 'Analytics', svg: '/svg-shapes/analytics.svg', blurb: 'Revenue insights' },
    ],
  },
  {
    id: 'people',
    name: 'People',
    tagline: 'HR, leave, attendance and workforce operations.',
    accent: 'violet',
    stat: '5',
    statLabel: 'apps',
    modules: [
      { name: 'HR', svg: '/svg-shapes/hr-management.svg', blurb: 'Staff directory' },
      { name: 'Leave', svg: '/svg-shapes/leave-management.svg', blurb: 'Policies & requests' },
      { name: 'Attendance', svg: '/svg-shapes/attendance.svg', blurb: 'Daily presence' },
      { name: 'Payroll', svg: '/svg-shapes/payroll.svg', blurb: 'Compensation' },
      { name: 'AI Assistant', svg: '/svg-shapes/ai-assistant.svg', blurb: 'Workforce insights' },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    tagline: 'Assets, transport, hostel, library and school logistics.',
    accent: 'amber',
    stat: '6',
    statLabel: 'apps',
    modules: [
      { name: 'Assets', svg: '/svg-shapes/asset-management.svg', blurb: 'School property' },
      { name: 'Inventory', svg: '/svg-shapes/inventory.svg', blurb: 'Stores' },
      { name: 'Transport', svg: '/svg-shapes/transport.svg', blurb: 'Routes & fleet' },
      { name: 'Hostel', svg: '/svg-shapes/hostel.svg', blurb: 'Boarding' },
      { name: 'Library', svg: '/svg-shapes/library.svg', blurb: 'Books & loans' },
      { name: 'Timetable', svg: '/svg-shapes/timetable.svg', blurb: 'Scheduling' },
    ],
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    tagline: 'Dashboards, AI forecasting and executive reporting.',
    accent: 'cyan',
    stat: '5',
    statLabel: 'apps',
    modules: [
      { name: 'Dashboard', svg: '/svg-shapes/dashboard.svg', blurb: 'Live overview' },
      { name: 'Analytics', svg: '/svg-shapes/analytics.svg', blurb: 'Trends & KPIs' },
      { name: 'AI Assistant', svg: '/svg-shapes/ai-assistant.svg', blurb: 'Predictions' },
      { name: 'ShuleChat', svg: '/svg-shapes/shulechat.svg', blurb: 'Messaging' },
      { name: 'Circulars', svg: '/svg-shapes/circular-management.svg', blurb: 'Notices' },
    ],
  },
];

/** Flat catalog used by the landing module wall */
export const landingModules: LandingModule[] = suites.flatMap((s) => s.modules);

export const coreServices: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'IAM', icon: KeyRound },
  { name: 'API Gateway', icon: Network },
  { name: 'Event Bus', icon: Radio },
  { name: 'Object Store', icon: Database },
  { name: 'Notifications', icon: MessageSquare },
  { name: 'Analytics', icon: BarChart3 },
];

export const connectedServices: Array<{ name: string; accent: AccentKey; icon: LucideIcon }> = [
  { name: 'Education', accent: 'indigo', icon: GraduationCap },
  { name: 'Finance', accent: 'emerald', icon: Wallet },
  { name: 'HR', accent: 'violet', icon: Users },
  { name: 'Inventory', accent: 'amber', icon: Boxes },
  { name: 'NESA', accent: 'blue', icon: Shield },
  { name: 'Circulars', accent: 'cyan', icon: FileText },
  { name: 'AI', accent: 'rose', icon: BrainCircuit },
  { name: 'Marketplace', accent: 'indigo', icon: Sparkles },
];

export const aiFeatures: Array<{
  name: string;
  desc: string;
  accent: AccentKey;
  icon: LucideIcon;
}> = [
  {
    name: 'Smart drafting',
    desc: 'Generate circulars, letters and reports from structured school data.',
    accent: 'amber',
    icon: Sparkles,
  },
  {
    name: 'Multilingual',
    desc: 'Translate parent communications across Kinyarwanda, English and French.',
    accent: 'blue',
    icon: Languages,
  },
  {
    name: 'Forecasting',
    desc: 'Predict fee collection, attendance dips and staffing needs.',
    accent: 'emerald',
    icon: LineChart,
  },
  {
    name: 'Policy checks',
    desc: 'Validate fees and compliance against national rules automatically.',
    accent: 'indigo',
    icon: Shield,
  },
  {
    name: 'Assistant',
    desc: 'Ask questions across modules and get cited answers instantly.',
    accent: 'violet',
    icon: Bot,
  },
  {
    name: 'Insights',
    desc: 'Surface anomalies in finance, HR and academic operations.',
    accent: 'cyan',
    icon: BrainCircuit,
  },
];
