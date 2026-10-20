/** Modules owned by the platform Super Admin — not school-assignable or org-launcher tiles. */
export const PLATFORM_OWNED_MODULE_SLUGS = new Set(['shulekit-mis']);

/** Not shown in org self-service marketplace / onboarding module picker (platform or legacy). */
export const SCHOOL_MARKETPLACE_HIDDEN_MODULE_SLUGS = new Set([
  'nesa',
  'deo-mis',
  'sector-mis',
  'print-card',
  'parent-mis',
  'sample-module',
  'finance',
  'dashboard',
  'leave',
]);

export function isPlatformOwnedModule(slug: string): boolean {
  return PLATFORM_OWNED_MODULE_SLUGS.has(slug);
}

export function isHiddenFromSchoolMarketplace(slug: string): boolean {
  return (
    isPlatformOwnedModule(slug) || SCHOOL_MARKETPLACE_HIDDEN_MODULE_SLUGS.has(slug)
  );
}
