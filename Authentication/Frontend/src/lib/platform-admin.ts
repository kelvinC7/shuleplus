export type PlatformAdminScope = 'root-admin' | 'super-admin';

export interface PlatformAdminConfig {
  scope: PlatformAdminScope;
  apiPrefix: string;
  basePath: string;
  dashboardPath: string;
  organizationsPath: string;
  organizationsNewPath: string;
  organizationsRegisterPath: string;
  pendingApprovalsPath: string;
  orgDetailPath: (id: string) => string;
  orgModulesPath: (id: string) => string;
  subscriptionsPath: string;
  orgSubscriptionPath: (orgId: string) => string;
}

export function getPlatformConfig(scope: PlatformAdminScope): PlatformAdminConfig {
  return {
    scope,
    apiPrefix: `/${scope}`,
    basePath: `/${scope}`,
    dashboardPath: `/${scope}`,
    organizationsPath: `/${scope}/organizations`,
    organizationsNewPath: `/${scope}/organizations/new`,
    organizationsRegisterPath: `/${scope}/organizations/register`,
    pendingApprovalsPath: `/${scope}/pending-approvals`,
    orgDetailPath: (id: string) => `/${scope}/organizations/${id}`,
    orgModulesPath: (id: string) => `/${scope}/organizations/${id}/modules`,
    subscriptionsPath: `/${scope}/subscriptions`,
    orgSubscriptionPath: (orgId: string) => `/${scope}/subscriptions/${orgId}`,
  };
}

export function detectPlatformScope(pathname: string): PlatformAdminScope {
  return pathname.startsWith('/super-admin') ? 'super-admin' : 'root-admin';
}
