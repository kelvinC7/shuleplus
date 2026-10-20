'use client';

import { useAuth } from '@/contexts/auth-context';
import {
  CreditCard, Wallet, CalendarCheck,
  TrendingUp, Award, GraduationCap,
  AlertCircle, ChevronRight, Clock, ArrowUpRight,
  Receipt, User,
} from 'lucide-react';
import Link from 'next/link';

import { StatCard, StatsGrid } from '@/components/shared/stat-card';

function childInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function DashboardPage() {
  const { ready, authorized, error, summary, parentName, linkedStudents, activeStudentId, setActiveStudent } = useAuth();
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
          <AlertCircle className="h-8 w-8 text-danger" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-navy">Access Denied</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            {error || 'Unable to access Parent Portal. Please check your network connection and try again.'}
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  const student = summary?.student;
  const greetingName = parentName || student?.fullName || 'Parent';
  const viewingChild = linkedStudents.find((c) => c.id === activeStudentId) ?? linkedStudents[0];
  const todayStatus = summary?.attendance?.todayStatus;
  const todayLabel =
    todayStatus === 'PRESENT'
      ? 'Present'
      : todayStatus === 'ABSENT'
        ? 'Absent'
        : todayStatus === 'LATE'
          ? 'Late'
          : todayStatus === 'EXCUSED'
            ? 'Excused'
            : 'Not checked in';
  const checkHint = [
    summary?.attendance?.checkInTime ? `In ${summary.attendance.checkInTime}` : null,
    summary?.attendance?.checkOutTime ? `Out ${summary.attendance.checkOutTime}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || (todayStatus && todayStatus !== 'NONE' ? undefined : 'Waiting for RFID tap');
  const stats = [
    {
      label: "Today's Attendance",
      value: todayLabel,
      hint: checkHint,
      icon: <CalendarCheck size={20} strokeWidth={1.75} />,
      trend: todayStatus === 'PRESENT'
        ? { value: 'On time', direction: 'up' as const }
        : todayStatus === 'LATE'
          ? { value: 'Late arrival', direction: 'down' as const }
          : undefined,
    },
    {
      label: 'Attendance Rate',
      value: summary?.attendance?.attendanceRate ? `${summary.attendance.attendanceRate.toFixed(0)}%` : 'N/A',
      hint: `${summary?.attendance?.monthlyPresent ?? 0} days present this month`,
      icon: <TrendingUp size={20} strokeWidth={1.75} />,
      trend: { value: 'This month', direction: 'up' as const },
    },
    {
      label: 'Current GPA',
      value: summary?.academics?.currentGPA?.toFixed(1) ?? '0.0',
      hint: `Rank ${summary?.academics?.classRank ?? '-'} of ${summary?.academics?.totalStudents ?? '-'}`,
      icon: <GraduationCap size={20} strokeWidth={1.75} />,
    },
    {
      label: 'Outstanding Fees',
      value: summary?.fees?.outstanding
        ? `${summary.fees.outstanding.toLocaleString()} RWF`
        : '0 RWF',
      hint: 'Due this term',
      icon: <CreditCard size={20} strokeWidth={1.75} />,
      trend: (summary?.fees?.outstanding ?? 0) > 0
        ? { value: 'Due', direction: 'down' as const }
        : undefined,
    },
    {
      label: 'Wallet Balance',
      value: summary?.wallet?.balance
        ? `${summary.wallet.balance.toLocaleString()} RWF`
        : '0 RWF',
      hint: 'ShuleCard balance',
      icon: <Wallet size={20} strokeWidth={1.75} />,
    },
    {
      label: 'Discipline Score',
      value: summary?.academics?.disciplineScore
        ? `${summary.academics.disciplineScore}/100`
        : '—',
      hint: 'Behavioural conduct',
      icon: <Award size={20} strokeWidth={1.75} />,
    },
  ];

  const recentActivities = summary?.recentActivities ?? [];
  const displayStudent = viewingChild
    ? {
        fullName: viewingChild.fullName,
        classLabel: [viewingChild.className, viewingChild.stream].filter(Boolean).join(' · '),
        shuleCode: viewingChild.shuleCode,
      }
    : {
        fullName: student?.fullName ?? 'Student',
        classLabel: [student?.class, student?.stream].filter(Boolean).join(' · '),
        shuleCode: student?.shuleCode ?? '',
      };
  const schoolTerm =
    summary?.schoolAcademic?.currentTerm ||
    summary?.academics?.term ||
    '';
  const schoolYear =
    summary?.schoolAcademic?.currentAcademicYear ||
    summary?.academics?.academicYear ||
    '';

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl border border-border/70 bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">{summary?.organization?.name ?? 'School'}</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-navy sm:text-2xl">
              Hi, {greetingName.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {displayStudent.fullName}
              {schoolTerm && schoolYear ? ` · ${schoolTerm} · ${schoolYear}` : ''}
            </p>
          </div>
          <Link
            href="/academic"
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-medium text-primary"
          >
            Marks
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      {/* All children */}
      {linkedStudents.length > 0 && (
        <section className="hr-card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-navy">Children</h2>
            </div>
            <span className="rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {linkedStudents.length} {linkedStudents.length === 1 ? 'child' : 'children'}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {linkedStudents.map((child) => {
              const selected = child.id === (activeStudentId ?? viewingChild?.id);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setActiveStudent(child.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-primary/40 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      selected ? 'bg-navy text-primary' : 'bg-slate-100 text-navy'
                    }`}
                  >
                    {childInitials(child.fullName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-navy">{child.fullName}</span>
                    <span className="block truncate text-xs text-muted">
                      {[child.className, child.stream, child.shuleCode].filter(Boolean).join(' · ') || 'Student'}
                    </span>
                    {child.relationship ? (
                      <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-ochre">
                        {child.relationship.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <span className="shrink-0 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Viewing
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Switch
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats */}
      <StatsGrid columns={3}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </StatsGrid>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy">Student</h2>
            <Link href="/profile" className="text-xs font-medium text-primary">
              Profile
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy/5 text-base font-semibold text-navy">
              {childInitials(displayStudent.fullName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-navy">{displayStudent.fullName}</p>
              <p className="text-sm text-muted">{displayStudent.classLabel || 'Class'}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-border/60 rounded-xl border border-border/60">
            {[
              { label: 'Shule code', value: displayStudent.shuleCode, icon: User },
              { label: 'Card', value: student?.cardNumber, icon: CreditCard },
              { label: 'Teacher', value: student?.classTeacher, icon: User },
            ]
              .filter((row) => row.value)
              .map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-xs text-muted">{row.label}</dt>
                  <dd className="truncate text-sm font-medium text-navy">{row.value}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy">Recent activity</h2>
            <Link href="/timeline" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              All <ChevronRight size={14} />
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <Clock size={22} className="text-muted" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted">No activity yet</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {recentActivities.slice(0, 6).map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-navy">
                    <Receipt size={15} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-navy">{log.description}</p>
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(log.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
