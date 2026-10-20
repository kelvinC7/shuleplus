'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/layouts/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { procurementApi } from '@/services/procurement-api';
import type { PurchaseRequest } from '@/types';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading } from '@/components/list-ui';
import {
  FileText, ShoppingCart, Truck,
  Package, CheckCircle, XCircle,
  Clock, BarChart3, Users, Plus,
} from 'lucide-react';
import { formatFrw } from '@/utils/currency';
import { AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PlatformPageLayout } from '@/components/platform-page-layout';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  DEPARTMENT_HEAD_APPROVED: 'Dept. Approved',
  FINANCE_APPROVED: 'Finance Approved',
  PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Fully Approved',
  REJECTED: 'Rejected',
  CONVERTED_TO_PO: 'Ordered',
  CANCELLED: 'Cancelled',
};

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

  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const approved = requests.filter((r) =>
    ['MD_APPROVED', 'CONVERTED_TO_PO', 'DEPARTMENT_HEAD_APPROVED', 'FINANCE_APPROVED', 'PROCUREMENT_APPROVED'].includes(r.status),
  ).length;
  const items = requests.reduce((n, r) => n + (r.items?.length ?? r._count?.items ?? 0), 0);

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Your purchase requests at a glance. Create and track requests submitted by you."
        actions={
          <button type="button" onClick={() => router.push('/purchase-requests')} className="btn-primary">
            <Plus className="h-4 w-4" /> New Request
          </button>
        }
        kpis={[
          { label: 'My Requests', value: requests.length, icon: <FileText size={20} /> },
          { label: 'Pending', value: pending, icon: <Clock size={20} />, valueClassName: 'text-amber-600' },
          { label: 'Approved', value: approved, icon: <CheckCircle size={20} />, valueClassName: 'text-emerald-600' },
          { label: 'Items Requested', value: items, icon: <Package size={20} /> },
        ]}
      >
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-navy">Recent Requests</h2>
            <button
              type="button"
              onClick={() => router.push('/purchase-requests')}
              className="text-xs font-semibold text-[#fcb038] hover:underline"
            >
              View all →
            </button>
          </div>
          {requests.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted">You have not submitted any purchase requests yet.</p>
              <button
                type="button"
                onClick={() => router.push('/purchase-requests')}
                className="btn-primary mt-4"
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {requests.slice(0, 8).map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => router.push('/purchase-requests')}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-navy">{pr.prNumber}</p>
                    <p className="text-xs text-muted">
                      {pr.departmentOther || pr.department?.name || '—'} ·{' '}
                      {new Date(pr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {STATUS_LABELS[pr.status] ?? pr.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-[#fcb038]/25 bg-[#fcb038]/10 px-5 py-4 text-sm text-navy">
          Signed in as <span className="font-semibold">{user?.email ?? 'Module User'}</span>.
          You can create purchase requests and track their approval status here.
        </div>
      </PlatformPageLayout>
    </MainLayout>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

const ACTION_ICONS: Record<string, any> = {
  PR_CREATED: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  PR_APPROVED: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  PR_REJECTED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  PO_CREATED: { icon: ShoppingCart, color: 'text-purple-500', bg: 'bg-purple-50' },
  PO_SENT: { icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50' },
  GOODS_RECEIVED: { icon: Package, color: 'text-teal-500', bg: 'bg-teal-50' },
  PR_CANCELLED: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
};

function describeActivity(action: string, metadata: any): string {
  switch (action) {
    case 'PR_CREATED': return `Purchase Request ${metadata?.prNumber || ''} submitted`;
    case 'PR_APPROVED': return `PR approved at ${metadata?.stage || 'a stage'}`;
    case 'PR_REJECTED': return `PR rejected: ${metadata?.reason || 'No reason'}`;
    case 'PO_CREATED': return `Purchase Order ${metadata?.poNumber || ''} created`;
    case 'PO_SENT': return `PO sent to supplier`;
    case 'GOODS_RECEIVED': return `Goods received via ${metadata?.grnNumber || 'GRN'}`;
    case 'PR_CANCELLED': return `Purchase Request cancelled`;
    default: return action?.replace(/_/g, ' ').toLowerCase() || 'Unknown activity';
  }
}

export default function DashboardPage() {
  const { summary, isSupervisor, isManageUser } = useAuth();
  const router = useRouter();

  if (isManageUser) {
    return <ManageUserDashboard />;
  }

  if (!summary) {
    return (
      <MainLayout>
        <PageLoading label="Loading dashboard…" />
      </MainLayout>
    );
  }

  const d = summary;

  const kpiCards = [
    { label: 'Total PRs', value: d.totalPRs, icon: <FileText size={20} strokeWidth={1.75} />, href: '/purchase-requests', change: d.prChange },
    { label: 'Pending Approvals', value: d.pendingApprovals, icon: <Clock size={20} strokeWidth={1.75} />, href: '/purchase-requests', alert: d.pendingApprovals > 0 },
    { label: 'Approved Orders', value: d.approvedOrders, icon: <CheckCircle size={20} strokeWidth={1.75} />, href: '/purchase-requests' },
    { label: 'Purchase Orders', value: d.poIssued, icon: <ShoppingCart size={20} strokeWidth={1.75} />, href: '/purchase-orders' },
    { label: 'Suppliers', value: d.totalSuppliers, icon: <Users size={20} strokeWidth={1.75} />, href: '/suppliers' },
  ];

  const monthlyData = d.monthlySpending.map(m => ({
    name: m.month,
    spending: m.total,
  }));

  const deptData = d.spendingByDepartment.map(d => ({
    name: d.department,
    value: d.total,
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <p className="text-sm text-muted">
          Overview of purchase requests, orders, and suppliers.
        </p>

        <StatsGrid columns={3} className="lg:max-w-5xl">
          {kpiCards.map((card) => (
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
                valueClassName={card.alert ? 'text-red-600' : 'text-[#000435]'}
                showTrend={card.change !== undefined}
                delta={
                  card.change !== undefined
                    ? `${card.change >= 0 ? '+' : ''}${card.change}% vs last month`
                    : undefined
                }
              />
            </button>
          ))}
        </StatsGrid>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
            <h2 className="font-semibold mb-4">Procurement Spending by Month</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatFrw(Number(value))} />
                  <Area type="monotone" dataKey="spending" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No spending data yet</p>}
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
            <h2 className="font-semibold mb-4">Spending by Department</h2>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value) => formatFrw(Number(value))} />
                  <Bar dataKey="value" fill="#000435" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No department spending data yet</p>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
            <h2 className="font-semibold mb-4">Top Purchased Items</h2>
            {d.topPurchasedItems.length > 0 ? (
              <div className="space-y-3">
                {d.topPurchasedItems.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">{item.orderCount} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{item.totalQty}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No items data yet</p>}
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)] lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Activities</h2>
              <span className="text-xs text-muted-foreground">{d.recentActivities.length} activities</span>
            </div>
            {d.recentActivities.length > 0 ? (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {d.recentActivities.map((log) => {
                  const actionStyle = ACTION_ICONS[log.action] || { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' };
                  const Icon = actionStyle.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                      <div className={`rounded-lg p-2 ${actionStyle.bg} shrink-0 mt-0.5`}>
                        <Icon className={`h-4 w-4 ${actionStyle.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{describeActivity(log.action, log.metadata)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {log.userName && <span className="text-xs text-muted-foreground">{log.userName}</span>}
                          <span className="text-xs text-muted-foreground">-</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">No recent activity</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button onClick={() => router.push('/purchase-requests')}
                className="flex items-center gap-3 rounded-xl border p-4 hover:bg-gray-50 hover:border-primary/30 transition-all text-left">
                <div className="rounded-lg bg-blue-50 p-2"><FileText className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="text-sm font-medium">New Request</p>
                  <p className="text-xs text-muted-foreground">Create PR</p>
                </div>
              </button>
              {isSupervisor ? (
                <>
                  <button onClick={() => router.push('/purchase-orders')}
                    className="flex items-center gap-3 rounded-xl border p-4 hover:bg-gray-50 hover:border-primary/30 transition-all text-left">
                    <div className="rounded-lg bg-purple-50 p-2"><ShoppingCart className="h-5 w-5 text-purple-500" /></div>
                    <div>
                      <p className="text-sm font-medium">New Order</p>
                      <p className="text-xs text-muted-foreground">Create PO</p>
                    </div>
                  </button>
                  <button onClick={() => router.push('/suppliers')}
                    className="flex items-center gap-3 rounded-xl border p-4 hover:bg-gray-50 hover:border-primary/30 transition-all text-left">
                    <div className="rounded-lg bg-indigo-50 p-2"><Users className="h-5 w-5 text-indigo-500" /></div>
                    <div>
                      <p className="text-sm font-medium">Suppliers</p>
                      <p className="text-xs text-muted-foreground">Manage vendors</p>
                    </div>
                  </button>
                  <button onClick={() => router.push('/reports')}
                    className="flex items-center gap-3 rounded-xl border p-4 hover:bg-gray-50 hover:border-primary/30 transition-all text-left">
                    <div className="rounded-lg bg-emerald-50 p-2"><BarChart3 className="h-5 w-5 text-emerald-500" /></div>
                    <div>
                      <p className="text-sm font-medium">Reports</p>
                      <p className="text-xs text-muted-foreground">View analytics</p>
                    </div>
                  </button>
                </>
              ) : null}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
