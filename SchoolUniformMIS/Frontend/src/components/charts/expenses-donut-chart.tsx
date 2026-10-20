"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DATA = [
  { name: "Salaries", value: 42, amount: "35.9M", color: "#FCB038" },
  { name: "Operations", value: 22, amount: "18.8M", color: "#000435" },
  { name: "Utilities", value: 14, amount: "12.0M", color: "#60A5FA" },
  { name: "Supplies", value: 12, amount: "10.3M", color: "#A78BFA" },
  { name: "Other", value: 10, amount: "8.6M", color: "#94A3B8" },
];

interface ExpensesDonutChartProps {
  className?: string;
}

export function ExpensesDonutChart({ className }: ExpensesDonutChartProps) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Expenses by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative size-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-medium text-muted-foreground">
                Total
              </p>
              <p className="text-sm font-bold text-foreground">RWF 85.6M</p>
            </div>
          </div>
          <div className="w-full flex-1 space-y-2.5">
            {DATA.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground">
                    {item.value}%
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
