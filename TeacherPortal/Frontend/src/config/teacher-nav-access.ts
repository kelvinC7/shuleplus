import type { AvanceAccess } from '@/types';
import type { TeacherNavItem } from './teacher-nav';

export function canSeeNavItem(item: TeacherNavItem, access: AvanceAccess | null): boolean {
  if (item.available !== true) return false;
  if (!item.access || item.access === 'all') return true;
  if (!access) return false;
  if (item.access === 'org-admin') return access.canManageApprovers;
  if (item.access === 'approve') return access.canApprove;
  return true;
}
