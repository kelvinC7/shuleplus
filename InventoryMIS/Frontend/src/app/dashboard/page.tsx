'use client';

import { MainLayout } from '@/layouts/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  ArrowDown,
  ArrowUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { StatCard, StatsGrid } from '@/components/stat-card';

function describeActivity(action: string, metadata: Record<string, unknown> | null | undefined): string {
  switch (action) {
    case 'STOCK_RECEIVED':
      return `Received ${metadata?.itemCount || 0} item(s) via ${metadata?.grnNumber || 'GRN'}`;
    case 'STOCK_ISSUED':
      return `Issued ${metadata?.itemCount || 0} item(s) to ${metadata?.issuedTo || 'someone'}`;
    case 'STOCK_ADJUSTED':
      return `Stock adjustment: ${metadata?.reason || 'No reason given'}`;
    case 'STOCK_DISPOSED':
      return `Disposed items: ${metadata?.reason || 'No reason given'}`;
    case 'STOCK_REQUESTED':
      return `Stock request from ${metadata?.department || 'a department'}`;
    case 'STOCK_TRANSFERRED':
      return 'Stock transferred between locations';
    case 'STOCK_COUNTED':
      return `${metadata?.countType || 'Stock'} count recorded`;
    default:
      return action?.replace(/_/g, ' ').toLowerCase() || 'Unknown activity';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { summary } = useAuth();
  const router = useRouter();

  const cards = [
    { label: 'Total Products', value: summary?.totalProducts ?? 0, icon: Package, href: '/products' },
    { label: 'Total Stock', value: summary?.totalStock ?? 0, icon: ClipboardList, href: '/stock-summary' },
    {
      label: 'Low Stock',
      value: summary?.lowStockItems ?? 0,
      icon: AlertTriangle,
      alert: (summary?.lowStockItems ?? 0) > 0,
      href: '/stock-summary',
    },
    {
      label: 'Out of Stock',
      value: summary?.outOfStockItems ?? 0,
      icon: AlertCircle,
      alert: (summary?.outOfStockItems ?? 0) > 0,
      href: '/stock-summary',
    },
    {
      label: 'Expiring Soon',
      value: summary?.expiringSoon ?? 0,
      icon: Clock,
      alert: (summary?.expiringSoon ?? 0) > 0,
      href: '/stock-summary',
    },
    {
      label: 'Expired',
      value: summary?.expiredItems ?? 0,
      icon: AlertCircle,
      alert: (summary?.expiredItems ?? 0) > 0,
      href: '/stock-summary',
    },
    {
      label: 'Pending Requests',
      value: summary?.pendingStockRequests ?? 0,
      icon: TrendingUp,
      href: '/stock-requests',
    },
    { label: 'Received Today', value: summary?.stockReceivedToday ?? 0, icon: ArrowDown, href: '/receivings' },
    { label: 'Issued Today', value: summary?.stockIssuedToday ?? 0, icon: ArrowUp, href: '/issues' },
  ];

  const maxConsumption = Math.max(...(summary?.monthlyConsumption?.map((x) => x.total) ?? [1]), 1);

  return (
    <MainLayout>
      <div className="space-y-6">
        <StatsGrid columns={5}>
          {cards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={<card.icon strokeWidth={1.75} />}
              valueClassName={card.alert ? 'text-red-600' : 'text-[#000435]'}
              onClick={() => router.push(card.href)}
            />
          ))}
        </StatsGrid>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <section className="hr-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/70">Top Consumed Items</h2>
            {summary?.topConsumed?.length ? (
              <ul className="mt-4 space-y-3">
                {summary.topConsumed.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-navy">{item.totalConsumed} units</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No consumption data yet</p>
            )}
          </section>

          <section className="hr-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/70">Monthly Consumption</h2>
            {summary?.monthlyConsumption?.length ? (
              <ul className="mt-4 space-y-3">
                {summary.monthlyConsumption.map((m) => (
                  <li key={m.month} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm text-muted-foreground">{m.month}</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
                        style={{ width: `${Math.max(8, (m.total / maxConsumption) * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-bold text-navy">{m.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No consumption data yet</p>
            )}
          </section>
        </div>

        <section className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/70">Recent Activities</h2>
          {summary?.recentActivities?.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {summary.recentActivities.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-navy/80">{describeActivity(log.action, log.metadata)}</p>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{timeAgo(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No recent activity</p>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
