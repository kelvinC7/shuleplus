import type { OrgUser } from '@/lib/org-admin-api';

const TEACHING_POSITION = /teacher|instructor|lecturer|head\s*of/i;
const TEACHING_DEPARTMENT = /teach|academic|education/i;

export function isTeachingStaffUser(user: OrgUser): boolean {
  if (user.modules.some((m) => m.slug === 'teacher-portal')) return true;
  if (user.position && TEACHING_POSITION.test(user.position)) return true;
  if (user.department && TEACHING_DEPARTMENT.test(user.department)) return true;
  return false;
}
