'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  School,
  Store,
  Wallet,
  Receipt,
  Banknote,
  Menu,
  PackageSearch,
  Bell,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api, getData } from '@/services/api';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingScreen } from '@/components/shared/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { DashboardData, Sale } from '@/types';

export default function DashboardPage() {
  const { role, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData<DashboardData>('/dashboard')
      .then(setData)
      .catch((err: unknown) =>
        toast.error((err as { message?: string })?.message ?? 'Could not load dashboard')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen label="Loading dashboard…" />;

  const platform = data?.scope === 'platform';

  return (
    <div>
      <PageHeader
        title={platform ? 'Platform overview' : 'Canteen dashboard'}
        description={
          platform
            ? 'Everything happening across all canteens on the platform.'
            : `Welcome back, ${user?.email ?? ''}. Here is how your canteen is doing.`
        }
      />

      {platform ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Active canteens" value={data?.counts.canteens ?? 0} icon={School} />
          <StatCard title="Suppliers" value={data?.counts.suppliers ?? 0} icon={Store} />
          <StatCard title="Pending approvals" value={data?.counts.pendingSuppliers ?? 0} icon={Users} accent="warning" />
          <StatCard title="Student wallets" value={data?.counts.wallets ?? 0} icon={Wallet} accent="info" />
          <StatCard title="Total sales" value={data?.counts.sales ?? 0} icon={Receipt} accent="success" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Sales today"
            value={data?.counts.salesToday ?? 0}
            icon={Receipt}
            accent="success"
            hint={`${data?.counts.sales ?? 0} all time`}
          />
          <StatCard
            title="Wallet balance"
            value={formatRwf(data?.counts.totalBalance ?? 0)}
            icon={Wallet}
            accent="info"
            hint={`${data?.counts.wallets ?? 0} student wallets`}
          />
          <StatCard title="Menu items" value={data?.counts.menuItems ?? 0} icon={Menu} />
          <StatCard
            title="Pending orders"
            value={data?.counts.pendingOrders ?? 0}
            icon={PackageSearch}
            accent="warning"
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent sales</CardTitle>
            <Link href="/app/reports" className="text-sm text-primary hover:underline">
              View reports
            </Link>
          </CardHeader>
          <CardContent>
            {(data?.recentSales?.length ?? 0) === 0 ? (
              <EmptyState title="No sales yet" description="Sales made at the POS will appear here." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Student</TH>
                    <TH>Items</TH>
                    <TH>Amount</TH>
                    <TH>When</TH>
                  </TR>
                </THead>
                <TBody>
                  {data?.recentSales?.map((sale: Sale) => (
                    <TR key={sale.id}>
                      <TD className="font-medium text-navy">{sale.studentName}</TD>
                      <TD>{Array.isArray(sale.items) ? sale.items.map((i) => i.name).join(', ') : '—'}</TD>
                      <TD className="font-semibold">{formatRwf(sale.amount)}</TD>
                      <TD className="text-muted">{formatDateTime(sale.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {platform ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest canteens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.canteens?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">{c.organizationName}</p>
                      <p className="text-xs text-muted">{c.schoolCode ?? c.organizationCode ?? '—'}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Notifications</CardTitle>
                  <Link href="/app/notifications" className="text-sm text-primary hover:underline">
                    View all
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(data?.notifications?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted">You are all caught up.</p>
                  ) : (
                    data?.notifications?.map((n) => (
                      <div key={n.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-navy">{n.title}</p>
                        <p className="text-xs text-muted">{n.message}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Latest transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data?.recentTransactions?.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className={t.type === 'CREDIT' ? 'text-emerald-600' : 'text-danger'}>
                        {t.type === 'CREDIT' ? '+' : '−'} {formatRwf(t.amount)}
                      </span>
                      <span className="text-xs text-muted">{formatDateTime(t.createdAt)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
