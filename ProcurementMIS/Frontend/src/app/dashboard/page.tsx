'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/layouts/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { procurementApi } from '@/services/procurement-api';
import type { DashboardData, PurchaseRequest } from '@/types';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading, StatusBadge } from '@/components/list-ui';
import {
  FileText,
  ShoppingCart,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Plus,
  DollarSign,
  ArrowUpRight,
  Activity,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { formatFrw, formatFrwCompact } from '@/utils/currency';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#94a3b8' },
  SENT: { label: 'Sent', color: '#38bdf8' },
  ACCEPTED: { label: 'Accepted', color: '#818cf8' },
  PREPARING: { label: 'Preparing', color: '#a78bfa' },
  IN_TRANSIT: { label: 'In transit', color: '#fb923c' },
  DELIVERED: { label: 'Delivered', color: '#2dd4bf' },
  PARTIALLY_DELIVERED: { label: 'Partially delivered', color: '#fbbf24' },
  COMPLETED: { label: 'Completed', color: '#34d399' },
  CANCELLED: { label: 'Cancelled', color: '#f87171' },
};

const PR_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  DEPARTMENT_HEAD_APPROVED: 'Dept. approved',
  FINANCE_APPROVED: 'Finance approved',
  PROCUREMENT_APPROVED: 'Procurement approved',
  MD_APPROVED: 'Fully approved',
  REJECTED: 'Rejected',
  CONVERTED_TO_PO: 'Ordered',
  CANCELLED: 'Cancelled',
};

const PR_STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  DRAFT: 'neutral',
  MD_APPROVED: 'success',
  CONVERTED_TO_PO: 'success',
  DEPARTMENT_HEAD_APPROVED: 'info',
  FINANCE_APPROVED: 'info',
  PROCUREMENT_APPROVED: 'info',
};

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

