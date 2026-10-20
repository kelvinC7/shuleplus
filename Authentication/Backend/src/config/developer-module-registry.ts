/**
 * Developer Portal — module registry with real routes from each microservice.
 * Gateway proxies and OpenAPI specs are generated from this registry.
 */

import { env } from './env';
import { resolveLocalModuleBackendUrl } from './local-module-urls';
import { studentManagementPermissionConfig, STUDENT_MANAGEMENT_SCOPES } from './student-management-developer-scopes';
import { schoolFeesPermissionConfig, SCHOOL_FEES_SCOPES } from './school-fees-developer-scopes';
import { babyeyiPermissionConfig, BABYEYI_WIZARD_SCOPES } from './babyeyi-developer-scopes';
import { webpageBabyeyiPermissionConfig, WEBPAGE_BABYEYI_SCOPES } from './webpage-babyeyi-developer-scopes';
import { payrollPermissionConfig, PAYROLL_SCOPES } from './payroll-developer-scopes';
import { kaziAvancePermissionConfig, KAZIAVANCE_SCOPES } from './kaziavance-developer-scopes';
import { tichaPortalPermissionConfig, TICHA_PORTAL_SCOPES } from './ticha-portal-developer-scopes';

export type GatewayAuthMode = 'none' | 'service' | 'developer_jwt';

export interface ModuleRouteDef {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path on the upstream module (e.g. /public/students/lookup) */
  upstreamPath: string;
  summary: string;
  description: string;
  permission: string;
  authMode: GatewayAuthMode;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: Record<string, unknown>;
  responseExample?: Record<string, unknown>;
  tags?: string[];
}

export interface DeveloperModuleDef {
  slug: string;
  catalogKey: string;
  name: string;
  description: string;
  /** Permission namespace prefix for module toggle (e.g. student) */
  permissionModule: string;
  resolveUpstreamBase: () => string;
  routes: ModuleRouteDef[];
}

function moduleBase(slug: string, fallback: string): string {
  const raw = (resolveLocalModuleBackendUrl(slug, fallback, env.NODE_ENV) ?? fallback).replace(/\/$/, '');
  // Local dev URL map entries sometimes omit /api; fallbacks from env include it.
  if (fallback.includes('/api') && !raw.endsWith('/api')) {
    return `${raw}/api`;
  }
  return raw;
}

function resolveRouteAuthMode(path: string, options?: { alwaysPublic?: boolean }): GatewayAuthMode {
  if (options?.alwaysPublic) return 'none';
  if (path === '/health' || path.startsWith('/public/')) return 'none';
  if (path.startsWith('/babyeyi/verify/')) return 'none';
  return 'service';
}

function scopesToGatewayRoutes(
  modulePrefix: string,
  scopes: { key: string; label: string; endpoints: { method: string; path: string; summary: string }[] }[],
  options?: { alwaysPublic?: boolean }
): ModuleRouteDef[] {
  return scopes.flatMap((scope) =>
    scope.endpoints.map((ep) => ({
      id: `${modulePrefix}-${scope.key}-${ep.method.toLowerCase()}-${ep.path.replace(/[^a-z0-9]+/gi, '-')}`,
      method: ep.method as ModuleRouteDef['method'],
      upstreamPath: ep.path,
      summary: ep.summary,
      description: `${ep.summary} (${ep.method} ${ep.path})`,
      permission: scope.key,
      authMode: resolveRouteAuthMode(ep.path, options),
      tags: [scope.label],
    }))
  );
}

function studentManagementGatewayRoutes(): ModuleRouteDef[] {
  return STUDENT_MANAGEMENT_SCOPES.flatMap((scope) =>
    scope.endpoints.map((ep) => ({
      id: `sm-${scope.key}-${ep.method.toLowerCase()}-${ep.path.replace(/[^a-z0-9]+/gi, '-')}`,
      method: ep.method as ModuleRouteDef['method'],
      upstreamPath: ep.path,
      summary: ep.summary,
      description: `${ep.summary} (${ep.method} ${ep.path})`,
      permission: scope.key,
      authMode: (ep.path.startsWith('/public') ? 'none' : 'service') as GatewayAuthMode,
      tags: [scope.label],
    }))
  );
}

