"use client";

import * as React from "react";

import {
  AppSidebar,
  type SidebarVariant,
} from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageTitle,
  SecondaryText,
  SectionTitle,
} from "@/components/typography";
import { MODULE_NAV } from "@/config/navigation";
import { cn } from "@/lib/utils";

const VARIANTS: { key: SidebarVariant; label: string; description: string }[] =
  [
    {
      key: "light",
      label: "Light Sidebar",
      description: "White background - default for most modules.",
    },
    {
      key: "dark",
      label: "Dark Sidebar",
      description: "Navy background - high contrast navigation.",
    },
    {
      key: "compact",
      label: "Compact Sidebar",
      description: "Icon-only - saves horizontal space.",
    },
  ];

export default function SidebarPage() {
  const [variant, setVariant] = React.useState<SidebarVariant>("light");

  return (
    <div className="space-y-8">
      <div>
        <PageTitle>Sidebar Design</PageTitle>
        <SecondaryText className="mt-2">
          Three sidebar variants - light, dark navy, and compact icon-only.
        </SecondaryText>
      </div>

      {/* Variant picker */}
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setVariant(v.key)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
              variant === v.key
                ? "border-primary bg-primary/12 text-primary shadow-soft"
                : "border-border/60 bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Live preview */}
      <section className="space-y-4">
        <SectionTitle>
          {VARIANTS.find((v) => v.key === variant)?.label}
        </SectionTitle>
        <p className="text-sm text-muted-foreground">
          {VARIANTS.find((v) => v.key === variant)?.description}
        </p>
        <div className="overflow-hidden rounded-[16px] border border-border/60 bg-card shadow-soft-lg">
          <div className="flex h-[520px]">
            <AppSidebar variant={variant} items={MODULE_NAV} />
            <div className="flex flex-1 flex-col">
              <DashboardHeader className="border-b-0 shadow-none" />
              <div className="flex flex-1 items-center justify-center bg-muted/20 text-sm text-muted-foreground">
                Main content area
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All three side by side */}
      <section className="space-y-4">
        <SectionTitle>All Variants</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-3">
          {VARIANTS.map((v) => (
            <div
              key={v.key}
              className="overflow-hidden rounded-[16px] border border-border/60 bg-card shadow-soft"
            >
              <p className="border-b border-border/60 px-4 py-2.5 text-sm font-semibold text-foreground">
                {v.label}
              </p>
              <div className="h-[400px]">
                <AppSidebar
                  variant={v.key}
                  items={MODULE_NAV}
                  className="h-full border-r-0"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-card p-5 text-sm text-foreground shadow-soft">
          {`import { AppSidebar } from '@/components/layout';

<AppSidebar variant="light" />
<AppSidebar variant="dark" />
<AppSidebar variant="compact" />`}
        </pre>
      </section>
    </div>
  );
}
