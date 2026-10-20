import type { LicensedModule } from '@/lib/modules';

export type ModuleLifecycleStatus =
  | 'active'
  | 'provisioning'
  | 'pending_activation'
  | 'deactivated'
  | 'unconfigured';

export const MODULE_LIFECYCLE_ORDER: Record<ModuleLifecycleStatus, number> = {
  active: 0,
  provisioning: 1,
  pending_activation: 2,
  deactivated: 3,
  unconfigured: 4,
};

export const MODULE_LIFECYCLE_META: Record<
  ModuleLifecycleStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    pillClass: string;
    dotClass: string;
  }
> = {
  active: {
    label: 'Active',
    shortLabel: 'Active',
    description: 'Ready to launch',
    pillClass: 'bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  provisioning: {
    label: 'Setting up',
    shortLabel: 'Provisioning',
    description: 'Waiting for tenant workspace',
    pillClass: 'bg-sky-50 text-sky-700',
    dotClass: 'bg-sky-500',
  },
  pending_activation: {
    label: 'Pending activation',
    shortLabel: 'Pending',
    description: 'Awaiting platform approval',
    pillClass: 'bg-amber-50 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  deactivated: {
    label: 'Deactivated',
    shortLabel: 'Off',
    description: 'Module is suspended',
    pillClass: 'bg-red-50 text-red-700',
    dotClass: 'bg-red-400',
  },
  unconfigured: {
    label: 'Not configured',
    shortLabel: 'Setup needed',
    description: 'Contact support to configure',
    pillClass: 'bg-slate-100 text-slate-600',
    dotClass: 'bg-slate-400',
  },
};

export function getModuleLifecycleStatus(mod: LicensedModule): ModuleLifecycleStatus {
  if (mod.deactivated || mod.status === 'SUSPENDED') return 'deactivated';
  if (mod.locked || mod.status === 'PENDING') return 'pending_activation';
  if (
    mod.notProvisioned ||
    (mod.status === 'ACTIVE' && mod.tenantProvisioned === false)
  ) {
    return 'provisioning';
  }
  if (mod.frontendUrl) return 'active';
  return 'unconfigured';
}

export function isModuleLaunchable(mod: LicensedModule): boolean {
  return getModuleLifecycleStatus(mod) === 'active';
}

export function sortModulesByLifecycle(modules: LicensedModule[]): LicensedModule[] {
  return [...modules].sort((a, b) => {
    const orderA = MODULE_LIFECYCLE_ORDER[getModuleLifecycleStatus(a)];
    const orderB = MODULE_LIFECYCLE_ORDER[getModuleLifecycleStatus(b)];
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

export function countModulesByLifecycle(modules: LicensedModule[]) {
  const counts = {
    total: modules.length,
    active: 0,
    provisioning: 0,
    pending_activation: 0,
    deactivated: 0,
    unconfigured: 0,
  };

  for (const mod of modules) {
    counts[getModuleLifecycleStatus(mod)] += 1;
  }

  return counts;
}

export const LIFECYCLE_SECTIONS: ModuleLifecycleStatus[] = [
  'active',
  'provisioning',
  'pending_activation',
  'deactivated',
  'unconfigured',
];

export function groupModulesByLifecycle(modules: LicensedModule[]) {
  const sorted = sortModulesByLifecycle(modules);
  const groups = new Map<ModuleLifecycleStatus, LicensedModule[]>();

  for (const status of LIFECYCLE_SECTIONS) {
    groups.set(status, []);
  }

  for (const mod of sorted) {
    const status = getModuleLifecycleStatus(mod);
    groups.get(status)!.push(mod);
  }

  return LIFECYCLE_SECTIONS.filter((status) => (groups.get(status)?.length ?? 0) > 0).map(
    (status) => ({
      status,
      meta: MODULE_LIFECYCLE_META[status],
      modules: groups.get(status)!,
    })
  );
}
