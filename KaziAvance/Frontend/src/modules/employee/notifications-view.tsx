"use client";

import { SectionCard } from "@/modules/employee/section-card";
import { useEmployeeDashboard } from "@/modules/employee/use-employee-dashboard";

export function NotificationsView() {
  const { dashboard, loading, error } = useEmployeeDashboard();

  if (loading) return <p className="text-sm text-muted">Loading notifications…</p>;
  if (error || !dashboard) {
    return <p className="text-sm text-danger">{error || "Unable to load notifications."}</p>;
  }

  return (
    <SectionCard title="Notifications Center" description="Alerts about advances and repayments">
      <div className="space-y-2">
        {dashboard.notifications.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F7FA] px-3 py-3 text-sm"
          >
            <span className="font-semibold text-navy">{item.type}</span>
            <span className="text-muted">{item.channel}</span>
            <span className={item.read ? "text-muted" : "font-semibold text-primary"}>
              {item.time}
            </span>
          </div>
        ))}
        {dashboard.notifications.length === 0 ? (
          <p className="text-sm text-muted">No notifications yet.</p>
        ) : null}
      </div>
    </SectionCard>
  );
}
