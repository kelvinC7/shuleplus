import type { ActionPlan, ActionPlanTask, Meeting, PeriodReview } from '@/types';

export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'delayed' | 'overdue';

export type CalendarEventType = 'plan' | 'task' | 'milestone' | 'meeting' | 'review';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: CalendarEventType;
  status: ActivityStatus;
  planId?: string;
  planTitle?: string;
  department?: string;
  owner?: string;
  pillar?: string;
  taskId?: string;
  detailHref?: string;
}

export const STATUS_STYLES: Record<
  ActivityStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  planned: { label: 'Planned', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
  delayed: { label: 'Delayed', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  overdue: { label: 'Overdue', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
};

function planStatus(plan: ActionPlan): ActivityStatus {
  if (plan.status === 'COMPLETED') return 'completed';
  const due = new Date(plan.dueDate);
  const now = new Date();
  if (due < now && plan.status !== 'COMPLETED') {
    return plan.progress > 0 ? 'delayed' : 'overdue';
  }
  if (plan.status === 'IN_PROGRESS' || plan.progress > 0) return 'in_progress';
  return 'planned';
}

function taskStatus(task: ActionPlanTask): ActivityStatus {
  if (task.status === 'COMPLETED') return 'completed';
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    if (due < new Date()) return task.progress > 0 ? 'delayed' : 'overdue';
  }
  if (task.status === 'IN_PROGRESS' || task.progress > 0) return 'in_progress';
  return 'planned';
}

export function buildCalendarEvents(input: {
  plans: ActionPlan[];
  meetings: Meeting[];
  reviews: PeriodReview[];
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const { plans, meetings, reviews } = input;

  for (const plan of plans) {
    const pillar = plan.category?.name;
    const dept = plan.department ?? undefined;
    const st = planStatus(plan);

    events.push({
      id: `plan-start-${plan.id}`,
      title: `${plan.title} (start)`,
      start: new Date(plan.startDate),
      end: new Date(plan.startDate),
      type: 'plan',
      status: st,
      planId: plan.id,
      planTitle: plan.title,
      department: dept,
      owner: plan.responsiblePerson ?? undefined,
      pillar,
      detailHref: `/plans/${plan.id}`,
    });

    events.push({
      id: `plan-due-${plan.id}`,
      title: `${plan.title} (due)`,
      start: new Date(plan.dueDate),
      end: new Date(plan.dueDate),
      type: 'plan',
      status: st,
      planId: plan.id,
      planTitle: plan.title,
      department: dept,
      owner: plan.responsiblePerson ?? undefined,
      pillar,
      detailHref: `/plans/${plan.id}`,
    });

    for (const task of plan.tasks ?? []) {
      const start = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : new Date(plan.startDate);
      const end = task.dueDate ? new Date(task.dueDate) : start;
      events.push({
        id: `task-${task.id}`,
        title: task.title,
        start,
        end,
        type: 'task',
        status: taskStatus(task),
        planId: plan.id,
        planTitle: plan.title,
        department: dept,
        owner: task.owner ?? plan.responsiblePerson ?? undefined,
        pillar,
        taskId: task.id,
        detailHref: `/plans/${plan.id}`,
      });
    }

    for (const ms of plan.milestones ?? []) {
      events.push({
        id: `ms-${ms.id}`,
        title: ms.title,
        start: new Date(ms.targetDate),
        end: new Date(ms.targetDate),
        type: 'milestone',
        status: ms.isCompleted ? 'completed' : new Date(ms.targetDate) < new Date() ? 'overdue' : 'planned',
        planId: plan.id,
        planTitle: plan.title,
        department: dept,
        owner: ms.responsiblePerson ?? undefined,
        pillar,
        detailHref: `/plans/${plan.id}`,
      });
    }
  }

  for (const m of meetings) {
    const start = new Date(m.meetingDate);
    events.push({
      id: `meeting-${m.id}`,
      title: m.title,
      start,
      end: start,
      type: 'meeting',
      status: 'planned',
      planId: m.actionPlanId ?? undefined,
      detailHref: m.actionPlanId ? `/plans/${m.actionPlanId}` : undefined,
    });
  }

  for (const r of reviews) {
    const d = new Date(r.createdAt);
    events.push({
      id: `review-${r.id}`,
      title: `${r.reviewType} Review`,
      start: d,
      end: d,
      type: 'review',
      status: 'completed',
      detailHref: '/reviews',
    });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: {
    planId: string;
    department: string;
    owner: string;
    pillar: string;
    status: string;
  }
): CalendarEvent[] {
  return events.filter((e) => {
    if (filters.planId && e.planId !== filters.planId) return false;
    if (filters.department && e.department !== filters.department) return false;
    if (filters.owner && e.owner !== filters.owner) return false;
    if (filters.pillar && e.pillar !== filters.pillar) return false;
    if (filters.status && e.status !== filters.status) return false;
    return true;
  });
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isInRange(date: Date, start: Date, end: Date) {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}
