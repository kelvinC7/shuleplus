export interface PublishedMark {
  id: string;
  title: string;
  subject: string;
  type: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  grade: string | null;
  date: string | null;
  term: string;
  academicYear: string;
  status: string;
  code?: string | null;
  assessmentId?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  subject: string;
  type: string;
  date: string | null;
  term: string;
  academicYear: string;
  status: string;
  maxScore: number;
  hasPublishedMark?: boolean;
  code?: string | null;
  className?: string | null;
}

export type CourseOverviewRow = {
  subject: string;
  assessmentsScheduled: number;
  assessmentsEntered: number;
  status: 'Not started' | 'In progress' | 'Updated' | 'Completed';
  lastMarkDate: string | null;
};

export type AcademicAlert = {
  id: string;
  tone: 'info' | 'success' | 'warning';
  title: string;
  detail: string;
};

export function buildCourseOverview(
  marks: PublishedMark[],
  schedule: ScheduleItem[]
): CourseOverviewRow[] {
  const subjects = new Set<string>();
  for (const m of marks) subjects.add(m.subject);
  for (const s of schedule) subjects.add(s.subject);

  const rows: CourseOverviewRow[] = [];
  for (const subject of [...subjects].sort((a, b) => a.localeCompare(b))) {
    const subjectMarks = marks.filter((m) => m.subject === subject);
    const subjectSchedule = schedule.filter((s) => s.subject === subject);
    const scheduled = subjectSchedule.length;
    const entered = subjectMarks.length;
    let status: CourseOverviewRow['status'] = 'Not started';
    if (entered === 0) status = 'Not started';
    else if (scheduled > 0 && entered < scheduled) status = 'In progress';
    else if (scheduled > 0 && entered >= scheduled) status = 'Completed';
    else status = 'Updated';

    const dates = subjectMarks.map((m) => m.date).filter(Boolean) as string[];
    const lastMarkDate =
      dates.length > 0
        ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

    rows.push({
      subject,
      assessmentsScheduled: scheduled,
      assessmentsEntered: entered,
      status,
      lastMarkDate,
    });
  }
  return rows;
}

export function buildAcademicAlerts(
  marks: PublishedMark[],
  schedule: ScheduleItem[],
  reportCount: number
): AcademicAlert[] {
  const alerts: AcademicAlert[] = [];
  const now = Date.now();
  const upcoming = schedule.filter((s) => {
    if (!s.date) return false;
    const t = new Date(s.date).getTime();
    return t >= now - 86400000;
  });
  const nextWeek = upcoming.filter((s) => {
    if (!s.date) return false;
    const t = new Date(s.date).getTime();
    return t <= now + 7 * 86400000;
  });

  if (nextWeek.length >= 3) {
    alerts.push({
      id: 'upcoming-batch',
      tone: 'info',
      title: 'Upcoming assessments',
      detail: `Your child has ${nextWeek.length} assessments scheduled in the next 7 days.`,
    });
  }

  const pendingResults = schedule.filter((s) => {
    const done =
      s.status.toUpperCase() === 'APPROVED' ||
      s.status.toUpperCase() === 'LOCKED' ||
      s.status.toUpperCase() === 'SUBMITTED';
    return done && !s.hasPublishedMark;
  });
  if (pendingResults.length) {
    alerts.push({
      id: 'pending-marks',
      tone: 'warning',
      title: 'Results pending',
      detail: `${pendingResults.length} completed assessment(s) do not have published marks yet.`,
    });
  }

  if (reportCount > 0) {
    alerts.push({
      id: 'reports',
      tone: 'success',
      title: 'Official reports',
      detail: `${reportCount} published report card(s) are available to view and download.`,
    });
  }

  const bySubject = new Map<string, PublishedMark[]>();
  for (const m of marks) {
    if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
    bySubject.get(m.subject)!.push(m);
  }
  for (const [subject, list] of bySubject) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    const first = sorted[0].percentage;
    const last = sorted[sorted.length - 1].percentage;
    if (first == null || last == null) continue;
    const delta = last - first;
    if (delta >= 8) {
      alerts.push({
        id: `improve-${subject}`,
        tone: 'success',
        title: `${subject} improving`,
        detail: `Latest mark is about ${Math.round(delta)}% higher than the first recorded assessment this term.`,
      });
    } else if (delta <= -8) {
      alerts.push({
        id: `decline-${subject}`,
        tone: 'warning',
        title: `${subject} needs attention`,
        detail: `Latest mark is about ${Math.round(Math.abs(delta))}% lower than earlier assessments this term.`,
      });
    }
  }

  return alerts.slice(0, 6);
}

export function marksForSubject(marks: PublishedMark[], subject: string) {
  return marks
    .filter((m) => m.subject === subject)
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
}
