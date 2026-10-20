import Link from "next/link";
import { BarChart3, Layout, PanelLeft, Rows3 } from "lucide-react";

import { PageTitle, SecondaryText } from "@/components/typography";

const SECTIONS = [
  {
    href: "/design/headers",
    title: "Page Headers",
    description:
      "Global dashboard header with search, notifications, and user profile.",
    icon: Layout,
    color: "bg-primary/12 text-primary",
  },
  {
    href: "/design/module-headers",
    title: "Module Headers",
    description:
      "Module-level headers with back nav, breadcrumbs, and action buttons.",
    icon: Rows3,
    color: "bg-violet-500/12 text-violet-600",
  },
  {
    href: "/design/charts",
    title: "Charts Design",
    description: "Revenue, budget, expenses, and enrollment chart cards.",
    icon: BarChart3,
    color: "bg-info/12 text-info",
  },
  {
    href: "/design/sidebar",
    title: "Sidebar",
    description: "Light, dark, and compact sidebar navigation layouts.",
    icon: PanelLeft,
    color: "bg-emerald-500/12 text-emerald-600",
  },
];

export default function DesignHubPage() {
  return (
    <div className="space-y-8">
      <div>
        <PageTitle>ShulePlus Design System</PageTitle>
        <SecondaryText className="mt-2">
          Enterprise UI patterns for every microservice - headers, charts, and
          navigation.
        </SecondaryText>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-[16px] border border-border/60 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
          >
            <div
              className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl ${section.color}`}
            >
              <section.icon className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.description}
            </p>
            <p className="mt-4 text-xs font-semibold text-primary">
              View demo →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
