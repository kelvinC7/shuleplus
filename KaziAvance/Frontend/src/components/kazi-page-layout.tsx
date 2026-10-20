"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface KaziKpi {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  iconClass?: string;
}

interface KaziPageLayoutProps {
  actions?: ReactNode;
  kpis?: KaziKpi[];
  children: ReactNode;
}

export function KaziPageLayout({ actions, kpis, children }: KaziPageLayoutProps) {
  return (
    <div className="space-y-5">
      {kpis && kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_8px_24px_-16px_rgba(0,4,53,0.2)] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{kpi.value}</p>
                    {kpi.hint ? <p className="mt-1 text-xs text-muted">{kpi.hint}</p> : null}
                  </div>
                  {Icon ? (
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${kpi.iconClass ?? "bg-navy/10 text-navy"}`}>
                      <Icon size={18} />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{actions}</div> : null}
      {children}
    </div>
  );
}