export const DEVELOPER_MODULE_REGISTRY: DeveloperModuleDef[] = [
  {
    slug: 'student-management',
    catalogKey: 'student',
    name: 'Student Management',
    description: 'Students, classes, parents, enrollments, exams, marks, and academic records.',
    permissionModule: 'student',
    resolveUpstreamBase: () =>
      moduleBase('student-management', env.STUDENT_MANAGEMENT_API_URL),
    routes: studentManagementGatewayRoutes(),
  },
  {
    slug: 'school-fees',
    catalogKey: 'payment',
    name: 'School Fees & Payments',
    description: 'Fee lookup, payment initiation, receipts, and outstanding balances.',
    permissionModule: 'payment',
    resolveUpstreamBase: () =>
      moduleBase('school-fees', env.SCHOOL_FEES_API_URL),
    routes: scopesToGatewayRoutes('sf', SCHOOL_FEES_SCOPES),
  },
  {
    slug: 'authentication',
    catalogKey: 'authentication',
    name: 'Authentication & IAM',
    description: 'Public IAM APIs — locations, admissions, and platform health.',
    permissionModule: 'authentication',
    resolveUpstreamBase: () => {
      const port = env.PORT;
      return `http://localhost:${port}${env.API_PREFIX}`.replace(/\/$/, '');
    },
    routes: [
      {
        id: 'iam-health',
        method: 'GET',
        upstreamPath: '/health',
        summary: 'IAM health check',
        description: 'Platform IAM service health.',
        permission: 'authentication.read',
        authMode: 'none',
        responseExample: { success: true, service: 'shuleplus-iam', version: '1.0.0' },
        tags: ['Health'],
      },
      {
        id: 'iam-provinces',
        method: 'GET',
        upstreamPath: '/public/locations/provinces',
        summary: 'List provinces',
        description: 'Rwanda administrative provinces for onboarding forms.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Locations'],
      },
      {
        id: 'iam-districts',
        method: 'GET',
        upstreamPath: '/public/locations/provinces/{provinceId}/districts',
        summary: 'List districts',
        description: 'Districts within a province.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Locations'],
      },
      {
        id: 'iam-sectors',
        method: 'GET',
        upstreamPath: '/public/locations/districts/{districtId}/sectors',
        summary: 'List sectors',
        description: 'Sectors within a district.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Locations'],
      },
      {
        id: 'iam-cells',
        method: 'GET',
        upstreamPath: '/public/locations/sectors/{sectorId}/cells',
        summary: 'List cells',
        description: 'Cells within a sector.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Locations'],
      },
      {
        id: 'iam-villages',
        method: 'GET',
        upstreamPath: '/public/locations/cells/{cellId}/villages',
        summary: 'List villages',
        description: 'Villages within a cell.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Locations'],
      },
      {
        id: 'iam-school-registrations',
        method: 'GET',
        upstreamPath: '/public/school-registrations',
        summary: 'List public schools',
        description: 'Onboarded schools directory feed.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Directory'],
      },
      {
        id: 'iam-admissions-check',
        method: 'GET',
        upstreamPath: '/public/admissions/check',
        summary: 'Check admissions open',
        description: 'Whether a school accepts online admissions.',
        permission: 'authentication.read',
        authMode: 'none',
        queryParams: [{ name: 'organizationId', type: 'string', required: true, description: 'School org ID' }],
        tags: ['Admissions'],
      },
      {
        id: 'iam-admissions-config',
        method: 'GET',
        upstreamPath: '/public/admissions/config',
        summary: 'Admissions configuration',
        description: 'Public admission form configuration for a school.',
        permission: 'authentication.read',
        authMode: 'none',
        queryParams: [{ name: 'organizationId', type: 'string', required: true, description: 'School org ID' }],
        tags: ['Admissions'],
      },
      {
        id: 'iam-admissions-submit',
        method: 'POST',
        upstreamPath: '/public/admissions/submit',
        summary: 'Submit admission application',
        description: 'Submit a new admission application (sandbox).',
        permission: 'authentication.write',
        authMode: 'none',
        requestBody: {
          organizationId: '00000000-0000-0000-0000-000000000000',
          applicantName: 'Test Applicant',
          gradeApplied: 'P1',
        },
        tags: ['Admissions'],
      },
      {
        id: 'iam-admissions-track',
        method: 'GET',
        upstreamPath: '/public/admissions/track/{applicationNumber}',
        summary: 'Track admission application',
        description: 'Track status by application number.',
        permission: 'authentication.read',
        authMode: 'none',
        tags: ['Admissions'],
      },
    ],
  },
  {
    slug: 'babyeyi-wizard',
    catalogKey: 'babyeyi',
    name: 'Babyeyi Wizard',
    description: 'School fee circulars (Babyeyi), verification, and NESA compliance.',
    permissionModule: 'babyeyi',
    resolveUpstreamBase: () => moduleBase('babyeyi', env.BABYEYI_WIZARD_API_URL),
    routes: scopesToGatewayRoutes('bw', BABYEYI_WIZARD_SCOPES),
  },
  {
    slug: 'webpage-babyeyi',
    catalogKey: 'webpage-babyeyi',
    name: 'Webpage Babyeyi (BFF)',
    description: 'Public babyeyi.rw BFF — aggregates students, fees, circulars, and admissions.',
    permissionModule: 'webpage',
    resolveUpstreamBase: () =>
      moduleBase('webpage-babyeyi', env.WEBPAGE_BABYEYI_API_URL),
    routes: scopesToGatewayRoutes('wb', WEBPAGE_BABYEYI_SCOPES, { alwaysPublic: true }),
  },
  {
    slug: 'payroll',
    catalogKey: 'payroll',
    name: 'Payroll',
    description: 'Staff payroll, runs, bank disbursement, deductions, and payslips.',
    permissionModule: 'payroll',
    resolveUpstreamBase: () => moduleBase('payroll', env.PAYROLL_API_URL),
    routes: scopesToGatewayRoutes('pr', PAYROLL_SCOPES),
  },
  {
    slug: 'kaziavance',
    catalogKey: 'kazi',
    name: 'KaziAvance (TichaAvance)',
    description: 'Teacher salary advances — submit requests, org-admin approval, and disbursement.',
    permissionModule: 'kazi',
    resolveUpstreamBase: () => moduleBase('kaziavance', env.KAZI_API_URL),
    routes: scopesToGatewayRoutes('kz', KAZIAVANCE_SCOPES),
  },
  {
    slug: 'ticha-portal',
    catalogKey: 'ticha',
    name: 'TichaPortal (TichaAvance BFF)',
    description: 'Teacher portal BFF — same TichaAvance paths used by ticha.shuleplus.rw (Kazi proxy).',
    permissionModule: 'ticha',
    resolveUpstreamBase: () => moduleBase('teacher-portal', env.TICHA_PORTAL_API_URL),
    routes: scopesToGatewayRoutes('tp', TICHA_PORTAL_SCOPES),
  },
];

