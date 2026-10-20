import type { Template, TemplateData, ActionPlan } from '@/types';

export const WIZARD_STEPS = [
  'Basic Info',
  'Goals',
  'Objectives',
  'Activities',
  'Budget',
  'Team',
  'Calendar',
  'Review',
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number];

export type DurationType = 'full_year' | 'term1' | 'term2' | 'term3' | 'custom';

export interface WizardObjective {
  id: string;
  title: string;
  description: string;
  measurementIndicator: string;
  baseline: string;
  target: string;
  unit: string;
}

export interface WizardGoal {
  id: string;
  title: string;
  objectives: WizardObjective[];
}

export interface WizardBudgetItem {
  id: string;
  label: string;
  amount: number;
}

export interface WizardActivityBudget {
  activityId: string;
  requiresBudget: boolean;
  items: WizardBudgetItem[];
  fundingSource: string;
}

export interface WizardActivity {
  id: string;
  goalId: string;
  objectiveId: string;
  title: string;
  description: string;
  selected: boolean;
  owner: string;
  supportTeam: string[];
  reviewer: string;
  notifyTeam: boolean;
  startDate: string;
  endDate: string;
  frequency: string;
  priority: string;
  expectedOutput: string;
  evidenceTypes: string[];
}

export interface WizardBasicInfo {
  title: string;
  academicYear: string;
  term: string;
  durationType: DurationType;
  startDate: string;
  endDate: string;
  planOwner: string;
  description: string;
  visibility: 'management' | 'all_staff';
  pillarId: string;
  department: string;
  categoryId: string;
  priority: string;
}

export interface WizardState {
  basic: WizardBasicInfo;
  goals: WizardGoal[];
  activities: WizardActivity[];
  activityBudgets: WizardActivityBudget[];
}

export interface StaffOption {
  key: string;
  id: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  source?: 'iam' | 'hr' | 'teacher';
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export const EVIDENCE_OPTIONS = ['Attendance List', 'Progress Report', 'Photos', 'Document'] as const;

export const MEASUREMENT_INDICATORS = [
  'Average Mathematics Score',
  'Average English Score',
  'Student Attendance Rate',
  'Pass Rate',
  'Number of Low-Performing Students',
  'Literacy Rate',
  'Custom Indicator',
] as const;

export const UNIT_OPTIONS = ['%', 'students', 'teachers', 'days', 'RWF', 'score'] as const;

export const DURATION_OPTIONS: { id: DurationType; label: string; term: string }[] = [
  { id: 'full_year', label: 'Full Academic Year', term: 'Full Academic Year' },
  { id: 'term1', label: 'Term 1', term: 'Term 1' },
  { id: 'term2', label: 'Term 2', term: 'Term 2' },
  { id: 'term3', label: 'Term 3', term: 'Term 3' },
  { id: 'custom', label: 'Custom Period', term: 'Custom' },
];

export function applyAcademicSettings(basic: WizardBasicInfo, settings: AcademicSettings): WizardBasicInfo {
  const year = settings.currentAcademicYear ?? settings.academicYears[0] ?? basic.academicYear;
  const dates = academicYearDates(year);
  const term =
    settings.currentTerm && settings.terms.includes(settings.currentTerm)
      ? settings.currentTerm
      : settings.terms.includes('Full Academic Year')
        ? 'Full Academic Year'
        : settings.terms[0] ?? basic.term;
  const durationType =
    term === 'Term 1' ? 'term1' : term === 'Term 2' ? 'term2' : term === 'Term 3' ? 'term3' : 'full_year';
  return {
    ...basic,
    academicYear: year,
    term,
    durationType,
    startDate: dates.startDate,
    endDate: dates.endDate,
  };
}

export function staffReactKey(s: StaffOption) {
  return s.key || `${s.source ?? 'staff'}-${s.id}`;
}

export interface WizardPersistedMeta {
  visibility: 'management' | 'all_staff';
  goals: WizardGoal[];
  academicYear: string;
  term: string;
  planOwner: string;
  pillarId: string;
  durationType?: DurationType;
}

export const PLAN_OWNER_ROLES = [
  'Head Teacher',
  'Deputy Head Teacher',
  'Director of Studies',
  'School Bursar',
  'Department Head',
] as const;

export const TERM_OPTIONS = ['Full Academic Year', 'Term 1', 'Term 2', 'Term 3', 'Custom'] as const;

export const FREQUENCY_OPTIONS = ['One-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly'] as const;

export const WIZARD_META_MARKER = '\n\n---AP_WIZARD---\n';

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultAcademicYear() {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export function academicYearDates(academicYear: string) {
  const startYear = parseInt(academicYear.split('-')[0], 10) || new Date().getFullYear();
  return {
    startDate: `${startYear}-09-01`,
    endDate: `${startYear + 1}-08-31`,
  };
}

export function emptyObjective(): WizardObjective {
  return {
    id: uid('obj'),
    title: '',
    description: '',
    measurementIndicator: '',
    baseline: '',
    target: '',
    unit: '%',
  };
}

export function emptyActivityBudget(activityId: string): WizardActivityBudget {
  return {
    activityId,
    requiresBudget: false,
    items: [],
    fundingSource: 'School Budget',
  };
}

export function activityBudgetTotal(budgets: WizardActivityBudget[], activityId: string) {
  const entry = budgets.find((b) => b.activityId === activityId);
  if (!entry?.requiresBudget) return 0;
  return entry.items.reduce((sum, item) => sum + item.amount, 0);
}

export function totalWizardBudget(state: WizardState) {
  return state.activities
    .filter((a) => a.selected)
    .reduce((sum, act) => sum + activityBudgetTotal(state.activityBudgets, act.id), 0);
}

export function objectiveKpiCount(goals: WizardGoal[]) {
  return goals.reduce((sum, goal) => sum + goal.objectives.filter((o) => o.title.trim()).length, 0);
}

export function parseSupportTeam(raw?: string | string[] | null): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function parseEvidenceTypes(raw?: string | string[] | null): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw?.trim()) return [];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [];
}

