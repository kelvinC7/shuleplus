/**
 * Maps platform module slugs / names → Academic-style SVG icons in /public/svg-shapes.
 * Used by org dashboard & post-login launcher so assigned modules get icons automatically.
 */

const DEFAULT_ICON = '/svg-shapes/dashboard.svg';

/** Canonical slug → SVG path */
const SLUG_ICONS: Record<string, string> = {
  academic: '/svg-shapes/student-management.svg',
  'academic-module': '/svg-shapes/student-management.svg',
  'student-management': '/svg-shapes/student-management.svg',
  students: '/svg-shapes/students.svg',
  attendance: '/svg-shapes/attendance.svg',
  rfid: '/svg-shapes/attendance.svg',
  'rfid-attendance': '/svg-shapes/attendance.svg',
  'school-fees': '/svg-shapes/fee-collection.svg',
  fees: '/svg-shapes/fee-collection.svg',
  finance: '/svg-shapes/finance.svg',
  'school-budget': '/svg-shapes/finance.svg',
  budget: '/svg-shapes/finance.svg',
  payroll: '/svg-shapes/payroll.svg',
  hr: '/svg-shapes/hr-management.svg',
  'human-resources': '/svg-shapes/hr-management.svg',
  'human-resource': '/svg-shapes/hr-management.svg',
  'human-resource-management': '/svg-shapes/hr-management.svg',
  kaziavance: '/svg-shapes/leave-management.svg',
  'kazi-avance': '/svg-shapes/leave-management.svg',
  'kazi-advance': '/svg-shapes/leave-management.svg',
  babyeyi: '/svg-shapes/circular-management.svg',
  'babyeyi-wizard': '/svg-shapes/circular-management.svg',
  circulars: '/svg-shapes/circular-management.svg',
  'circular-wizard': '/svg-shapes/circular-management.svg',
  'circular-management': '/svg-shapes/circular-management.svg',
  assets: '/svg-shapes/asset-management.svg',
  'assets-portal': '/svg-shapes/asset-management.svg',
  'shulekit-mis': '/svg-shapes/inventory.svg',
  'asset-management': '/svg-shapes/asset-management.svg',
  inventory: '/svg-shapes/inventory.svg',
  'inventory-mis': '/svg-shapes/inventory.svg',
  timetable: '/svg-shapes/timetable.svg',
  library: '/svg-shapes/library.svg',
  hostel: '/svg-shapes/hostel.svg',
  transport: '/svg-shapes/transport.svg',
  procurement: '/svg-shapes/procurement.svg',
  nesa: '/svg-shapes/analytics.svg',
  'nesa-dashboard': '/svg-shapes/analytics.svg',
  analytics: '/svg-shapes/analytics.svg',
  dashboard: '/svg-shapes/dashboard.svg',
  'sample-module': '/svg-shapes/settings.svg',
  sample: '/svg-shapes/settings.svg',
  'action-plan': '/svg-shapes/dashboard.svg',
  'action-plan-mis': '/svg-shapes/dashboard.svg',
  cafeteria: '/svg-shapes/inventory.svg',
  leave: '/svg-shapes/leave-management.svg',
  'ai-assistant': '/svg-shapes/ai-assistant.svg',
  ai: '/svg-shapes/ai-assistant.svg',
  teacher: '/svg-shapes/graduation.svg',
  'teacher-portal': '/svg-shapes/graduation.svg',
  'student-portal': '/svg-shapes/students.svg',
  'parent-portal': '/svg-shapes/student-management.svg',
  'parent-mis': '/svg-shapes/student-management.svg',
  'task-module': '/svg-shapes/dashboard.svg',
  'task-mis': '/svg-shapes/dashboard.svg',
  'procurement-mis': '/svg-shapes/procurement.svg',
  'student-discipline': '/svg-shapes/examination.svg',
  'student-discpline': '/svg-shapes/examination.svg',
  canteen: '/svg-shapes/canteen.svg',
  'school-canteen': '/svg-shapes/canteen.svg',
  'mini-website': '/svg-shapes/website.svg',
  'mini-website-mis': '/svg-shapes/website.svg',
  shulechat: '/svg-shapes/shulechat.svg',
  'shule-chat': '/svg-shapes/shulechat.svg',
  chat: '/svg-shapes/shulechat.svg',
};

