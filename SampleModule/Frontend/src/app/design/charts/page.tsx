import {
  BudgetBarChart,
  EnrollmentAreaChart,
  ExpensesDonutChart,
  RevenueChart,
} from '@/components/charts';
import { PageTitle, SecondaryText } from '@/components/typography';

export const metadata = {
  title: 'Charts — Design System',
};

export default function ChartsPage() {
  return (
    <div className="space-y-8">
      <div>
        <PageTitle>Charts Design</PageTitle>
        <SecondaryText className="mt-2">
          Consistent chart cards for dashboards — revenue, budget, expenses, and enrollment.
        </SecondaryText>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <BudgetBarChart />
        <ExpensesDonutChart />
        <EnrollmentAreaChart />
      </div>

      <section className="space-y-4">
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-card p-5 text-sm text-foreground shadow-soft">
{`import { RevenueChart, BudgetBarChart, ExpensesDonutChart, EnrollmentAreaChart } from '@/components/charts';

<div className="grid gap-6 lg:grid-cols-2">
  <RevenueChart />
  <BudgetBarChart />
  <ExpensesDonutChart />
  <EnrollmentAreaChart />
</div>`}
        </pre>
      </section>
    </div>
  );
}
