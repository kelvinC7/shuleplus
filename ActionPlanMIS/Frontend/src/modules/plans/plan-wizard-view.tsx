'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Plus,
  Trash2,
  X,
  ChevronRight,
} from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { RWANDA_STRATEGIC_PILLARS, DEPARTMENTS, FUNDING_SOURCES } from '@/lib/strategic-pillars';
import { formatRwf } from '@/lib/format-rwf';
import type { Category } from '@/types';
import {
  WIZARD_STEPS,
  WIZARD_BOOTSTRAP_KEY,
  PLAN_OWNER_ROLES,
  FREQUENCY_OPTIONS,
  EVIDENCE_OPTIONS,
  MEASUREMENT_INDICATORS,
  UNIT_OPTIONS,
  DURATION_OPTIONS,
  emptyWizardState,
  buildWizardFromTemplate,
  buildWizardFromPlan,
  encodeWizardDescription,
  academicYearDates,
  uid,
  emptyObjective,
  emptyActivityBudget,
  ensureActivityBudgets,
  totalWizardBudget,
  activityBudgetTotal,
  objectiveKpiCount,
  calendarOccurrences,
  staffReactKey,
  type WizardState,
  type WizardGoal,
  type WizardObjective,
  type WizardActivity,
  type WizardActivityBudget,
  type StaffOption,
  type WizardPersistedMeta,
  type AcademicSettings,
  applyAcademicSettings,
} from '@/lib/plan-wizard-types';

interface Props {
  planId?: string;
  templateId?: string;
}

function academicYearOptions() {
  const base = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const y = base - 2 + i;
    return `${y}-${y + 1}`;
  });
}

