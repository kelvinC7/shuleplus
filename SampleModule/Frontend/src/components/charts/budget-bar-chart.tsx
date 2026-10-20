'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DATA = [
  { month: 'Jan', budget: 40, actual: 38 },
  { month: 'Feb', budget: 45, actual: 42 },
  { month: 'Mar', budget: 42, actual: 44 },
  { month: 'Apr', budget: 50, actual: 48 },
  { month: 'May', budget: 48, actual: 52 },
  { month: 'Jun', budget: 55, actual: 50 },
];

interface BudgetBarChartProps {
  className?: string;
}

export function BudgetBarChart({ className }: BudgetBarChartProps) {
  return (
    <Card className={cn('shadow-soft', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Budget vs Actual</CardTitle>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-violet-300" />
            Budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-secondary" />
            Actual
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="budget" fill="#C4B5FD" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#000435" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