export function findModuleBySlug(slug: string): DeveloperModuleDef | undefined {
  return DEVELOPER_MODULE_REGISTRY.find((m) => m.slug === slug);
}

export function findRoute(
  moduleSlug: string,
  method: string,
  path: string
): { module: DeveloperModuleDef; route: ModuleRouteDef; resolvedUpstreamPath: string } | null {
  const mod = findModuleBySlug(moduleSlug);
  if (!mod) return null;

  const normalized = path.startsWith('/') ? path : `/${path}`;

  for (const route of mod.routes) {
    if (route.method !== method.toUpperCase()) continue;
    const pattern = route.upstreamPath.replace(/\{[^}]+\}/g, '[^/]+');
    const re = new RegExp(`^${pattern}$`);
    if (re.test(normalized)) {
      return { module: mod, route, resolvedUpstreamPath: normalized };
    }
  }
  return null;
}

export const DEVELOPER_MODULE_PERMISSIONS: Record<
  string,
  { label: string; permissions: { key: string; label: string }[] }
> = {
  student: studentManagementPermissionConfig(),
  payment: schoolFeesPermissionConfig(),
  authentication: {
    label: 'Authentication & IAM',
    permissions: [
      { key: 'authentication.read', label: 'Read Public IAM APIs' },
      { key: 'authentication.write', label: 'Write Public IAM APIs' },
    ],
  },
  babyeyi: babyeyiPermissionConfig(),
  webpage: webpageBabyeyiPermissionConfig(),
  payroll: payrollPermissionConfig(),
  kazi: kaziAvancePermissionConfig(),
  ticha: tichaPortalPermissionConfig(),
  attendance: {
    label: 'Attendance',
    permissions: [
      { key: 'attendance.read', label: 'Read Attendance' },
      { key: 'attendance.write', label: 'Write Attendance' },
    ],
  },
  assets: {
    label: 'Assets',
    permissions: [
      { key: 'assets.read', label: 'Read Assets' },
      { key: 'assets.write', label: 'Write Assets' },
    ],
  },
};

export function filterModulesByPermissions(
  allowedModules: Record<string, Record<string, boolean>>
): DeveloperModuleDef[] {
  const granted = new Set<string>();
  for (const mod of Object.values(allowedModules)) {
    for (const [perm, enabled] of Object.entries(mod)) {
      if (enabled) granted.add(perm);
    }
  }
  return DEVELOPER_MODULE_REGISTRY.map((mod) => ({
    ...mod,
    routes: mod.routes.filter((r) => granted.has(r.permission)),
  })).filter((m) => m.routes.length > 0);
}
