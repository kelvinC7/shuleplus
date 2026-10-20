'use client';

import Link from 'next/link';
import { FileText, Plus, TrendingUp, Users, Zap } from 'lucide-react';

import {
  BudgetBarChart,
  EnrollmentAreaChart,
  ExpensesDonutChart,
  RevenueChart,
} from '@/components/charts';
import { StatCard, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QUICK_ACTIONS } from '@/config/navigation';
import { RECENT_ACTIVITY } from '@/data/mock';
import { useAuth } from '@/contexts/auth-context';

export function DashboardView() {
  const { summary } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{summary ? `, ${summary.organizationName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening in your tenant today.</p>
        </div>
        <Link
          href="/records/new"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-primary to-[#e8a02a] px-2.5 text-sm font-medium text-primary-foreground shadow-glow-primary"
        >
          <Plus className="size-4" />
          New Record
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Records" value={summary?.recordCount ?? '—'} icon={<FileText />} trend={{ value: '+12', direction: 'up' }} description="this month" />
        <StatCard title="Active Users" value="24" icon={<Users />} trend={{ value: '+3', direction: 'up' }} description="licensed" />
        <StatCard title="Reports Generated" value={summary?.reportCount ?? '—'} icon={<TrendingUp />} description="all time" />
        <StatCard title="Tenant Status" value={<StatusBadge status={summary?.status ?? 'Active'} />} icon={<Zap />} description="isolation active" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <BudgetBarChart />
        <ExpensesDonutChart />
        <EnrollmentAreaChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-start gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                <div className="mt-0.5 size-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{item.user}</span> {item.action}{' '}
                    <span className="font-medium">{item.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/8 hover:text-primary"
              >
                <action.icon className="size-4 text-primary" />
                {action.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