export function emptyWizardState(): WizardState {
  const year = defaultAcademicYear();
  const dates = academicYearDates(year);
  return {
    basic: {
      title: '',
      academicYear: year,
      term: 'Full Academic Year',
      durationType: 'full_year',
      startDate: dates.startDate,
      endDate: dates.endDate,
      planOwner: 'Head Teacher',
      description: '',
      visibility: 'all_staff',
      pillarId: 'teaching-learning',
      department: '',
      categoryId: '',
      priority: 'MEDIUM',
    },
    goals: [],
    activities: [],
    activityBudgets: [],
  };
}

export function buildWizardFromTemplate(template: Template): WizardState {
  const td = (template.templateData ?? {}) as TemplateData;
  const year = defaultAcademicYear();
  const dates = academicYearDates(year);
  const goals: WizardGoal[] = (td.goals ?? [template.name]).map((g) => ({
    id: uid('goal'),
    title: g,
    objectives: (td.objectives ?? []).map((o) => ({
      ...emptyObjective(),
      title: o,
    })),
  }));

  if (goals.length === 1 && goals[0].objectives.length === 0 && (td.suggestedKpis ?? []).length > 0) {
    goals[0].objectives = (td.suggestedKpis ?? []).map((k) => ({
      ...emptyObjective(),
      title: k.name,
      measurementIndicator: k.name,
      baseline: String(k.baseline ?? ''),
      target: String(k.target ?? ''),
      unit: k.unit ?? '%',
    }));
  }

  const activities: WizardActivity[] = [];
  const activityBudgets: WizardActivityBudget[] = [];

  for (const goal of goals) {
    const primaryObjective =
      goal.objectives[0] ??
      ({
        ...emptyObjective(),
        title: goal.title,
      } as WizardObjective);
    if (goal.objectives.length === 0) {
      goal.objectives.push(primaryObjective);
    }

    for (const obj of goal.objectives) {
      const kpiDef = (td.suggestedKpis ?? []).find((k) =>
        obj.title.toLowerCase().includes(k.name.toLowerCase().split(' ')[0] ?? '')
      );
      if (kpiDef) {
        obj.measurementIndicator = kpiDef.name;
        obj.baseline = String(kpiDef.baseline ?? obj.baseline);
        obj.target = String(kpiDef.target ?? obj.target);
        obj.unit = kpiDef.unit ?? obj.unit;
      }
    }

    for (const act of td.suggestedActivities ?? []) {
      const actId = uid('act');
      activities.push({
        id: actId,
        goalId: goal.id,
        objectiveId: primaryObjective.id,
        title: act.title,
        description: '',
        selected: act.defaultSelected !== false,
        owner: '',
        supportTeam: [],
        reviewer: '',
        notifyTeam: true,
        startDate: dates.startDate,
        endDate: dates.endDate,
        frequency: act.frequency ?? 'Monthly',
        priority: 'HIGH',
        expectedOutput: '',
        evidenceTypes: parseEvidenceTypes(act.verification),
      });
      activityBudgets.push(emptyActivityBudget(actId));
    }
  }

  return {
    basic: {
      title: template.name,
      academicYear: year,
      term: 'Full Academic Year',
      durationType: 'full_year',
      startDate: dates.startDate,
      endDate: dates.endDate,
      planOwner: 'Head Teacher',
      description: template.description ?? '',
      visibility: 'all_staff',
      pillarId: 'teaching-learning',
      department: '',
      categoryId: template.categoryId ?? '',
      priority: 'MEDIUM',
    },
    goals,
    activities,
    activityBudgets,
  };
}

