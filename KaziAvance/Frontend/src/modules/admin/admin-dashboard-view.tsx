"use client";

import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Clock,
  Wallet,
  TrendingUp,
  Percent,
  ArrowRight,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard-kpi-card";
import { StatsGrid } from "@/components/stat-card";
import {
  ChartCard,
  BarChart,
  StackedBarChart,
  LineChart,
  DonutChart,
  PRIMARY,
} from "@/components/charts/kazi-charts";
import { formatRwf } from "@/config/org-admin-nav";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";

export function AdminDashboardView() {
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getDashboard(), []);

  if (loading) return <PageLoader />;
  if (error || !data) return <PageError message={error ?? "Unable to load dashboard"} onRetry={reload} />;

  const { kpis } = data;

  return (
    <div className="space-y-6">
      <div className="hr-card p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Organization admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy sm:text-3xl">
          {data.organizationName ? `${data.organizationName} · ` : ""}
          KaziAdvance Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Monitor advance access, requests, financials, and recovery performance in one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.hasHrIntegration ? (
            <span className="badge bg-emerald-100 text-emerald-800">HR sync active</span>
          ) : (
            <span className="badge bg-amber-100 text-amber-800">Standalone employee management</span>
          )}
          {data.hasPayrollIntegration ? (
            <span className="badge bg-sky-100 text-sky-800">Payroll integration active</span>
          ) : (
            <span className="badge bg-slate-100 text-slate-700">Manual salary entry</span>
          )}
        </div>
      </div>

      <StatsGrid columns={3}>
        <DashboardKpiCard
          eyebrow="Total Employees"
          value={kpis.totalEmployees}
          description="Employees on roster"
          icon={<Users size={18} />}
          menuTitle="Workforce"
          rows={[
            { label: "Total employees", value: kpis.totalEmployees, hint: "Full roster" },
            { label: "Eligible access", value: kpis.eligibleEmployees },
            { label: "Blocked access", value: kpis.blockedEmployees },
          ]}
          footerHref="/org-admin/employees"
          footerLabel="Manage employees"
        />

        <DashboardKpiCard
          eyebrow="Advance Access"
          value={kpis.eligibleEmployees}
          description="Employees can request advances"
          icon={<ShieldCheck size={18} />}
          menuTitle="Advance Access"
          rows={[
            { label: "Eligible", value: kpis.eligibleEmployees, hint: "Can request advances" },
            {
              label: "Approved",
              value: kpis.approvedAccessEmployees ?? kpis.eligibleEmployees,
              hint: "Employees approved to request advances",
            },
            { label: "Blocked", value: kpis.blockedEmployees, hint: "Employees denied access" },
            { label: "Rejected", value: kpis.rejectedRequests, hint: "Requests rejected" },
          ]}
          footerHref="/org-admin/employees"
          footerLabel="Manage Access"
        />

        <DashboardKpiCard
          eyebrow="Advance Requests"
          value={kpis.pendingRequests}
          description="Awaiting approval"
          icon={<Clock size={18} />}
          menuTitle="Advance Requests"
          rows={[
            { label: "Pending", value: kpis.pendingRequests, hint: "Awaiting review" },
            { label: "Active", value: kpis.activeAdvances, hint: "Currently running" },
            {
              label: "Completed",
              value: kpis.completedAdvances ?? 0,
              hint: "Fully paid",
            },
            {
              label: "Cancelled",
              value: kpis.cancelledRequests ?? 0,
              hint: "Withdrawn or cancelled",
            },
          ]}
          footerHref="/org-admin/requests"
          footerLabel="Manage Requests"
        />

        <DashboardKpiCard
          eyebrow="Financial Summary"
          value={formatRwf(kpis.outstandingBalance)}
          description="Outstanding balance"
          icon={<Wallet size={18} />}
          menuTitle="Financial Summary"
          rows={[
            { label: "Outstanding", value: formatRwf(kpis.outstandingBalance) },
            {
              label: "Disbursed",
              value: formatRwf(kpis.disbursedAllTime ?? kpis.disbursedThisMonth),
              hint: "All-time disbursed",
            },
            {
              label: "Recovered",
              value: formatRwf(kpis.recoveredAllTime ?? kpis.recoveredThisMonth),
              hint: "Payroll deductions received",
            },
            {
              label: "Remaining",
              value: formatRwf(kpis.remainingBalance ?? kpis.outstandingBalance),
            },
          ]}
          footerHref="/org-admin/repayments"
          footerLabel="View Reports"
        />

        <DashboardKpiCard
          eyebrow="Monthly Analytics"
          value={kpis.requestsThisMonth ?? data.monthlyRequests.at(-1)?.value ?? 0}
          description="Requests this month"
          icon={<TrendingUp size={18} />}
          menuTitle="Monthly Analytics"
          rows={[
            { label: "Today's requests", value: kpis.requestsToday ?? 0 },
            { label: "This week", value: kpis.requestsThisWeek ?? 0 },
            { label: "This month", value: kpis.requestsThisMonth ?? 0 },
            { label: "Last month", value: kpis.requestsLastMonth ?? 0 },
          ]}
          footerHref="/org-admin/requests"
          footerLabel="View Analytics"
        />

        <DashboardKpiCard
          eyebrow="Recovery Rate"
          value={`${kpis.recoveryRate ?? 0}%`}
          description="Successful payroll deductions"
          icon={<Percent size={18} />}
          menuTitle="Recovery Statistics"
          rows={[
            { label: "Recovery rate", value: `${kpis.recoveryRate ?? 0}%` },
            {
              label: "Payroll success",
              value: `${kpis.payrollSuccessRate ?? kpis.recoveryRate ?? 0}%`,
            },
            { label: "Failed recoveries", value: kpis.failedRecoveries ?? 0 },
            { label: "Overdue payments", value: kpis.overduePayments ?? 0 },
          ]}
          footerHref="/org-admin/repayments"
          footerLabel="View Reports"
        />
      </StatsGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Monthly Advance Requests"
          subtitle="Submitted applications over time"
          metric={`${kpis.requestsThisMonth ?? data.monthlyRequests.at(-1)?.value ?? 0} this month`}
        >
          <BarChart data={data.monthlyRequests} color={PRIMARY} />
        </ChartCard>
        <ChartCard title="Approval vs Rejection Rate" subtitle="Monthly decision breakdown">
          <StackedBarChart approved={data.approvalRate.approved} rejected={data.approvalRate.rejected} />
        </ChartCard>
        <ChartCard
          title="Outstanding Balance Trend"
          subtitle="Total remaining across all advances"
          metric={formatRwf(kpis.outstandingBalance)}
        >
          <LineChart
            data={data.outstandingTrend}
            valueFormatter={(v) => formatRwf(Math.round(v))}
          />
        </ChartCard>
        <ChartCard title="Department Usage Analysis" subtitle="Active advances by department">
          <DonutChart
            segments={
              data.departmentUsage.length
                ? data.departmentUsage
                : [{ label: "None", value: 1, color: "#e2e8f0" }]
            }
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/org-admin/requests", label: "Review Requests", count: kpis.pendingRequests },
          { href: "/org-admin/employees", label: "Manage Employees", count: kpis.totalEmployees },
          { href: "/org-admin/active-advances", label: "Active Advances", count: kpis.activeAdvances },
          { href: "/org-admin/repayments", label: "Repayment Tracking", count: kpis.activeAdvances },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="hr-card hr-card-hover group flex items-center justify-between p-5"
          >
            <div>
              <p className="text-xl font-semibold text-navy">{action.count}</p>
              <p className="mt-1 text-sm font-medium text-navy/80">{action.label}</p>
            </div>
            <ArrowRight
              size={18}
              className="text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
