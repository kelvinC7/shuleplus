import {
  BudgetModuleHeader,
  ModuleHeader,
  StudentsModuleHeader,
} from '@/components/layout/module-header';
import { Button } from '@/components/ui/button';
import { PageTitle, SecondaryText, SectionTitle } from '@/components/typography';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Module Headers — Design System',
};

export default function ModuleHeadersPage() {
  return (
    <div className="space-y-8">
      <div>
        <PageTitle>Module Headers</PageTitle>
        <SecondaryText className="mt-2">
          Module-level page headers with back navigation, icon, breadcrumbs, and contextual actions.
        </SecondaryText>
      </div>

      <section className="space-y-4">
        <SectionTitle>Students Module</SectionTitle>
        <StudentsModuleHeader />
      </section>

      <section className="space-y-4">
        <SectionTitle>Budget Planning Module</SectionTitle>
        <BudgetModuleHeader />
      </section>

      <section className="space-y-4">
        <SectionTitle>Custom Module Header</SectionTitle>
        <ModuleHeader
          title="Records"
          breadcrumbs={['Home', 'Sample Module', 'Records']}
          icon={
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          actions={
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Record
            </Button>
          }
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Usage</SectionTitle>
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-card p-5 text-sm text-foreground shadow-soft">
{`import { StudentsModuleHeader, BudgetModuleHeader, ModuleHeader } from '@/components/layout';

<StudentsModuleHeader />
<BudgetModuleHeader />

<ModuleHeader
  title="Records"
  breadcrumbs={['Home', 'Records']}
  icon={<FileIcon />}
  actions={<Button>Add</Button>}
/>`}
        </pre>
      </section>
    </div>
  );
}