export function encodeWizardDescription(description: string, meta: WizardPersistedMeta) {
  const base = description.trim();
  return `${base}${WIZARD_META_MARKER}${JSON.stringify(meta)}`;
}

export function decodeWizardDescription(description?: string | null): {
  text: string;
  meta: WizardPersistedMeta | null;
} {
  if (!description?.includes(WIZARD_META_MARKER)) {
    return { text: description ?? '', meta: null };
  }
  const [text, json] = description.split(WIZARD_META_MARKER);
  try {
    return { text: text.trim(), meta: JSON.parse(json) as WizardPersistedMeta };
  } catch {
    return { text: description, meta: null };
  }
}

function normalizeObjective(obj: Partial<WizardObjective> & { id: string }): WizardObjective {
  return {
    id: obj.id,
    title: obj.title ?? '',
    description: obj.description ?? '',
    measurementIndicator: obj.measurementIndicator ?? obj.title ?? '',
    baseline: obj.baseline ?? '',
    target: obj.target ?? '',
    unit: obj.unit ?? '%',
  };
}

export function buildWizardFromPlan(plan: ActionPlan): WizardState {
  const { text, meta } = decodeWizardDescription(plan.description);
  const year = plan.periodYear ? `${plan.periodYear}-${plan.periodYear + 1}` : defaultAcademicYear();

  const goals: WizardGoal[] = meta?.goals?.length
    ? meta.goals.map((g) => ({
        ...g,
        objectives: g.objectives.map((o) => normalizeObjective(o)),
      }))
    : [{
        id: uid('goal'),
        title: plan.expectedOutcome ?? plan.title,
        objectives: [normalizeObjective({ id: uid('obj'), title: plan.expectedOutcome ?? 'Main objective' })],
      }];

  const activities: WizardActivity[] = (plan.tasks ?? []).map((t) => {
    const objMatch = t.description?.match(/@obj:([^\n]+)/);
    const objectiveId = objMatch?.[1] ?? goals[0]?.objectives[0]?.id ?? uid('obj');
    const goalId = goals.find((g) => g.objectives.some((o) => o.id === objectiveId))?.id ?? goals[0]?.id ?? uid('goal');
    return {
      id: t.id,
      goalId,
      objectiveId,
      title: t.title,
      description: t.description?.replace(/@obj:[^\n]+\n?/, '').split('\n').filter((line) => !/^(Support|Reviewer|Notify team|Frequency|Expected output|Verification|Budget|Funding|Budget items):/.test(line)).join('\n').trim() ?? '',
      selected: true,
      owner: t.owner ?? '',
      supportTeam: parseSupportTeam(t.description?.match(/Support: ([^\n]+)/)?.[1]),
      reviewer: t.description?.match(/Reviewer: ([^\n]+)/)?.[1] ?? '',
      notifyTeam: /Notify team: yes/i.test(t.description ?? ''),
      startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '',
      endDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
      frequency: t.description?.match(/Frequency: ([^\n]+)/)?.[1] ?? 'Monthly',
      priority: 'MEDIUM',
      expectedOutput: t.description?.match(/Expected output: ([^\n]+)/)?.[1] ?? '',
      evidenceTypes: parseEvidenceTypes(t.description?.match(/Verification: ([^\n]+)/)?.[1]),
    };
  });

  const activityBudgets: WizardActivityBudget[] = activities.map((act) => {
    const task = (plan.tasks ?? []).find((t) => t.id === act.id);
    const hint = Number(task?.description?.match(/Budget: (\d+)/)?.[1] ?? 0);
    const funding = task?.description?.match(/Funding: ([^\n]+)/)?.[1] ?? 'School Budget';
    const itemsRaw = task?.description?.match(/Budget items: ([^\n]+)/)?.[1];
    const items = itemsRaw
      ? itemsRaw.split(';').map((part) => {
          const [label, amount] = part.split('=');
          return { id: uid('bitem'), label: label?.trim() ?? 'Item', amount: Number(amount) || 0 };
        })
      : hint > 0
        ? [{ id: uid('bitem'), label: 'Planned budget', amount: hint }]
        : [];
    return {
      activityId: act.id,
      requiresBudget: hint > 0 || items.length > 0,
      items,
      fundingSource: funding,
    };
  });

  const durationType = meta?.durationType ?? (
    meta?.term === 'Term 1' ? 'term1' :
    meta?.term === 'Term 2' ? 'term2' :
    meta?.term === 'Term 3' ? 'term3' :
    meta?.term === 'Custom' ? 'custom' : 'full_year'
  );

  return {
    basic: {
      title: plan.title,
      academicYear: meta?.academicYear ?? year,
      term: meta?.term ?? 'Full Academic Year',
      durationType,
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().slice(0, 10) : '',
      endDate: plan.dueDate ? new Date(plan.dueDate).toISOString().slice(0, 10) : '',
      planOwner: meta?.planOwner ?? plan.responsiblePerson ?? 'Head Teacher',
      description: text,
      visibility: meta?.visibility ?? 'all_staff',
      pillarId: meta?.pillarId ?? 'teaching-learning',
      department: plan.department ?? '',
      categoryId: plan.categoryId ?? '',
      priority: plan.priority,
    },
    goals,
    activities,
    activityBudgets,
  };
}

