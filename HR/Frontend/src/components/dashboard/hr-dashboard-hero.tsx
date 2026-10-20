'use client';

import { useEffect, useState } from 'react';
import { CalendarOff, GraduationCap, Users } from 'lucide-react';
import type { DashboardSummary } from '@/types';
import { HrSparkline } from '@/components/dashboard/hr-sparkline';

interface HrDashboardHeroProps {
  orgName?: string;
  userName?: string;
  kpis?: DashboardSummary['kpis'];
  trend?: number[];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HrDashboardHero({ orgName, userName, kpis, trend = [] }: HrDashboardHeroProps) {
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const stats = [
    { label: 'Staff', value: kpis?.totalEmployees ?? 0, hint: `${kpis?.activeRate ?? 0}% active`, icon: Users, color: '#FCB038' },
    { label: 'Teachers', value: kpis?.teachers ?? 0, hint: `${kpis?.teacherRate ?? 0}% of workforce`, icon: GraduationCap, color: '#60a5fa' },
    { label: 'On Leave', value: kpis?.onLeave ?? 0, hint: `${kpis?.onLeaveRate ?? 0}% away today`, icon: CalendarOff, color: '#a78bfa' },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-navy/10 bg-gradient-to-br from-[#000435] via-[#000435] to-[#0a0f5c] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#FCB038]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-[#FCB038]/10 blur-2xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#FCB038]">
            {greeting}, {userName ?? 'Admin'}! <span className="align-middle">👋</span>
          </p>
          <h1 className="mt-2 font-montserrat text-3xl font-bold tracking-tight text-white sm:text-4xl">
            HR Dashboard
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-[#FCB038]">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </svg>
            <span className="truncate">Workforce overview for {orgName ?? 'your organization'}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="min-w-[140px] rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3.5 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    <Icon size={13} style={{ color: stat.color }} />
                    {stat.label}
                  </span>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-white">{stat.value}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-[10px] text-white/50">{stat.hint}</span>
                  <HrSparkline values={trend} color={stat.color} width={64} height={22} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