function nameFromEmail(email?: string): string {
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  const first = local.split(/[._-]/).filter(Boolean)[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function DashboardHero({
  email,
  onNewRequest,
  onNewOrder,
  showOrder,
}: {
  email?: string;
  onNewRequest: () => void;
  onNewOrder: () => void;
  showOrder: boolean;
}) {
  const name = nameFromEmail(email);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-5 py-6 shadow-[0_1px_2px_rgba(0,4,53,0.04),0_16px_36px_-28px_rgba(0,4,53,0.28)] sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#fcb038]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-16 h-48 w-48 rounded-full bg-slate-100/80 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fcb038]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b45309]">
            <Activity className="h-3 w-3" />
            Procurement overview
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            {greeting()}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Requests, orders, deliveries and spending, connected in one live workspace
            for your school.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNewRequest}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#fcb038] to-[#febf10] px-4 py-2.5 text-sm font-bold text-navy shadow-[0_8px_24px_-10px_rgba(252,176,56,0.9)] transition hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> New Request
          </button>
          {showOrder ? (
            <button
              type="button"
              onClick={onNewOrder}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-navy transition hover:border-[#fcb038]/60 hover:bg-[#fcb038]/5"
            >
              <ShoppingCart className="h-4 w-4" /> New Order
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#34d399]" />
          </span>
          Live from requests and orders
        </span>
        <span className="text-slate-300">•</span>
        <span>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04),0_16px_36px_-28px_rgba(0,4,53,0.28)] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center">
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
}

function ManageUserDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    procurementApi.purchaseRequests
      .list()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading your dashboard…" />
      </MainLayout>
    );
  }

  const pending = requests.filter((request) => request.status === 'PENDING').length;
  const approved = requests.filter((request) =>
    [
      'MD_APPROVED',
      'CONVERTED_TO_PO',
      'DEPARTMENT_HEAD_APPROVED',
      'FINANCE_APPROVED',
      'PROCUREMENT_APPROVED',
    ].includes(request.status),
  ).length;
  const items = requests.reduce(
    (total, request) => total + (request.items?.length ?? request._count?.items ?? 0),
    0,
  );

  return (
    <MainLayout>
      <div className="space-y-5">
        <DashboardHero
          email={user?.email}
          onNewRequest={() => router.push('/purchase-requests')}
          onNewOrder={() => router.push('/purchase-orders')}
          showOrder={false}
        />

        <StatsGrid columns={3}>
          {[
            { label: 'My Requests', value: requests.length, icon: <FileText size={20} /> },
            {
              label: 'Pending',
              value: pending,
              icon: <Clock size={20} />,
              valueClassName: 'text-amber-600',
            },
            {
              label: 'Approved',
              value: approved,
              icon: <CheckCircle size={20} />,
              valueClassName: 'text-emerald-600',
            },
            { label: 'Items Requested', value: items, icon: <Package size={20} /> },
          ].map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              valueClassName={card.valueClassName}
            />
          ))}
        </StatsGrid>

        <SectionCard
          title="Recent requests"
          subtitle="Track the requests you submitted and their approval progress."
          action={
            <button
              type="button"
              onClick={() => router.push('/purchase-requests')}
              className="inline-flex items-center gap-1 text-xs font-bold text-navy/70 transition hover:text-navy"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {requests.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <p className="text-sm text-slate-500">
                You have not submitted any purchase requests yet.
              </p>
              <button
                type="button"
                onClick={() => router.push('/purchase-requests')}
                className="btn-primary mt-4"
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.slice(0, 8).map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => router.push('/purchase-requests')}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left transition hover:bg-slate-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{request.prNumber}</p>
                    <p className="truncate text-xs text-slate-500">
                      {request.departmentOther || request.department?.name || '—'} ·{' '}
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge tone={PR_STATUS_TONE[request.status] ?? 'neutral'}>
                    {PR_STATUS_LABELS[request.status] ?? request.status}
                  </StatusBadge>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  const { summary, isSupervisor, isManageUser, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(summary);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    setRefreshing(true);
    procurementApi.dashboard
      .get()
      .then((fresh) => {
        if (active) setData(fresh);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const monthlySpending = useMemo(
    () => (data?.monthlySpending ?? []).map((item) => ({ name: item.month, total: item.total })),
    [data],
  );

  const statusData = useMemo(
    () =>
      (data?.statusDistribution ?? [])
        .map((item) => ({
          name: ORDER_STATUS_META[item.status]?.label ?? item.status,
          value: item.count,
          color: ORDER_STATUS_META[item.status]?.color ?? '#94a3b8',
        }))
        .filter((item) => item.value > 0),
    [data],
  );

  if (isManageUser) {
    return <ManageUserDashboard />;
  }

  if (!data) {
    return (
      <MainLayout>
        <PageLoading label="Loading dashboard…" />
      </MainLayout>
    );
  }

  const d = data;
  const spendTotal = monthlySpending.reduce((total, item) => total + item.total, 0);
  const ordersTotal = statusData.reduce((total, item) => total + item.value, 0);

  const kpis: {
    label: string;
    value: string | number;
    icon: ReactNode;
    href: string;
    delta?: string;
    hint?: string;
    showTrend?: boolean;
    valueClassName?: string;
  }[] = [
    {
      label: 'Purchase Requests',
      value: d.totalPRs ?? 0,
      icon: <FileText size={20} strokeWidth={1.75} />,
      href: '/purchase-requests',
      delta:
        d.prChange !== undefined
          ? `${d.prChange >= 0 ? '+' : ''}${d.prChange}% vs last month`
          : undefined,
      showTrend: d.prChange !== undefined,
      valueClassName: 'text-[#000435]',
    },
    {
      label: 'Pending Approvals',
      value: d.pendingApprovals ?? 0,
      icon: <Clock size={20} strokeWidth={1.75} />,
      href: '/purchase-requests',
      hint: d.pendingApprovals > 0 ? 'Awaiting action' : 'All caught up',
      valueClassName: d.pendingApprovals > 0 ? 'text-amber-600' : 'text-[#000435]',
    },
    {
      label: 'Purchase Orders',
      value: d.poIssued ?? 0,
      icon: <ShoppingCart size={20} strokeWidth={1.75} />,
      href: '/purchase-orders',
      hint: `${d.ordersInTransit ?? 0} in transit`,
      valueClassName: 'text-[#000435]',
    },
    {
      label: 'Total Order Value',
      value: formatFrwCompact(d.totalOrderValue ?? 0),
      icon: <DollarSign size={20} strokeWidth={1.75} />,
      href: '/purchase-orders',
      hint: 'All purchase orders',
      valueClassName: 'text-[#000435]',
    },
    {
      label: 'Delivered',
      value: d.deliveredOrders ?? 0,
      icon: <Truck size={20} strokeWidth={1.75} />,
      href: '/goods-receivings',
      hint: `${d.ordersInTransit ?? 0} on the way`,
      valueClassName: 'text-emerald-600',
    },
    {
      label: 'Active Suppliers',
      value: d.totalSuppliers ?? 0,
      icon: <Users size={20} strokeWidth={1.75} />,
      href: '/suppliers',
      hint: `${d.contractsExpiring ?? 0} contracts expiring`,
      valueClassName: 'text-[#000435]',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-5">
        <DashboardHero
          email={user?.email}
          onNewRequest={() => router.push('/purchase-requests')}
          onNewOrder={() => router.push('/purchase-orders')}
          showOrder={isSupervisor}
        />

        <StatsGrid columns={3}>
          {kpis.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => router.push(card.href)}
              className="text-left"
            >
              <StatCard
                label={card.label}
                value={card.value}
                icon={card.icon}
                hint={card.hint}
                delta={card.delta}
                showTrend={card.showTrend}
                valueClassName={card.valueClassName}
              />
            </button>
          ))}
        </StatsGrid>

        <div className="grid gap-5 xl:grid-cols-3">
          <SectionCard
            title="Procurement spend"
            subtitle="Purchase order value over the last 12 months"
            className="xl:col-span-2"
            action={
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Total
                </p>
                <p className="text-sm font-extrabold text-navy">{formatFrw(spendTotal)}</p>
              </div>
            }
          >
            {monthlySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlySpending} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fcb038" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#fcb038" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatFrwCompact(Number(value))}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      boxShadow: '0 12px 30px -18px rgba(0,4,53,0.4)',
                    }}
                    formatter={(value) => [formatFrw(Number(value)), 'Spend']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#000435"
                    strokeWidth={2.5}
                    fill="url(#spendGradient)"
                    activeDot={{ r: 5, fill: '#fcb038', stroke: '#000435', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint message="No purchase order spending recorded yet." />
            )}
          </SectionCard>

          <SectionCard
            title="Order status"
            subtitle={`${ordersTotal} purchase orders`}
            action={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <TrendingUp className="h-3 w-3" /> Live
              </span>
            }
          >
            {statusData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [`${Number(value)} orders`, String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate text-slate-600">{entry.name}</span>
                      <span className="ml-auto font-bold text-navy">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyHint message="No purchase orders created yet." />
            )}

            <div className="mt-4 rounded-xl bg-navy p-3.5 text-white">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-white/55">
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-[#fcb038]" /> Budget used
                </span>
                <span className="text-[#fcb038]">{d.budgetUtilization ?? 0}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#fcb038] to-[#febf10]"
                  style={{ width: `${Math.min(100, Math.max(0, d.budgetUtilization ?? 0))}%` }}
                />
              </div>
              <p className="mt-2 truncate text-[10px] text-white/45">
                {formatFrwCompact(d.totalSpent ?? 0)} of {formatFrwCompact(d.totalBudget ?? 0)}
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <SectionCard title="Top purchased items" subtitle="Most requested this year">
            {(d.topPurchasedItems ?? []).length > 0 ? (
              <div className="space-y-3">
                {d.topPurchasedItems.slice(0, 7).map((item, index) => {
                  const max = d.topPurchasedItems[0]?.totalQty || 1;
                  return (
                    <div key={`${item.itemName}-${index}`}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-navy text-[10px] font-bold text-[#fcb038]">
                            {index + 1}
                          </span>
                          <span className="truncate font-semibold text-navy">{item.itemName}</span>
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-navy">
                          {item.totalQty}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#fcb038] to-[#febf10]"
                          style={{ width: `${Math.max(6, (item.totalQty / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyHint message="No items recorded yet." />
            )}
          </SectionCard>

          <SectionCard
            title="Recent activity"
            subtitle="Approvals, orders and deliveries"
            className="xl:col-span-2"
            action={
              <span className="text-[11px] font-medium text-slate-500">
                {(d.recentActivities ?? []).length} events
              </span>
            }
          >
            {(d.recentActivities ?? []).length > 0 ? (
              <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
                {d.recentActivities.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      {log.action?.includes('ORDER') ? (
                        <ShoppingCart className="h-4 w-4" />
                      ) : log.action?.includes('RECEIV') ? (
                        <Package className="h-4 w-4" />
                      ) : log.action?.includes('REJECT') ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 border-b border-slate-100 pb-3 last:border-0">
                      <p className="truncate text-xs font-medium text-navy">
                        {log.action?.replace(/_/g, ' ').toLowerCase() || 'Activity'}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {log.userName ? `${log.userName} · ` : ''}
                        {timeAgo(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint message="No recent activity yet." />
            )}
          </SectionCard>
        </div>

        {refreshing ? (
          <p className="text-center text-[11px] text-slate-400">Refreshing dashboard…</p>
        ) : null}
      </div>
    </MainLayout>
  );
}
