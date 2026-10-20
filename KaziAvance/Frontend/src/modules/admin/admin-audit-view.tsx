"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Download,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { BarChart, ChartCard, PRIMARY } from "@/components/charts/kazi-charts";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/shared/notifications";
import type { AuditLogRow } from "./types";

const CATEGORY_STYLES: Record<NonNullable<AuditLogRow["category"]>, string> = {
  info: "bg-sky-100 text-sky-800",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-800",
};

function exportCsv(rows: AuditLogRow[]) {
  const header = ["User", "Action", "Target", "Category", "Timestamp"];
  const lines = rows.map((r) =>
    [r.user, r.action, r.target, r.category ?? "", r.timestamp]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaziavance-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAuditView() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getAuditWorkspace(), []);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("All");
  const [user, setUser] = useState("All");
  const [category, setCategory] = useState("All");
  const [range, setRange] = useState<"All" | "Today" | "Week" | "Month">("All");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    const rows = data?.data ?? [];
    const q = search.trim().toLowerCase();
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return rows.filter((r) => {
      if (action !== "All" && r.action !== action) return false;
      if (user !== "All" && r.user !== user) return false;
      if (category !== "All" && (r.category ?? "info") !== category) return false;
      if (range !== "All") {
        const t = new Date(r.createdAt ?? r.timestamp);
        if (range === "Today" && t < dayStart) return false;
        if (range === "Week" && t < weekStart) return false;
        if (range === "Month" && t < monthStart) return false;
      }
      if (
        q &&
        !r.user.toLowerCase().includes(q) &&
        !r.action.toLowerCase().includes(q) &&
        !r.target.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data?.data, search, action, user, category, range]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (loading && !data) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={reload} />;

  const s = data!.summary;

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard label="Total events" value={s.total} icon={<ClipboardList />} />
        <StatCard label="Today" value={s.today} icon={<ShieldCheck />} hint={`${s.thisWeek} this week`} />
        <StatCard label="Unique users" value={s.uniqueUsers} icon={<Users />} />
        <StatCard
          label="Approvals logged"
          value={s.approvals}
          icon={<CheckIcon />}
          hint={`${s.policyChanges} policy changes`}
        />
      </StatsGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Activity (14 days)" subtitle="Admin actions per day">
            <BarChart data={data!.daily} color={PRIMARY} height={200} />
          </ChartCard>
        </div>
        <ChartCard title="Top actions" subtitle="Most frequent events">
          <div className="space-y-2 py-1">
            {data!.topActions.length === 0 ? (
              <p className="text-sm text-muted">No actions yet.</p>
            ) : (
              data!.topActions.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-navy">{item.label}</span>
                  <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
                    {item.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div className="hr-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10"
              placeholder="Search user, action, or target…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <label className="text-xs font-semibold text-muted">
            Action
            <select
              className="input mt-1 w-auto min-w-[140px]"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All actions</option>
              {data!.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            User
            <select
              className="input mt-1 w-auto min-w-[140px]"
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All users</option>
              {data!.users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Category
            <select
              className="input mt-1 w-auto"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Range
            <select
              className="input mt-1 w-auto"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as typeof range);
                setPage(1);
              }}
            >
              <option value="All">All time</option>
              <option value="Today">Today</option>
              <option value="Week">Last 7 days</option>
              <option value="Month">This month</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch("");
              setAction("All");
              setUser("All");
              setCategory("All");
              setRange("All");
              setPage(1);
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (filtered.length === 0) {
                toast.error("No audit rows to export.");
                return;
              }
              exportCsv(filtered);
              toast.success("Audit log exported.");
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="hr-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Date & time</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const cat = r.category ?? "info";
                  return (
                    <tr key={r.id} className="border-t border-border/70 hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-navy">{r.user}</td>
                      <td className="px-4 py-3 font-semibold text-navy">{r.action}</td>
                      <td className="px-4 py-3 text-muted">{r.target}</td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize ${CATEGORY_STYLES[cat]}`}>{cat}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.timestamp}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted">
            {filtered.length} event{filtered.length === 1 ? "" : "s"} · page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return <ShieldCheck size={20} />;
}
