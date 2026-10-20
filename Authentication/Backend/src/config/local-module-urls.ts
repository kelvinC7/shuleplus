/**
 * Local development URLs for module catalog entries.
 * Used when NODE_ENV !== 'production' to override hosted shuleplus.rw URLs
 * stored in the database after running apply-module-subdomains.mjs.
 *
 * Keep in sync with docs/PORTS.md
 */
export const LOCAL_MODULE_URLS: Record<
  string,
  { frontendUrl?: string; backendUrl?: string }
> = {
  academic: { frontendUrl: 'http://localhost:3004', backendUrl: 'http://localhost:3003' },
  'student-management': { frontendUrl: 'http://localhost:3053', backendUrl: 'http://localhost:3052/api' },
  attendance: { frontendUrl: 'http://localhost:3025', backendUrl: 'http://localhost:3024/api' },
  transport: { frontendUrl: 'http://localhost:3065', backendUrl: 'http://localhost:3064/api' },
  babyeyi: { frontendUrl: 'http://localhost:3013', backendUrl: 'http://localhost:3012/api' },
  timetable: { frontendUrl: 'http://localhost:3011', backendUrl: 'http://localhost:3010' },
  'teacher-portal': { frontendUrl: 'http://localhost:5173', backendUrl: 'http://localhost:4000' },
  'task-module': { frontendUrl: 'http://localhost:3047', backendUrl: 'http://localhost:3046' },
  'procurement-mis': { frontendUrl: 'http://localhost:3031', backendUrl: 'http://localhost:3030' },
  'student-discipline': { frontendUrl: 'http://localhost:3033', backendUrl: 'http://localhost:3032' },
  cafeteria: { frontendUrl: 'http://localhost:3042', backendUrl: 'http://localhost:3043' },
  canteen: { frontendUrl: 'http://localhost:3050', backendUrl: 'http://localhost:3051' },
  'school-budget': { frontendUrl: 'http://localhost:3023', backendUrl: 'http://localhost:3022/api' },
  'action-plan': { frontendUrl: 'http://localhost:3035', backendUrl: 'http://localhost:3034' },
  hr: { frontendUrl: 'http://localhost:3006', backendUrl: 'http://localhost:3005' },
  payroll: { frontendUrl: 'http://localhost:3008', backendUrl: 'http://localhost:3026' },
  'parent-mis': { frontendUrl: 'http://localhost:3049', backendUrl: 'http://localhost:3048' },
  'school-fees': { frontendUrl: 'http://localhost:3015', backendUrl: 'http://localhost:3014/api' },
  /** Legacy IAM catalog slug — same app as school-fees */
  fees: { frontendUrl: 'http://localhost:3015', backendUrl: 'http://localhost:3014/api' },
  finance: { frontendUrl: 'http://localhost:3015', backendUrl: 'http://localhost:3014/api' },
  inventory: { frontendUrl: 'http://localhost:3045', backendUrl: 'http://localhost:3044' },
  /** Alias — same app as Inventory (catalog may use either slug) */
  'inventory-mis': { frontendUrl: 'http://localhost:3045', backendUrl: 'http://localhost:3044' },
  'school-uniform': { frontendUrl: 'http://localhost:3050', backendUrl: 'http://localhost:3051' },
  'assets-portal': { frontendUrl: 'http://localhost:3021', backendUrl: 'http://localhost:3020/api' },
  nesa: { frontendUrl: 'http://localhost:3016', backendUrl: 'http://localhost:3018/api' },
  'webpage-babyeyi': { frontendUrl: 'http://localhost:3098', backendUrl: 'http://localhost:3099/api' },
  /** Alias — Circulars is the same product as Babyeyi Wizard */
  circulars: { frontendUrl: 'http://localhost:3013', backendUrl: 'http://localhost:3012/api' },
  kaziavance: { frontendUrl: 'http://localhost:4401', backendUrl: 'http://localhost:4400' },
  'shulekit-mis': { frontendUrl: 'http://localhost:3039', backendUrl: 'http://localhost:3038/api' },
  'mini-website': { frontendUrl: 'http://localhost:3054', backendUrl: 'http://localhost:3055/api' },
  shulechat: { frontendUrl: 'http://localhost:3054', backendUrl: 'http://localhost:3055' },
  library: { frontendUrl: 'http://localhost:3061', backendUrl: 'http://localhost:3060/api' },
  device: { frontendUrl: 'http://localhost:3063', backendUrl: 'http://localhost:3062/api' },
  'rfid-device': { frontendUrl: 'http://localhost:3063', backendUrl: 'http://localhost:3062/api' },
  'print-card': { frontendUrl: 'http://localhost:3092', backendUrl: 'http://localhost:3093/api' },
  'sector-mis': { frontendUrl: 'http://localhost:3071', backendUrl: 'http://localhost:3070/api' },
  'deo-mis': { frontendUrl: 'http://localhost:3073', backendUrl: 'http://localhost:3072/api' },
  'curriculum-intelligence': { backendUrl: 'http://localhost:3094/api' },
};

/**
 * Same-host production ports (PM2). IAM provisions via 127.0.0.1 so it does not
 * depend on hairpin NAT to the public IP for https://*-api.shuleplus.rw.
 * Keep in sync with scripts/redeploy-module.sh BACKEND_PORT.
 */
