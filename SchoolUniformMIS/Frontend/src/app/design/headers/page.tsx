import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageTitle,
  SecondaryText,
  SectionTitle,
} from "@/components/typography";

export const metadata = {
  title: "Page Headers - Design System",
};

export default function HeadersPage() {
  return (
    <div className="space-y-8">
      <div>
        <PageTitle>Page Headers</PageTitle>
        <SecondaryText className="mt-2">
          Global dashboard top bar - search, notifications, messages, and user
          profile dropdown.
        </SecondaryText>
      </div>

      <section className="space-y-4">
        <SectionTitle>Dashboard Header</SectionTitle>
        <div className="overflow-hidden rounded-[16px] border border-border/60 bg-card shadow-soft-lg">
          <DashboardHeader />
          <div className="border-t border-border/60 bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
            Page content area
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Usage</SectionTitle>
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-card p-5 text-sm text-foreground shadow-soft">
          {`import { DashboardHeader } from '@/components/layout';

<DashboardHeader
 title="Dashboard"
 breadcrumbs={['Home', 'Dashboard']}
 userName="Jean Ishimwe"
 userRole="Super Admin"
 notificationCount={8}
 messageCount={3}
/>`}
        </pre>
      </section>
    </div>
  );
}
