import type { AuthState } from '../middleware/auth.middleware';
import { schoolData } from './school-data.service';
import { consoleService, actorOf } from './console.service';
import {
  DEMO_TEACHING_NOW,
  DEMO_BUSES,
  CURRENT_PERIOD,
  PERIODS,
} from '../demo/demo-data';

export interface OverviewFilters {
  organizationId?: string;
  academicYear?: string;
  term?: string;
}

/** Compose the Executive Overview from IAM (or demo) + console-owned data. */
export async function getOverview(auth: AuthState, filters: OverviewFilters) {
  const [overview, fees, attendance, approvals, tasks, unread] = await Promise.all([
    schoolData.overview(auth, filters),
    schoolData.fees(auth, filters).catch(() => null),
    schoolData.attendance(auth, filters.organizationId).catch(() => null),
    consoleService.approvalStats(filters.organizationId),
    consoleService.taskStats(),
    consoleService.unreadCount(),
  ]);

  const teachingGaps = DEMO_TEACHING_NOW.filter((t) => t.status === 'gap');
  const lateBuses = DEMO_BUSES.filter((b) => b.status === 'late');

  const attention: Array<{ severity: 'urgent' | 'warning' | 'info'; title: string; body: string; link: string; category: string }> = [];

  if (approvals.pending > 0) {
    attention.push({
      severity: approvals.dueToday > 0 ? 'urgent' : 'warning',
      title: `${approvals.pending} approvals waiting for you`,
      body: `${approvals.dueToday} due today · RWF ${(approvals.pendingAmount / 1_000_000).toFixed(2)}M to approve`,
      link: '/director/approvals',
      category: 'Governance',
    });
  }
  if (teachingGaps.length) {
    attention.push({
      severity: 'urgent',
      title: `${teachingGaps.map((g) => `${g.className} ${g.subject}`).join(', ')} has no teacher`,
      body: 'Tap Teaching Now to assign a cover teacher.',
      link: '/director/teaching-now',
      category: 'Academics',
    });
  }
  if (lateBuses.length) {
    attention.push({
      severity: 'warning',
      title: `${lateBuses[0].name} running ${lateBuses[0].etaMin - 6} min late`,
      body: `${lateBuses[0].route} route · ${lateBuses[0].studentsOnBoard} students on board`,
      link: '/director/transport',
      category: 'Transport',
    });
  }
  if (fees && fees.summary.collectionRate < 80) {
    attention.push({
      severity: 'warning',
      title: 'Fee collection behind plan',
      body: `${fees.summary.collectionRate}% collected · RWF ${(fees.summary.outstanding / 1_000_000).toFixed(1)}M outstanding`,
      link: '/director/fees',
      category: 'Finance',
    });
  }
  if (tasks.overdue > 0) {
    attention.push({
      severity: 'warning',
      title: `${tasks.overdue} action-plan tasks overdue`,
      body: 'Review the action plan and escalate or reassign.',
      link: '/director/action-plan',
      category: 'Governance',
    });
  }

  const collectionsTrend = fees?.collectionTrend ?? [];

  return {
    greeting: {
      period: filters.term ?? 'Term 3',
      week: 'Week 8',
      user: actorOf(auth).name,
    },
    summary: {
      ...overview.summary,
      feesCollected: fees?.summary.totalCollected ?? 0,
      feesBilled: fees?.summary.totalExpected ?? 0,
      feesOutstanding: fees?.summary.outstanding ?? 0,
      feesCollectionRate: fees?.summary.collectionRate ?? 0,
      pendingApprovals: approvals.pending,
      approvalsDueToday: approvals.dueToday,
      unreadNotifications: unread,
      healthScore: computeHealth(overview.summary.averageAttendance, fees?.summary.collectionRate ?? 0, overview.summary.totalStudents > 0),
    },
    schoolPerformance: overview.schoolPerformance,
    financial: overview.financial,
    attendance: attendance
      ? { summary: attendance.summary, weeklyTrend: attendance.weeklyTrend, bySchool: attendance.bySchool }
      : null,
    feesTrend: collectionsTrend,
    feesStatusDistribution: fees?.statusDistribution ?? [],
    attention,
    teaching: {
      period: PERIODS.find((p) => p.id === CURRENT_PERIOD)?.label ?? 'P4',
      time: PERIODS.find((p) => p.id === CURRENT_PERIOD)?.time ?? '10:00–10:40',
      sessions: DEMO_TEACHING_NOW.length,
      teaching: DEMO_TEACHING_NOW.filter((t) => t.status === 'teaching').length,
      cover: DEMO_TEACHING_NOW.filter((t) => t.status === 'cover').length,
      gaps: teachingGaps.length,
      late: DEMO_TEACHING_NOW.filter((t) => t.status === 'late').length,
      exam: DEMO_TEACHING_NOW.filter((t) => t.status === 'exam').length,
    },
    tasks: {
      open: tasks.open,
      inProgress: tasks.inProgress,
      completed: tasks.completed,
      overdue: tasks.overdue,
    },
    metricsSource: overview.metricsSource,
    lastUpdated: new Date().toISOString(),
  };
}

