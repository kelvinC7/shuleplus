'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { YoDashboardHead } from '@/components/dashboard/yo-dashboard-head';
import { YoFeesWalletRow } from '@/components/dashboard/yo-fees-wallet-row';
import { YoMetricTiles } from '@/components/dashboard/yo-metric-tiles';
import { YoActivityPanel, YoTodayPanel, YoTodoPanel } from '@/components/dashboard/yo-dashboard-panels';
import { YoQuickActions } from '@/components/layout/yo-quick-actions';
import { ShuleTripParentHome } from '@/components/dashboard/shuletrip-parent-home';
import { ParentAcademicHubCard } from '@/components/dashboard/parent-academic-hub-card';

export default function DashboardPage() {
  const {
    ready,
    authorized,
    error,
    summary,
    parentName,
    linkedStudents,
    activeStudentId,
    setActiveStudent,
    shuleTripOnly,
  } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
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

  const schoolTerm =
    summary?.schoolAcademic?.currentTerm || summary?.academics?.term || summary?.fees?.currentTerm || '';
  const schoolYear = summary?.schoolAcademic?.currentAcademicYear || summary?.academics?.academicYear || '';
  const termLabel = [schoolTerm, schoolYear].filter(Boolean).join(' ') || 'This term';

  const displayStudent = viewingChild
    ? {
        fullName: viewingChild.fullName,
        classLabel: [viewingChild.className, viewingChild.stream].filter(Boolean).join(' · '),
      }
    : {
        fullName: student?.fullName ?? 'Student',
        classLabel: [student?.class, student?.stream].filter(Boolean).join(' · '),
      };

  const upcomingExams = summary?.academics?.upcomingExams ?? [];
  const todayExams = upcomingExams.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const examsForPanel = todayExams.length > 0 ? todayExams : upcomingExams;

  const examCount = summary?.academics?.upcomingExams?.length ?? 0;
  const homeworkDue = examCount > 0 ? String(examCount) : '0';

  const metricTiles = [
    {
      label: 'Attendance',
      value: summary?.attendance?.attendanceRate
        ? `${summary.attendance.attendanceRate.toFixed(0)}%`
        : todayLabel,
      hint: 'This term',
      hintTone: 'green' as const,
    },
    {
      label: 'Average',
      value: summary?.academics?.currentGPA?.toFixed(1) ?? '—',
      hint:
        summary?.academics?.classRank && summary?.academics?.totalStudents
          ? `Rank ${summary.academics.classRank} of ${summary.academics.totalStudents}`
          : 'GPA',
      hintTone: 'green' as const,
    },
    {
      label: 'Homework',
      value: homeworkDue,
      hint: 'Due soon',
      hintTone: 'muted' as const,
    },
  ];

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1d';
    return `${days}d`;
  }

  const recentActivities = summary?.recentActivities ?? [];
  const fees = summary?.fees ?? {
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0,
    overdue: 0,
    currency: 'RWF',
    currentTerm: '',
    feeStatements: [],
    recentPayments: [],
  };
  const wallet = summary?.wallet ?? {
    balance: 0,
    currency: 'RWF',
    cardNumber: '',
    lastTopUp: null,
    lastTopUpAmount: null,
    recentTransactions: [],
  };

  if (shuleTripOnly) {
    return <ShuleTripParentHome />;
  }

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-5 sm:gap-[22px]">
      <YoDashboardHead
        parentFirstName={greetingName.split(' ')[0] ?? 'Parent'}
        activeChildName={displayStudent.fullName}
        schoolName={summary?.organization?.name ?? 'Your school'}
        linkedStudents={linkedStudents}
        activeStudentId={activeStudentId ?? viewingChild?.id ?? null}
        onSelectChild={setActiveStudent}
      />

      <YoFeesWalletRow fees={fees} wallet={wallet} termLabel={termLabel} />

      <YoQuickActions />

      <ParentAcademicHubCard
        termLabel={termLabel}
        upcomingCount={summary?.academics?.upcomingExams?.length ?? 0}
        reportHint={undefined}
      />

      <YoMetricTiles tiles={metricTiles} />

      <div className="grid gap-4 min-[700px]:grid-cols-[1.2fr_1fr]">
        <YoTodayPanel exams={examsForPanel} />
        <YoTodoPanel statements={fees.feeStatements} activities={recentActivities} />
      </div>

      <YoActivityPanel activities={recentActivities} timeAgo={timeAgo} />

      {displayStudent.classLabel ? (
        <p className="pb-2 text-center text-[11px] font-semibold text-[var(--yo-muted)] lg:hidden">
          {displayStudent.classLabel}
        </p>
      ) : null}
    </div>
  );
}