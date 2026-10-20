import { PlatformAdminStats } from '@/lib/platform-administrators';

const STAT_ITEMS: { key: keyof PlatformAdminStats; label: string; icon: string }[] = [
  { key: 'total', label: 'Total Platform Admins', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 .01 M23 21v-2a4 4 0 0 0-3-3.87' },
  { key: 'active', label: 'Active Admins', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3' },
  { key: 'suspended', label: 'Suspended Admins', icon: 'M18.36 6.64a9 9 0 1 1-12.73 0 M12 2v10' },
  { key: 'onlineNow', label: 'Online Now', icon: 'M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0' },
  { key: 'failedLoginAttempts', label: 'Failed Login Attempts', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
  { key: 'pendingInvitations', label: 'Pending Invitations', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6' },
];

export function AdminStatsCards({ stats }: { stats: PlatformAdminStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
      {STAT_ITEMS.map(({ key, label, icon }) => (
        <div
          key={key}
          className="group rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/[0.04] text-navy transition-colors group-hover:bg-navy group-hover:text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d={icon} />
            </svg>
          </span>
          <p className="mt-3 font-montserrat text-2xl font-bold text-navy">{stats[key]}</p>
          <p className="text-[11px] leading-tight text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminHighlightCards({ stats }: { stats: PlatformAdminStats }) {
  const highlights = [
    { label: 'Platform Admins', value: stats.total, color: 'from-navy to-navy-light' },
    { label: 'Active', value: stats.active, color: 'from-success/80 to-success' },
    { label: 'Suspended', value: stats.suspended, color: 'from-amber-500/80 to-amber-500' },
    { label: 'Online', value: stats.onlineNow, color: 'from-primary/90 to-primary' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {highlights.map((h) => (
        <div
          key={h.label}
          className={`rounded-2xl bg-gradient-to-br ${h.color} p-5 text-white shadow-md`}
        >
          <p className="font-montserrat text-3xl font-bold">{h.value}</p>
          <p className="mt-1 text-sm text-white/80">{h.label}</p>
        </div>
      ))}
    </div>
  );
}
