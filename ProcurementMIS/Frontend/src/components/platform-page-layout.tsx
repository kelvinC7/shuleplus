"use client";

import type { ReactNode } from "react";
import { StatCard, StatsGrid } from "@/components/stat-card";

export function PlatformPageLayout({
  subtitle,
  actions,
  kpis,
  children,
}: {
  subtitle?: string;
  actions?: ReactNode;
  kpis?: {
    label: string;
    value: string | number;
    hint?: string;
    icon?: ReactNode;
    valueClassName?: string;
  }[];
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      {(subtitle || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          {subtitle ? (
            <p className="max-w-3xl text-sm text-muted">{subtitle}</p>
          ) : (
            <span />
          )}
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      )}

      {kpis && kpis.length > 0 ? (
        <StatsGrid columns={kpis.length >= 4 ? 4 : 3}>
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              icon={kpi.icon}
              valueClassName={kpi.valueClassName}
            />
          ))}
        </StatsGrid>
      ) : null}

      {children}
    </div>
  );
}
