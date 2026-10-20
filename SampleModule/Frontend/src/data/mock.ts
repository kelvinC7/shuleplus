import type { LucideIcon } from 'lucide-react';

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'create' | 'update' | 'delete' | 'login';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ip: string;
  timestamp: string;
  status: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'deadline' | 'review';
}

export interface RecordRow {
  id: string;
  title: string;
  department: string;
  status: string;
  owner: string;
  createdAt: string;
  priority: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: '1', user: 'Jean Ishimwe', action: 'created', target: 'Annual Budget Report', time: '2 min ago', type: 'create' },
  { id: '2', user: 'Amina Hassan', action: 'updated', target: 'Staff Record #1042', time: '15 min ago', type: 'update' },
  { id: '3', user: 'System', action: 'exported', target: 'Records CSV (248 rows)', time: '1 hr ago', type: 'update' },
  { id: '4', user: 'Peter Otieno', action: 'approved', target: 'Leave Request #89', time: '3 hrs ago', type: 'update' },
  { id: '5', user: 'Grace Okonkwo', action: 'logged in', target: 'from 192.168.1.45', time: '5 hrs ago', type: 'login' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Record approved', message: 'Your budget record was approved by the finance team.', time: '5 min ago', read: false, type: 'success' },
  { id: '2', title: 'New user added', message: 'Amina Hassan was added to Sample Module.', time: '1 hr ago', read: false, type: 'info' },
  { id: '3', title: 'Export complete', message: 'Your records export is ready for download.', time: '2 hrs ago', read: true, type: 'success' },
  { id: '4', title: 'License reminder', message: 'Your module license renews in 30 days.', time: '1 day ago', read: true, type: 'warning' },
  { id: '5', title: 'Failed sync', message: 'IAM sync failed for 2 users. Review audit log.', time: '2 days ago', read: true, type: 'error' },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'AUD-001', actor: 'jean@org.com', action: 'CREATE', resource: 'Record / Annual Budget', ip: '10.0.0.12', timestamp: '2026-07-08 08:15', status: 'Success' },
  { id: 'AUD-002', actor: 'amina@org.com', action: 'UPDATE', resource: 'User / peter@org.com', ip: '10.0.0.18', timestamp: '2026-07-08 07:42', status: 'Success' },
  { id: 'AUD-003', actor: 'system', action: 'EXPORT', resource: 'Records / CSV', ip: '10.0.0.1', timestamp: '2026-07-08 06:30', status: 'Success' },
  { id: 'AUD-004', actor: 'peter@org.com', action: 'DELETE', resource: 'Record / Draft #44', ip: '10.0.0.22', timestamp: '2026-07-07 16:10', status: 'Rejected' },
  { id: 'AUD-005', actor: 'grace@org.com', action: 'LOGIN', resource: 'Session', ip: '192.168.1.45', timestamp: '2026-07-07 09:00', status: 'Success' },
  { id: 'AUD-006', actor: 'jean@org.com', action: 'UPDATE', resource: 'Settings / Theme', ip: '10.0.0.12', timestamp: '2026-07-06 14:22', status: 'Success' },
];

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Budget Review Meeting', date: '2026-07-08', time: '10:00 AM', type: 'meeting' },
  { id: '2', title: 'Q3 Report Deadline', date: '2026-07-10', time: '5:00 PM', type: 'deadline' },
  { id: '3', title: 'Staff Onboarding Session', date: '2026-07-12', time: '2:00 PM', type: 'meeting' },
  { id: '4', title: 'Records Audit Review', date: '2026-07-15', time: '11:00 AM', type: 'review' },
  { id: '5', title: 'Monthly Finance Close', date: '2026-07-31', time: '6:00 PM', type: 'deadline' },
];

export function enrichRecord(r: { id: string; title: string; createdAt: string; createdBy: string }): RecordRow {
  const statuses = ['Active', 'Pending', 'Approved', 'Draft'];
  const depts = ['Finance', 'HR', 'Operations', 'IT'];
  const priorities = ['High', 'Medium', 'Low'];
  const hash = r.id.charCodeAt(0) + r.title.length;
  return {
    id: r.id,
    title: r.title,
    department: depts[hash % depts.length],
    status: statuses[hash % statuses.length],
    owner: r.createdBy,
    createdAt: r.createdAt,
    priority: priorities[hash % priorities.length],
  };
}
