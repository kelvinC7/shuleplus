'use client';

import { Minus, Plus } from 'lucide-react';
import { TextField, SelectField } from '@/components/form-fields';
import type { CourseConfig, CourseSchedulingRules, TeacherAssignment } from '@/types';
import {
  DEFAULT_SCHEDULING_RULES,
  PERIOD_OPTIONS,
  WEEKDAY_OPTIONS,
  courseConfigFromForm,
  rulesFromCourseConfig,
} from '@/utils/course-scheduling';
import {
  isValidCourseCode,
  normalizeCourseCode,
  previewAutoCourseCode,
} from '@/utils/course-code';
import { defaultCourseColor, nextUnusedCourseColor } from '@/utils/timetable';

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/60 pb-3">
      <h3 className="text-sm font-bold text-navy">{title}</h3>
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
    </div>
  );
}

function RadioCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
        checked
          ? 'border-primary/50 bg-primary/10 shadow-sm'
          : 'border-border bg-white hover:border-slate-300 hover:bg-slate-50/80'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          checked ? 'border-navy bg-navy' : 'border-slate-300 bg-white'
        }`}
      >
        {checked ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </button>
  );
}

function ChipToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
        checked
          ? 'border-primary bg-primary text-navy shadow-sm'
          : 'border-border bg-white text-muted hover:border-primary/40 hover:bg-primary/5'
      }`}
    >
      {label}
    </button>
  );
}

