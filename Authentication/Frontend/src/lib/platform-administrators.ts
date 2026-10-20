export type AdminRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_ADMIN'
  | 'SECURITY_ADMIN'
  | 'BILLING_ADMIN'
  | 'SUPPORT_ADMIN'
  | 'DEVELOPER_ADMIN';

export type DataScope = 'GLOBAL' | 'REGIONAL' | 'COUNTRY' | 'CUSTOM';

export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: AdminRole | string;
  status: string;
  lastLoginAt: string | null;
  mfaEnabled?: boolean;
  mustChangePassword?: boolean;
  failedLoginCount?: number;
  createdAt: string;
  isOnline?: boolean;
  organizationsManaged: number;
}

export interface PlatformAdminStats {
  total: number;
  active: number;
  suspended: number;
  onlineNow: number;
  failedLoginAttempts: number;
  pendingInvitations: number;
}

export interface AdminSession {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActivity: string;
  createdAt: string;
}

export interface PlatformAdminDetails extends PlatformAdmin {
  emailVerifiedAt: string | null;
  sessions: AdminSession[];
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata?: Record<string, unknown> | null;
  }>;
}

export const ADMIN_ROLES: {
  id: AdminRole;
  label: string;
  description: string;
  canManage: string[];
  cannot?: string[];
}[] = [
  {
    id: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full platform operations except root security',
    canManage: ['Organizations', 'Modules', 'Subscriptions', 'Customers', 'Users', 'Reports'],
    cannot: ['Delete Root Admin', 'Modify Platform Security'],
  },
  {
    id: 'OPERATIONS_ADMIN',
    label: 'Operations Admin',
    description: 'Onboarding, training & operational support',
    canManage: ['Organizations', 'Support Tickets', 'Onboarding', 'Training'],
  },
  {
    id: 'SECURITY_ADMIN',
    label: 'Security Admin',
    description: 'Platform security, audit & access control',
    canManage: ['Audit Logs', 'Security Policies', 'Sessions', 'Blocked IPs', 'MFA'],
  },
  {
    id: 'BILLING_ADMIN',
    label: 'Billing Admin',
    description: 'Subscriptions, invoices & licenses',
    canManage: ['Subscriptions', 'Invoices', 'Payments', 'Licenses'],
  },
  {
    id: 'SUPPORT_ADMIN',
    label: 'Support Admin',
    description: 'Customer support & knowledge base',
    canManage: ['Customer Support', 'Tickets', 'Knowledge Base', 'Live Chat'],
  },
  {
    id: 'DEVELOPER_ADMIN',
    label: 'Developer Admin',
    description: 'API, webhooks & integrations',
    canManage: ['API Keys', 'Webhooks', 'Integrations', 'Developer Settings'],
  },
];

export const PERMISSION_MODULES = [
  { key: 'organizations', label: 'Organizations' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'modules', label: 'Modules' },
  { key: 'users', label: 'Users' },
  { key: 'audit', label: 'Audit Logs' },
  { key: 'security', label: 'Security' },
] as const;

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

export const DEFAULT_TEAMS = [
  { id: 'support', name: 'Support Team', color: '#FCB038', members: [] as string[] },
  { id: 'security', name: 'Security Team', color: '#000435', members: [] as string[] },
  { id: 'finance', name: 'Finance Team', color: '#22c55e', members: [] as string[] },
  { id: 'development', name: 'Development Team', color: '#3b82f6', members: [] as string[] },
  { id: 'operations', name: 'Operations Team', color: '#8b5cf6', members: [] as string[] },
];

export function formatAdminRole(role: string): string {
  return role.replace(/_/g, ' ');
}

export function formatLastLogin(date: string | null): string {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function statusStyle(status: string): { dot: string; chip: string } {
  switch (status) {
    case 'ACTIVE':
      return { dot: 'bg-success', chip: 'bg-success/10 text-success' };
    case 'SUSPENDED':
      return { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600' };
    case 'PENDING_VERIFICATION':
      return { dot: 'bg-primary', chip: 'bg-primary/10 text-primary' };
    default:
      return { dot: 'bg-muted', chip: 'bg-muted/10 text-muted' };
  }
}

export function defaultPermissionsForRole(role: AdminRole): Record<string, Record<string, boolean>> {
  const all = PERMISSION_MODULES.reduce(
    (acc, m) => {
      acc[m.key] = { view: true, create: false, edit: false, delete: false };
      return acc;
    },
    {} as Record<string, Record<string, boolean>>
  );

  if (role === 'SUPER_ADMIN') {
    ['organizations', 'subscriptions', 'modules', 'users'].forEach((k) => {
      all[k] = { view: true, create: true, edit: true, delete: false };
    });
  }
  if (role === 'SECURITY_ADMIN') {
    all.audit = { view: true, create: false, edit: false, delete: false };
    all.security = { view: true, create: true, edit: true, delete: false };
  }
  if (role === 'BILLING_ADMIN') {
    all.subscriptions = { view: true, create: true, edit: true, delete: false };
  }
  return all;
}
