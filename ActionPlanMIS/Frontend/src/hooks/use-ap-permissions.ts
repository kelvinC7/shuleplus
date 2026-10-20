'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apApi } from '@/services/action-plan-api';
import { type ApPermission, primaryRoleLabel, userHasPermission } from '@/lib/ap-permissions';

export function useApPermissions() {
  const { user, authorized } = useAuth();
  const [primaryRole, setPrimaryRole] = useState(() => primaryRoleLabel(user));

  useEffect(() => {
    if (!authorized) return;
    apApi
      .permissions()
      .then(({ data }) => setPrimaryRole(data.data.primaryRole))
      .catch(() => setPrimaryRole(primaryRoleLabel(user)));
  }, [authorized, user]);

  return {
    can: (permission: ApPermission) => userHasPermission(user, permission),
    primaryRole,
    user,
  };
}
