'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw, Wand2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { SegmentTabs } from '@/components/segment-tabs';
import { TermYearBar } from '@/components/term-year-bar';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { useAuth } from '@/contexts/auth-context';
import { timetableApi } from '@/services/timetable-api';
import { GeneratorTab } from '@/modules/timetable/timetable-view';
import { ManualEntryTab } from '@/modules/create-timetable/manual-entry-tab';
import type {
  ClassConfigListItem,
  CourseConfig,
  CoverageItem,
  GenerateResult,
  SchoolSchedule,
  TeacherAssignment,
  TimetableRow,
} from '@/types';
import { resolveSchedulePeriodSlots, uniqueClasses } from '@/utils/timetable';
import { classOptionLabel } from '@/utils/class-label';

type CreateTab = 'generator' | 'manual';

const NAVY = '#000435';

export function CreateTimetableView() {
  const searchParams = useSearchParams();
  const { reload: reloadDashboard } = useAuth();
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<CreateTab>(
    tabParam === 'generator' ? 'generator' : 'manual',
  );

  useEffect(() => {
    if (tabParam === 'generator') setActiveTab('generator');
    if (tabParam === 'manual') setActiveTab('manual');
  }, [tabParam]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [courses, setCourses] = useState<CourseConfig[]>([]);
  const [schedule, setSchedule] = useState<SchoolSchedule | null>(null);
  const [timetableRows, setTimetableRows] = useState<TimetableRow[]>([]);
  const [classConfigRows, setClassConfigRows] = useState<ClassConfigListItem[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [generatePreview, setGeneratePreview] = useState<GenerateResult | null>(null);
  const [schedulingIssues, setSchedulingIssues] = useState<GenerateResult['issues']>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [academicClassLabels, setAcademicClassLabels] = useState<string[]>([]);

  const classes = useMemo(() => {
    const fromAssignments = uniqueClasses(assignments);
    return [...new Set([...academicClassLabels, ...fromAssignments])].sort();
  }, [assignments, academicClassLabels]);

  const periodSlots = useMemo(
    () => (schedule ? resolveSchedulePeriodSlots(schedule) : []),
    [schedule],
  );

  const loadAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [a, c, s, t, classCfg, conf, cov, academic] = await Promise.all([
        timetableApi.listAssignments({ term, academic_year: academicYear }),
        timetableApi.listCourseConfig(),
        timetableApi.getSchedule(term, academicYear),
        timetableApi.listTimetable({ term, academic_year: academicYear }),
        timetableApi.listClassConfig({ term, academic_year: academicYear }),
        timetableApi.conflictCenter(term, academicYear),
        timetableApi.classCoverage(term, academicYear),
        timetableApi.academicClasses(term, academicYear).catch(() => null),
      ]);
      setAssignments(a.data.data);
      setCourses(c.data.data);
      setSchedule(s.data.data);
      setTimetableRows(t.data.data);
      setClassConfigRows(classCfg.data.data);
      setConflictCount(conf.data.data.total);
      setCoverage(cov.data.data.coverage);
      const academicLabels = (academic?.data.data.classes ?? []).map((x) => classOptionLabel(x));
      setAcademicClassLabels(academicLabels);
      const cls = [...new Set([...academicLabels, ...uniqueClasses(a.data.data)])].sort();
      setSelectedClasses((prev) => (prev.length ? prev : cls));
    } catch {
      toast.error('Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleGenerate() {
    if (!selectedClasses.length) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.generate({ classes: selectedClasses, term, academicYear });
      setGeneratePreview(data.data);
      setCoverage(data.data.coverage);
      setSchedulingIssues(data.data.issues ?? []);
      toast.success(`Generated ${data.data.placements.length} proposed slots`);
    } catch {
      toast.error('Generation failed');
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
      toast.success('Timetable applied');
      setGeneratePreview(null);
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
      toast.success('Regenerated');
      await loadAll();
    } catch {
      toast.error('Regenerate failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!confirm('Clear timetables for selected classes?')) return;
    setBusy(true);
    try {
      await timetableApi.clearTimetables({ term, academicYear, classes: selectedClasses });
      await loadAll();
    } catch {
      toast.error('Clear failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoComplete() {
    if (!selectedClasses.length) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.autoComplete({ classes: selectedClasses, term, academicYear });
      setGeneratePreview(data.data);
      setCoverage(data.data.coverage);
      setSchedulingIssues(data.data.issues ?? []);
      toast.success(data.data.message ?? 'Auto-complete finished');
    } catch {
      toast.error('Auto-complete failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleFillGaps() {
    if (!selectedClasses.length) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.fillGaps({ classes: selectedClasses, term, academicYear });
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
      }
      toast.success(result.message || 'Fill gaps complete');
    } catch {
      toast.error('Fill gaps failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="animate-spin" size={18} /> Loading…
      </div>
    );
  }

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

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl" style={{ color: NAVY }}>
            Create Timetable
          </h1>
          <div className="mt-4">
            <SegmentTabs
              items={[
                { id: 'generator', label: 'Generator', icon: Wand2 },
                { id: 'manual', label: 'Manual Entry', icon: PenLine },
              ]}
              value={activeTab}
              onChange={setActiveTab}
              activeWidthPercent={45}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'generator' ? (
            <GeneratorTab
              compact
              classes={classes}
              selectedClasses={selectedClasses}
              setSelectedClasses={setSelectedClasses}
              coverage={coverage}
              generatePreview={generatePreview}
              schedulingIssues={schedulingIssues}
              weeklyCapacity={
                periodSlots.filter((s) => !s.isBreak).length * Math.max(1, schedule?.activeDays?.length ?? 5)
              }
              onGenerate={handleGenerate}
              onApply={handleApply}
              onRegenerate={handleRegenerate}
              onClear={handleClear}
              onFillGaps={handleFillGaps}
              onAutoComplete={handleAutoComplete}
              busy={busy}
            />
          ) : (
            <ManualEntryTab
              term={term}
              academicYear={academicYear}
              schedule={schedule}
              courses={courses}
              classRows={classConfigRows}
              timetableRows={timetableRows}
              assignments={assignments}
              conflictCount={conflictCount}
              onRefresh={loadAll}
              busy={busy}
              setBusy={setBusy}
            />
          )}
        </div>
      </div>
    </div>
  );
}
