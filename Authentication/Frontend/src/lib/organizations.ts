export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'DISABLED' | 'ARCHIVED';

export const ORG_TYPES = [
  'SCHOOL',
  'UNIVERSITY',
  'NGO',
  'FACTORY',
  'HOSPITAL',
  'CHURCH',
  'BUSINESS',
  'OTHER',
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  status: OrgStatus;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  subscriptionTier: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export interface OrgAuditLog {
  id: string;
  action: string;
  resource: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export interface OrgDetails extends Organization {
  adminUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    lastLoginAt: string | null;
    mustChangePassword: boolean;
  } | null;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    admins: number;
    roles: number;
  };
  recentActivity: OrgAuditLog[];
}

export const STATUS_STYLES: Record<OrgStatus, { dot: string; text: string; chip: string }> = {
  ACTIVE: { dot: 'bg-success', text: 'text-success', chip: 'bg-success/10 text-success' },
  PENDING: { dot: 'bg-primary', text: 'text-primary', chip: 'bg-primary/10 text-primary' },
  SUSPENDED: { dot: 'bg-amber-500', text: 'text-amber-600', chip: 'bg-amber-500/10 text-amber-600' },
  DISABLED: { dot: 'bg-danger', text: 'text-danger', chip: 'bg-danger/10 text-danger' },
  ARCHIVED: { dot: 'bg-muted', text: 'text-muted', chip: 'bg-muted/10 text-muted' },
};

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year(s) ago`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/**
 * Deterministic, seeded pseudo metrics derived from the org id.
 * NOTE: student/staff/finance data is owned by other ShulePlus microservices.
 * These derived values keep the executive UI complete until those services
 * are wired in. They are stable per-organization (seeded by id).
 */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface DerivedMetrics {
  students: number;
  teachers: number;
  classes: number;
  parents: number;
  revenue: number;
  studentGrowth: number[];
  attendance: number[];
  performance: number[];
  subscriptionUsage: { label: string; value: number; color: string }[];
}

export function deriveOrgMetrics(orgId: string): DerivedMetrics {
  const rand = seededRandom(hashString(orgId) || 1);
  const students = 400 + Math.floor(rand() * 1400);
  const teachers = 20 + Math.floor(rand() * 60);
  const classes = 15 + Math.floor(rand() * 45);
  const parents = Math.floor(students * (0.8 + rand() * 0.2));
  const revenue = Math.floor(students * (1200 + rand() * 1800));

  const months = 8;
  const studentGrowth: number[] = [];
  let base = students * 0.6;
  for (let i = 0; i < months; i++) {
    base += base * (0.02 + rand() * 0.06);
    studentGrowth.push(Math.round(base));
  }

  const attendance = Array.from({ length: months }, () => 78 + Math.round(rand() * 20));
  const performance = Array.from({ length: 6 }, () => 55 + Math.round(rand() * 40));

  const used = 40 + Math.round(rand() * 50);
  const subscriptionUsage = [
    { label: 'Used', value: used, color: '#FCB038' },
    { label: 'Available', value: 100 - used, color: '#000435' },
  ];

  return {
    students,
    teachers,
    classes,
    parents,
    revenue,
    studentGrowth,
    attendance,
    performance,
    subscriptionUsage,
  };
}

export function exportToCsv(orgs: Organization[]): void {
  const header = ['Name', 'Code', 'Type', 'Status', 'Plan', 'Email', 'Users', 'Created'];
  const rows = orgs.map((o) => [
    o.name,
    o.slug,
    o.type,
    o.status,
    o.subscriptionTier ?? '',
    o.email ?? '',
    String(o._count?.users ?? 0),
    new Date(o.createdAt).toISOString().split('T')[0],
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `organizations-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