export function CourseSchedulingForm({
  course,
  rules,
  assignments,
  rooms,
  isNew,
  allCourses = [],
  onChange,
  onRulesChange,
}: {
  course: CourseConfig;
  rules: CourseSchedulingRules;
  assignments: TeacherAssignment[];
  rooms: string[];
  isNew: boolean;
  allCourses?: CourseConfig[];
  onChange: (next: CourseConfig) => void;
  onRulesChange: (next: CourseSchedulingRules) => void;
}) {
  const related = assignments.filter((a) => a.subjectName === course.subjectName);
  const teachers = [...new Set(related.map((a) => a.teacherName))];
  const classes = [...new Set(related.map((a) => a.className))];
  const codeMode = course.codeMode ?? 'AUTOMATIC';
  const existingCodes = allCourses
    .filter((c) => c.id !== course.id && c.courseCode)
    .map((c) => c.courseCode!) ;
  const autoPreview = previewAutoCourseCode(course.subjectName || 'Course', existingCodes);
  const codeLocked = !isNew && related.length > 0;

  function patchRules(patch: Partial<CourseSchedulingRules>) {
    onRulesChange({ ...rules, ...patch });
  }

  function setPeriodsPerWeek(value: number) {
    onChange({ ...course, periodsPerWeek: Math.max(1, Math.min(14, value)) });
  }

  const showDoubleOptions = rules.lessonDuration === 'DOUBLE' || rules.lessonDuration === 'FLEXIBLE';
  const showLabPicker = rules.roomRequirement === 'REQUIRE_LAB' || rules.roomRequirement === 'PREFER_LAB';

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader
          title="Report card category"
          description="Core subjects appear first on Academic student reports."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioCard
            label="Core course"
            description="Mathematics, languages, sciences, etc."
            checked={course.isCore !== false}
            onChange={() => onChange({ ...course, isCore: true })}
          />
          <RadioCard
            label="Non-core course"
            description="Electives, clubs, optional subjects."
            checked={course.isCore === false}
            onChange={() => onChange({ ...course, isCore: false })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Course information"
        />
        <div className="space-y-3">
          <TextField
            compact
            label="Course name"
            required
            value={course.subjectName}
            onChange={(v) => {
              const next = { ...course, subjectName: v };
              if ((next.codeMode ?? 'AUTOMATIC') === 'AUTOMATIC') {
                next.courseCode = previewAutoCourseCode(v, existingCodes);
              }
              if (!next.color) {
                next.color = nextUnusedCourseColor(allCourses.map((c) => c.color));
              }
              onChange(next);
            }}
            placeholder="e.g. Mathematics"
          />

          <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/60 px-3 py-2.5">
            <span
              className="h-8 w-8 shrink-0 rounded-lg border border-border"
              style={{
                backgroundColor:
                  course.color ||
                  nextUnusedCourseColor(allCourses.map((c) => c.color)) ||
                  defaultCourseColor(course.subjectName, allCourses.length),
              }}
            />
            <div>
              <p className="text-xs font-semibold text-navy">Timetable color</p>
              <p className="text-[11px] text-muted">Assigned automatically for this course</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-navy">Course Code</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['AUTOMATIC', 'Automatic'],
                  ['MANUAL', 'Manual'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={codeLocked && mode === 'MANUAL'}
                  onClick={() =>
                    onChange({
                      ...course,
                      codeMode: mode,
                      courseCode:
                        mode === 'AUTOMATIC'
                          ? autoPreview
                          : course.courseCode ?? autoPreview,
                    })
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    codeMode === mode
                      ? 'border-primary bg-primary/10 text-navy'
                      : 'border-border bg-white text-muted hover:border-primary/30'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>

            {codeMode === 'AUTOMATIC' ? (
              <div>
                <div className="rounded-xl border border-navy/20 bg-navy px-3 py-2.5 font-mono text-sm font-bold text-primary">
                  {course.courseCode || autoPreview}
                </div>
                <p className="mt-1.5 text-xs text-muted">Code will be generated automatically when saved.</p>
              </div>
            ) : (
              <TextField
                compact
                label="Course code"
                required
                value={course.courseCode ?? ''}
                onChange={(v) => onChange({ ...course, courseCode: normalizeCourseCode(v) })}
                placeholder="e.g. MATH-S1"
                disabled={codeLocked}
              />
            )}

            {codeLocked ? (
              <p className="text-xs text-amber-700">
                This course is used in {related.length} class assignment(s). Code changes require careful review.
              </p>
            ) : null}

            {codeMode === 'MANUAL' && course.courseCode && !isValidCourseCode(course.courseCode) ? (
              <p className="text-xs text-red-600">Use uppercase letters, numbers, and hyphens only.</p>
            ) : null}
          </div>
          {related.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted">Teachers</p>
                <div className="flex flex-wrap gap-1.5">
                  {teachers.map((t) => (
                    <span key={t} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-navy">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted">Classes</p>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((c) => (
                    <span key={c} className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-navy">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Assign teachers and classes under Config Class to link this course.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Scheduling requirements" />

        <div className="rounded-2xl border border-border/70 bg-slate-50/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-navy">Periods per week</p>
          <p className="mt-1 text-xs text-muted">How many periods should this course be taught each week?</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-navy transition hover:border-primary/40 hover:bg-primary/5"
              onClick={() => setPeriodsPerWeek((course.periodsPerWeek ?? 1) - 1)}
              aria-label="Decrease periods"
            >
              <Minus size={16} />
            </button>
            <div className="flex h-12 min-w-[4.5rem] items-center justify-center rounded-xl border border-primary/30 bg-white px-4 text-2xl font-extrabold tabular-nums text-navy">
              {course.periodsPerWeek ?? 1}
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-navy transition hover:border-primary/40 hover:bg-primary/5"
              onClick={() => setPeriodsPerWeek((course.periodsPerWeek ?? 1) + 1)}
              aria-label="Increase periods"
            >
              <Plus size={16} />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            The timetable will try to schedule exactly {course.periodsPerWeek ?? 1} period
            {(course.periodsPerWeek ?? 1) === 1 ? '' : 's'} for this course each week.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">Lesson duration</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['SINGLE', 'Single period', 'One period per slot'],
                ['DOUBLE', 'Double period', 'Prefer two consecutive periods'],
                ['FLEXIBLE', 'Flexible', 'Generator may split or combine'],
              ] as const
            ).map(([value, label, description]) => (
              <RadioCard
                key={value}
                label={label}
                description={description}
                checked={rules.lessonDuration === value}
                onChange={() => patchRules({ lessonDuration: value })}
              />
            ))}
          </div>
          {showDoubleOptions ? (
            <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-white p-3">
              <p className="text-xs font-semibold text-navy">Double period requirement</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <RadioCard
                  label="Prefer double period"
                  description="Try consecutive periods when possible"
                  checked={rules.doublePeriodMode === 'PREFER'}
                  onChange={() => patchRules({ doublePeriodMode: 'PREFER' })}
                />
                <RadioCard
                  label="Require double period"
                  description="Avoid splitting into single periods"
                  checked={rules.doublePeriodMode === 'REQUIRE'}
                  onChange={() => patchRules({ doublePeriodMode: 'REQUIRE' })}
                />
              </div>
              <p className="text-xs font-semibold text-navy">Double period pattern</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ['ANY', 'Any day'],
                    ['ONCE', 'Once per week'],
                    ['TWICE', 'Twice per week'],
                  ] as const
                ).map(([value, label]) => (
                  <RadioCard
                    key={value}
                    label={label}
                    checked={rules.doublePeriodPattern === value}
                    onChange={() => patchRules({ doublePeriodPattern: value })}
                  />
                ))}
              </div>
              <p className="text-xs text-muted">
                When enabled, the timetable will try to place two consecutive periods for this course.
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">Room requirement</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['ANY', 'Any classroom', 'No special room needed'],
                ['PREFER_LAB', 'Prefer laboratory', 'Use a lab when available'],
                ['REQUIRE_LAB', 'Require laboratory', 'Never use a normal classroom'],
              ] as const
            ).map(([value, label, description]) => (
              <RadioCard
                key={value}
                label={label}
                description={description}
                checked={rules.roomRequirement === value}
                onChange={() => patchRules({ roomRequirement: value })}
              />
            ))}
          </div>
          {showLabPicker ? (
            <div className="mt-3">
              <SelectField
                compact
                label="Preferred lab"
                value={rules.preferredLabRoom ?? ''}
                onChange={(v) => patchRules({ preferredLabRoom: v || null })}
                placeholder="Select laboratory"
                options={[
                  { value: '', label: 'Select laboratory…' },
                  ...rooms.map((r) => ({ value: r, label: r })),
                ]}
              />
              <p className="mt-1 text-xs text-muted">
                {rules.roomRequirement === 'REQUIRE_LAB'
                  ? 'This course can only be scheduled in a laboratory.'
                  : 'The generator will prefer this lab when placing periods.'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/60 bg-white p-3">
          <SelectField
            compact
            label="Preferred room"
            value={rules.preferredRoom ?? ''}
            onChange={(v) => patchRules({ preferredRoom: v || null })}
            placeholder="Select room…"
            options={[
              { value: '', label: 'Any room' },
              ...rooms.map((r) => ({ value: r, label: r })),
            ]}
          />
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={Boolean(rules.preferPreferredRoom)}
              onChange={(e) => patchRules({ preferPreferredRoom: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>Prefer this room (use another if unavailable)</span>
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">Preferred time</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['ANY', 'No preference'],
                ['MORNING', 'Morning'],
                ['AFTERNOON', 'Afternoon'],
              ] as const
            ).map(([value, label]) => (
              <ChipToggle
                key={value}
                label={label}
                checked={course.timePreference === value}
                onChange={() => onChange({ ...course, timePreference: value })}
              />
            ))}
          </div>
          <p className="mt-3 mb-2 text-xs font-semibold text-muted">Preferred periods (optional)</p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <ChipToggle
                key={p}
                label={p}
                checked={(rules.preferredPeriods ?? []).includes(p)}
                onChange={() => {
                  const current = rules.preferredPeriods ?? [];
                  const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
                  patchRules({ preferredPeriods: next });
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">Preferred days</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((day) => (
              <ChipToggle
                key={day}
                label={day.slice(0, 3)}
                checked={(rules.preferredDays ?? []).includes(day)}
                onChange={() => {
                  const current = rules.preferredDays ?? [];
                  const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
                  patchRules({ preferredDays: next });
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Leave empty to allow any weekday.</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">Scheduling importance</p>
          <p className="mb-2 text-xs text-muted">
            Advanced: how strongly the generator prioritizes this course when slots are limited.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['NORMAL', 'Normal', 'Standard placement priority'],
                ['IMPORTANT', 'Important', 'Placed before normal courses'],
                ['CRITICAL', 'Critical', 'Highest placement priority'],
              ] as const
            ).map(([value, label, description]) => (
              <RadioCard
                key={value}
                label={label}
                description={description}
                checked={rules.schedulingImportance === value}
                onChange={() => patchRules({ schedulingImportance: value })}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function buildCoursePayload(course: CourseConfig, rules: CourseSchedulingRules): CourseConfig {
  return courseConfigFromForm(course, rules);
}

export function initRulesFromCourse(course: CourseConfig): CourseSchedulingRules {
  return rulesFromCourseConfig(course);
}

export function emptyCourseConfig(existingColors: Array<string | null | undefined> = []): CourseConfig {
  return {
    id: '',
    subjectName: '',
    courseCode: null,
    codeMode: 'AUTOMATIC',
    color: nextUnusedCourseColor(existingColors),
    priority: 5,
    periodsPerWeek: 1,
    requiresLab: false,
    prefersDoublePeriod: false,
    timePreference: 'ANY',
    customWindowStart: null,
    customWindowEnd: null,
    schedulingRules: { ...DEFAULT_SCHEDULING_RULES },
    isCore: true,
  };
}
