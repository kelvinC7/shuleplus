"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Download,
  Percent,
  Wallet,
} from "lucide-react";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { InfoCell, SectionCard } from "@/modules/employee/section-card";
import { currency, formatDate } from "@/modules/employee/types";
import { useEmployeeDashboard } from "@/modules/employee/use-employee-dashboard";
import { apiFetch } from "@/lib/api";
import { downloadAuthenticated } from "@/lib/download";

type HistoryRow = {
  id: string;
  requestNo: string;
  amount: number;
  purpose: string;
  description?: string | null;
  months: number;
  date: string;
  status: string;
  monthlyDeduction?: number | null;
  remainingBalance?: number | null;
};

export function AdvancesView() {
  const { dashboard, loading, error } = useEmployeeDashboard();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: HistoryRow[] }>("/api/employee/advance-history")
      .then((res) => {
        if (!cancelled) setHistory(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err instanceof Error ? err.message : "Failed to load history");
      });
    return () => {
      cancelled = true;
    };
  }, [dashboard?.now]);

  async function handleDownload(id: string, requestNo: string) {
    setDownloadingId(id);
    try {
      await downloadAuthenticated(
        `/api/advance/requests/${id}/receipt`,
        `advance-receipt-${requestNo}.html`
      );
    } catch {
      /* ignore — table stays usable */
    } finally {
      setDownloadingId(null);
    }
  }

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
        {error || "Unable to load advances."}
      </div>
    );
  }

  const a = dashboard.activeAdvance;
  const hasActive = Boolean(a.advanceId);
  const paidCount = dashboard.installments.filter((i) => i.status === "Paid").length;
  const upcoming = dashboard.installments.find((i) => i.status === "Upcoming");
  const progress = Math.min(100, Math.max(0, a.completionPercent ?? 0));

  return (
    <div className="space-y-6">
      <SectionCard
        title="My Advances"
        description="Track requests, balances, and repayment progress"
        action={
          <Link
            href="/request"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy transition hover:brightness-105"
          >
            New request
            <ArrowRight size={16} />
          </Link>
        }
      >
        <div className="rounded-2xl bg-gradient-to-br from-navy via-[#12164a] to-[#1a1f5c] p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/90">
                {hasActive ? "Active advance" : "No active advance"}
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight">
                {hasActive ? a.advanceId : "You’re clear"}
              </h3>
              <p className="mt-1 text-sm text-white/60">
                {hasActive
                  ? `Status · ${a.status}`
                  : "Request a salary advance when you need short-term support."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                hasActive ? "bg-primary/20 text-primary" : "bg-white/10 text-white/70"
              }`}
            >
              {hasActive ? a.status : "Idle"}
            </span>
          </div>

          {hasActive ? (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                <span>Repayment progress</span>
                <span className="font-semibold text-white">{progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-amber-300 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <StatsGrid columns={4}>
        <StatCard
          label="Approved Amount"
          value={hasActive ? currency(a.approvedAmount) : "—"}
          delta={hasActive ? formatDate(a.approvalDate) : "No approval yet"}
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Current Balance"
          value={hasActive ? currency(a.currentBalance) : "—"}
          delta={hasActive ? "Outstanding" : "Nothing owed"}
          icon={<CircleDot size={20} />}
        />
        <StatCard
          label="Interest Rate"
          value={hasActive ? `${a.interestRate}%` : "—"}
          delta={hasActive ? `${a.repaymentPeriodMonths} months` : "N/A"}
          icon={<Percent size={20} />}
        />
        <StatCard
          label="Installments Paid"
          value={`${paidCount}/${dashboard.installments.length || 0}`}
          delta={upcoming ? `Next ${formatDate(upcoming.date)}` : "No schedule"}
          icon={<CalendarClock size={20} />}
        />
      </StatsGrid>

      <SectionCard title="Request history" description="All your advance requests with status and receipt">
        {historyError ? (
          <p className="text-sm text-danger">{historyError}</p>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/15 px-5 py-10 text-center">
            <p className="font-semibold text-navy">No requests yet</p>
            <p className="mt-1 text-sm text-muted">Submit a salary advance to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-navy/[0.06]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F6F7FA] text-[11px] font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Request #</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-navy/[0.05]">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{row.requestNo}</td>
                    <td className="px-4 py-3 font-semibold text-navy">{currency(row.amount)}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-[180px] truncate text-navy/80">{row.purpose}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.date}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={downloadingId === row.id}
                        onClick={() => void handleDownload(row.id, row.requestNo)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionCard title="Advance details" description="Key terms for your current advance">
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Advance ID" value={a.advanceId || "—"} />
              <InfoCell
                label="Disbursed"
                value={a.disbursedAmount ? currency(a.disbursedAmount) : "—"}
              />
              <InfoCell
                label="Approval date"
                value={a.approvalDate ? formatDate(a.approvalDate) : "—"}
              />
              <InfoCell
                label="Period"
                value={a.repaymentPeriodMonths ? `${a.repaymentPeriodMonths} months` : "—"}
              />
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-3">
          <SectionCard title="Repayment tracker" description="Upcoming and completed installments">
            <div className="space-y-2.5">
              {dashboard.installments.map((item) => {
                const isPaid = item.status === "Paid";
                const isUpcoming = item.status === "Upcoming";
                return (
                  <div
                    key={item.name}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-navy/[0.05] bg-[#F8F9FB] px-4 py-3.5"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-700"
                          : isUpcoming
                            ? "bg-primary/15 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isPaid ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy">{item.name}</p>
                      <p className="text-xs text-muted">{formatDate(item.date)}</p>
                    </div>
                    <p className="text-sm font-bold text-navy">{currency(item.amount)}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : isUpcoming
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
              {dashboard.installments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-navy/15 px-5 py-10 text-center">
                  <p className="font-semibold text-navy">No repayment schedule yet</p>
                  <p className="mt-1 text-sm text-muted">
                    When an advance is approved, installments will appear here.
                  </p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
