/** Shule+ landing (module picker + school onboarding) — apex shuleplus.rw in production. */
const AUTH_BASE = (
  process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
  (process.env.NODE_ENV === 'production' ? 'https://shuleplus.rw' : 'http://localhost:3000')
).replace(/\/$/, '');

/** Licensed Babyeyi school console (requires org login — not public). */
const BABYEYI_MODULE_BASE = (
  process.env.NEXT_PUBLIC_BABYEYI_MODULE_URL ?? 'https://babyeyi.shuleplus.rw'
).replace(/\/$/, '');

/** Parent portal login — separate subdomain. */
export const PARENT_PORTAL_URL = (
  process.env.NEXT_PUBLIC_PARENT_PORTAL_URL?.trim() ||
  (process.env.NODE_ENV === 'production'
    ? 'https://parents.shuleplus.rw/login'
    : 'http://localhost:3049/login')
).replace(/\/$/, '');

/** Teacher portal login. */
export const TEACHER_PORTAL_URL = (
  process.env.NEXT_PUBLIC_TEACHER_PORTAL_URL?.trim() ||
  (process.env.NODE_ENV === 'production'
    ? 'https://ticha.shuleplus.rw/login'
    : 'http://localhost:5173/login')
).replace(/\/$/, '');

/** Module picker — choose modules before `/onboard` school registration. */
export const REGISTER_SCHOOL_URL = `${AUTH_BASE}/enter-as-school`;

/** Existing schools: open Shule+ org dashboard (Babyeyi module needs a session token). */
export const SCHOOL_DASHBOARD_URL = `${AUTH_BASE}/organization-admin`;

/** Footer "For schools" link targets (index-aligned with `site-i18n` schoolLinks). */
export const SCHOOL_FOOTER_LINKS = [
  REGISTER_SCHOOL_URL,
  SCHOOL_DASHBOARD_URL,
  `${BABYEYI_MODULE_BASE}/dashboard`,
  REGISTER_SCHOOL_URL,
] as const;
