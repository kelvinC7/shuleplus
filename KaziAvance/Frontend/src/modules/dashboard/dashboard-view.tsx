"use client";

import Link from "next/link";
import { ArrowRight, Banknote, ShieldCheck, Wallet } from "lucide-react";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { useEmployeeDashboard } from "@/modules/employee/use-employee-dashboard";
import { InfoCell, SectionCard } from "@/modules/employee/section-card";
import { currency, formatDate, formatDateTime } from "@/modules/employee/types";

export function DashboardView() {
  const { dashboard, loading, error } = useEmployeeDashboard();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 px-5 py-6 text-sm text-danger">
        {error || "Unable to load dashboard."}
      </div>
    );
  }

  const f = dashboard.financialSummary;
  const emp = dashboard.employee;
  const hasActive = Boolean(dashboard.activeAdvance.advanceId);

  return (
    <div className="space-y-6">
      <SectionCard
        title={dashboard.greeting}
        description={`Updated ${formatDateTime(dashboard.now)}`}
        action={
          <Link
            href="/request"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy transition hover:brightness-105"
          >
            Request advance
            <ArrowRight size={16} />
          </Link>
        }
      >
        <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
          <InfoCell label="Employee ID" value={emp.id} />
          <InfoCell label="Department" value={emp.department || "—"} />
          <InfoCell label="Position" value={emp.position || "—"} />
          <InfoCell
            label="Phone"
            value={emp.phone?.trim() ? emp.phone : "—"}
          />
        </div>
      </SectionCard>

      <StatsGrid columns={4}>
        <StatCard
          label="Net Salary"
          value={currency(f.salary.net)}
          delta={f.salary.gross ? `Gross ${currency(f.salary.gross)}` : "From Payroll / admin"}
          icon={<Banknote size={20} />}
        />
        <StatCard
          label="Available Limit"
          value={currency(f.advance.availableLimit)}
          delta={`Max ${currency(f.advance.maxEligibleAmount)}`}
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Outstanding"
          value={currency(f.advance.outstandingBalance)}
          delta={
            f.repayment.remainingInstallments
              ? `${f.repayment.remainingInstallments} installments left`
              : "No active balance"
          }
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Eligibility"
          value={dashboard.eligibility.status}
          delta={`Score ${dashboard.eligibility.score}/100`}
          icon={<ShieldCheck size={20} />}
        />
      </StatsGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Eligibility"
          description={
            dashboard.eligibility.status === "Eligible"
              ? "You can apply for a salary advance"
              : "Advance access is currently restricted"
          }
        >
          <ul className="space-y-2">
            {dashboard.eligibility.reasons.map((reason) => (
              <li key={reason} className="rounded-xl bg-[#F6F7FA] px-3 py-2 text-sm text-navy/70">
                {reason}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Active advance"
          description={hasActive ? dashboard.activeAdvance.status : "No active advance"}
          action={
            <Link href="/advances" className="text-sm font-semibold text-primary hover:underline">
              Details
            </Link>
          }
        >
          {hasActive ? (
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Advance ID" value={dashboard.activeAdvance.advanceId} />
              <InfoCell
                label="Approved"
                value={currency(dashboard.activeAdvance.approvedAmount)}
              />
              <InfoCell
                label="Balance"
                value={currency(dashboard.activeAdvance.currentBalance)}
              />
              <InfoCell
                label="Next deduction"
                value={formatDate(f.repayment.nextDeductionDate)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">
              When an advance is approved, the balance and repayment schedule appear here.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