export function ensureActivityBudgets(state: WizardState): WizardState {
  const existing = new Set(state.activityBudgets?.map((b) => b.activityId) ?? []);
  const missing = state.activities
    .filter((a) => !existing.has(a.id))
    .map((a) => emptyActivityBudget(a.id));
  const activityBudgets = [...(state.activityBudgets ?? []), ...missing];
  const goals = (state.goals ?? []).map((g) => ({
    ...g,
    objectives: (g.objectives ?? []).map((o) => normalizeObjective(o)),
  }));
  const activities = (state.activities ?? []).map((a) => normalizeActivityRecord(a));
  const basic = {
    ...state.basic,
    durationType: state.basic?.durationType ?? 'full_year',
  };
  return { ...state, basic, goals, activities, activityBudgets };
}

function normalizeActivityRecord(act: WizardActivity & { evidenceRequired?: string; budget?: number; fundingSource?: string }): WizardActivity {
  return {
    id: act.id,
    goalId: act.goalId,
    objectiveId: act.objectiveId,
    title: act.title,
    description: act.description,
    selected: act.selected !== false,
    owner: act.owner ?? '',
    supportTeam: Array.isArray(act.supportTeam) ? act.supportTeam : parseSupportTeam(act.supportTeam as unknown as string),
    reviewer: act.reviewer ?? '',
    notifyTeam: act.notifyTeam !== false,
    startDate: act.startDate ?? '',
    endDate: act.endDate ?? '',
    frequency: act.frequency ?? 'Monthly',
    priority: act.priority ?? 'MEDIUM',
    expectedOutput: act.expectedOutput ?? '',
    evidenceTypes: act.evidenceTypes?.length ? act.evidenceTypes : parseEvidenceTypes(act.evidenceRequired),
  };
}

/** Generate calendar occurrence dates for preview */
export function calendarOccurrences(activity: WizardActivity, max = 8): Date[] {
  if (!activity.startDate || !activity.endDate) return [];
  const start = new Date(activity.startDate);
  const end = new Date(activity.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const dates: Date[] = [];
  const cursor = new Date(start);

  const stepDays = (() => {
    switch (activity.frequency) {
      case 'Daily': return 1;
      case 'Weekly': return 7;
      case 'Monthly': return 30;
      case 'Quarterly': return 90;
      default: return 0;
    }
  })();

  if (stepDays === 0) {
    dates.push(new Date(start));
    return dates;
  }

  while (cursor <= end && dates.length < max) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + stepDays);
  }
  return dates;
}

export const WIZARD_BOOTSTRAP_KEY = 'ap-wizard-bootstrap';
