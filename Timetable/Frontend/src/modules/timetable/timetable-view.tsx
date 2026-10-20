'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Save,
  Play,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Plus,
  FileText,
  Pencil,
  Users,
  BookOpen,
  Wand2,
  Sparkles,
} from 'lucide-react';
import { TIMETABLE_TABS } from '@/config/timetable-nav';
import { useTimetableTab } from '@/contexts/timetable-tab-context';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { TermYearBar } from '@/components/term-year-bar';
import { DndTimetableGrid } from '@/components/dnd-timetable-grid';
import { FormField, SelectField, TextField } from '@/components/form-fields';
import { SetupModal, ModalSection } from '@/components/setup-modal';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { toast } from 'sonner';
import { TimeSettingsView } from '@/modules/timetable/time-settings-view';
import {
  buildDaySlots,
  parseBreakDefs,
} from '@/utils/schedule-builder';
import { DayToggleGroup, ModalFooterActions } from '@/components/setup-form-ui';
import {
  TeacherAccountTab,
  emptyAccountDraft,
  validateAccountDraft,
  type TeacherAccountDraft,
} from '@/components/teacher-account-tab';
import {
  CourseSchedulingForm,
  buildCoursePayload,
  emptyCourseConfig,
  initRulesFromCourse,
} from '@/components/course-scheduling-form';
import { formatCourseSummary, DEFAULT_SCHEDULING_RULES } from '@/utils/course-scheduling';
import { courseConfigWritePayload } from '@/utils/course-config-payload';
import { previewAutoCourseCode } from '@/utils/course-code';
import { CourseCodeBadge } from '@/components/course-code-badge';
import { HrDataTable, PillBadge, type HrTableColumn } from '@/components/hr-data-table';
import { HrPageLayout } from '@/components/hr-page-layout';
import { timetableApi } from '@/services/timetable-api';
import { formatStaffCodeDisplay } from '@/lib/format-staff-code';
import { StaffPositionSelect } from '@/components/staff-position-select';
import { classOptionLabel } from '@/utils/class-label';
import { useAuth } from '@/contexts/auth-context';
import type {
  CourseConfig,
  CourseSchedulingRules,
  CoverageItem,
  ExtraActivity,
  GenerateResult,
  SchoolSchedule,
  TeacherAssignment,
  TeacherProfile,
  TimetableConflict,
  TimetableRow,
  TeacherOption,
} from '@/types';
import type { TimetableCellRef } from '@/components/dnd-timetable-grid';
import { WEEK_DAYS } from '@/types';
import { nextUnusedCourseColor, resolveCourseColor, resolveSchedulePeriodSlots, uniqueClasses } from '@/utils/timetable';
import type { TimetablePdfContext } from '@/utils/timetable-pdf-export';

async function downloadClassPdf(
  className: string,
  rows: TimetableRow[],
  meta: { schoolName?: string; term: string; academicYear: string },
  pdfCtx: TimetablePdfContext,
) {
  const { exportClassTimetablePdf } = await import('@/utils/timetable-pdf-export');
  exportClassTimetablePdf(className, rows, meta, pdfCtx);
}

