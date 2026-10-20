'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DATA = [
  { month: 'Jan', income: 42, expense: 28 },
  { month: 'Feb', income: 48, expense: 32 },
  { month: 'Mar', income: 45, expense: 35 },
  { month: 'Apr', income: 55, expense: 38 },
  { month: 'May', income: 52, expense: 40 },
  { month: 'Jun', income: 58, expense: 42 },
  { month: 'Jul', income: 62, expense: 45 },
  { month: 'Aug', income: 60, expense: 44 },
  { month: 'Sep', income: 68, expense: 48 },
  { month: 'Oct', income: 72, expense: 50 },
  { month: 'Nov', income: 70, expense: 52 },
  { month: 'Dec', income: 78, expense: 55 },
];

interface RevenueChartProps {
  className?: string;
}

export function RevenueChart({ className }: RevenueChartProps) {
  return (
    <Card className={cn('shadow-soft', className)}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
          <p className="mt-1 text-2xl font-bold text-foreground">
            RWF 124.5M
            <span className="ml-2 text-sm font-semibold text-success">+12.5% vs last year</span>
          </p>
        </div>
        <Select defaultValue="year">
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-secondary" />
            Expense
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
            <Line type="monotone" dataKey="income" stroke="#FCB038" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="expense" stroke="#000435" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