/** Name / shortName keywords → SVG (fallback when slug is unknown) */
const NAME_HINTS: Array<{ match: RegExp; icon: string }> = [
  { match: /school\s*fees|fee\s*collection/i, icon: '/svg-shapes/fee-collection.svg' },
  { match: /academic|student\s*manage/i, icon: '/svg-shapes/student-management.svg' },
  { match: /attendance|rfid/i, icon: '/svg-shapes/attendance.svg' },
  { match: /payroll|salary/i, icon: '/svg-shapes/payroll.svg' },
  { match: /\bhr\b|human\s*resource/i, icon: '/svg-shapes/hr-management.svg' },
  { match: /kazi/i, icon: '/svg-shapes/leave-management.svg' },
  { match: /circular|babyeyi/i, icon: '/svg-shapes/circular-management.svg' },
  { match: /asset/i, icon: '/svg-shapes/asset-management.svg' },
  { match: /inventory/i, icon: '/svg-shapes/inventory.svg' },
  { match: /timetable|schedule/i, icon: '/svg-shapes/timetable.svg' },
  { match: /library/i, icon: '/svg-shapes/library.svg' },
  { match: /hostel|boarding/i, icon: '/svg-shapes/hostel.svg' },
  { match: /transport|fleet/i, icon: '/svg-shapes/transport.svg' },
  { match: /procurement|purchase/i, icon: '/svg-shapes/procurement.svg' },
  { match: /nesa|analytics/i, icon: '/svg-shapes/analytics.svg' },
  { match: /budget/i, icon: '/svg-shapes/finance.svg' },
  { match: /cafeteria|canteen|meal/i, icon: '/svg-shapes/canteen.svg' },
  { match: /discipline|behavior/i, icon: '/svg-shapes/examination.svg' },
  { match: /task\s*mis|task\s*module/i, icon: '/svg-shapes/dashboard.svg' },
  { match: /finance|treasury/i, icon: '/svg-shapes/finance.svg' },
  { match: /sample/i, icon: '/svg-shapes/settings.svg' },
  { match: /ai\b|assistant/i, icon: '/svg-shapes/ai-assistant.svg' },
  { match: /chat|messaging/i, icon: '/svg-shapes/shulechat.svg' },
];

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

function isSvgPath(value: string): boolean {
  return (
    value.startsWith('/svg-shapes/') ||
    value.startsWith('/icons/') ||
    value.endsWith('.svg')
  );
}

/**
 * Resolve the SVG icon for a licensed / catalog module.
 * Priority: API `icon` (if SVG path) → slug map → name hints → dashboard default.
 */
export function resolveModuleIcon(mod: {
  slug: string;
  name?: string | null;
  shortName?: string | null;
  icon?: string | null;
}): string {
  if (mod.icon && isSvgPath(mod.icon)) {
    return mod.icon.startsWith('/') ? mod.icon : `/${mod.icon}`;
  }

  const slug = normalizeSlug(mod.slug);
  if (SLUG_ICONS[slug]) return SLUG_ICONS[slug];

  // Partial slug matches (e.g. "school-fees-collection")
  for (const [key, icon] of Object.entries(SLUG_ICONS)) {
    if (slug.includes(key) || key.includes(slug)) return icon;
  }

  const label = `${mod.name ?? ''} ${mod.shortName ?? ''}`;
  for (const hint of NAME_HINTS) {
    if (hint.match.test(label)) return hint.icon;
  }

  return DEFAULT_ICON;
}
