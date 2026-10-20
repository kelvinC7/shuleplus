export function moduleDisplayName(m: { slug: string; name: string }): string {
  if (m.slug === 'attendance') return 'Digital Attendance';
  return m.name;
}

export function moduleDisplayShortName(m: { slug: string; shortName?: string | null }): string {
  if (m.slug === 'attendance') return 'Digital';
  return m.shortName?.trim() || m.slug;
}

export interface ModuleCatalogItem {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  category: string | null;
  version: string;
  description: string | null;
  color: string | null;
  isEnabled: boolean;
  isPremium: boolean;
  isCore: boolean;
  maintenanceMode: boolean;
  visibleInMarketplace: boolean;
  licenseType: string | null;
  frontendUrl?: string | null;
  backendUrl?: string | null;
  healthCheckUrl?: string | null;
  organizationCount: number;
  dependencies: { id: string; slug: string; name: string }[];
}

export interface ModuleCatalogStats {
  totalModules: number;
  activeModules: number;
  premiumModules: number;
  coreModules: number;
  disabledModules: number;
  organizationsUsingModules: number;
}

export interface OrganizationModuleAssignment {
  module: ModuleCatalogItem;
  assignment: {
    id: string;
    status: string;
    subscriptionPlan: string | null;
    moduleVersion: string | null;
    activatedAt: string | null;
    expiresAt: string | null;
    tenantProvisioned: boolean;
    tenantProvisionedAt: string | null;
    isHidden?: boolean;
    limits?: Record<string, unknown>;
    provisionLastError?: string | null;
    provisionAttempts?: number;
  } | null;
  dependencies: { id: string; slug: string; name: string }[];
}

export interface ModuleControlRow {
  assignmentId: string;
  moduleId: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'EXPIRED' | string;
  subscriptionPlan: string | null;
  moduleVersion: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  tenantProvisioned: boolean;
  tenantProvisionedAt: string | null;
  isHidden: boolean;
  limits: Record<string, unknown>;
  provisionLastError: string | null;
  provisionAttempts: number;
  tenantStatus: 'NOT_PROVISIONED' | 'PROVISIONING' | 'PROVISIONED' | 'FAILED' | string;
  module: {
    id: string;
    slug: string;
    name: string;
    shortName: string | null;
    category: string | null;
    color: string | null;
    icon: string | null;
    version: string;
    frontendUrl: string | null;
    backendUrl: string | null;
  };
}

export interface ModuleControlResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationCode: string | null;
    status: string;
    subscriptionTier: string | null;
  };
  modules: ModuleControlRow[];
  stats: {
    total: number;
    active: number;
    locked: number;
    disabled: number;
    expired: number;
    provisioned: number;
    hidden: number;
    lastActivityAt?: string | null;
  };
}

export interface ModuleProvisionLog {
  id: string;
  organizationId: string;
  moduleId: string | null;
  moduleSlug: string | null;
  action: string;
  success: boolean;
  message: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface ProvisioningQueueItem {
  id: string;
  status: string;
  activatedAt: string | null;
  tenantProvisioned: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationCode: string | null;
  };
  module: {
    id: string;
    slug: string;
    name: string;
    frontendUrl: string | null;
    backendUrl: string | null;
  };
}

export const MODULE_CATEGORIES = [
  'Human Resources',
  'Finance',
  'Education',
  'Operations',
  'Communication',
  'Analytics',
  'Productivity',
] as const;

export interface LicensedModule {
  slug: string;
  name: string;
  shortName: string | null;
  frontendUrl: string | null;
  color: string | null;
  icon: string | null;
  category: string | null;
  activatedAt: string | null;
  status?: string;
  deactivated?: boolean;
  locked?: boolean;
  notProvisioned?: boolean;
  isHidden?: boolean;
  tenantProvisioned?: boolean;
}

export const LICENSE_TYPES = ['Free', 'Standard', 'Professional', 'Enterprise', 'Custom'] as const;
