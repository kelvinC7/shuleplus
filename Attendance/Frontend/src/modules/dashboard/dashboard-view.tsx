'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  Briefcase,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { PageShell, Panel } from '@/components/attendance-ui';
import { ClassHeatBars, TodayMixPanel, TrendAreaChart } from '@/components/dashboard-charts';
import { attendanceApi, type DashboardData } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function CircularRate({ value, stroke }: { value: number; stroke: string }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const dash = Math.min(100, Math.max(0, value)) / 100 * c;
  return (
    <svg width={96} height={96} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={48} cy={48} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function formatRatePct(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  if (value > 0 && value < 1) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}

function RateCard({
  label,
  value,
  loading,
  icon,
  stroke,
  badge,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: ReactNode;
  stroke: string;
  badge?: string;
}) {
  const pctLabel = loading ? '…' : formatRatePct(value);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)] transition hover:shadow-[0_8px_24px_-8px_rgba(0,4,53,0.12)] sm:p-6">
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-navy/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy/70">
          {badge}
        </span>
      ) : null}
      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center">
          <CircularRate value={loading ? 0 : value} stroke={stroke} />
          <span className="absolute text-base font-extrabold tabular-nums text-navy">{pctLabel}</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-[#FCB038] shadow-sm">
            {icon}
          </span>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-navy">{pctLabel}</p>
        </div>
      </div>
    </div>
  );
}

function OpLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-5 py-4 text-sm font-semibold text-navy shadow-sm transition hover:border-[#FCB038]/40 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-navy ring-1 ring-border">
        {icon}
      </span>
      {label}
    </Link>
  );
}

export function DashboardView() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [report, setReport] = useState<
    Awaited<ReturnType<typeof attendanceApi.reportsSummary>>['data']['data'] | null
  >(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, rep] = await Promise.all([
        attendanceApi.dashboard(),
        attendanceApi.reportsSummary(),
      ]);
      setData(dash.data.data);
      setReport(rep.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const k = data?.kpis ?? {};
  const studentRate = k.attendanceRate ?? 0;
  const staffRate = k.staffAttendanceRate ?? 0;
  const rosterStudents = k.enrolledStudents ?? 0;
  const usesSmRoster = (k.enrolledStudentsRoster ?? 0) > 0;
  const usesStaffRoster = (k.enrolledStaffRoster ?? 0) > 0;
  const presentToday = k.present ?? 0;
  const staffRoster = k.enrolledStaff ?? 0;

  const donutSegments = useMemo(
    () => [
      { label: 'On time', value: k.onTimePresent ?? Math.max(0, (k.present ?? 0) - (k.late ?? 0)), color: '#10b981' },
      { label: 'Late', value: k.late ?? 0, color: '#f59e0b' },
      { label: 'Absent', value: k.absent ?? 0, color: '#94a3b8' },
    ],
    [k.onTimePresent, k.present, k.late, k.absent]
  );

  const trendPoints = useMemo(
    () =>
      (report?.weekly ?? []).map((w) => {
        const day =
          typeof w.lessonDate === 'string'
            ? w.lessonDate.slice(0, 10)
            : new Date(w.lessonDate).toISOString().slice(0, 10);
        return {
          label: new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
          value: w._count,
        };
      }),
    [report?.weekly]
  );

  return (
    <PageShell
      title="Dashboard"
      subtitle={data?.organizationName}
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <RateCard
          label="Student rate"
          value={studentRate}
          loading={loading}
          stroke="#FCB038"
          icon={<GraduationCap size={20} />}
          badge={usesSmRoster ? 'Student Mgmt' : undefined}
        />
        <RateCard
          label="Staff rate"
          value={staffRate}
          loading={loading}
          stroke="#6366f1"
          icon={<Briefcase size={20} />}
          badge={usesStaffRoster ? 'HR · TT · IAM' : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title="Today’s mix">
          <TodayMixPanel
            loading={loading}
            studentRateLabel={formatRatePct(studentRate)}
            donutSegments={donutSegments}
            rosterStudents={rosterStudents}
            studentMetrics={{
              gateReads: presentToday,
              entries: k.studentEntries ?? 0,
              exits: k.exited ?? 0,
              late: k.late ?? 0,
              absent: k.absent ?? 0,
              onCampus: k.inside ?? 0,
              roster: rosterStudents,
            }}
            staffMetrics={{
              gateReads: k.staffPresent ?? 0,
              onSite: k.staffInside ?? 0,
              roster: staffRoster,
              rateLabel: formatRatePct(staffRate),
            }}
          />
          </Panel>
        </div>

        <Panel title="Weekly activity">
          <TrendAreaChart points={trendPoints} />
        </Panel>

        <Panel title="By class today">
          <ClassHeatBars
            rows={(report?.byClass ?? []).slice(0, 6).map((c) => ({
              label: String(c.className ?? 'Unassigned'),
              value: c._count,
            }))}
          />
        </Panel>
      </div>

      <Panel title="Quick access">
        <div className="flex flex-col gap-3 sm:flex-row">
          <OpLink href="/live-monitor" label="Live monitor" icon={<Activity size={20} />} />
          <OpLink href="/records" label="Records" icon={<ClipboardList size={20} />} />
          <OpLink href="/reports" label="Reports" icon={<FileBarChart size={20} />} />
        </div>
      </Panel>
    </PageShell>
  );
}
