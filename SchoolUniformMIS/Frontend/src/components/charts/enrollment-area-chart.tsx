"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DATA = [
  { month: "Jan", students: 2100 },
  { month: "Feb", students: 2150 },
  { month: "Mar", students: 2200 },
  { month: "Apr", students: 2280 },
  { month: "May", students: 2350 },
  { month: "Jun", students: 2400 },
  { month: "Jul", students: 2450 },
  { month: "Aug", students: 2500 },
  { month: "Sep", students: 2547 },
];

interface EnrollmentAreaChartProps {
  className?: string;
}

export function EnrollmentAreaChart({ className }: EnrollmentAreaChartProps) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Student Enrollment
        </CardTitle>
        <p className="mt-1 text-2xl font-bold text-foreground">
          2,547
          <span className="ml-2 text-sm font-semibold text-success">
            +8.2% growth
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={DATA}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="students"
              stroke="#A78BFA"
              strokeWidth={2.5}
              fill="url(#enrollGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