export function TimetableView() {
  const { tab: activeTab } = useTimetableTab();
  const { reload: reloadDashboard, summary } = useAuth();
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();

  const [loading, setLoading] = useState(true);

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [courses, setCourses] = useState<CourseConfig[]>([]);
  const [schedule, setSchedule] = useState<SchoolSchedule | null>(null);
  const [timetableRows, setTimetableRows] = useState<TimetableRow[]>([]);
  const [extraActivities, setExtraActivities] = useState<ExtraActivity[]>([]);
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [conflictStats, setConflictStats] = useState<Record<string, number>>({});
  const [generatePreview, setGeneratePreview] = useState<GenerateResult | null>(null);
  const [schedulingIssues, setSchedulingIssues] = useState<GenerateResult['issues']>([]);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [academicClassLabels, setAcademicClassLabels] = useState<string[]>([]);
  const [gridClass, setGridClass] = useState('');
  const [gridTeacher, setGridTeacher] = useState('');
  const [gridCourseOptions, setGridCourseOptions] = useState<string[]>([]);
  const [gridTeachers, setGridTeachers] = useState<TeacherOption[]>([]);
  const [busy, setBusy] = useState(false);

  const classes = useMemo(() => {
    const fromAssignments = uniqueClasses(assignments);
    return [...new Set([...academicClassLabels, ...fromAssignments])].sort();
  }, [assignments, academicClassLabels]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p, c, s, t, e, cov, conf, academic] = await Promise.all([
        timetableApi.listAssignments({ term, academic_year: academicYear }),
        timetableApi.listTeacherProfiles(),
        timetableApi.listCourseConfig(),
        timetableApi.getSchedule(term, academicYear),
        timetableApi.listTimetable({ term, academic_year: academicYear }),
        timetableApi.listExtraActivities(term, academicYear),
        timetableApi.classCoverage(term, academicYear),
        timetableApi.conflictCenter(term, academicYear),
        timetableApi.academicClasses(term, academicYear).catch(() => null),
      ]);
      setAssignments(a.data.data);
      setProfiles(p.data.data);
      setCourses(c.data.data);
      setSchedule(s.data.data);
      setTimetableRows(t.data.data);
      setExtraActivities(e.data.data);
      setCoverage(cov.data.data.coverage);
      setConflicts(conf.data.data.conflicts);
      setConflictStats(conf.data.data.byType);
      const academicLabels = (academic?.data.data.classes ?? []).map((x) => classOptionLabel(x));
      setAcademicClassLabels(academicLabels);
      const cls = [...new Set([...academicLabels, ...uniqueClasses(a.data.data)])].sort();
      setSelectedClasses((prev) => (prev.length ? prev : cls));
      setGridClass((prev) => prev || cls[0] || '');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load timetable data'
      );
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!gridClass) {
      setGridCourseOptions([]);
      setGridTeachers([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [detail, teacherRes] = await Promise.all([
          timetableApi.getClassConfig(gridClass, term, academicYear),
          timetableApi.classConfigTeachers(term, academicYear),
        ]);
        if (cancelled) return;
        const subjects = detail.data.data.courses.map((c) => c.subjectName);
        setGridCourseOptions([...new Set(subjects)].sort());
        setGridTeachers(teacherRes.data.data);
      } catch {
        if (!cancelled) {
          setGridCourseOptions([]);
          setGridTeachers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gridClass, term, academicYear]);

  const gridRows = useMemo(() => {
    let rows = timetableRows;
    if (gridClass) rows = rows.filter((r) => r.className === gridClass);
    if (gridTeacher) rows = rows.filter((r) => r.teacherUserId === gridTeacher);
    return rows;
  }, [timetableRows, gridClass, gridTeacher]);

  const periodSlots = useMemo(
    () => (schedule ? resolveSchedulePeriodSlots(schedule) : []),
    [schedule],
  );

  const pdfCtx = useMemo(
    (): TimetablePdfContext => ({
      periodSlots,
      courses,
    }),
    [periodSlots, courses],
  );

  const pdfMeta = useMemo(
    () => ({
      schoolName: summary?.organizationName,
      term,
      academicYear,
    }),
    [summary?.organizationName, term, academicYear],
  );

  async function handleGenerate() {
    if (!selectedClasses.length) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.generate({ classes: selectedClasses, term, academicYear });
      setGeneratePreview(data.data);
      setCoverage(data.data.coverage);
      setSchedulingIssues(data.data.issues ?? []);
      const issueCount = data.data.issues?.length ?? 0;
      if (issueCount > 0) {
        toast.warning(`Generated ${data.data.placements.length} slots with ${issueCount} scheduling issue(s)`);
      } else {
        toast.success(`Generated ${data.data.placements.length} proposed slots`);
      }
    } catch {
      toast.error('Generation failed — check assignments and schedule');
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    if (!selectedClasses.length) return;
    setBusy(true);
    try {
      await timetableApi.apply({
        classes: selectedClasses,
        term,
        academicYear,
        placements: generatePreview?.placements,
      });
      toast.success('Timetable applied successfully');
      setGeneratePreview(null);
      setSchedulingIssues([]);
      await loadAll();
      await reloadDashboard();
    } catch {
      toast.error('Apply failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!selectedClasses.length) return;
    setBusy(true);
    try {
      await timetableApi.regenerate({ classes: selectedClasses, term, academicYear });
      toast.success('Timetable regenerated');
      await loadAll();
      await reloadDashboard();
    } catch {
      toast.error('Regenerate failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!confirm('Clear placed timetables for selected classes? Assignments are kept.')) return;
    setBusy(true);
    try {
      await timetableApi.clearTimetables({ term, academicYear, classes: selectedClasses });
      toast.success('Timetables cleared');
      await loadAll();
    } catch {
      toast.error('Clear failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoComplete() {
    if (!selectedClasses.length) {
      toast.error('Select at least one class');
      return;
    }
    setBusy(true);
    try {
      const { data } = await timetableApi.autoComplete({
        classes: selectedClasses,
        term,
        academicYear,
      });
      const result = data.data;
      setGeneratePreview(result);
      setCoverage(result.coverage);
      setSchedulingIssues(result.issues ?? []);
      const overloaded = result.autoComplete?.teacherLoad?.overloaded?.length ?? 0;
      if (result.message) {
        if ((result.issues?.length ?? 0) > 0 || overloaded > 0) toast.warning(result.message);
        else toast.success(result.message);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Auto-complete failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleFillGaps() {
    if (!selectedClasses.length) {
      toast.error('Select at least one class');
      return;
    }
    setBusy(true);
    try {
      const { data } = await timetableApi.fillGaps({
        classes: selectedClasses,
        term,
        academicYear,
      });
      const result = data.data;
      setCoverage(result.coverage ?? []);
      setSchedulingIssues(result.issues ?? []);
      if (result.mode === 'preview') {
        setGeneratePreview((prev) => ({
          placements: result.placements as GenerateResult['placements'],
          coverage: result.coverage,
          issues: result.issues,
          issueSummary: result.issueSummary,
          autoComplete: prev?.autoComplete,
          slotCount: (result.placements as unknown[]).length,
          classes: result.classes,
        }));
      } else {
        await loadAll();
        await reloadDashboard();
      }
      if (result.filled > 0) {
        toast.success(result.message || `Placed ${result.filled} missing period(s)`);
      } else if ((result.issues?.length ?? 0) > 0) {
        toast.warning(result.message || 'Some periods could not be placed');
      } else {
        toast.info(result.message || 'Nothing to fill');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not fill missing periods';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoFix() {
    setBusy(true);
    try {
      const { data } = await timetableApi.autoFix(term, academicYear);
      toast.success(`Auto-fix resolved ${data.data.fixed} conflict(s)`);
      await loadAll();
    } catch {
      toast.error('Auto-fix failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(id: string, dayOfWeek: string, startTime: string, endTime: string) {
    await timetableApi.updateTimetable(id, { dayOfWeek, startTime, endTime });
    await loadAll();
  }

  async function handleSwap(sourceId: string, targetId: string) {
    await timetableApi.swapTimetable(sourceId, targetId);
    await loadAll();
  }

  const loadTeachersForGridSubject = useCallback(
    async (subjectName: string) => {
      const res = await timetableApi.classConfigTeachers(term, academicYear, subjectName);
      return res.data.data;
    },
    [term, academicYear],
  );

  const periodsPerWeekForGridSubject = useCallback(
    (subjectName: string) => {
      const fromAssignment = assignments.find(
        (a) => a.className === gridClass && a.subjectName === subjectName,
      )?.periodsPerWeek;
      if (fromAssignment != null) return fromAssignment;
      return courses.find((c) => c.subjectName === subjectName)?.periodsPerWeek;
    },
    [assignments, gridClass, courses],
  );

  const placedPeriodsForGridSubject = useCallback(
    (subjectName: string) =>
      timetableRows.filter(
        (r) => r.className === gridClass && r.subjectName === subjectName && !r.isExtraActivity,
      ).length,
    [timetableRows, gridClass],
  );

  async function handleSaveCourseFromFreeSlot(
    cell: TimetableCellRef,
    payload: {
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      room?: string;
    },
    opts: { bumpPeriods: boolean },
  ) {
    if (!gridClass) return;
    await timetableApi.createTimetable({
      className: gridClass,
      subjectName: payload.subjectName,
      teacherUserId: payload.teacherUserId,
      teacherName: payload.teacherName,
      dayOfWeek: cell.dayOfWeek,
      startTime: cell.startTime,
      endTime: cell.endTime,
      ...(payload.room ? { room: payload.room } : {}),
      term,
      academicYear,
    });
    if (opts.bumpPeriods) {
      const assignment = assignments.find(
        (a) => a.className === gridClass && a.subjectName === payload.subjectName,
      );
      if (assignment) {
        await timetableApi.updateAssignment(assignment.id, {
          periodsPerWeek: assignment.periodsPerWeek + 1,
        });
      }
    }
    await loadAll();
  }

  async function saveSchedule() {
    if (!schedule) return;
    setBusy(true);
    try {
      const transitionMinutes = schedule.transitionMinutes ?? 5;
      const breakDefs = parseBreakDefs(schedule.breaks, {
        dayStart: schedule.dayStart,
        periodDurationMinutes: schedule.periodDurationMinutes,
        transitionMinutes,
      });
      const periodSlots = buildDaySlots({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        transitionMinutes,
        breakDefs,
      });
      const periodCount = periodSlots.filter((s) => !s.isBreak).length;

      const { data } = await timetableApi.updateSchedule({
        term,
        academicYear,
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        periodCount,
        transitionMinutes,
        durationMode: 'UNIFORM',
        periodSlots,
        activeDays: schedule.activeDays,
        breaks: breakDefs,
      });
      const refreshed = await timetableApi.getSchedule(term, academicYear);
      setSchedule(refreshed.data.data ?? data.data);
      toast.success('Time settings saved');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save schedule';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(_profile: TeacherProfile) {
    await loadAll();
  }

  async function saveCourse(course: CourseConfig, originalSubjectName?: string, isNewCourse?: boolean) {
    setBusy(true);
    try {
      const previousName = (originalSubjectName ?? course.subjectName).trim();
      const nextName = course.subjectName.trim();
      const withColor = {
        ...course,
        subjectName: nextName,
        color:
          course.color ||
          nextUnusedCourseColor(courses.filter((c) => c.id !== course.id).map((c) => c.color)),
      };
      const renamed = previousName !== nextName && !isNewCourse;
      const payload = courseConfigWritePayload(withColor, renamed ? { newSubjectName: nextName } : undefined);

      if (isNewCourse || !course.id) {
        await timetableApi.createCourseConfig(payload);
      } else {
        await timetableApi.updateCourseConfigById(course.id, payload);
      }

      const related = assignments.filter(
        (a) => a.subjectName === previousName || a.subjectName === nextName
      );
      for (const assignment of related) {
        const updates: Partial<TeacherAssignment> = {};
        if (assignment.periodsPerWeek !== course.periodsPerWeek) {
          updates.periodsPerWeek = course.periodsPerWeek;
        }
        if (renamed && assignment.subjectName !== nextName) {
          updates.subjectName = nextName;
        }
        if (Object.keys(updates).length) {
          await timetableApi.updateAssignment(assignment.id, updates);
        }
      }
      toast.success(renamed ? 'Course renamed and saved' : 'Course scheduling requirements saved');
      await loadAll();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Failed to save course');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCourse(courseId: string, subjectName: string) {
    setBusy(true);
    try {
      await timetableApi.deleteCourseConfigById(courseId);
      toast.success(`${subjectName} deleted`);
      await loadAll();
    } catch {
      toast.error('Failed to delete course');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTeacher(teacherUserId: string) {
    setBusy(true);
    try {
      await timetableApi.deleteTeacherProfile(teacherUserId);
      toast.success('Teacher profile deleted');
      await loadAll();
    } catch {
      toast.error('Failed to delete teacher');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="animate-spin" size={18} /> Loading timetable module…
      </div>
    );
  }

  const activeTabConfig = TIMETABLE_TABS.find((t) => t.id === activeTab) ?? TIMETABLE_TABS[0];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <TermYearBar
        term={term}
        academicYear={academicYear}
        onTermChange={setTerm}
        onYearChange={setAcademicYear}
        terms={academicSettings?.terms}
        academicYears={academicSettings?.academicYears}
        extra={
          <button type="button" className="btn-secondary py-2.5" onClick={() => void loadAll()}>
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />

      <div className="hr-card overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold tracking-tight text-navy">{activeTabConfig.label}</h2>
          <p className="mt-0.5 text-sm text-muted">{activeTabConfig.description}</p>
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'teachers' ? (
            <TeachersTab profiles={profiles} onSave={saveProfile} onDelete={deleteTeacher} busy={busy} />
          ) : null}

          {activeTab === 'courses' ? (
            <CoursesTab courses={courses} assignments={assignments} onSave={saveCourse} onDelete={deleteCourse} busy={busy} />
          ) : null}

          {activeTab === 'schedule' && schedule ? (
            <TimeSettingsView schedule={schedule} setSchedule={setSchedule} onSave={saveSchedule} busy={busy} />
          ) : null}

          {activeTab === 'generator' ? (
            <GeneratorTab
              classes={classes}
              selectedClasses={selectedClasses}
              setSelectedClasses={setSelectedClasses}
              coverage={coverage}
              generatePreview={generatePreview}
              schedulingIssues={schedulingIssues}
              weeklyCapacity={
                periodSlots.filter((s) => !s.isBreak).length *
                Math.max(1, schedule?.activeDays?.length ?? 5)
              }
              onGenerate={handleGenerate}
              onApply={handleApply}
              onRegenerate={handleRegenerate}
              onClear={handleClear}
              onFillGaps={handleFillGaps}
              onAutoComplete={handleAutoComplete}
              busy={busy}
            />
          ) : null}

          {activeTab === 'timetable' ? (
            <div className="space-y-4">
              <div className="hr-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField
                  label="Class filter"
                  value={gridClass}
                  onChange={setGridClass}
                  placeholder="All classes"
                  options={classes.map((c) => ({ value: c, label: c }))}
                />
                <SelectField
                  label="Teacher filter"
                  value={gridTeacher}
                  onChange={setGridTeacher}
                  placeholder="All teachers"
                  options={[...new Map(timetableRows.map((r) => [r.teacherUserId, r.teacherName])).entries()].map(
                    ([id, name]) => ({ value: id, label: name })
                  )}
                />
                {gridClass ? (
                  <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className="btn-primary py-2.5"
                      onClick={() =>
                        void downloadClassPdf(
                          gridClass,
                          timetableRows.filter((r) => r.className === gridClass),
                          pdfMeta,
                          pdfCtx,
                        )
                      }
                    >
                      <FileText size={16} /> Class PDF
                    </button>
                  </div>
                ) : null}
              </div>
              <DndTimetableGrid
                rows={gridRows}
                periodSlots={periodSlots}
                courses={courses}
                className={gridClass || undefined}
                cardSecondary={gridTeacher && !gridClass ? 'class' : 'teacher'}
                term={term}
                academicYear={academicYear}
                onMove={handleMove}
                onSwap={handleSwap}
                onAddExtra={
                  gridClass
                    ? async (input) => {
                        await timetableApi.createExtraActivity({
                          name: input.name,
                          dayOfWeek: input.dayOfWeek,
                          startTime: input.startTime,
                          endTime: input.endTime,
                          className: input.className,
                          term,
                          academicYear,
                          sync: true,
                        });
                        await loadAll();
                      }
                    : undefined
                }
                onRemoveExtra={async (extraActivityId) => {
                  await timetableApi.deleteExtraActivity(extraActivityId);
                  await loadAll();
                }}
                onSaveCourseFromFreeSlot={gridClass ? handleSaveCourseFromFreeSlot : undefined}
                freeSlotCourseOptions={gridCourseOptions}
                freeSlotTeachers={gridTeachers}
                loadTeachersForSubject={loadTeachersForGridSubject}
                periodsPerWeekForSubject={periodsPerWeekForGridSubject}
                placedPeriodsForSubject={placedPeriodsForGridSubject}
                viewLabel={
                  gridClass
                    ? `Class: ${gridClass}`
                    : gridTeacher
                      ? `Teacher: ${timetableRows.find((r) => r.teacherUserId === gridTeacher)?.teacherName ?? ''}`
                      : undefined
                }
              />
              <div className="hr-card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="font-bold text-navy">Extra activities</p>
                  {extraActivities.length ? (
                    <p className="mt-1 text-xs text-muted">{extraActivities.length} this term</p>
                  ) : null}
                </div>
                <Link href="/extra-activities" className="btn-primary py-2.5 text-sm">
                  Manage
                </Link>
              </div>
            </div>
          ) : null}

          {activeTab === 'conflicts' ? (
            <ConflictsTab
              conflicts={conflicts}
              stats={conflictStats}
              onScan={loadAll}
              onAutoFix={handleAutoFix}
              busy={busy}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TeachersTab({
  profiles,
  onSave,
  onDelete,
  busy,
}: {
  profiles: TeacherProfile[];
  onSave: (p: TeacherProfile) => Promise<void>;
  onDelete: (teacherUserId: string) => Promise<void>;
  busy: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherProfile | null>(null);
  const [accountDraft, setAccountDraft] = useState<TeacherAccountDraft>(emptyAccountDraft());
  const [modalTab, setModalTab] = useState<'profile' | 'account'>('profile');
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyProfile = (): TeacherProfile => ({
    id: '',
    teacherUserId: '',
    teacherName: '',
    position: 'Teacher',
    maxPeriodsPerDay: 6,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    preferredSlots: [],
    unavailableSlots: [],
  });

  function openAdd() {
    setEditing(emptyProfile());
    setAccountDraft(emptyAccountDraft());
    setModalTab('profile');
    setIsNew(true);
    setModalOpen(true);
  }

  function openEdit(profile: TeacherProfile) {
    setEditing({ ...profile, availableDays: [...(profile.availableDays as string[])] });
    setAccountDraft(emptyAccountDraft(profile));
    setModalTab('profile');
    setIsNew(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setAccountDraft(emptyAccountDraft());
    setModalTab('profile');
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing?.teacherName.trim()) return;

    const accountError = validateAccountDraft(accountDraft, isNew, editing.account);
    if (accountError) {
      toast.error(accountError);
      setModalTab('account');
      return;
    }

    if (accountDraft.portalEnabled) {
      const checkBody: { email?: string; phone?: string; excludeUserId?: string } = {
        excludeUserId: editing.teacherUserId || undefined,
      };
      if (accountDraft.loginMethod === 'email' || accountDraft.loginMethod === 'both') {
        checkBody.email = accountDraft.loginEmail.trim();
      }
      if (accountDraft.loginMethod === 'phone' || accountDraft.loginMethod === 'both') {
        checkBody.phone = accountDraft.loginPhone.trim();
      }
      try {
        const { data } = await timetableApi.checkTeacherIdentifier(checkBody);
        if (!data.data.available) {
          toast.error(data.data.message ?? 'Login identifier is not available');
          setModalTab('account');
          return;
        }
      } catch {
        toast.error('Could not validate login identifier');
        return;
      }
    }

    setSaving(true);
    try {
      const { data } = await timetableApi.saveTeacherWithAccount({
        profile: {
          ...editing,
          portalEnabled: accountDraft.portalEnabled,
          loginMethod: accountDraft.loginMethod,
          loginEmail: accountDraft.loginEmail.trim() || null,
          loginPhone: accountDraft.loginPhone.trim() || null,
        },
        account: accountDraft.portalEnabled
          ? {
              password: accountDraft.password || undefined,
              requirePasswordChange: accountDraft.requirePasswordChange,
              sendCredentialsEmail: accountDraft.sendCredentialsEmail,
            }
          : undefined,
      });
      await onSave(data.data);
      toast.success(isNew ? 'Teacher added' : 'Teacher updated');
      closeModal();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not save teacher'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Configure available days and portal access for each teacher.</p>
        <button type="button" className="btn-primary py-2.5" onClick={openAdd}>
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      {!profiles.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/60 px-6 py-12 text-center">
          <Users size={32} className="mx-auto text-muted/40" />
          <p className="mt-3 font-semibold text-navy">No teachers yet</p>
          <p className="mt-1 text-sm text-muted">Add a teacher profile or create assignments first.</p>
          <button type="button" className="btn-primary mt-4 py-2.5" onClick={openAdd}>
            <Plus size={16} /> Add Teacher
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <div
              key={p.id || p.teacherUserId}
              className="group hr-card flex items-start justify-between gap-3 p-4 transition hover:border-primary/25"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-navy">{p.teacherName}</p>
                {p.employeeNumber ? (
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    {formatStaffCodeDisplay(p.employeeNumber)}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {(p.availableDays as string[]).map((d) => d.slice(0, 3)).join(' · ')}
                </p>
                {p.portalEnabled ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-success">
                    Portal enabled
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-xl border border-border p-2 text-muted transition hover:border-primary/40 hover:bg-primary/5 hover:text-navy"
                  aria-label={`Edit ${p.teacherName}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className="rounded-xl border border-border p-2 text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${p.teacherName}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!busy) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDelete(deleteTarget.teacherUserId);
          setDeleteTarget(null);
        }}
        loading={busy}
        title="Delete teacher profile?"
        description="This removes the teacher's timetable settings. Class assignments are not deleted automatically."
        itemLabel={deleteTarget?.teacherName}
        confirmLabel="Delete Teacher"
      />

      <SetupModal
        open={modalOpen}
        onClose={closeModal}
        title={isNew ? 'Add Teacher' : 'Edit Teacher'}
        subtitle={
          isNew
            ? 'Set workload limits and available teaching days'
            : `Update settings for ${editing?.teacherName ?? 'this teacher'}`
        }
        icon={Users}
        badge={isNew ? 'New' : 'Edit'}
        footer={
          <ModalFooterActions
            onCancel={closeModal}
            onSave={() => void handleSave()}
            saveLabel={isNew ? 'Add Teacher' : 'Save Changes'}
            saving={saving || busy}
            disabled={!editing?.teacherName.trim()}
          />
        }
      >
        <div className="mb-4 inline-flex rounded-xl border border-border bg-slate-50 p-1">
          {(
            [
              ['profile', 'Profile & Availability'],
              ['account', 'Account & Portal'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModalTab(id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                modalTab === id ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {editing && modalTab === 'profile' ? (
          <div className="space-y-4">
            <ModalSection title="Teacher details" description="Name and workload settings">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  compact
                  label="Teacher name"
                  required
                  value={editing.teacherName}
                  onChange={(v) => setEditing({ ...editing, teacherName: v })}
                  placeholder="e.g. Alice Mukamana"
                />
                <StaffPositionSelect
                  scope="teachers"
                  label="Teaching position"
                  value={editing.position ?? 'Teacher'}
                  onChange={(v) => setEditing({ ...editing, position: v })}
                  required
                  className="sm:col-span-2"
                />
                <TextField
                  compact
                  label="Staff ID"
                  value={editing.employeeNumber ?? ''}
                  onChange={(v) => setEditing({ ...editing, employeeNumber: v || null })}
                  placeholder="Auto: TR 04 001 001"
                  disabled={Boolean(editing.employeeNumber && !isNew)}
                />
                {!accountDraft.portalEnabled && !isNew ? (
                  <TextField
                    compact
                    label="User ID"
                    value={editing.teacherUserId}
                    onChange={(v) => setEditing({ ...editing, teacherUserId: v })}
                    placeholder="Legacy identifier"
                  />
                ) : null}
                {!isNew ? (
                  <div className="sm:col-span-2">
                    <TextField
                      compact
                      label="Digital ID (RFID)"
                      value={editing.rfidUid ?? ''}
                      onChange={() => undefined}
                      placeholder="Assigned by Super Admin"
                      disabled
                    />
                    <p className="mt-1 text-xs text-muted">
                      Gate attendance RFID — assign via Super Admin Smart Access (Staff).
                    </p>
                  </div>
                ) : null}
              </div>
            </ModalSection>
            <ModalSection title="Availability" description="Days this teacher can be scheduled">
              <DayToggleGroup
                days={WEEK_DAYS.slice(0, 5)}
                selected={editing.availableDays as string[]}
                onChange={(days) => setEditing({ ...editing, availableDays: days })}
              />
            </ModalSection>
          </div>
        ) : null}

        {editing && modalTab === 'account' ? (
          <TeacherAccountTab
            draft={accountDraft}
            onChange={(patch) => setAccountDraft((prev) => ({ ...prev, ...patch }))}
            account={editing.account}
            isNew={isNew}
            busy={saving || busy}
            onSetManualPassword={async ({ password, sendCredentialsEmail }) => {
              if (!editing.teacherUserId) return;
              await timetableApi.resetTeacherPassword(editing.teacherUserId, {
                password,
                sendCredentialsEmail,
              });
              toast.success(
                sendCredentialsEmail
                  ? 'Password updated — credentials emailed if configured'
                  : 'Password updated',
              );
            }}
            onResetPasswordAuto={async () => {
              if (!editing.teacherUserId) return;
              await timetableApi.resetTeacherPassword(editing.teacherUserId, {
                sendCredentialsEmail: accountDraft.sendCredentialsEmail,
              });
              toast.success('Random password generated — emailed if configured');
            }}
            onDisableAccount={() => {
              if (!editing.teacherUserId) return;
              void timetableApi
                .disableTeacherAccount(editing.teacherUserId)
                .then(() => toast.success('Account disabled'))
                .catch(() => toast.error('Could not disable account'));
            }}
            onEnableAccount={() => {
              if (!editing.teacherUserId) return;
              void timetableApi
                .enableTeacherAccount(editing.teacherUserId)
                .then(() => toast.success('Account enabled'))
                .catch(() => toast.error('Could not enable account'));
            }}
          />
        ) : null}
      </SetupModal>
    </div>
  );
}

function CoursesTab({
  courses,
  assignments,
  onSave,
  onDelete,
  busy,
}: {
  courses: CourseConfig[];
  assignments: TeacherAssignment[];
  onSave: (c: CourseConfig, originalSubjectName?: string, isNewCourse?: boolean) => Promise<void>;
  onDelete: (courseId: string, subjectName: string) => Promise<void>;
  busy: boolean;
}) {
  const assignmentSubjects = [...new Set(assignments.map((a) => a.subjectName))];
  const configuredNames = new Set(courses.map((c) => c.subjectName));
  const assignmentOnlySubjects = assignmentSubjects.filter((n) => !configuredNames.has(n)).sort();
  const sortedCourses = [...courses].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName) || (a.courseCode ?? '').localeCompare(b.courseCode ?? '')
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseConfig | null>(null);
  const [originalSubjectName, setOriginalSubjectName] = useState<string | null>(null);
  const [rules, setRules] = useState<CourseSchedulingRules>({ ...DEFAULT_SCHEDULING_RULES });
  const [isNew, setIsNew] = useState(false);
  const [rooms, setRooms] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; code?: string | null } | null>(
    null
  );

  useEffect(() => {
    timetableApi
      .smartClassrooms()
      .then((res) => {
        const names = (res.data.data ?? [])
          .map((r) => r.name || r.roomNumber)
          .filter(Boolean) as string[];
        setRooms([...new Set(names)].sort());
      })
      .catch(() => setRooms([]));
  }, []);

  function openAdd() {
    const empty = emptyCourseConfig(courses.map((c) => c.color));
    setEditing(empty);
    setOriginalSubjectName(null);
    setRules(initRulesFromCourse(empty));
    setIsNew(true);
    setModalOpen(true);
  }

  function openEditCourse(course: CourseConfig) {
    setEditing({ ...course, periodsPerWeek: course.periodsPerWeek ?? 1 });
    setOriginalSubjectName(course.subjectName);
    setRules(initRulesFromCourse(course));
    setIsNew(false);
    setModalOpen(true);
  }

  function openEditAssignmentOnly(name: string) {
    const base = {
      ...emptyCourseConfig(courses.map((c) => c.color)),
      subjectName: name,
      periodsPerWeek: assignments.find((a) => a.subjectName === name)?.periodsPerWeek ?? 1,
    } as CourseConfig;
    setEditing({ ...base, periodsPerWeek: base.periodsPerWeek ?? 1 });
    setOriginalSubjectName(name);
    setRules(initRulesFromCourse(base));
    setIsNew(true);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setOriginalSubjectName(null);
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing?.subjectName.trim()) return;
    const payload = buildCoursePayload(
      { ...editing, subjectName: editing.subjectName.trim() },
      rules,
    );
    await onSave(payload, originalSubjectName ?? undefined, isNew);
    closeModal();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Set periods per week, room needs, double periods, and preferred days for each course.
        </p>
        <button type="button" className="btn-primary py-2.5" onClick={openAdd}>
          <Plus size={16} /> Add Course
        </button>
      </div>

      {!sortedCourses.length && !assignmentOnlySubjects.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/60 px-6 py-12 text-center">
          <BookOpen size={32} className="mx-auto text-muted/40" />
          <p className="mt-3 font-semibold text-navy">No courses yet</p>
          <p className="mt-1 text-sm text-muted">Add a course rule or create teacher assignments first.</p>
          <button type="button" className="btn-primary mt-4 py-2.5" onClick={openAdd}>
            <Plus size={16} /> Add Course
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCourses.map((displayCfg) => (
              <div
                key={displayCfg.id}
                className="group hr-card flex items-center justify-between gap-3 p-4 transition hover:border-primary/25"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor:
                    displayCfg.color ||
                    resolveCourseColor(displayCfg.subjectName, courses),
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {displayCfg.courseCode ? (
                      <CourseCodeBadge code={displayCfg.courseCode} />
                    ) : (
                      <CourseCodeBadge
                        code={previewAutoCourseCode(
                          displayCfg.subjectName,
                          courses.map((c) => c.courseCode ?? '').filter(Boolean)
                        )}
                      />
                    )}
                    <p className="truncate font-bold text-navy">{displayCfg.subjectName}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatCourseSummary(displayCfg)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(displayCfg.periodsPerWeek ?? 1) > 0 ? (
                      <span className="rounded-lg bg-navy/10 px-2 py-0.5 text-[10px] font-bold text-navy">
                        {displayCfg.periodsPerWeek ?? 1}/wk
                      </span>
                    ) : null}
                    {displayCfg.requiresLab ? (
                      <span className="rounded-lg bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">
                        Lab
                      </span>
                    ) : null}
                    {displayCfg.prefersDoublePeriod ? (
                      <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-ochre">
                        Double
                      </span>
                    ) : null}
                    {displayCfg.isCore === false ? (
                      <span className="rounded-lg bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Non-core
                      </span>
                    ) : (
                      <span className="rounded-lg bg-navy/10 px-2 py-0.5 text-[10px] font-bold text-navy">
                        Core
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEditCourse(displayCfg)}
                    className="rounded-xl border border-border p-2 text-muted transition hover:border-primary/40 hover:bg-primary/5 hover:text-navy"
                    aria-label={`Edit ${displayCfg.subjectName}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        id: displayCfg.id,
                        name: displayCfg.subjectName,
                        code: displayCfg.courseCode,
                      })
                    }
                    className="rounded-xl border border-border p-2 text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${displayCfg.subjectName}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
          ))}
          {assignmentOnlySubjects.map((subject) => {
            const displayCfg = {
              ...emptyCourseConfig(courses.map((c) => c.color)),
              subjectName: subject,
              periodsPerWeek: assignments.find((a) => a.subjectName === subject)?.periodsPerWeek ?? 1,
            } as CourseConfig;
            return (
              <div
                key={`assign-${subject}`}
                className="group hr-card flex items-center justify-between gap-3 border-dashed p-4 transition hover:border-primary/25"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: resolveCourseColor(subject, courses),
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CourseCodeBadge code={previewAutoCourseCode(subject, courses.map((c) => c.courseCode ?? '').filter(Boolean))} />
                    <p className="truncate font-bold text-navy">{subject}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatCourseSummary(displayCfg)} · from class assignment</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditAssignmentOnly(subject)}
                  className="rounded-xl border border-border p-2 text-muted transition hover:border-primary/40 hover:bg-primary/5 hover:text-navy"
                  aria-label={`Configure ${subject}`}
                >
                  <Pencil size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!busy) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDelete(deleteTarget.id, deleteTarget.name);
          setDeleteTarget(null);
        }}
        loading={busy}
        title="Delete course?"
        description="Removes this course definition. If it is the only course with this name, linked class assignments and timetable periods for that name are removed too."
        itemLabel={
          deleteTarget
            ? [deleteTarget.code, deleteTarget.name].filter(Boolean).join(' · ')
            : undefined
        }
        confirmLabel="Delete Course"
      />

      <SetupModal
        open={modalOpen}
        onClose={closeModal}
        title={isNew && !editing?.id ? 'Add Course' : editing?.subjectName ?? 'Edit Course'}
        subtitle="Course scheduling requirements for timetable generation"
        icon={BookOpen}
        badge={isNew && !editing?.id ? 'New' : 'Edit'}
        size="xl"
        footer={
          <ModalFooterActions
            onCancel={closeModal}
            onSave={() => void handleSave()}
            saveLabel={isNew && !editing?.id ? 'Add Course' : 'Save Changes'}
            saving={busy}
            disabled={!editing?.subjectName.trim()}
          />
        }
      >
        {editing ? (
          <CourseSchedulingForm
            course={editing}
            rules={rules}
            assignments={assignments}
            rooms={rooms}
            isNew={isNew}
            allCourses={courses}
            onChange={setEditing}
            onRulesChange={setRules}
          />
        ) : null}
      </SetupModal>
    </div>
  );
}

export function GeneratorTab({
  classes,
  selectedClasses,
  setSelectedClasses,
  coverage,
  generatePreview,
  schedulingIssues,
  weeklyCapacity,
  onGenerate,
  onApply,
  onRegenerate,
  onClear,
  onFillGaps,
  onAutoComplete,
  busy,
  compact = false,
}: {
  classes: string[];
  selectedClasses: string[];
  setSelectedClasses: (c: string[]) => void;
  coverage: CoverageItem[];
  generatePreview: GenerateResult | null;
  schedulingIssues?: GenerateResult['issues'];
  weeklyCapacity: number;
  onGenerate: () => Promise<void>;
  onApply: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onClear: () => Promise<void>;
  onFillGaps: () => Promise<void>;
  onAutoComplete: () => Promise<void>;
  busy: boolean;
  compact?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const scopedCoverage = useMemo(
    () =>
      selectedClasses.length
        ? coverage.filter((c) => selectedClasses.includes(c.className))
        : coverage,
    [coverage, selectedClasses],
  );
  const complete = scopedCoverage.filter((c) => c.complete).length;
  const total = scopedCoverage.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = scopedCoverage.slice((page - 1) * pageSize, page * pageSize);
  const lessonsPlaced = generatePreview?.placements.length ?? 0;
  const expectedLessons = coverage
    .filter((c) => selectedClasses.includes(c.className))
    .reduce((sum, c) => sum + (c.expected || 0), 0);
  const missingLessons = Math.max(0, expectedLessons - lessonsPlaced);
  const coveragePct =
    expectedLessons > 0 ? Math.round((Math.min(lessonsPlaced, expectedLessons) / expectedLessons) * 100) : 0;
  const incompleteRows = scopedCoverage.filter((c) => !c.complete).length;

  const issueSummary = generatePreview?.issueSummary;
  const topBlockers = issueSummary?.topBlockers ?? [];
  const displayIssues = (schedulingIssues ?? []).slice(0, 40);
  const hiddenIssueCount = Math.max(0, (schedulingIssues?.length ?? 0) - displayIssues.length);

  const teacherLoad = generatePreview?.autoComplete?.teacherLoad;
  const overloadedTeachers = teacherLoad?.overloaded ?? [];

  const columns: HrTableColumn<CoverageItem>[] = [
    {
      key: 'class',
      header: 'Class',
      sortable: true,
      render: (row) => <PillBadge tone="blue">{row.className}</PillBadge>,
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (row) => <span className="font-semibold text-navy">{row.subjectName}</span>,
    },
    {
      key: 'teacher',
      header: 'Teacher',
      render: (row) => <span className="text-muted">{row.teacherName}</span>,
    },
    {
      key: 'placed',
      header: 'Placed',
      render: (row) => (
        <span className={row.complete ? 'font-bold text-success' : 'font-bold text-warning'}>{row.placed}</span>
      ),
    },
    {
      key: 'expected',
      header: 'Expected',
      render: (row) => row.expected,
    },
  ];

  return (
    <HrPageLayout
      kpis={[
        { label: 'Coverage', value: `${complete}/${total}` },
        { label: 'Classes', value: classes.length },
        { label: 'Selected', value: selectedClasses.length },
        {
          label: 'Lessons placed',
          value: generatePreview
            ? `${lessonsPlaced}${expectedLessons ? ` / ${expectedLessons}` : ''}`
            : '-',
        },
        {
          label: missingLessons > 0 ? 'Still missing' : 'Fill rate',
          value: generatePreview
            ? missingLessons > 0
              ? `${missingLessons} · ${coveragePct}%`
              : `${coveragePct}%`
            : '-',
        },
        {
          label: 'Weekly capacity',
          value: weeklyCapacity > 0 ? weeklyCapacity : '-',
        },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary py-2.5"
            disabled={busy || !selectedClasses.length}
            onClick={() => void onAutoComplete()}
            title="Generate, fill gaps, and shuffle blocking lessons automatically (preview)"
          >
            <Sparkles size={16} /> Auto-complete
          </button>
          <button type="button" className="btn-secondary py-2.5" disabled={busy} onClick={() => void onGenerate()}>
            <Play size={16} /> Generate preview
          </button>
          {generatePreview && missingLessons > 0 ? (
            <button
              type="button"
              className="btn-primary py-2.5"
              disabled={busy || !selectedClasses.length}
              onClick={() => void onFillGaps()}
            >
              <Wand2 size={16} /> Fill {missingLessons} missing
            </button>
          ) : null}
          <button type="button" className="btn-primary py-2.5" disabled={busy || !generatePreview} onClick={() => void onApply()}>
            <CheckCircle2 size={16} /> Apply
          </button>
          <button type="button" className="btn-secondary py-2.5" disabled={busy} onClick={() => void onRegenerate()}>
            <RefreshCw size={16} /> Regenerate
          </button>
          <button type="button" className="btn-danger py-2.5" disabled={busy} onClick={() => void onClear()}>
            <Trash2 size={16} /> Clear
          </button>
        </div>
      }
    >
      <FormField label="Classes">
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => {
            const selected = selectedClasses.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setSelectedClasses(selected ? selectedClasses.filter((x) => x !== c) : [...selectedClasses, c])
                }
                className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                  selected ? 'border-primary bg-primary/15 text-navy' : 'border-border text-muted'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </FormField>

      {teacherLoad && (!compact || overloadedTeachers.length > 0) ? (
        <div
          className={`mb-4 rounded-2xl border p-4 ${
            overloadedTeachers.length > 0
              ? 'border-red-200 bg-red-50/80'
              : 'border-emerald-200 bg-emerald-50/80'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-navy">Teacher capacity</p>
            </div>
            {generatePreview?.autoComplete ? (
              <span className="rounded-lg bg-white/90 px-2 py-1 text-[0.6875rem] font-semibold text-muted">
                +{generatePreview.autoComplete.fillTotal} filled · {generatePreview.autoComplete.displaced} shuffled
              </span>
            ) : null}
          </div>

          {overloadedTeachers.length > 0 ? (
            <>
              <p className="mt-3 text-xs font-semibold text-red-900">
                {overloadedTeachers.length} overloaded teacher{overloadedTeachers.length === 1 ? '' : 's'}. Reduce
                assignments or add staff.
              </p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-red-200/80 bg-white">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-red-100 bg-red-50/50 text-[0.6875rem] font-bold uppercase tracking-wide text-red-900/80">
                      <th className="px-3 py-2">Teacher</th>
                      <th className="px-3 py-2 text-right">Assigned</th>
                      <th className="px-3 py-2 text-right">Max / week</th>
                      <th className="px-3 py-2 text-right">Over by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overloadedTeachers.map((t) => (
                      <tr key={t.teacherUserId} className="border-b border-red-50 last:border-0">
                        <td className="px-3 py-2.5 font-semibold text-navy">{t.teacherName}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-red-800">{t.expectedPeriods}</td>
                        <td className="px-3 py-2.5 text-right text-muted">{t.maxWeeklyPeriods}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-red-700">+{t.surplus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : compact ? null : (
            <p className="mt-2 text-sm font-semibold text-emerald-800">
              All {teacherLoad.teachersChecked} teacher{teacherLoad.teachersChecked === 1 ? '' : 's'} within capacity.
            </p>
          )}
        </div>
      ) : null}

      {(schedulingIssues?.length ?? 0) > 0 || (generatePreview && missingLessons > 0) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-navy">
                {missingLessons > 0
                  ? `${missingLessons} period${missingLessons === 1 ? '' : 's'} still missing`
                  : 'Scheduling issues'}
                {incompleteRows > 0 ? (
                  <span className="ml-2 text-xs font-semibold text-amber-800">
                    · {incompleteRows} subject{incompleteRows === 1 ? '' : 's'} underfilled
                  </span>
                ) : null}
              </p>
              {topBlockers.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topBlockers.map((b) => (
                    <span
                      key={b.blocker}
                      className="rounded-lg border border-amber-300/80 bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-950"
                    >
                      {b.count}× {b.blocker}
                    </span>
                  ))}
                </div>
              ) : null}
              {!compact ? (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-navy">
                  <p className="font-bold">Tips</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted">
                    <li>Use <strong className="text-navy">Auto-complete</strong> for generate + fill in one step.</li>
                    <li>Split heavy teacher loads in Teacher Assignments.</li>
                    <li>Generate in batches of a few classes if needed.</li>
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary py-2 text-xs"
                onClick={() => void onFillGaps()}
                disabled={busy || !selectedClasses.length}
              >
                <Wand2 size={14} /> Fill missing periods
              </button>
              <button
                type="button"
                className="btn-secondary py-2 text-xs"
                onClick={() => void onGenerate()}
                disabled={busy}
              >
                Retry generate
              </button>
            </div>
          </div>
          {(schedulingIssues?.length ?? 0) > 0 ? (
            <ul className="mt-3 space-y-2">
              {displayIssues.map((issue, i) => {
                const advice = Array.isArray(issue.details?.advice)
                  ? (issue.details.advice as string[])
                  : [];
                return (
                  <li
                    key={`${issue.type}-${issue.className}-${issue.subjectName}-${i}`}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${
                      issue.severity === 'error'
                        ? 'border-red-200 bg-white text-red-800'
                        : 'border-amber-200 bg-white text-amber-900'
                    }`}
                  >
                    <span className="font-semibold">{issue.className}</span>
                    <span className="text-muted"> · {issue.subjectName}</span>
                    <p className="mt-0.5 text-xs">{issue.message}</p>
                    {advice.length > 0 ? (
                      <ul className="mt-2 list-inside list-disc space-y-0.5 border-t border-red-100 pt-2 text-[0.6875rem] text-red-900/90">
                        {advice.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
              {hiddenIssueCount > 0 ? (
                <li className="text-center text-xs font-semibold text-amber-900">
                  + {hiddenIssueCount} more issue{hiddenIssueCount === 1 ? '' : 's'}. Fix top blockers first.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <HrDataTable
        columns={columns}
        data={paged}
        rowKey={(row) => `${row.className}-${row.subjectName}`}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        emptyMessage="No assignments yet. Add teacher assignments first."
      />
    </HrPageLayout>
  );
}

function ConflictsTab({
  conflicts,
  stats,
  onScan,
  onAutoFix,
  busy,
}: {
  conflicts: TimetableConflict[];
  stats: Record<string, number>;
  onScan: () => Promise<void>;
  onAutoFix: () => Promise<void>;
  busy: boolean;
}) {
  const kpis = Object.entries(stats).map(([type, count]) => ({
    label: type.replace(/_/g, ' '),
    value: count,
  }));

  return (
    <HrPageLayout
      kpis={
        kpis.length
          ? kpis
          : [
              { label: 'Conflicts', value: 0 },
              { label: 'Status', value: 'Clean' },
            ]
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary py-2.5" disabled={busy} onClick={() => void onScan()}>
            <RefreshCw size={16} /> Re-scan
          </button>
          <button type="button" className="btn-primary py-2.5" disabled={busy} onClick={() => void onAutoFix()}>
            <Wand2Icon /> Auto-fix safe conflicts
          </button>
        </div>
      }
    >
      {conflicts.length === 0 ? (
        <div className="hr-card px-5 py-8 text-center text-sm text-emerald-800">
          No conflicts detected.
        </div>
      ) : (
        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <div key={i} className="hr-card border-red-100 bg-red-50/60 px-4 py-3 text-sm">
              <span className="mr-2 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                {c.type}
              </span>
              {c.message}
            </div>
          ))}
        </div>
      )}
    </HrPageLayout>
  );
}

function Wand2Icon() {
  return <Wand2 size={16} />;
}
