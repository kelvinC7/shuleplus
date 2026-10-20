'use client';

import { BudgetModuleHeader } from '@/components/layout/module-header';
import {
  BudgetBarChart,
  EnrollmentAreaChart,
  ExpensesDonutChart,
  RevenueChart,
} from '@/components/charts';
import { StatCard } from '@/components/shared';
import { BarChart3, Download, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      <BudgetModuleHeader />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value="RWF 124.5M" icon={<TrendingUp />} trend={{ value: '+12.5%', direction: 'up' }} />
        <StatCard title="Total Expenses" value="RWF 85.6M" icon={<BarChart3 />} trend={{ value: '-3.2%', direction: 'down' }} />
        <StatCard title="Net Profit" value="RWF 38.9M" icon={<TrendingUp />} trend={{ value: '+8.1%', direction: 'up' }} />
        <StatCard title="Reports" value="47" icon={<FileText />} description="generated this month" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <BudgetBarChart />
        <ExpensesDonutChart />
        <EnrollmentAreaChart />
      </div>

      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="mr-1.5 size-4" />
          Download Full Report
        </Button>
      </div>
    </div>
  );
}
