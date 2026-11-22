import { iam } from './api/iam';

const ENTRY_PATH = {
  nesa: '/nesa/dashboard',
  academic: '/home',
  'academic-1': '/home',
  'mini-website': '/home',
  'mini-website-mis': '/home',
  babyeyi: '/dashboard',
  circulars: '/dashboard',
  'teacher-portal': '/',
  hr: '/dashboard',
  payroll: '/dashboard',
  'student-discipline': '/',
  'print-card': '/cards',
  transport: '/dashboard',
};

export function moduleEntryPath(slug) {
  return ENTRY_PATH[slug] || '/dashboard';
}

export function buildModuleLaunchUrl(mod, token, refreshToken) {
  if (!mod?.frontendUrl) return null;
  const base = String(mod.frontendUrl).replace(/\/$/, '');
  const path = moduleEntryPath(mod.slug);
  const url = new URL(`${base}${path}`);
  if (token) url.searchParams.set('token', token);
  if (refreshToken) url.searchParams.set('refresh', refreshToken);
  return url.toString();
}

export const MODULE_SLUGS = {
  'Student Management': ['student-management', 'students', 'student-mis'],
  Academic: ['academic', 'academic-1', 'academics'],
  Timetable: ['timetable', 'time-table'],
  Discipline: ['student-discipline', 'discipline'],
  Attendance: ['attendance'],
  'Smart Transport': ['transport', 'shule-trip', 'smart-transport'],
  'Parent MIS': ['parent-mis', 'parent'],
  ShuleChat: ['internal-chat', 'chat', 'communication', 'shule-chat'],
  Circulars: ['babyeyi', 'circulars', 'communication'],
  'School Fees': ['school-fees', 'fees', 'school-fees-portal'],
  'School Budget': ['school-budget', 'budget', 'budget-management'],
  HR: ['hr', 'human-resources'],
  Payroll: ['payroll'],
  KaziAdvance: ['kaziavance', 'kazi-advance'],
  'Action Plan': ['action-plan', 'action-plan-mis'],
  ShuleKit: ['shulekit-mis', 'shulekit'],
  Uniforms: ['school-uniform', 'uniforms', 'school-uniform-mis'],
  'Dining/Cafeteria': ['canteen', 'canteen-mis', 'cafeteria', 'cafeteria-mis', 'dining', 'dining-cafeteria', 'school-canteen'],
  ShuleMart: ['shulemart', 'mart', 'shule-mart'],
};

export async function openModuleInErp(name, { token, refreshToken, showToast } = {}) {
  if (!token) {
    showToast?.('Sign in required to open ShulePlus ERP');
    return false;
  }
  const candidates = MODULE_SLUGS[name] || [];
  try {
    const mods = await iam.modules(token);
    const list = Array.isArray(mods) ? mods : Array.isArray(mods?.data) ? mods.data : Array.isArray(mods?.modules) ? mods.modules : [];
    let mod = null;
    for (const s of candidates) {
      mod = list.find((m) => String(m.slug || '').toLowerCase() === s);
      if (mod) break;
    }
    if (!mod) {
      const n = String(name).toLowerCase();
      const tokens = [n, n.replace(/[^a-z0-9]+/g, '-'), ...n.split(/[^a-z0-9]+/).filter((t) => t.length > 2), ...candidates];
      mod = list.find((m) => {
        const slug = String(m.slug || '').toLowerCase();
        const mname = String(m.name || '').toLowerCase();
        return tokens.some((t) => t && (slug.includes(t) || mname.includes(t)));
      });
    }
    if (!mod) {
      showToast?.(`${name} is not available in your ShulePlus ERP`);
      return false;
    }
    const url = buildModuleLaunchUrl(mod, token, refreshToken);
    if (!url) {
      showToast?.(`${mod.name || name} has no frontend URL configured`);
      return false;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch (e) {
    console.error('openModuleInErp', e);
    showToast?.(`Could not open ${name} in ShulePlus ERP`);
    return false;
  }
}