export const PRODUCTION_LOOPBACK_BACKEND_URLS: Record<string, string> = {
  academic: 'http://127.0.0.1:4002',
  'student-management': 'http://127.0.0.1:4024',
  'teacher-portal': 'http://127.0.0.1:4003',
  'school-fees': 'http://127.0.0.1:4004',
  fees: 'http://127.0.0.1:4004',
  finance: 'http://127.0.0.1:4004',
  'school-budget': 'http://127.0.0.1:4005',
  payroll: 'http://127.0.0.1:4006',
  hr: 'http://127.0.0.1:4007',
  attendance: 'http://127.0.0.1:4008',
  'action-plan': 'http://127.0.0.1:4009',
  'procurement-mis': 'http://127.0.0.1:4010',
  inventory: 'http://127.0.0.1:4011',
  'inventory-mis': 'http://127.0.0.1:4011',
  'school-uniform': 'http://127.0.0.1:4023',
  'assets-portal': 'http://127.0.0.1:4012',
  cafeteria: 'http://127.0.0.1:4013',
  timetable: 'http://127.0.0.1:4014',
  'parent-mis': 'http://127.0.0.1:4015',
  nesa: 'http://127.0.0.1:4016',
  babyeyi: 'http://127.0.0.1:4017',
  circulars: 'http://127.0.0.1:4017',
  kaziavance: 'http://127.0.0.1:4018',
  'student-discipline': 'http://127.0.0.1:4019',
  'sample-module': 'http://127.0.0.1:4020',
  'shulekit-mis': 'http://127.0.0.1:4021',
  schoolmaterial: 'http://127.0.0.1:4021',
  'task-module': 'http://127.0.0.1:4022',
  library: 'http://127.0.0.1:4025',
  transport: 'http://127.0.0.1:4026',
  'webpage-babyeyi': 'http://127.0.0.1:4027',
  'print-card': 'http://127.0.0.1:4028',
  'sector-mis': 'http://127.0.0.1:4029',
  'deo-mis': 'http://127.0.0.1:4030',
  'curriculum-intelligence': 'http://127.0.0.1:4031',
};

/** Circulars catalog slug is an alias of Babyeyi Wizard (same app). */
export const MODULE_SLUG_ALIASES: Record<string, string> = {
  circulars: 'babyeyi',
  'inventory-mis': 'inventory',
  inventory: 'inventory-mis',
  budget: 'school-budget',
  'school-budget': 'budget',
  /** Legacy Finance tile slug in IAM seed — same microservice as school-fees */
  fees: 'school-fees',
  finance: 'school-fees',
};

export function canonicalizeModuleSlug(slug: string): string {
  return MODULE_SLUG_ALIASES[slug] ?? slug;
}

export function expandModuleSlugsForJwt(slugs: string[]): string[] {
  const out = new Set<string>();
  for (const slug of slugs) {
    out.add(slug);
    const canonical = canonicalizeModuleSlug(slug);
    out.add(canonical);
    if (canonical === 'babyeyi') out.add('circulars');
  }
  return [...out];
}

const HOSTED_MODULE_HOST = /shuleplus\.rw/i;

export function isHostedModuleUrl(url: string | null | undefined): boolean {
  return Boolean(url && HOSTED_MODULE_HOST.test(url));
}

/**
 * Local URL overrides exist for developer machines whose DB still has
 * https://*.shuleplus.rw catalog URLs. Production must never apply them.
 *
 * PM2 often leaves NODE_ENV unset → env defaults to "development" and
 * org dashboards open http://localhost:3004. Detect hosted Auth origins
 * so a mis-set NODE_ENV cannot rewrite launch URLs on mopas.
 */
export function useLocalModuleUrlOverrides(nodeEnv: string): boolean {
  if (process.env.FORCE_LOCAL_MODULE_URLS === 'true') return true;
  if (process.env.FORCE_LOCAL_MODULE_URLS === 'false') return false;
  if (nodeEnv === 'production') return false;
  if (
    isHostedModuleUrl(process.env.FRONTEND_URL) ||
    isHostedModuleUrl(process.env.CORS_ORIGIN) ||
    isHostedModuleUrl(process.env.PUBLIC_APP_URL)
  ) {
    return false;
  }
  return true;
}

export function resolveLocalModuleBackendUrl(
  slug: string,
  backendUrl: string | null | undefined,
  nodeEnv: string
): string | null {
  if (!useLocalModuleUrlOverrides(nodeEnv)) {
    // Prefer loopback on the app server (avoids public-IP hairpin timeouts).
    // Set MODULE_PROVISION_USE_LOOPBACK=false to force catalog public URLs.
    if (process.env.MODULE_PROVISION_USE_LOOPBACK !== 'false') {
      const loopback = PRODUCTION_LOOPBACK_BACKEND_URLS[slug];
      if (loopback) return loopback;
    }
    return backendUrl ?? null;
  }

  const local = LOCAL_MODULE_URLS[slug]?.backendUrl;
  if (local) return local;
  if (isHostedModuleUrl(backendUrl)) return null;
  return backendUrl ?? null;
}

export function resolveLocalModuleFrontendUrl(
  slug: string,
  frontendUrl: string | null | undefined,
  nodeEnv: string
): string | null {
  if (!useLocalModuleUrlOverrides(nodeEnv)) return frontendUrl ?? null;

  const local = LOCAL_MODULE_URLS[slug]?.frontendUrl;
  if (local) return local;
  if (isHostedModuleUrl(frontendUrl)) return null;
  return frontendUrl ?? null;
}

export function sanitizeProvisionErrorMessage(message: string): string {
  return message
    .replace(/\s*—\s*is the service running at https?:\/\/[^\s?]+?\??/gi, '')
    .replace(/\s*Ensure [^.]+\s+is running at https?:\/\/[^\s.]+\.?/gi, '')
    .replace(/fetch failed/gi, 'Module backend unreachable')
    .trim();
}

export const LOCAL_PROVISION_HINT =
  'Start the module backend locally, or set production URLs when deployed.';
