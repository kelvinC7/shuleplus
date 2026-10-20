"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/shared/notifications";
import type { NotificationRow } from "./types";

const READ_KEY = "kazi-admin-notifications-read";

const TYPE_STYLES: Record<NotificationRow["type"], string> = {
  info: "border-sky-200 bg-sky-50",
  warning: "border-amber-200 bg-amber-50",
  success: "border-emerald-200 bg-emerald-50",
  danger: "border-red-200 bg-red-50",
};

const TYPE_ICON = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: ShieldAlert,
};

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

type Filter = "All" | "Unread" | "Critical" | "Activity";

export function AdminNotificationsView() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(
    () => adminApi.getNotificationsWorkspace(),
    []
  );
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | NotificationRow["type"]>("All");

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  const notifications = useMemo(() => {
    const rows = (data?.data ?? []).map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }));
    const q = search.trim().toLowerCase();
    return rows.filter((n) => {
      if (filter === "Unread" && n.read) return false;
      if (filter === "Critical" && n.type !== "danger" && n.type !== "warning") return false;
      if (filter === "Activity" && n.id.startsWith("alert-")) return false;
      if (typeFilter !== "All" && n.type !== typeFilter) return false;
      if (
        q &&
        !n.title.toLowerCase().includes(q) &&
        !n.message.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data?.data, readIds, search, filter, typeFilter]);

  const unreadCount = useMemo(
    () => (data?.data ?? []).filter((n) => !n.read && !readIds.has(n.id)).length,
    [data?.data, readIds]
  );

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    const all = new Set((data?.data ?? []).map((n) => n.id));
    setReadIds(all);
    saveReadIds(all);
    toast.success("All notifications marked as read.");
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={reload} />;

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard label="Unread" value={unreadCount} icon={<Bell />} hint="Needs attention" />
        <StatCard label="Total" value={summary?.total ?? 0} icon={<Info />} />
        <StatCard
          label="Critical / warning"
          value={summary?.critical ?? 0}
          icon={<AlertTriangle />}
          valueClassName="text-amber-700"
        />
        <StatCard label="Activity events" value={summary?.activity ?? 0} icon={<CheckCircle2 />} />
      </StatsGrid>

      <div className="hr-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10"
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="All">All</option>
            <option value="Unread">Unread</option>
            <option value="Critical">Critical</option>
            <option value="Activity">Activity</option>
          </select>
          <select
            className="input w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          >
            <option value="All">All types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="danger">Danger</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => reload()}>
            <RotateCcw size={16} />
            Refresh
          </button>
          <button type="button" className="btn-primary" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCircle2 size={16} />
            Mark all as read
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["All", "Unread", "Critical", "Activity"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === f ? "bg-navy text-white" : "bg-slate-100 text-navy hover:bg-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="hr-card p-10 text-center text-sm text-muted">No notifications match your filters.</div>
        ) : (
          notifications.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <div
                key={n.id}
                className={`hr-card flex gap-4 p-4 transition sm:p-5 ${TYPE_STYLES[n.type]} ${
                  !n.read ? "ring-2 ring-primary/25" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-navy">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-navy">{n.title}</h3>
                    {!n.read ? <span className="badge bg-primary/25 text-navy">New</span> : null}
                    <span className="badge bg-white/80 capitalize text-muted">{n.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{n.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-xs text-muted">{n.createdAt}</p>
                    {!n.read ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
                        onClick={() => markRead(n.id)}
                      >
                        Mark as read
                      </button>
                    ) : null}
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy underline-offset-2 hover:underline"
                        onClick={() => markRead(n.id)}
                      >
                        Open <ExternalLink size={12} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