function buildTaskDescription(act: WizardActivity, budget?: WizardActivityBudget) {
  const total = budget?.requiresBudget ? budget.items.reduce((s, i) => s + i.amount, 0) : 0;
  return [
    `@obj:${act.objectiveId}`,
    act.description.trim(),
    act.supportTeam.length > 0 && `Support: ${act.supportTeam.join(', ')}`,
    act.reviewer && `Reviewer: ${act.reviewer}`,
    act.notifyTeam && `Notify team: yes`,
    act.frequency && `Frequency: ${act.frequency}`,
    act.expectedOutput && `Expected output: ${act.expectedOutput}`,
    act.evidenceTypes.length > 0 && `Verification: ${act.evidenceTypes.join(', ')}`,
    total > 0 && `Budget: ${total}`,
    budget?.fundingSource && `Funding: ${budget.fundingSource}`,
    budget?.requiresBudget && budget.items.length > 0 &&
      `Budget items: ${budget.items.map((i) => `${i.label}=${i.amount}`).join('; ')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPersistedMeta(state: WizardState): WizardPersistedMeta {
  return {
    visibility: state.basic.visibility,
    goals: state.goals,
    academicYear: state.basic.academicYear,
    term: state.basic.term,
    planOwner: state.basic.planOwner,
    pillarId: state.basic.pillarId,
    durationType: state.basic.durationType,
  };
}

function buildPlanPayload(state: WizardState) {
  const { basic, goals, activities } = state;
  const selected = activities.filter((a) => a.selected);
  const totalBudget = totalWizardBudget(state);
  const meta = buildPersistedMeta(state);
  return {
    title: basic.title.trim(),
    description: encodeWizardDescription(basic.description, meta),
    categoryId: basic.categoryId || undefined,
    department: basic.department || undefined,
    priority: basic.priority,
    responsiblePerson: basic.planOwner,
    startDate: basic.startDate,
    dueDate: basic.endDate,
    budget: totalBudget,
    expectedOutcome: goals.map((g) => g.title).join('; ') || basic.title,
    periodType: 'ANNUAL' as const,
    periodYear: parseInt(basic.academicYear.split('-')[0], 10) || new Date().getFullYear(),
  };
}

export function PlanWizardView({ planId, templateId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(planId);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(emptyWizardState);
  const [loading, setLoading] = useState(Boolean(planId || templateId));
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [existingTaskIds, setExistingTaskIds] = useState<string[]>([]);
  const [activityModal, setActivityModal] = useState<{ mode: 'add' | 'edit'; activity?: WizardActivity; objectiveId?: string; goalId?: string } | null>(null);
  const [objectiveModal, setObjectiveModal] = useState<{ mode: 'add' | 'edit'; goalId: string; objective?: WizardObjective } | null>(null);
  const [budgetActivityIndex, setBudgetActivityIndex] = useState(0);

  const selectedPillar = RWANDA_STRATEGIC_PILLARS.find((p) => p.id === state.basic.pillarId);
  const selectedActivities = useMemo(() => state.activities.filter((a) => a.selected), [state.activities]);
  const totalBudget = useMemo(() => totalWizardBudget(state), [state]);

  useEffect(() => {
    apApi.listCategories().then(({ data }) => setCategories(data.data ?? [])).catch(console.error);
    apApi.listStaff().then(({ data }) => setStaff(data.data ?? [])).catch(() => setStaff([]));
    apApi.getAcademicSettings().then(({ data }) => setAcademicSettings(data.data ?? null)).catch(() => setAcademicSettings(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (planId) {
        try {
          const { data } = await apApi.getPlan(planId);
          if (cancelled) return;
          setState(ensureActivityBudgets(buildWizardFromPlan(data.data)));
          setExistingTaskIds((data.data.tasks ?? []).map((t) => t.id));
        } catch (e) {
          console.error(e);
          alert('Failed to load action plan.');
          router.push('/plans');
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      try {
        const raw = sessionStorage.getItem(WIZARD_BOOTSTRAP_KEY);
        if (raw) {
          sessionStorage.removeItem(WIZARD_BOOTSTRAP_KEY);
          const parsed = JSON.parse(raw) as { templateId?: string; state: WizardState };
          if (parsed.state) {
            if (!cancelled) setState(ensureActivityBudgets(parsed.state));
            if (!cancelled) setLoading(false);
            return;
          }
        }
      } catch {
        sessionStorage.removeItem(WIZARD_BOOTSTRAP_KEY);
      }

      if (templateId) {
        try {
          const { data } = await apApi.getTemplate(templateId);
          if (!cancelled) setState(ensureActivityBudgets(buildWizardFromTemplate(data.data)));
        } catch (e) {
          console.error(e);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(false);
    }

    void init();
    return () => { cancelled = true; };
  }, [planId, templateId, router]);

  useEffect(() => {
    if (!academicSettings || planId) return;
    setState((prev) => ({
      ...prev,
      basic: applyAcademicSettings(prev.basic, academicSettings),
    }));
  }, [academicSettings, planId]);

  const updateBasic = useCallback((patch: Partial<WizardState['basic']>) => {
    setState((prev) => ({ ...prev, basic: { ...prev.basic, ...patch } }));
  }, []);

  const handleAcademicYearChange = useCallback((academicYear: string) => {
    const dates = academicYearDates(academicYear);
    setState((prev) => ({
      ...prev,
      basic: { ...prev.basic, academicYear, startDate: dates.startDate, endDate: dates.endDate },
    }));
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(state.basic.title.trim() && state.basic.pillarId && state.basic.startDate && state.basic.endDate);
      case 1:
        return state.goals.length > 0 && state.goals.every((g) => g.title.trim());
      case 2:
        return state.goals.every((g) => g.objectives.length > 0 && g.objectives.every((o) => o.title.trim() && o.baseline.trim() && o.target.trim()));
      case 3:
        return selectedActivities.length > 0;
      default:
        return true;
    }
  }, [step, state.basic, state.goals, selectedActivities.length]);

  async function persistPlan(fullSave: boolean) {
    setSaving(true);
    try {
      const payload = buildPlanPayload(state);
      let targetPlanId = planId;

      if (isEdit && planId) {
        await apApi.updatePlan(planId, payload);
        if (!fullSave) {
          router.push(`/plans/${planId}`);
          return;
        }
        for (const taskId of existingTaskIds) {
          try { await apApi.deleteTask(taskId); } catch { /* ignore */ }
        }
      } else {
        const { data } = await apApi.createPlan(payload);
        targetPlanId = data.data.id;
      }

      if (!targetPlanId) throw new Error('Missing plan id');

      if (fullSave) {
        for (const act of selectedActivities) {
          const budget = state.activityBudgets.find((b) => b.activityId === act.id);
          await apApi.createTask(targetPlanId, {
            title: act.title,
            owner: act.owner || undefined,
            description: buildTaskDescription(act, budget),
            startDate: act.startDate || state.basic.startDate,
            dueDate: act.endDate || state.basic.endDate,
            status: 'TODO',
          });
        }

        if (!isEdit) {
          for (const goal of state.goals) {
            for (const obj of goal.objectives) {
              if (!obj.title.trim()) continue;
              await apApi.createKpi(targetPlanId, {
                name: obj.measurementIndicator || obj.title,
                target: Number(obj.target) || 100,
                currentValue: Number(obj.baseline) || 0,
                unit: obj.unit,
                description: [
                  obj.description,
                  `Baseline: ${obj.baseline}`,
                  obj.measurementIndicator ? `Indicator: ${obj.measurementIndicator}` : '',
                ].filter(Boolean).join('\n'),
              });
            }
          }
        }

        if (totalBudget > 0) {
          try {
            await apApi.upsertBudget(targetPlanId, {
              category: 'general',
              allocated: totalBudget,
              spent: 0,
              committed: 0,
              fiscalYear: parseInt(state.basic.academicYear.split('-')[0], 10),
            });
          } catch { /* budget permission may be missing */ }
        }
      }

      router.push(`/plans/${targetPlanId}`);
    } catch (e) {
      console.error(e);
      alert(isEdit ? 'Failed to save action plan.' : 'Failed to create action plan. Check required fields and try again.');
    } finally {
      setSaving(false);
    }
  }

  function addGoal() {
    setState((prev) => ({
      ...prev,
      goals: [...prev.goals, { id: uid('goal'), title: '', objectives: [] }],
    }));
  }

  function updateGoal(goalId: string, patch: Partial<WizardGoal>) {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
    }));
  }

  function deleteGoal(goalId: string) {
    setState((prev) => {
      const actIds = prev.activities.filter((a) => a.goalId === goalId).map((a) => a.id);
      return {
        ...prev,
        goals: prev.goals.filter((g) => g.id !== goalId),
        activities: prev.activities.filter((a) => a.goalId !== goalId),
        activityBudgets: prev.activityBudgets.filter((b) => !actIds.includes(b.activityId)),
      };
    });
  }

  function duplicateGoal(goal: WizardGoal) {
    const newGoalId = uid('goal');
    const objMap = new Map<string, string>();
    const newObjectives = goal.objectives.map((o) => {
      const newId = uid('obj');
      objMap.set(o.id, newId);
      return { ...o, id: newId };
    });
    setState((prev) => {
      const duplicatedActs = prev.activities
        .filter((a) => a.goalId === goal.id)
        .map((a) => {
          const newActId = uid('act');
          return { oldId: a.id, act: { ...a, id: newActId, goalId: newGoalId, objectiveId: objMap.get(a.objectiveId) ?? a.objectiveId } };
        });
      return {
        ...prev,
        goals: [...prev.goals, { ...goal, id: newGoalId, title: `${goal.title} (copy)`, objectives: newObjectives }],
        activities: [...prev.activities, ...duplicatedActs.map(({ act }) => act)],
        activityBudgets: [
          ...prev.activityBudgets,
          ...duplicatedActs.map(({ oldId, act }) => {
            const source = prev.activityBudgets.find((b) => b.activityId === oldId);
            return source
              ? { ...source, activityId: act.id, items: source.items.map((i) => ({ ...i, id: uid('bitem') })) }
              : emptyActivityBudget(act.id);
          }),
        ],
      };
    });
  }

  function saveObjective(goalId: string, objective: WizardObjective) {
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === goalId);
      if (!goal) return prev;
      const exists = goal.objectives.some((o) => o.id === objective.id);
      return {
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                objectives: exists
                  ? g.objectives.map((o) => (o.id === objective.id ? objective : o))
                  : [...g.objectives, objective],
              }
            : g
        ),
      };
    });
    setObjectiveModal(null);
  }

  function deleteObjective(goalId: string, objId: string) {
    setState((prev) => {
      const actIds = prev.activities.filter((a) => a.objectiveId === objId).map((a) => a.id);
      return {
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId ? { ...g, objectives: g.objectives.filter((o) => o.id !== objId) } : g
        ),
        activities: prev.activities.filter((a) => a.objectiveId !== objId),
        activityBudgets: prev.activityBudgets.filter((b) => !actIds.includes(b.activityId)),
      };
    });
  }

  function toggleActivitySelected(id: string) {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)),
    }));
  }

  function saveActivity(activity: WizardActivity) {
    setState((prev) => {
      const exists = prev.activities.some((a) => a.id === activity.id);
      const hasBudget = prev.activityBudgets.some((b) => b.activityId === activity.id);
      return {
        ...prev,
        activities: exists
          ? prev.activities.map((a) => (a.id === activity.id ? activity : a))
          : [...prev.activities, activity],
        activityBudgets: hasBudget ? prev.activityBudgets : [...prev.activityBudgets, emptyActivityBudget(activity.id)],
      };
    });
    setActivityModal(null);
  }

  function deleteActivity(id: string) {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
      activityBudgets: prev.activityBudgets.filter((b) => b.activityId !== id),
    }));
  }

  function updateActivityBudgetEntry(activityId: string, patch: Partial<WizardActivityBudget>) {
    setState((prev) => ({
      ...prev,
      activityBudgets: prev.activityBudgets.map((b) =>
        b.activityId === activityId ? { ...b, ...patch } : b
      ),
    }));
  }

  function addBudgetItem(activityId: string, label: string, amount: number) {
    if (!label.trim()) return;
    setState((prev) => ({
      ...prev,
      activityBudgets: prev.activityBudgets.map((b) =>
        b.activityId === activityId
          ? { ...b, items: [...b.items, { id: uid('bitem'), label: label.trim(), amount }] }
          : b
      ),
    }));
  }

  function removeBudgetItem(activityId: string, itemId: string) {
    setState((prev) => ({
      ...prev,
      activityBudgets: prev.activityBudgets.map((b) =>
        b.activityId === activityId ? { ...b, items: b.items.filter((i) => i.id !== itemId) } : b
      ),
    }));
  }

  function updateActivityTeam(id: string, patch: Partial<Pick<WizardActivity, 'owner' | 'supportTeam' | 'reviewer' | 'notifyTeam'>>) {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }

  if (loading) {
    return (
      <ApPageLayout title={isEdit ? 'Edit Action Plan' : 'Create Action Plan'}>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={18} />
          Loading wizard…
        </div>
      </ApPageLayout>
    );
  }

  return (
    <ApPageLayout
      title={isEdit ? 'Edit Action Plan' : 'Create Action Plan'}
      subtitle="Eight-step wizard aligned with Rwanda school strategic planning"
    >
      <StepIndicator current={step} />

      <div className="card mt-6">
        {step === 0 && (
          <StepBasicInfo
            basic={state.basic}
            categories={categories}
            staff={staff}
            academicSettings={academicSettings}
            selectedPillar={selectedPillar}
            onChange={updateBasic}
            onAcademicYearChange={handleAcademicYearChange}
          />
        )}

        {step === 1 && (
          <StepGoals
            goals={state.goals}
            onAddGoal={addGoal}
            onUpdateGoal={updateGoal}
            onDeleteGoal={deleteGoal}
            onDuplicateGoal={duplicateGoal}
          />
        )}

        {step === 2 && (
          <StepObjectives
            goals={state.goals}
            onAdd={(goalId) => setObjectiveModal({ mode: 'add', goalId })}
            onEdit={(goalId, objective) => setObjectiveModal({ mode: 'edit', goalId, objective })}
            onDelete={deleteObjective}
          />
        )}

        {step === 3 && (
          <StepActivities
            goals={state.goals}
            activities={state.activities}
            onToggle={toggleActivitySelected}
            onAdd={(goalId, objectiveId) => setActivityModal({ mode: 'add', goalId, objectiveId })}
            onEdit={(activity) => setActivityModal({ mode: 'edit', activity })}
            onDelete={deleteActivity}
          />
        )}

        {step === 4 && (
          <StepBudget
            activities={selectedActivities}
            activityBudgets={state.activityBudgets}
            totalBudget={totalBudget}
            currentIndex={budgetActivityIndex}
            onIndexChange={setBudgetActivityIndex}
            onUpdate={updateActivityBudgetEntry}
            onAddItem={addBudgetItem}
            onRemoveItem={removeBudgetItem}
          />
        )}

        {step === 5 && (
          <StepTeam
            goals={state.goals}
            activities={selectedActivities}
            staff={staff}
            onUpdate={updateActivityTeam}
          />
        )}

        {step === 6 && (
          <StepCalendar activities={selectedActivities} />
        )}

        {step === 7 && (
          <StepReview
            state={state}
            selectedCount={selectedActivities.length}
            totalBudget={totalBudget}
            selectedPillar={selectedPillar}
          />
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? router.push('/plans') : setStep(step - 1))}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        <div className="flex flex-wrap gap-2">
          {step === WIZARD_STEPS.length - 1 ? (
            <>
              <button
                type="button"
                disabled={saving || !state.basic.title.trim()}
                onClick={() => void persistPlan(false)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saving || !canNext || selectedActivities.length === 0}
                onClick={() => void persistPlan(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {isEdit ? 'Save Action Plan' : 'Create Action Plan'}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
            >
              Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {objectiveModal && (
        <ObjectiveFormModal
          mode={objectiveModal.mode}
          goalId={objectiveModal.goalId}
          objective={objectiveModal.objective}
          onClose={() => setObjectiveModal(null)}
          onSave={saveObjective}
        />
      )}

      {activityModal && (
        <ActivityFormModal
          mode={activityModal.mode}
          activity={activityModal.activity}
          goalId={activityModal.goalId ?? activityModal.activity?.goalId ?? ''}
          objectiveId={activityModal.objectiveId ?? activityModal.activity?.objectiveId ?? ''}
          defaultDates={{ start: state.basic.startDate, end: state.basic.endDate }}
          staff={staff}
          onClose={() => setActivityModal(null)}
          onSave={saveActivity}
        />
      )}
    </ApPageLayout>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[640px] items-center">
        {WIZARD_STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                    active ? 'bg-navy text-white shadow-md' : done ? 'bg-primary text-navy' : 'bg-slate-100 text-muted'
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span className={`max-w-[88px] text-center text-[10px] font-semibold leading-tight sm:text-xs ${active ? 'text-navy' : 'text-muted'}`}>
                  {label}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`mx-1 mb-5 h-0.5 flex-1 rounded ${i < current ? 'bg-primary' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepBasicInfo({
  basic,
  categories,
  staff,
  academicSettings,
  selectedPillar,
  onChange,
  onAcademicYearChange,
}: {
  basic: WizardState['basic'];
  categories: Category[];
  staff: StaffOption[];
  academicSettings: AcademicSettings | null;
  selectedPillar: (typeof RWANDA_STRATEGIC_PILLARS)[number] | undefined;
  onChange: (patch: Partial<WizardState['basic']>) => void;
  onAcademicYearChange: (year: string) => void;
}) {
  const yearOptions = academicSettings?.academicYears?.length
    ? academicSettings.academicYears
    : academicYearOptions();

  return (
    <div className="space-y-6">
      {academicSettings && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-xs font-semibold text-navy">Organization settings</span>
          <span className="text-xs text-muted">
            Academic year &amp; term synced from your school profile
            {academicSettings.currentAcademicYear ? ` · Current: ${academicSettings.currentAcademicYear}` : ''}
            {academicSettings.currentTerm ? ` · ${academicSettings.currentTerm}` : ''}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Action Plan Title *" className="sm:col-span-2">
        <input className="ap-input" value={basic.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="School Improvement Plan 2026–2027" />
      </Field>
      <Field label="Academic Year *">
        <select className="ap-input" value={basic.academicYear} onChange={(e) => onAcademicYearChange(e.target.value)}>
          {yearOptions.map((y) => (
            <option key={`year-${y}`} value={y}>{y}</option>
          ))}
        </select>
      </Field>
      <Field label="Duration *" className="sm:col-span-2">
        <div className="flex flex-wrap gap-3">
          {DURATION_OPTIONS.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
              <input
                type="radio"
                name="durationType"
                checked={basic.durationType === d.id}
                onChange={() => onChange({ durationType: d.id, term: d.term })}
              />
              {d.label}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Start Date *">
        <input type="date" className="ap-input" value={basic.startDate} onChange={(e) => onChange({ startDate: e.target.value, durationType: 'custom', term: 'Custom' })} />
      </Field>
      <Field label="End Date *">
        <input type="date" className="ap-input" value={basic.endDate} onChange={(e) => onChange({ endDate: e.target.value, durationType: 'custom', term: 'Custom' })} />
      </Field>
      <Field label="Plan Owner">
        <select className="ap-input" value={basic.planOwner} onChange={(e) => onChange({ planOwner: e.target.value })}>
          <optgroup label="Roles">
            {PLAN_OWNER_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </optgroup>
          {staff.length > 0 && (
            <optgroup label="Staff">
              {staff.map((s) => (
                <option key={staffReactKey(s)} value={s.name}>{s.name}{s.department ? ` (${s.department})` : ''}</option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>
      <Field label="Priority">
        <select className="ap-input" value={basic.priority} onChange={(e) => onChange({ priority: e.target.value })}>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea className="ap-input min-h-[80px]" value={basic.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Brief context and rationale for this action plan" />
      </Field>
      <Field label="Visibility" className="sm:col-span-2">
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-navy">
            <input type="radio" name="visibility" checked={basic.visibility === 'management'} onChange={() => onChange({ visibility: 'management' })} />
            Management only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-navy">
            <input type="radio" name="visibility" checked={basic.visibility === 'all_staff'} onChange={() => onChange({ visibility: 'all_staff' })} />
            All staff
          </label>
        </div>
      </Field>
      <Field label="Strategic Pillar *" className="sm:col-span-2">
        <select className="ap-input" value={basic.pillarId} onChange={(e) => onChange({ pillarId: e.target.value })}>
          {RWANDA_STRATEGIC_PILLARS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {selectedPillar ? (
          <p className="mt-2 text-xs text-muted">Themes: {selectedPillar.themes.slice(0, 4).join(' · ')}</p>
        ) : null}
      </Field>
      <Field label="Department">
        <select className="ap-input" value={basic.department} onChange={(e) => onChange({ department: e.target.value })}>
          <option value="">Select department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="Category">
        <select className="ap-input" value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      </div>
    </div>
  );
}

function StepGoals({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDuplicateGoal,
}: {
  goals: WizardGoal[];
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<WizardGoal>) => void;
  onDeleteGoal: (id: string) => void;
  onDuplicateGoal: (goal: WizardGoal) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Add strategic goals for your action plan. You will define objectives under each goal in the next step.</p>
      {goals.length === 0 && (
        <p className="text-sm text-muted">No goals yet. Add at least one strategic goal to continue.</p>
      )}
      {goals.map((goal, gi) => (
        <div key={goal.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-navy">Goal {gi + 1}</p>
            <div className="flex gap-1">
              <IconBtn onClick={() => onDuplicateGoal(goal)} title="Duplicate goal"><Copy size={14} /></IconBtn>
              <IconBtn onClick={() => onDeleteGoal(goal.id)} title="Delete goal"><Trash2 size={14} /></IconBtn>
            </div>
          </div>
          <Field label="Strategic goal *">
            <input
              className="ap-input"
              value={goal.title}
              onChange={(e) => onUpdateGoal(goal.id, { title: e.target.value })}
              placeholder="Improve Student Academic Performance"
            />
          </Field>
          <p className="mt-2 text-xs text-muted">{goal.objectives.length} objective{goal.objectives.length === 1 ? '' : 's'} (add in next step)</p>
        </div>
      ))}
      <button type="button" onClick={onAddGoal} className="btn-secondary inline-flex items-center gap-2">
        <Plus size={16} /> Add Another Goal
      </button>
    </div>
  );
}

function StepObjectives({
  goals,
  onAdd,
  onEdit,
  onDelete,
}: {
  goals: WizardGoal[];
  onAdd: (goalId: string) => void;
  onEdit: (goalId: string, objective: WizardObjective) => void;
  onDelete: (goalId: string, objId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Define measurable objectives under each goal with baseline and target values.</p>
      {goals.map((goal, gi) => (
        <div key={goal.id} className="rounded-xl border border-slate-100 p-4">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Goal {gi + 1}</p>
            <h3 className="text-sm font-semibold text-navy">{goal.title || 'Untitled goal'}</h3>
          </div>
          <div className="space-y-2">
            {goal.objectives.length === 0 ? (
              <p className="text-xs text-muted italic">No objectives yet</p>
            ) : (
              goal.objectives.map((obj, oi) => (
                <div key={obj.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy">
                      {String(oi + 1).padStart(2, '0')} {obj.title || 'Untitled objective'}
                    </p>
                    <p className="text-xs text-muted">
                      Baseline: {obj.baseline || '—'}{obj.unit ? ` ${obj.unit}` : ''} · Target: {obj.target || '—'}{obj.unit ? ` ${obj.unit}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => onEdit(goal.id, obj)} className="text-xs font-semibold text-primary">Edit</button>
                    <IconBtn onClick={() => onDelete(goal.id, obj.id)} title="Delete"><Trash2 size={12} /></IconBtn>
                  </div>
                </div>
              ))
            )}
          </div>
          <button type="button" onClick={() => onAdd(goal.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Plus size={14} /> Add Objective
          </button>
        </div>
      ))}
    </div>
  );
}

function StepActivities({
  goals,
  activities,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: {
  goals: WizardGoal[];
  activities: WizardActivity[];
  onToggle: (id: string) => void;
  onAdd: (goalId: string, objectiveId: string) => void;
  onEdit: (activity: WizardActivity) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Select activities to include in your plan, or add new activities per objective.</p>
      {goals.map((goal) => (
        <div key={goal.id}>
          <h3 className="mb-2 text-sm font-semibold text-navy">{goal.title || 'Untitled goal'}</h3>
          {goal.objectives.map((obj) => {
            const objActs = activities.filter((a) => a.objectiveId === obj.id);
            return (
              <div key={obj.id} className="mb-4 ml-2 border-l-2 border-primary/30 pl-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted">{obj.title || 'Untitled objective'}</p>
                  <button type="button" onClick={() => onAdd(goal.id, obj.id)} className="text-xs font-semibold text-primary">
                    + Add New Activity
                  </button>
                </div>
                {objActs.length === 0 ? (
                  <p className="text-xs text-muted italic">No activities yet</p>
                ) : (
                  <div className="space-y-2">
                    {objActs.map((act) => (
                      <label key={act.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
                        <input type="checkbox" checked={act.selected} onChange={() => onToggle(act.id)} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-navy">{act.title}</p>
                          {act.description && <p className="text-xs text-muted line-clamp-2">{act.description}</p>}
                          <p className="mt-1 text-[11px] text-muted">{act.frequency}{act.priority ? ` · ${act.priority}` : ''}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <IconBtn onClick={(e) => { e.preventDefault(); onEdit(act); }} title="Edit"><ChevronRight size={14} /></IconBtn>
                          <IconBtn onClick={(e) => { e.preventDefault(); onDelete(act.id); }} title="Delete"><Trash2 size={14} /></IconBtn>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function StepBudget({
  activities,
  activityBudgets,
  totalBudget,
  currentIndex,
  onIndexChange,
  onUpdate,
  onAddItem,
  onRemoveItem,
}: {
  activities: WizardActivity[];
  activityBudgets: WizardActivityBudget[];
  totalBudget: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onUpdate: (activityId: string, patch: Partial<WizardActivityBudget>) => void;
  onAddItem: (activityId: string, label: string, amount: number) => void;
  onRemoveItem: (activityId: string, itemId: string) => void;
}) {
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  const act = activities[currentIndex];
  const budget = act ? activityBudgets.find((b) => b.activityId === act.id) ?? emptyActivityBudget(act.id) : null;
  const activityTotal = act ? activityBudgetTotal(activityBudgets, act.id) : 0;

  if (activities.length === 0) {
    return <p className="text-sm text-muted">No selected activities. Go back to the Activities step and select at least one.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy/[0.04] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total planned budget</p>
          <p className="text-xl font-bold text-navy">{formatRwf(totalBudget)} RWF</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <button type="button" disabled={currentIndex === 0} onClick={() => onIndexChange(currentIndex - 1)} className="btn-secondary px-2 py-1 disabled:opacity-40">Prev</button>
          <span>Activity {currentIndex + 1} of {activities.length}</span>
          <button type="button" disabled={currentIndex >= activities.length - 1} onClick={() => onIndexChange(currentIndex + 1)} className="btn-secondary px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {act && budget && (
        <div className="rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Activity Budget</p>
          <h3 className="mt-1 text-base font-semibold text-navy">{act.title}</h3>

          <Field label="Does this activity require a budget?" className="mt-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                <input type="radio" name={`budget-${act.id}`} checked={budget.requiresBudget} onChange={() => onUpdate(act.id, { requiresBudget: true })} />
                Yes
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                <input type="radio" name={`budget-${act.id}`} checked={!budget.requiresBudget} onChange={() => onUpdate(act.id, { requiresBudget: false, items: [] })} />
                No
              </label>
            </div>
          </Field>

          {budget.requiresBudget && (
            <>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-navy">Budget Items</p>
                {budget.items.length === 0 ? (
                  <p className="text-xs text-muted italic">No budget items yet</p>
                ) : (
                  budget.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <span className="text-sm text-navy">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-navy">{formatRwf(item.amount)} RWF</span>
                        <IconBtn onClick={() => onRemoveItem(act.id, item.id)} title="Remove"><X size={14} /></IconBtn>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <input className="ap-input" placeholder="Item name (e.g. Learning Materials)" value={newItemLabel} onChange={(e) => setNewItemLabel(e.target.value)} />
                <input type="number" min={0} className="ap-input" placeholder="Amount" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    onAddItem(act.id, newItemLabel, Number(newItemAmount) || 0);
                    setNewItemLabel('');
                    setNewItemAmount('');
                  }}
                >
                  + Add Budget Item
                </button>
              </div>

              <p className="mt-4 text-sm font-semibold text-navy">Total Planned Budget: {formatRwf(activityTotal)} RWF</p>

              <Field label="Funding Source" className="mt-3">
                <select className="ap-input" value={budget.fundingSource} onChange={(e) => onUpdate(act.id, { fundingSource: e.target.value })}>
                  {FUNDING_SOURCES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StepTeam({
  goals,
  activities,
  staff,
  onUpdate,
}: {
  goals: WizardGoal[];
  activities: WizardActivity[];
  staff: StaffOption[];
  onUpdate: (id: string, patch: Partial<Pick<WizardActivity, 'owner' | 'supportTeam' | 'reviewer' | 'notifyTeam'>>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Assign responsibility for each selected activity. Each activity must have a responsible person.</p>
      {goals.map((goal) => {
        const goalActs = activities.filter((a) => a.goalId === goal.id);
        if (goalActs.length === 0) return null;
        return (
          <div key={goal.id} className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-3 text-sm font-semibold text-navy">{goal.title || 'Untitled goal'}</h3>
            <div className="space-y-4">
              {goalActs.map((act) => (
                <div key={act.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                  <p className="mb-3 text-sm font-semibold text-navy">{act.title}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Responsible Person *">
                      <StaffSelect staff={staff} value={act.owner} onChange={(v) => onUpdate(act.id, { owner: v })} />
                    </Field>
                    <Field label="Reviewer">
                      <StaffSelect staff={staff} value={act.reviewer} onChange={(v) => onUpdate(act.id, { reviewer: v })} allowEmpty />
                    </Field>
                    <Field label="Supporting Team" className="sm:col-span-2">
                      <StaffMultiSelect
                        staff={staff}
                        selected={act.supportTeam}
                        onChange={(names) => onUpdate(act.id, { supportTeam: names })}
                      />
                    </Field>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-navy sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={act.notifyTeam}
                        onChange={(e) => onUpdate(act.id, { notifyTeam: e.target.checked })}
                      />
                      Notify assigned team when Action Plan is activated
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepCalendar({ activities }: { activities: WizardActivity[] }) {
  const recurring = activities.filter((a) => a.frequency !== 'One-time' && a.startDate);

  if (recurring.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">No recurring activities to preview. Weekly, monthly, or daily activities will appear on the school calendar when the plan is activated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Preview of recurring schedule. ShulePlus will automatically create calendar entries based on activity frequency and dates.</p>
      {recurring.map((act) => {
        const occurrences = calendarOccurrences(act, 6);
        const first = occurrences[0];
        const monthLabel = first
          ? first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : 'Schedule preview';
        return (
          <div key={act.id} className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Calendar</p>
                <h3 className="text-sm font-semibold text-navy">{act.title}</h3>
              </div>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-navy">{act.frequency}</span>
            </div>
            <p className="mb-3 text-xs text-muted">{monthLabel}</p>
            <div className="flex flex-wrap gap-2">
              {occurrences.map((date) => (
                <div key={date.toISOString()} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase text-muted">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                  <p className="text-sm font-bold text-navy">{date.getDate()}</p>
                  <p className="text-[10px] text-muted">{act.title.slice(0, 18)}{act.title.length > 18 ? '…' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepReview({
  state,
  selectedCount,
  totalBudget,
  selectedPillar,
}: {
  state: WizardState;
  selectedCount: number;
  totalBudget: number;
  selectedPillar: (typeof RWANDA_STRATEGIC_PILLARS)[number] | undefined;
}) {
  const objectiveCount = state.goals.reduce((s, g) => s + g.objectives.length, 0);
  const kpiCount = objectiveKpiCount(state.goals);
  const teamCount = new Set(
    state.activities.filter((a) => a.selected).flatMap((a) => [a.owner, ...a.supportTeam].filter(Boolean))
  ).size;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-navy">Review Action Plan</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Strategic Goals" value={String(state.goals.length)} />
        <SummaryCard label="Objectives" value={String(objectiveCount)} />
        <SummaryCard label="Activities" value={String(selectedCount)} />
        <SummaryCard label="KPIs" value={String(kpiCount)} />
        <SummaryCard label="Planned Budget" value={`${formatRwf(totalBudget)} RWF`} />
        <SummaryCard label="Team Members" value={String(teamCount)} />
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Title</dt><dd className="font-medium text-navy">{state.basic.title || '—'}</dd></div>
          <div><dt className="text-xs text-muted">Academic year</dt><dd className="font-medium text-navy">{state.basic.academicYear}</dd></div>
          <div><dt className="text-xs text-muted">Duration</dt><dd className="font-medium text-navy">{state.basic.term}</dd></div>
          <div><dt className="text-xs text-muted">Plan owner</dt><dd className="font-medium text-navy">{state.basic.planOwner}</dd></div>
          <div><dt className="text-xs text-muted">Pillar</dt><dd className="font-medium text-navy">{selectedPillar?.name ?? state.basic.pillarId}</dd></div>
          <div><dt className="text-xs text-muted">Period</dt><dd className="font-medium text-navy">{state.basic.startDate} → {state.basic.endDate}</dd></div>
        </dl>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Goals</p>
          {state.goals.map((goal) => {
            const actCount = state.activities.filter((a) => a.selected && a.goalId === goal.id).length;
            return (
              <div key={goal.id} className="mb-2 text-sm text-navy">
                ✓ {goal.title || 'Untitled goal'}
                <span className="ml-2 text-xs text-muted">{goal.objectives.length} Objectives · {actCount} Activities</span>
              </div>
            );
          })}
        </div>
        {state.basic.description && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <dt className="text-xs text-muted">Description</dt>
            <dd className="mt-1 text-navy">{state.basic.description}</dd>
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectiveFormModal({
  mode,
  goalId,
  objective,
  onClose,
  onSave,
}: {
  mode: 'add' | 'edit';
  goalId: string;
  objective?: WizardObjective;
  onClose: () => void;
  onSave: (goalId: string, objective: WizardObjective) => void;
}) {
  const [form, setForm] = useState<WizardObjective>(
    objective ?? { ...emptyObjective(), id: uid('obj') }
  );
  const [customIndicator, setCustomIndicator] = useState(
    objective?.measurementIndicator && !MEASUREMENT_INDICATORS.includes(objective.measurementIndicator as typeof MEASUREMENT_INDICATORS[number])
      ? objective.measurementIndicator
      : ''
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const measurementIndicator =
      form.measurementIndicator === 'Custom Indicator' ? customIndicator.trim() : form.measurementIndicator;
    onSave(goalId, { ...form, measurementIndicator: measurementIndicator || form.title });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy">{mode === 'add' ? 'Add Objective' : 'Edit Objective'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Objective Name *">
            <input className="ap-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Improve Mathematics performance" required />
          </Field>
          <Field label="Description">
            <textarea className="ap-input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Improve Mathematics learning outcomes through remedial learning and regular assessments." />
          </Field>
          <Field label="Measurement Indicator">
            <select className="ap-input" value={form.measurementIndicator} onChange={(e) => setForm({ ...form, measurementIndicator: e.target.value })}>
              <option value="">Select indicator</option>
              {MEASUREMENT_INDICATORS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          {form.measurementIndicator === 'Custom Indicator' && (
            <Field label="Custom indicator">
              <input className="ap-input" value={customIndicator} onChange={(e) => setCustomIndicator(e.target.value)} />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Baseline">
              <div className="flex gap-2">
                <input className="ap-input" value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })} placeholder="48" />
                <select className="ap-input w-28" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Target">
              <div className="flex gap-2">
                <input className="ap-input" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="65" />
                <select className="ap-input w-28" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{mode === 'add' ? 'Add Objective' : 'Save Objective'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActivityFormModal({
  mode,
  activity,
  goalId,
  objectiveId,
  defaultDates,
  staff,
  onClose,
  onSave,
}: {
  mode: 'add' | 'edit';
  activity?: WizardActivity;
  goalId: string;
  objectiveId: string;
  defaultDates: { start: string; end: string };
  staff: StaffOption[];
  onClose: () => void;
  onSave: (a: WizardActivity) => void;
}) {
  const [form, setForm] = useState<WizardActivity>(
    activity ?? {
      id: uid('act'),
      goalId,
      objectiveId,
      title: '',
      description: '',
      selected: true,
      owner: '',
      supportTeam: [],
      reviewer: '',
      notifyTeam: true,
      startDate: defaultDates.start,
      endDate: defaultDates.end,
      frequency: 'Weekly',
      priority: 'HIGH',
      expectedOutput: '',
      evidenceTypes: [],
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleEvidence(type: string) {
    setForm((prev) => ({
      ...prev,
      evidenceTypes: prev.evidenceTypes.includes(type)
        ? prev.evidenceTypes.filter((t) => t !== type)
        : [...prev.evidenceTypes, type],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Activity name is required';
    if (!form.owner.trim()) next.owner = 'Select a responsible person';
    if (!form.startDate) next.startDate = 'Start date is required';
    if (!form.endDate) next.endDate = 'End date is required';
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      next.endDate = 'End date must be after start date';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      const modal = e.currentTarget.closest('.overflow-y-auto');
      modal?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors({});
    onSave({ ...form, goalId, objectiveId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy">{mode === 'add' ? 'Add New Activity' : 'Edit Activity'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {Object.keys(errors).length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:col-span-2">
              Please complete the required fields at the top of the form (activity name and responsible person).
            </div>
          )}
          <Field label="Activity Name *" className="sm:col-span-2">
            <input className="ap-input" value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrors((p) => ({ ...p, title: '' })); }} placeholder="Conduct Weekly Mathematics Remedial Classes" required />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea className="ap-input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Provide additional Mathematics support to students performing below the target." />
          </Field>
          <Field label="Start Date *">
            <input type="date" className="ap-input" value={form.startDate} onChange={(e) => { setForm({ ...form, startDate: e.target.value }); setErrors((p) => ({ ...p, startDate: '' })); }} required />
            {errors.startDate && <p className="mt-1 text-xs text-rose-600">{errors.startDate}</p>}
          </Field>
          <Field label="End Date *">
            <input type="date" className="ap-input" value={form.endDate} onChange={(e) => { setForm({ ...form, endDate: e.target.value }); setErrors((p) => ({ ...p, endDate: '' })); }} required />
            {errors.endDate && <p className="mt-1 text-xs text-rose-600">{errors.endDate}</p>}
          </Field>
          <Field label="Frequency">
            <select className="ap-input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Responsible Person *">
            <StaffSelect staff={staff} value={form.owner} onChange={(v) => { setForm({ ...form, owner: v }); setErrors((p) => ({ ...p, owner: '' })); }} placeholder="Select responsible person" />
            {errors.owner && <p className="mt-1 text-xs text-rose-600">{errors.owner}</p>}
          </Field>
          <Field label="Supporting Team" className="sm:col-span-2">
            <StaffMultiSelect staff={staff} selected={form.supportTeam} onChange={(names) => setForm({ ...form, supportTeam: names })} />
          </Field>
          <Field label="Priority">
            <select className="ap-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                <option key={p} value={p}>{p === 'HIGH' ? 'High' : p === 'MEDIUM' ? 'Medium' : p === 'LOW' ? 'Low' : 'Critical'}</option>
              ))}
            </select>
          </Field>
          <Field label="Expected Output" className="sm:col-span-2">
            <input className="ap-input" value={form.expectedOutput} onChange={(e) => setForm({ ...form, expectedOutput: e.target.value })} placeholder="At least 45 students receive weekly support." />
          </Field>
          <Field label="Evidence Required" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_OPTIONS.map((type) => {
                const selected = form.evidenceTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleEvidence(type)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? 'border-primary bg-primary/15 text-navy shadow-sm'
                        : 'border-slate-200 bg-white text-muted hover:border-primary/40 hover:text-navy'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Selected evidence can be uploaded later from the Evidence page or plan details.
            </p>
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{mode === 'add' ? 'Add Activity' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffMultiSelect({
  staff,
  selected,
  onChange,
}: {
  staff: StaffOption[];
  selected: string[];
  onChange: (names: string[]) => void;
}) {
  if (staff.length === 0) {
    return <p className="text-xs text-muted">No staff loaded — assign team members in the Team step.</p>;
  }
  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
      {staff.map((s) => {
        const checked = selected.includes(s.name);
        return (
          <label key={staffReactKey(s)} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-navy hover:bg-slate-50">
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? selected.filter((n) => n !== s.name) : [...selected, s.name])
              }
            />
            {s.name}{s.department ? ` (${s.department})` : ''}
          </label>
        );
      })}
    </div>
  );
}

function StaffSelect({
  staff,
  value,
  onChange,
  allowEmpty,
  placeholder,
}: {
  staff: StaffOption[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
  placeholder?: string;
}) {
  return (
    <select className="ap-input" value={value} onChange={(e) => onChange(e.target.value)} required={Boolean(placeholder) && !allowEmpty}>
      {(allowEmpty || placeholder) && (
        <option value="">{placeholder ?? '—'}</option>
      )}
      {staff.length === 0 ? (
        value ? <option value={value}>{value}</option> : null
      ) : (
        staff.map((s) => (
          <option key={staffReactKey(s)} value={s.name}>{s.name}{s.department ? ` (${s.department})` : ''}</option>
        ))
      )}
    </select>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 text-center">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-navy">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({ onClick, title, children }: { onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title} className="rounded p-1 text-muted hover:bg-slate-100 hover:text-navy">
      {children}
    </button>
  );
}
