'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Receipt, Banknote, Wallet } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingScreen } from '@/components/shared/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { formatRwf, formatDateTime } from '@/lib/format';
import type { Sale } from '@/types';

interface SalesReport {
  count: number;
  total: number;
  sales: Sale[];
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

const COLORS = ['#fcb038', '#000435', '#10b981', '#0ea5e9', '#f43f5e', '#8b5cf6', '#f59e0b', '#14b8a6'];

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const qs = new URLSearchParams();
  if (from) qs.set('from', new Date(from).toISOString());
  if (to) qs.set('to', new Date(to).toISOString());

  const { data: sales, loading } = useApi<SalesReport>(`/reports/sales?${qs.toString()}`);
  const { data: topItems } = useApi<TopItem[]>('/reports/top-menu-items');
  const { data: cashouts } = useApi<{ count: number; total: number }>('/reports/cashouts');
  const { data: wallets } = useApi<{ count: number; totalBalance: number }>('/reports/wallets');

  if (loading) return <LoadingScreen label="Loading reports…" />;

  const chartData = topItems?.slice(0, 8).map((t) => ({ name: t.name, qty: t.quantity })) ?? [];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, menu performance and wallet analytics."
        actions={
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2" />
            <span className="text-muted">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2" />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Sales (range)" value={sales?.count ?? 0} icon={Receipt} />
        <StatCard title="Revenue (range)" value={formatRwf(sales?.total ?? 0)} icon={TrendingUp} accent="success" />
        <StatCard title="Cashouts requested" value={formatRwf(cashouts?.total ?? 0)} icon={Banknote} accent="warning" />
        <StatCard title="Wallet balances" value={formatRwf(wallets?.totalBalance ?? 0)} icon={Wallet} accent="info" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top menu items by quantity</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#fcb038" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Menu share</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={chartData} dataKey="qty" nameKey="name" innerRadius={60} outerRadius={100} label>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top sellers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH>Quantity sold</TH>
                <TH>Revenue</TH>
              </TR>
            </THead>
            <TBody>
              {(topItems ?? []).map((t) => (
                <TR key={t.name}>
                  <TD className="font-medium text-navy">{t.name}</TD>
                  <TD>{t.quantity}</TD>
                  <TD className="font-semibold">{formatRwf(t.revenue)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sales in range</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Amount</TH>
                <TH>When</TH>
              </TR>
            </THead>
            <TBody>
              {(sales?.sales ?? []).map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-navy">{s.studentName}</TD>
                  <TD className="font-semibold">{formatRwf(s.amount)}</TD>
                  <TD className="text-muted">{formatDateTime(s.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
