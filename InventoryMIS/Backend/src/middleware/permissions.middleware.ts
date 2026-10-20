import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './error.middleware';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'receive'
  | 'transfer'
  | 'adjust'
  | 'dispose'
  | 'count'
  | 'export'
  | 'manage';

export type ResourceType =
  | 'products'
  | 'categories'
  | 'stores'
  | 'suppliers'
  | 'receiving'
  | 'issues'
  | 'transfers'
  | 'adjustments'
  | 'requests'
  | 'counts'
  | 'disposals'
  | 'analytics'
  | 'reports'
  | 'settings'
  | 'attachments';

const ROLE_PERMISSIONS: Record<string, PermissionAction[]> = {
  root_admin: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'receive', 'transfer', 'adjust', 'dispose', 'count', 'export', 'manage'],
  organization_admin: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'receive', 'transfer', 'adjust', 'dispose', 'count', 'export', 'manage'],
  inventory_manager: ['view', 'create', 'edit', 'approve', 'reject', 'receive', 'transfer', 'adjust', 'dispose', 'count', 'export'],
  storekeeper: ['view', 'create', 'edit', 'receive', 'transfer', 'adjust', 'dispose', 'count'],
  procurement_officer: ['view', 'create', 'edit', 'export'],
  department_head: ['view', 'create', 'export'],
  finance_officer: ['view', 'export'],
  auditor: ['view', 'export'],
  viewer: ['view', 'export'],
};

export function requirePermission(...actions: PermissionAction[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new AppError(401, 'Authentication required');

    const userRoles = user.roles || [];

    for (const role of userRoles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      if (!rolePerms) continue;
      const hasAll = actions.every(action => rolePerms.includes(action));
      if (hasAll) return next();
    }

    throw new AppError(403, 'Insufficient permissions');
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new AppError(401, 'Authentication required');

    const hasRole = user.roles?.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      throw new AppError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}
