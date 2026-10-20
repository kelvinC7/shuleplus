import type { JwtPayload } from '../middleware/auth.middleware';

export type ApRole =
  | 'head_teacher'
  | 'deputy_head'
  | 'head_of_studies'
  | 'bursar'
  | 'department_head'
  | 'teacher'
  | 'board'
  | 'deo'
  | 'org_admin'
  | 'super_admin';

export type ApPermission =
  | 'plan.create'
  | 'plan.edit'
  | 'plan.delete'
  | 'plan.approve'
  | 'plan.view_all'
  | 'activity.update'
  | 'evidence.upload'
  | 'evidence.verify'
  | 'budget.manage'
  | 'expense.record'
  | 'risk.manage'
  | 'review.record'
  | 'kpi.update';

const ROLE_PERMISSIONS: Record<ApRole, ApPermission[]> = {
  head_teacher: [
    'plan.create', 'plan.edit', 'plan.delete', 'plan.approve', 'plan.view_all',
    'activity.update', 'evidence.upload', 'evidence.verify', 'budget.manage',
    'expense.record', 'risk.manage', 'review.record', 'kpi.update',
  ],
  org_admin: [
    'plan.create', 'plan.edit', 'plan.delete', 'plan.approve', 'plan.view_all',
    'activity.update', 'evidence.upload', 'evidence.verify', 'budget.manage',
    'expense.record', 'risk.manage', 'review.record', 'kpi.update',
  ],
  deputy_head: [
    'plan.create', 'plan.edit', 'plan.view_all', 'activity.update',
    'evidence.upload', 'risk.manage', 'review.record', 'kpi.update',
  ],
  head_of_studies: [
    'plan.create', 'plan.edit', 'plan.view_all', 'activity.update',
    'evidence.upload', 'review.record', 'kpi.update',
  ],
  bursar: ['plan.view_all', 'budget.manage', 'expense.record', 'review.record'],
  department_head: ['plan.view_all', 'activity.update', 'evidence.upload', 'kpi.update'],
  teacher: ['activity.update', 'evidence.upload', 'kpi.update'],
  board: ['plan.view_all', 'review.record'],
  deo: ['plan.view_all', 'review.record', 'evidence.verify'],
  super_admin: ['plan.view_all'],
};

function normalizeRoles(user: JwtPayload): ApRole[] {
  const roles = user.roles ?? [];
  const mapped: ApRole[] = [];
  if (roles.includes('super_admin') || roles.includes('root_admin')) mapped.push('super_admin');
  if (roles.includes('organization_admin') || roles.includes('org_admin')) mapped.push('org_admin');
  if (roles.some((r) => /head.?teacher|principal/i.test(r))) mapped.push('head_teacher');
  if (roles.some((r) => /deputy/i.test(r))) mapped.push('deputy_head');
  if (roles.some((r) => /studies|academic/i.test(r))) mapped.push('head_of_studies');
  if (roles.some((r) => /bursar|finance/i.test(r))) mapped.push('bursar');
  if (roles.some((r) => /department/i.test(r))) mapped.push('department_head');
  if (roles.some((r) => /board|govern/i.test(r))) mapped.push('board');
  if (roles.some((r) => /deo|inspector|sector/i.test(r))) mapped.push('deo');
  if (roles.includes('teacher') || user.modules?.includes('teacher-portal')) mapped.push('teacher');
  if (mapped.length === 0) mapped.push('teacher');
  return mapped;
}

export function userHasPermission(user: JwtPayload, permission: ApPermission): boolean {
  const roles = normalizeRoles(user);
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function getUserApRoles(user: JwtPayload): ApRole[] {
  return normalizeRoles(user);
}

export function primaryRoleLabel(user: JwtPayload): string {
  const roles = normalizeRoles(user);
  const labels: Record<ApRole, string> = {
    head_teacher: 'Head Teacher',
    deputy_head: 'Deputy Head Teacher',
    head_of_studies: 'Head of Studies',
    bursar: 'Bursar',
    department_head: 'Department Head',
    teacher: 'Teacher',
    board: 'School Board',
    deo: 'DEO / Inspector',
    org_admin: 'Organization Admin',
    super_admin: 'Platform Admin',
  };
  return labels[roles[0] ?? 'teacher'];
}