function computeHealth(attendance: number, feesRate: number, hasData: boolean): number {
  if (!hasData) return 0;
  const attendanceScore = Math.min(100, (attendance / 100) * 45);
  const feesScore = Math.min(100, (feesRate / 100) * 35);
  const governanceScore = 12; // stable baseline for governance/executive signals
  return Math.round(attendanceScore + feesScore + governanceScore);
}

/** Compose the Director Daily Briefing. */
export async function getBriefing(auth: AuthState, filters: OverviewFilters) {
  const [overview, fees, attendance, approvals, alerts, tasks] = await Promise.all([
    schoolData.overview(auth, filters),
    schoolData.fees(auth, filters).catch(() => null),
    schoolData.attendance(auth, filters.organizationId).catch(() => null),
    consoleService.approvalStats(filters.organizationId),
    schoolData.alerts(auth, filters.organizationId).catch(() => []),
    consoleService.taskStats(),
  ]);

  const teachingGaps = DEMO_TEACHING_NOW.filter((t) => t.status === 'gap');
  const lateBuses = DEMO_BUSES.filter((b) => b.status === 'late');

  const briefing = {
    date: new Date().toISOString(),
    headline:
      overview.summary.averageAttendance >= 94
        ? 'The group is running smoothly.'
        : 'Some branches need your attention today.',
    sections: [
      {
        id: 'decisions',
        title: 'Pending decisions',
        items: [
          {
            label: `${approvals.pending} requests waiting`,
            detail: `${approvals.dueToday} due today · RWF ${(approvals.pendingAmount / 1_000_000).toFixed(2)}M total value`,
            severity: approvals.dueToday > 0 ? 'urgent' : 'info',
            link: '/director/approvals',
          },
        ],
      },
      {
        id: 'staffing',
        title: 'Staffing & teaching',
        items: [
          ...(teachingGaps.length
            ? [
                {
                  label: `${teachingGaps.map((g) => `${g.className} ${g.subject}`).join(', ')} has no teacher`,
                  detail: 'Assign a cover teacher from Teaching Now.',
                  severity: 'urgent',
                  link: '/director/teaching-now',
                },
              ]
            : []),
          {
            label: `${attendance?.summary.staffRate ?? 0}% staff attendance`,
            detail: 'Gate + classroom capture · Digital Attendance',
            severity: (attendance?.summary.staffRate ?? 0) < 90 ? 'warning' : 'info',
            link: '/director/attendance',
          },
        ],
      },
      {
        id: 'students',
        title: 'Students today',
        items: [
          {
            label: `${attendance?.summary.studentRate ?? 0}% attendance`,
            detail: `${attendance?.summary.lateArrivals ?? 0} late arrivals · ${overview.summary.totalStudents} enrolled`,
            severity: (attendance?.summary.studentRate ?? 0) < 93 ? 'warning' : 'info',
            link: '/director/attendance',
          },
        ],
      },
      {
        id: 'finance',
        title: 'Finance',
        items: fees
          ? [
              {
                label: `${fees.summary.collectionRate}% fees collected`,
                detail: `RWF ${(fees.summary.outstanding / 1_000_000).toFixed(1)}M outstanding · ${fees.studentsWithOutstanding} students with balances`,
                severity: fees.summary.collectionRate < 75 ? 'urgent' : 'info',
                link: '/director/fees',
              },
            ]
          : [],
      },
      {
        id: 'transport',
        title: 'Transport & security',
        items: [
          ...(lateBuses.length
            ? [
                {
                  label: `${lateBuses[0].name} is ${lateBuses[0].etaMin - 6} min late`,
                  detail: `${lateBuses[0].route} route · ${lateBuses[0].studentsOnBoard} students on board`,
                  severity: 'warning',
                  link: '/director/transport',
                },
              ]
            : [{ label: 'All buses on schedule', detail: 'GPS live · Smart Transport', severity: 'info', link: '/director/transport' }]),
        ],
      },
      {
        id: 'alerts',
        title: 'Branch alerts',
        items: alerts.slice(0, 5).map((a) => ({
          label: a.title,
          detail: a.message,
          severity: a.severity === 'warning' ? 'warning' : 'info',
          link: '/director/briefing',
        })),
      },
      {
        id: 'commitments',
        title: 'Your commitments',
        items: [
          {
            label: `${tasks.overdue} overdue · ${tasks.inProgress} in progress`,
            detail: 'Action plan for this term',
            severity: tasks.overdue > 0 ? 'warning' : 'info',
            link: '/director/action-plan',
          },
        ],
      },
    ].filter((s) => s.items.length > 0),
    metricsSource: overview.metricsSource,
  };

  return briefing;
}
