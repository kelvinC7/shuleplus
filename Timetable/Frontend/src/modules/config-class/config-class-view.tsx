'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Download,
  Loader2,
  Plus,
  Search,
  Settings2,
  Pencil,
  Trash2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  DatabaseZap,
  GraduationCap,
  CircleDot,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { TermYearBar } from '@/components/term-year-bar';
import { HrDataTable, PillBadge, type HrTableColumn } from '@/components/hr-data-table';
import { SideDrawer } from '@/components/side-drawer';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { SetupModal, ModalSection } from '@/components/setup-modal';
import { ModalFooterActions } from '@/components/setup-form-ui';
import { FormField, SelectField, TextField } from '@/components/form-fields';
import { timetableApi } from '@/services/timetable-api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type {
  ClassConfigDetail,
  ClassConfigListItem,
  ClassConfigStatus,
  ClassCourseRow,
  CourseConfig,
  TeacherOption,
} from '@/types';
import { parseSchedulingRules } from '@/utils/course-scheduling';
import { formatPreferredTime, previewAutoCourseCode } from '@/utils/course-code';
import { CourseCodeBadge } from '@/components/course-code-badge';

const SECTIONS = ['All', 'Primary', 'Secondary', 'Nursery', 'TVET'];
export const UNASSIGNED_TEACHER = {
  teacherUserId: '00000000-0000-0000-0000-000000000001',
  teacherName: 'Unassigned',
} as const;

const STATUS_FILTERS: Array<{ id: ClassConfigStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'ready', label: 'Ready' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'missing', label: 'Not Configured' },
];

function statusMeta(status: ClassConfigStatus) {
  if (status === 'ready') return { label: 'Ready', tone: 'green' as const };
  if (status === 'incomplete') return { label: 'Incomplete', tone: 'amber' as const };
  return { label: 'Missing', tone: 'red' as const };
}

function courseStatusLabel(status: ClassCourseRow['status']) {
  if (status === 'ready') return { label: 'Ready', className: 'bg-emerald-50 text-emerald-700' };
  if (status === 'warning') return { label: 'Needs review', className: 'bg-amber-50 text-amber-700' };
  return { label: 'Incomplete', className: 'bg-rose-50 text-rose-700' };
}

function isTeacherAssigned(teacherUserId: string, teacherName: string) {
  return (
    Boolean(teacherUserId) &&
    teacherUserId !== UNASSIGNED_TEACHER.teacherUserId &&
    teacherName !== UNASSIGNED_TEACHER.teacherName
  );
}

type ConfigDeleteTarget =
  | { kind: 'course'; id: string; subjectName: string; className: string }
  | { kind: 'teacher'; id: string; subjectName: string; teacherName: string; className: string };

export function ConfigClassView() {
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();
  const [section, setSection] = useState('All');
  const [rows, setRows] = useState<ClassConfigListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClassConfigStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'unavailable'>('idle');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClassConfigDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [courseConfigs, setCourseConfigs] = useState<CourseConfig[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<ClassCourseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigDeleteTarget | null>(null);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === 'course') {
        await timetableApi.deleteAssignment(deleteTarget.id);
        toast.success(`${deleteTarget.subjectName} removed from class`);
      } else {
        await timetableApi.updateAssignment(deleteTarget.id, {
          teacherUserId: UNASSIGNED_TEACHER.teacherUserId,
          teacherName: UNASSIGNED_TEACHER.teacherName,
        });
        toast.success(`Teacher removed from ${deleteTarget.subjectName}`);
      }
      setDeleteTarget(null);
      await refreshDetail();
    } catch {
      toast.error(deleteTarget.kind === 'course' ? 'Could not remove course' : 'Could not remove teacher');
    } finally {
      setBusy(false);
    }
  }

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { term, academic_year: academicYear };
      if (section !== 'All') params.section = section;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (levelFilter) params.level = levelFilter;
      if (streamFilter) params.stream = streamFilter;
      const [res, academic] = await Promise.all([
        timetableApi.listClassConfig(params),
        timetableApi.academicClasses(term, academicYear).catch(() => null),
      ]);
      setRows(res.data.data);
      const source = academic?.data.data.source ?? 'unavailable';
      setSyncStatus(source.startsWith('student-management') ? 'ok' : 'unavailable');
    } catch {
      setSyncStatus('unavailable');
      toast.error('Failed to load class configurations');
    } finally {
      setLoading(false);
    }
  }, [term, academicYear, section, statusFilter, levelFilter, streamFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleSync() {
    setSyncing(true);
    try {
      const academic = await timetableApi.academicClasses(term, academicYear);
      const source = academic?.data.data.source ?? 'unavailable';
      if (source.startsWith('student-management')) {
        setSyncStatus('ok');
      } else {
        setSyncStatus('unavailable');
        toast.error('Student Management unavailable. Showing Config Class only');
      }
      await loadList();
      toast.success(
        source.startsWith('student-management')
          ? 'Classes synced from Student Management'
          : 'Class list refreshed'
      );
    } catch {
      setSyncStatus('unavailable');
      toast.error('Failed to sync. Student Management may be unavailable');
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.className.toLowerCase().includes(q) ||
        r.level.toLowerCase().includes(q) ||
        (r.stream ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, levelFilter, streamFilter, statusFilter, section, term, academicYear]);

  const levelOptions = useMemo(
    () => [...new Set(rows.map((r) => r.level).filter(Boolean))].sort(),
    [rows]
  );
  const streamOptions = useMemo(
    () => [...new Set(rows.map((r) => r.stream).filter((s) => s))].sort() as string[],
    [rows]
  );

  async function openConfigure(className: string) {
    setActiveClass(className);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const [detailRes, coursesRes, roomsRes] = await Promise.all([
        timetableApi.getClassConfig(className, term, academicYear),
        timetableApi.listCourseConfig(),
        timetableApi.smartClassrooms().catch(() => null),
      ]);
      setDetail(detailRes.data.data);
      setCourseConfigs(coursesRes.data.data);
      const roomNames = (roomsRes?.data.data ?? []).map((r) => r.name).filter(Boolean);
      setRooms([...new Set(roomNames)].sort());
    } catch {
      toast.error('Failed to load class configuration');
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshDetail() {
    if (!activeClass) return;
    const res = await timetableApi.getClassConfig(activeClass, term, academicYear);
    setDetail(res.data.data);
    await loadList();
  }

  async function handleSaveAndRefresh() {
    if (!activeClass || busy) return;
    setBusy(true);
    try {
      await refreshDetail();
      toast.success('Configuration saved and refreshed');
    } catch {
      toast.error('Could not refresh configuration');
    } finally {
      setBusy(false);
    }
  }

  function exportListCsv() {
    const header = 'Class,Level,Stream,Students,Courses,Teachers,Periods,Status,Readiness';
    const lines = filtered.map(
      (r) =>
        `${r.className},${r.level},${r.stream ?? ''},${r.studentCount},${r.courseCount},${r.teacherCount},${r.totalPeriods},${r.status},${r.readinessPercent}%`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-config-${academicYear}-${term}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: HrTableColumn<ClassConfigListItem>[] = [
    {
      key: 'class',
      header: 'Class',
      sortable: true,
      render: (row) => <span className="font-bold text-navy">{row.className}</span>,
    },
    { key: 'level', header: 'Level', render: (row) => row.level },
    {
      key: 'students',
      header: 'Students',
      render: (row) => <span className="tabular-nums">{row.studentCount || '-'}</span>,
    },
    {
      key: 'courses',
      header: 'Courses',
      render: (row) => <span className="font-semibold tabular-nums">{row.courseCount}</span>,
    },
    {
      key: 'teachers',
      header: 'Teachers',
      render: (row) => <span className="tabular-nums">{row.teacherCount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = statusMeta(row.status);
        return (
          <PillBadge tone={s.tone}>
            {s.label}
          </PillBadge>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <button
          type="button"
          className="btn-primary py-1.5 text-xs"
          onClick={() => void openConfigure(row.className)}
        >
          <Settings2 size={14} /> Configure
        </button>
      ),
    },
  ];

  const totalClasses = filtered.length;
  const readyCount = filtered.filter((r) => r.status === 'ready').length;
  const incompleteCount = filtered.filter((r) => r.status === 'incomplete').length;
  const missingCount = filtered.filter((r) => r.status === 'missing').length;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Config Class</h1>
          <p className="mt-1 text-sm text-muted">
            Configure courses and teachers assigned to each class before generating the timetable.
          </p>
        </div>

        <TermYearBar
          term={term}
          academicYear={academicYear}
          onTermChange={setTerm}
          onYearChange={setAcademicYear}
          terms={academicSettings?.terms}
          academicYears={academicSettings?.academicYears}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Classes', value: totalClasses, icon: GraduationCap, color: 'text-navy' },
            { label: 'Ready', value: readyCount, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Incomplete', value: incompleteCount, icon: AlertTriangle, color: 'text-amber-600' },
            { label: 'Not Configured', value: missingCount, icon: CircleDot, color: 'text-red-500' },
          ].map((kpi) => (
            <div key={kpi.label} className="hr-card px-4 py-3">
              <div className="flex items-center gap-2">
                <kpi.icon size={16} className={kpi.color} />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{kpi.label}</p>
              </div>
              <p className={`mt-1 text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="hr-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FormField label="Section" compact>
                <select
                  className="input py-2 text-sm"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              <div className="relative min-w-[200px] flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input w-full py-2.5 pl-9"
                  placeholder="Search class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input py-2 text-sm" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                <option value="">Level</option>
                {levelOptions.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <select className="input py-2 text-sm" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                <option value="">Stream</option>
                {streamOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === f.id
                      ? 'border-primary bg-primary/15 text-navy'
                      : 'border-border text-muted hover:border-primary/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                {syncStatus === 'ok' ? (
                  <><span className="h-2 w-2 rounded-full bg-emerald-500" /> <span className="text-emerald-700">Student Management connected</span></>
                ) : syncStatus === 'unavailable' ? (
                  <><span className="h-2 w-2 rounded-full bg-red-500" /> <span className="text-red-600">Student Management unavailable</span></>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-secondary py-2 text-sm"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync Classes
              </button>
              <button type="button" className="btn-secondary py-2 text-sm" onClick={exportListCsv}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        <div className="hr-card p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
              <Loader2 className="animate-spin" size={18} /> Loading classes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-2xl bg-primary/10 p-4">
                <DatabaseZap size={32} className="text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-navy">No classes found</p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Classes are loaded from Student Management (e.g. N1, P1 A). Configure courses per class below, or sync to refresh.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary py-2.5 text-sm"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                {syncing ? (
                  <><Loader2 size={14} className="animate-spin" /> Syncing…</>
                ) : (
                  <><DatabaseZap size={14} /> Sync from Student Management</>
                )}
              </button>
            </div>
          ) : (
            <HrDataTable
              columns={columns}
              data={paged}
              rowKey={(r) => r.className}
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              emptyMessage="No classes found."
            />
          )}
        </div>
      </div>

      <ConfigureClassDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveClass(null);
          setDetail(null);
        }}
        className={activeClass}
        detail={detail}
        loading={detailLoading}
        term={term}
        academicYear={academicYear}
        courseConfigs={courseConfigs}
        rooms={rooms}
        allClasses={rows.map((r) => r.className)}
        busy={busy}
        setBusy={setBusy}
        onRefresh={() => void handleSaveAndRefresh()}
        onRegister={() => setRegisterOpen(true)}
        onBulk={() => setBulkOpen(true)}
        onCopy={() => setCopyOpen(true)}
        onEdit={(c) => {
          setEditCourse(c);
          setRegisterOpen(true);
        }}
        onDeleteCourse={(c) =>
          setDeleteTarget({
            kind: 'course',
            id: c.id,
            subjectName: c.subjectName,
            className: activeClass ?? c.subjectName,
          })
        }
        onRemoveTeacher={(c) =>
          setDeleteTarget({
            kind: 'teacher',
            id: c.id,
            subjectName: c.subjectName,
            teacherName: c.teacherName,
            className: activeClass ?? '',
          })
        }
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!busy) setDeleteTarget(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
        loading={busy}
        title={deleteTarget?.kind === 'teacher' ? 'Remove teacher?' : 'Remove course?'}
        description={
          deleteTarget?.kind === 'teacher'
            ? `This will unassign the teacher from this course. The course will remain on the class until you remove it.`
            : `This will remove the course from this class configuration. Teacher assignments for this course in this class will be deleted.`
        }
        itemLabel={
          deleteTarget
            ? deleteTarget.kind === 'teacher'
              ? `${deleteTarget.teacherName} · ${deleteTarget.subjectName} (${deleteTarget.className})`
              : `${deleteTarget.subjectName} · ${deleteTarget.className}`
            : undefined
        }
        confirmLabel={deleteTarget?.kind === 'teacher' ? 'Remove Teacher' : 'Remove Course'}
      />

      <RegisterCourseModal
        open={registerOpen}
        onClose={() => {
          setRegisterOpen(false);
          setEditCourse(null);
        }}
        className={activeClass}
        term={term}
        academicYear={academicYear}
        courseConfigs={courseConfigs}
        rooms={rooms}
        editRow={editCourse}
        registeredCourseCodes={
          (detail?.courses ?? []).map((c) => c.courseCode).filter(Boolean) as string[]
        }
        registeredCourses={detail?.courses ?? []}
        busy={busy}
        onSave={async () => {
          setRegisterOpen(false);
          setEditCourse(null);
          await refreshDetail();
        }}
        setBusy={setBusy}
      />

      <BulkAddModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        className={activeClass}
        term={term}
        academicYear={academicYear}
        courseConfigs={courseConfigs}
        existingSubjects={detail?.courses.map((c) => c.subjectName) ?? []}
        busy={busy}
        setBusy={setBusy}
        onDone={async () => {
          setBulkOpen(false);
          await refreshDetail();
        }}
      />

      <CopyConfigModal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        fromClass={activeClass}
        allClasses={rows.map((r) => r.className)}
        term={term}
        academicYear={academicYear}
        busy={busy}
        setBusy={setBusy}
        onDone={async () => {
          setCopyOpen(false);
          await loadList();
        }}
      />
    </>
  );
}

function ConfigureClassDrawer({
  open,
  onClose,
  className,
  detail,
  loading,
  term,
  academicYear,
  courseConfigs,
  rooms,
  allClasses,
  busy,
  setBusy,
  onRefresh,
  onRegister,
  onBulk,
  onCopy,
  onEdit,
  onDeleteCourse,
  onRemoveTeacher,
}: {
  open: boolean;
  onClose: () => void;
  className: string | null;
  detail: ClassConfigDetail | null;
  loading: boolean;
  term: string;
  academicYear: string;
  courseConfigs: CourseConfig[];
  rooms: string[];
  allClasses: string[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  onRefresh: () => void;
  onRegister: () => void;
  onBulk: () => void;
  onCopy: () => void;
  onEdit: (c: ClassCourseRow) => void;
  onDeleteCourse: (c: ClassCourseRow) => void;
  onRemoveTeacher: (c: ClassCourseRow) => void;
}) {
  const [courseSearch, setCourseSearch] = useState('');
  const summary = detail?.summary;
  const filteredCourses = useMemo(() => {
    if (!detail) return [];
    const q = courseSearch.trim().toLowerCase();
    if (!q) return detail.courses;
    return detail.courses.filter(
      (c) =>
        c.subjectName.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q) ||
        c.courseCode.toLowerCase().includes(q)
    );
  }, [detail, courseSearch]);

  const readiness = summary?.readinessPercent ?? 0;
  const status = summary?.status ?? 'missing';
  const statusInfo = statusMeta(status);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={className ? `Configure Class · ${className}` : 'Configure Class'}
      subtitle={
        detail
          ? `${detail.level}${detail.stream ? ` · ${detail.stream}` : ''} · ${detail.studentCount} students`
          : undefined
      }
      width="full"
      footer={
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary py-2 text-sm" onClick={onCopy}>
              <Copy size={14} /> Copy Configuration
            </button>
            <button type="button" className="btn-secondary py-2 text-sm" onClick={onClose}>
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary?.status === 'ready' ? (
              <Link href={`/timetable?tab=generator`} className="btn-primary py-2 text-sm">
                Generate Timetable
              </Link>
            ) : (
              <button type="button" className="btn-secondary py-2 text-sm" disabled>
                Fix Configuration
              </button>
            )}
            <button
              type="button"
              className="btn-primary py-2 text-sm"
              disabled={busy}
              onClick={() => onRefresh()}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              Save & Refresh
            </button>
          </div>
        </>
      }
    >
      {loading || !detail ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted">
          <Loader2 className="animate-spin" size={18} /> Loading configuration…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Courses', value: summary?.courseCount ?? 0 },
              { label: 'Teachers', value: summary?.teacherCount ?? 0 },
              { label: 'Periods / week', value: summary?.totalPeriods ?? 0 },
              { label: 'Readiness', value: `${readiness}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{kpi.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-navy">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-navy">
                Configuration readiness · {statusInfo.label}
              </p>
              <span className="text-xs text-muted">{readiness}% complete</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy to-primary"
                style={{ width: `${readiness}%` }}
              />
            </div>
            <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
              {Object.entries(detail.readiness).map(([key, val]) => (
                <p key={key} className={val.ok ? 'text-emerald-700' : 'text-amber-700'}>
                  {val.ok ? '✓' : '⚠'} {key}: {val.label}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input w-full py-2 pl-8 text-sm"
                placeholder="Search course name or code..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
            </div>
            <button type="button" className="btn-secondary py-2 text-sm" onClick={onBulk}>
              <Layers size={14} /> Add Multiple
            </button>
            <button type="button" className="btn-primary py-2 text-sm" onClick={onRegister}>
              <Plus size={14} /> Register Course
            </button>
          </div>

          <ul className="space-y-3 md:hidden">
            {filteredCourses.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                No courses registered. Add courses to configure this class.
              </li>
            ) : (
              filteredCourses.map((c) => {
                const color =
                  courseConfigs.find((cfg) => cfg.subjectName === c.subjectName)?.color ?? null;
                const s = courseStatusLabel(c.status);
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-border"
                            style={{ backgroundColor: color || '#E2E8F0' }}
                          />
                          <CourseCodeBadge code={c.courseCode} />
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${s.className}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        <p className="mt-2 font-bold text-navy">{c.subjectName}</p>
                        <p className="mt-1 text-xs text-muted">
                          {c.teacherName || 'No teacher'} · {c.periodsPerWeek} periods/wk
                        </p>
                        {c.room ? (
                          <p className="mt-0.5 text-xs text-muted">Room: {c.room}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary flex-1 py-2 text-xs"
                        onClick={() => onEdit(c)}
                      >
                        <Pencil size={14} className="inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                        onClick={() => onDeleteCourse(c)}
                      >
                        <Trash2 size={14} className="inline" />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Course</th>
                  <th className="px-3 py-2.5">Teacher</th>
                  <th className="px-3 py-2.5">Periods/wk</th>
                  <th className="px-3 py-2.5">Default</th>
                  <th className="px-3 py-2.5">Structure</th>
                  <th className="px-3 py-2.5">Room</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-muted">
                      No courses registered. Add courses to configure this class.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c) => {
                    const color =
                      courseConfigs.find((cfg) => cfg.subjectName === c.subjectName)?.color ?? null;
                    return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-slate-50/50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-border"
                            style={{ backgroundColor: color || '#E2E8F0' }}
                          />
                          <CourseCodeBadge code={c.courseCode} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-navy">{c.subjectName}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {c.periodsPerWeek} periods/week
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span>{c.teacherName || '-'}</span>
                          {isTeacherAssigned(c.teacherUserId, c.teacherName) ? (
                            <button
                              type="button"
                              title="Remove teacher"
                              className="rounded-md p-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                              onClick={() => onRemoveTeacher(c)}
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold">{c.periodsPerWeek}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {c.defaultCourseMarks != null ? (
                          <span className="inline-flex rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-navy">
                            {c.defaultCourseMarks}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{c.structure}</td>
                      <td className="px-3 py-2.5">{c.room || '-'}</td>
                      <td className="px-3 py-2.5">{c.preferredTime ?? 'Any'}</td>
                      <td className="px-3 py-2.5">
                        {(() => {
                          const s = courseStatusLabel(c.status);
                          return (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${s.className}`}>
                              {s.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Edit course / change teacher"
                            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-primary/10 hover:text-navy"
                            onClick={() => onEdit(c)}
                          >
                            <Pencil size={14} className="inline mr-0.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            title="Remove course"
                            className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                            onClick={() => onDeleteCourse(c)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-slate-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-navy">Summary</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-navy">
              <span>{summary?.courseCount ?? 0} courses</span>
              <span>{summary?.teacherCount ?? 0} teachers</span>
              <span>{summary?.totalPeriods ?? 0} periods/week</span>
              <span>{summary?.labPeriods ?? 0} lab</span>
              <span>{summary?.doublePreferences ?? 0} double</span>
            </div>
          </div>

          {detail.alerts.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <AlertTriangle size={16} className="text-amber-600" /> Configuration Alerts
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {detail.alerts.map((a) => (
                  <li key={a.message} className={a.severity === 'error' ? 'text-red-700' : 'text-amber-800'}>
                    • {a.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} /> Configuration looks good for timetable generation.
            </div>
          )}
        </div>
      )}
    </SideDrawer>
  );
}

type RegisterCourseEntry = {
  localId: string;
  courseConfigId: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
};

function newRegisterEntry(): RegisterCourseEntry {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    courseConfigId: '',
    subjectName: '',
    teacherUserId: '',
    teacherName: '',
  };
}

function assignmentPayloadFromCourse(
  className: string,
  term: string,
  academicYear: string,
  courseConfigId: string,
  teacherUserId: string,
  teacherName: string,
  courseConfigs: CourseConfig[]
) {
  const cfg = courseConfigs.find((c) => c.id === courseConfigId);
  if (!cfg) throw new Error('Course not found');
  const subjectName = cfg.subjectName;
  const rules = parseSchedulingRules(cfg?.schedulingRules);
  const lessonStructure =
    rules.lessonDuration === 'DOUBLE' && rules.doublePeriodMode === 'REQUIRE'
      ? 'REQUIRE_DOUBLE'
      : rules.lessonDuration === 'DOUBLE'
        ? 'PREFER_DOUBLE'
        : 'SINGLE';
  return {
    className,
    subjectName,
    teacherUserId,
    teacherName,
    periodsPerWeek: cfg?.periodsPerWeek ?? 3,
    defaultCourseMarks: null as number | null,
    room: rules.preferredLabRoom ?? rules.preferredRoom ?? undefined,
    schedulingOverrides: {
      lessonDuration: lessonStructure === 'SINGLE' ? 'SINGLE' : 'DOUBLE',
      doublePeriodMode: lessonStructure === 'REQUIRE_DOUBLE' ? 'REQUIRE' : 'PREFER',
      roomRequirement: rules.roomRequirement,
    },
    term,
    academicYear,
  };
}

function RegisterCourseModal({
  open,
  onClose,
  className,
  term,
  academicYear,
  courseConfigs,
  rooms,
  editRow,
  registeredCourseCodes,
  registeredCourses,
  busy,
  onSave,
  setBusy,
}: {
  open: boolean;
  onClose: () => void;
  className: string | null;
  term: string;
  academicYear: string;
  courseConfigs: CourseConfig[];
  rooms: string[];
  editRow: ClassCourseRow | null;
  registeredCourseCodes: string[];
  registeredCourses: ClassCourseRow[];
  busy: boolean;
  onSave: () => void;
  setBusy: (v: boolean) => void;
}) {
  const [subjectName, setSubjectName] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(3);
  const [defaultCourseMarks, setDefaultCourseMarks] = useState('');
  const [room, setRoom] = useState('');
  const [lessonStructure, setLessonStructure] = useState<'SINGLE' | 'PREFER_DOUBLE' | 'REQUIRE_DOUBLE'>('SINGLE');
  const [roomRequirement, setRoomRequirement] = useState<'ANY' | 'PREFER_LAB' | 'REQUIRE_LAB'>('ANY');
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [entries, setEntries] = useState<RegisterCourseEntry[]>(() => [newRegisterEntry()]);
  const [teacherCache, setTeacherCache] = useState<Record<string, TeacherOption[]>>({});

  const selectedCourse = courseConfigs.find((c) => c.subjectName === subjectName);
  const rules = selectedCourse ? parseSchedulingRules(selectedCourse.schedulingRules) : null;

  useEffect(() => {
    if (!open) return;
    if (editRow) {
      setSubjectName(editRow.subjectName);
      setTeacherUserId(editRow.teacherUserId);
      setTeacherName(editRow.teacherName);
      setPeriodsPerWeek(editRow.periodsPerWeek);
      setDefaultCourseMarks(
        editRow.defaultCourseMarks != null ? String(editRow.defaultCourseMarks) : ''
      );
      setRoom(editRow.room ?? '');
      const ov = editRow.schedulingOverrides;
      if (ov.lessonDuration === 'DOUBLE' && ov.doublePeriodMode === 'REQUIRE') setLessonStructure('REQUIRE_DOUBLE');
      else if (ov.lessonDuration === 'DOUBLE') setLessonStructure('PREFER_DOUBLE');
      else setLessonStructure('SINGLE');
      setRoomRequirement((ov.roomRequirement as typeof roomRequirement) ?? 'ANY');
    } else {
      setSubjectName('');
      setTeacherUserId('');
      setTeacherName('');
      setPeriodsPerWeek(3);
      setDefaultCourseMarks('');
      setRoom('');
      setLessonStructure('SINGLE');
      setRoomRequirement('ANY');
      setEntries([newRegisterEntry()]);
      setTeacherCache({});
    }
  }, [open, editRow]);

  const readyEntryCount = entries.filter((e) => e.courseConfigId && e.teacherUserId).length;
  const registeredCodeSet = useMemo(() => new Set(registeredCourseCodes), [registeredCourseCodes]);

  function coursesForEntry(entryId: string) {
    const pickedElsewhere = new Set(
      entries.filter((e) => e.localId !== entryId && e.courseConfigId).map((e) => e.courseConfigId)
    );
    return courseConfigs.filter(
      (c) =>
        c.id &&
        !registeredCodeSet.has(c.courseCode ?? '') &&
        !pickedElsewhere.has(c.id)
    );
  }

  function updateEntry(localId: string, patch: Partial<RegisterCourseEntry>) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.localId !== localId) return e;
        const next = { ...e, ...patch };
        if (patch.courseConfigId !== undefined && patch.courseConfigId !== e.courseConfigId) {
          const cfg = courseConfigs.find((c) => c.id === patch.courseConfigId);
          next.subjectName = cfg?.subjectName ?? '';
          next.teacherUserId = '';
          next.teacherName = '';
        }
        return next;
      })
    );
  }

  function addAnotherEntry() {
    const last = entries[entries.length - 1];
    if (last && (!last.courseConfigId || !last.teacherUserId)) {
      toast.error('Choose a course and teacher on the current row before adding another.');
      return;
    }
    setEntries((prev) => [...prev, newRegisterEntry()]);
  }

  function removeEntry(localId: string) {
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((e) => e.localId !== localId)));
  }

  const entrySubjectKey = entries.map((e) => e.subjectName).join('\0');

  useEffect(() => {
    if (!open || editRow) return;
    const subjects = [...new Set(entries.map((e) => e.subjectName).filter(Boolean))];
    for (const sn of subjects) {
      void timetableApi.classConfigTeachers(term, academicYear, sn).then((res) => {
        setTeacherCache((prev) => (prev[sn] ? prev : { ...prev, [sn]: res.data.data }));
      });
    }
  }, [open, editRow, entrySubjectKey, term, academicYear]);

  async function handleRegisterAll() {
    if (!className) return;
    const rows = entries.filter((e) => e.courseConfigId && e.teacherUserId);
    if (!rows.length) {
      toast.error('Add at least one course with a teacher.');
      return;
    }
    const ids = rows.map((r) => r.courseConfigId);
    if (new Set(ids).size !== ids.length) {
      toast.error('Each course can only be added once.');
      return;
    }
    for (const id of ids) {
      const cfg = courseConfigs.find((c) => c.id === id);
      if (cfg?.courseCode && registeredCodeSet.has(cfg.courseCode)) {
        toast.error(`${cfg.courseCode} is already on this class.`);
        return;
      }
    }

    setBusy(true);
    try {
      const payloads = rows.map((e) =>
        assignmentPayloadFromCourse(
          className,
          term,
          academicYear,
          e.courseConfigId,
          e.teacherUserId,
          e.teacherName,
          courseConfigs
        )
      );
      await timetableApi.bulkAssignments(payloads);
      toast.success(`Registered ${payloads.length} course${payloads.length === 1 ? '' : 's'} on ${className}`);
      onSave();
    } catch {
      toast.error('Failed to register courses');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || !subjectName) {
      setTeachers([]);
      return;
    }
    void timetableApi.classConfigTeachers(term, academicYear, subjectName).then((res) => {
      setTeachers(res.data.data);
    });
  }, [open, subjectName, term, academicYear]);

  useEffect(() => {
    if (!selectedCourse || editRow) return;
    setPeriodsPerWeek(selectedCourse.periodsPerWeek ?? 3);
    const r = parseSchedulingRules(selectedCourse.schedulingRules);
    if (r.lessonDuration === 'DOUBLE' && r.doublePeriodMode === 'REQUIRE') setLessonStructure('REQUIRE_DOUBLE');
    else if (r.lessonDuration === 'DOUBLE') setLessonStructure('PREFER_DOUBLE');
    else setLessonStructure('SINGLE');
    setRoomRequirement(r.roomRequirement);
    if (r.preferredLabRoom) setRoom(r.preferredLabRoom);
    else if (r.preferredRoom) setRoom(r.preferredRoom);
  }, [selectedCourse, editRow]);

  async function handleSubmit() {
    if (!className || !subjectName || !teacherUserId) {
      toast.error('Course and teacher are required');
      return;
    }
    const schedulingOverrides: Record<string, unknown> = {
      lessonDuration: lessonStructure === 'SINGLE' ? 'SINGLE' : 'DOUBLE',
      doublePeriodMode: lessonStructure === 'REQUIRE_DOUBLE' ? 'REQUIRE' : 'PREFER',
      roomRequirement,
    };
    const dcmRaw = defaultCourseMarks.trim();
    const dcmParsed = dcmRaw ? parseFloat(dcmRaw) : null;
    if (dcmRaw && (!Number.isFinite(dcmParsed!) || dcmParsed! <= 0)) {
      toast.error('Default marks must be a positive number, or leave blank');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        className,
        subjectName,
        teacherUserId,
        teacherName,
        periodsPerWeek,
        defaultCourseMarks: dcmParsed,
        room: room || undefined,
        schedulingOverrides,
        term,
        academicYear,
      };
      if (editRow) {
        await timetableApi.updateAssignment(editRow.id, payload);
        toast.success('Course updated');
      } else {
        await timetableApi.createAssignment(payload);
        toast.success('Course registered');
      }
      onSave();
    } catch {
      toast.error('Failed to save course');
    } finally {
      setBusy(false);
    }
  }

  const courseOptions = courseConfigs.map((c) => ({
    value: c.subjectName,
    label: c.courseCode ? `${c.courseCode} · ${c.subjectName}` : c.subjectName,
  }));

  return (
    <SetupModal
      open={open}
      onClose={onClose}
      title={editRow ? 'Edit course assignment' : 'Register Courses'}
      subtitle={
        className
          ? editRow
            ? `${className}`
            : `${className}`
          : undefined
      }
      size="lg"
      footer={
        editRow ? (
          <ModalFooterActions
            onCancel={onClose}
            onSave={() => void handleSubmit()}
            saveLabel="Save Changes"
            saving={busy}
            disabled={!subjectName || !teacherUserId}
          />
        ) : (
          <>
            <button type="button" className="btn-secondary w-full py-2 sm:w-auto sm:px-4" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary w-full py-2 sm:w-auto sm:px-4"
              disabled={busy || readyEntryCount === 0}
              onClick={() => void handleRegisterAll()}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Register {readyEntryCount > 0 ? `${readyEntryCount} course${readyEntryCount === 1 ? '' : 's'}` : 'courses'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {!editRow ? (
          <>
            {registeredCourses.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Already on this class</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {registeredCourses.map((row) => (
                      <span
                        key={row.id}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        <CourseCodeBadge code={row.courseCode} />
                        {row.subjectName}
                      </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {entries.map((entry, index) => {
                const rowCourses = coursesForEntry(entry.localId);
                const cfg = courseConfigs.find((c) => c.id === entry.courseConfigId);
                const rowTeachers = entry.subjectName ? teacherCache[entry.subjectName] ?? [] : [];
                const courseOpts = [
                  { value: '', label: 'Select course…' },
                  ...rowCourses.map((c) => ({
                    value: c.id,
                    label: c.courseCode ? `${c.courseCode} · ${c.subjectName}` : c.subjectName,
                  })),
                ];
                const teacherOpts = [
                  { value: '', label: entry.courseConfigId ? 'Select teacher…' : 'Choose a course first' },
                  ...rowTeachers.map((t) => ({
                    value: t.teacherUserId,
                    label: t.teacherName,
                  })),
                ];
                return (
                  <div
                    key={entry.localId}
                    className="rounded-2xl border border-border/90 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-navy">
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold text-navy">Course & teacher</span>
                      </div>
                      {entries.length > 1 ? (
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                          title="Remove row"
                          onClick={() => removeEntry(entry.localId)}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        compact
                        label="Course"
                        value={entry.courseConfigId}
                        onChange={(v) => updateEntry(entry.localId, { courseConfigId: v })}
                        placeholder="Select course..."
                        options={courseOpts}
                      />
                      <SelectField
                        compact
                        label="Teacher"
                        value={entry.teacherUserId}
                        onChange={(v) => {
                          const t = rowTeachers.find((x) => x.teacherUserId === v);
                          updateEntry(entry.localId, {
                            teacherUserId: v,
                            teacherName: t?.teacherName ?? '',
                          });
                        }}
                        placeholder="Select teacher..."
                        options={teacherOpts}
                        disabled={!entry.courseConfigId}
                      />
                    </div>
                    {cfg ? (
                      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
                        <CourseCodeBadge code={cfg.courseCode ?? '-'} className="mr-1 align-middle text-[10px]" />
                        {cfg.periodsPerWeek} periods/week
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-navy transition hover:border-primary/60 hover:bg-primary/10"
              onClick={addAnotherEntry}
            >
              <UserPlus size={18} className="text-primary" />
              Add another course
            </button>
          </>
        ) : (
          <>
          <SelectField
            compact
            label="Course"
            value={subjectName}
            onChange={setSubjectName}
            placeholder="Select course..."
            options={[{ value: '', label: 'Select course…' }, ...courseOptions]}
            disabled
          />

        {selectedCourse && rules ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-slate-50/80 p-3 text-xs">
              <p className="font-bold text-navy">Course defaults</p>
              <p className="mt-1 text-muted">Code: {selectedCourse.courseCode ?? '-'}</p>
              <p className="mt-1 text-muted">{selectedCourse.periodsPerWeek} periods/week</p>
              <p className="mt-1 text-muted">
                {selectedCourse.prefersDoublePeriod ? 'Prefer double' : 'Single'} ·{' '}
                {rules.roomRequirement.replace(/_/g, ' ')} · {formatPreferredTime(selectedCourse)}
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <p className="font-bold text-navy">Class configuration ({className})</p>
              <p className="mt-1 text-muted">{periodsPerWeek} periods/week (override)</p>
            </div>
          </div>
        ) : null}

        <SelectField
          compact
          label="Teacher"
          value={teacherUserId}
          onChange={(v) => {
            const t = teachers.find((x) => x.teacherUserId === v);
            setTeacherUserId(v);
            setTeacherName(t?.teacherName ?? '');
          }}
          placeholder="Select teacher…"
          options={[
            { value: '', label: teachers.length ? 'Select teacher…' : 'Loading teachers…' },
            ...teachers.map((t) => ({
              value: t.teacherUserId,
              label: t.teacherName,
            })),
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField compact label="Periods per week" type="number" min={1} max={14} value={periodsPerWeek} onChange={(v) => setPeriodsPerWeek(Number(v) || 1)} />
          <TextField
            compact
            label="Default course marks (optional)"
            type="number"
            min={1}
            max={1000}
            value={defaultCourseMarks}
            onChange={setDefaultCourseMarks}
            placeholder="e.g. 40"
          />
        </div>

        <ModalSection title="Lesson structure">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['SINGLE', 'Single'],
                ['PREFER_DOUBLE', 'Prefer Double'],
                ['REQUIRE_DOUBLE', 'Require Double'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLessonStructure(id)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  lessonStructure === id ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </ModalSection>

        <ModalSection title="Room requirement">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['ANY', 'Any room'],
                ['PREFER_LAB', 'Prefer lab'],
                ['REQUIRE_LAB', 'Require lab'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRoomRequirement(id)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  roomRequirement === id ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <SelectField
            compact
            label="Preferred room"
            value={room}
            onChange={setRoom}
            placeholder="Select room..."
            options={[{ value: '', label: '-' }, ...rooms.map((r) => ({ value: r, label: r }))]}
          />
        </ModalSection>
          </>
        )}
      </div>
    </SetupModal>
  );
}

function BulkAddModal({
  open,
  onClose,
  className,
  term,
  academicYear,
  courseConfigs,
  existingSubjects,
  busy,
  setBusy,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  className: string | null;
  term: string;
  academicYear: string;
  courseConfigs: CourseConfig[];
  existingSubjects: string[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = courseConfigs.filter((c) => !existingSubjects.includes(c.subjectName));

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  async function handleAdd() {
    if (!className || selected.size === 0) return;
    setBusy(true);
    try {
      const rows = [...selected].map((subjectName) => {
        const cfg = courseConfigs.find((c) => c.subjectName === subjectName)!;
        return {
          className,
          subjectName,
          teacherUserId: UNASSIGNED_TEACHER.teacherUserId,
          teacherName: UNASSIGNED_TEACHER.teacherName,
          periodsPerWeek: cfg.periodsPerWeek ?? 1,
          term,
          academicYear,
        };
      });
      await timetableApi.bulkAssignments(rows);
      toast.success(`Added ${rows.length} course(s). Assign teachers next`);
      onDone();
    } catch {
      toast.error('Bulk add failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SetupModal
      open={open}
      onClose={onClose}
      title="Add Multiple Courses"
      subtitle={className ?? undefined}
      footer={
        <ModalFooterActions
          onCancel={onClose}
          onSave={() => void handleAdd()}
          saveLabel="Add Selected"
          saving={busy}
          disabled={selected.size === 0}
        />
      }
    >
      <div className="space-y-2">
        {available.length === 0 ? (
          <p className="text-sm text-muted">All configured courses are already added to this class.</p>
        ) : (
          available.map((c) => (
            <label
              key={c.subjectName}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.has(c.subjectName)}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(c.subjectName)) next.delete(c.subjectName);
                  else next.add(c.subjectName);
                  setSelected(next);
                }}
              />
              <span className="flex-1 font-semibold text-navy">{c.subjectName}</span>
              <span className="text-xs text-muted">{c.periodsPerWeek ?? 1} periods</span>
            </label>
          ))
        )}
      </div>
    </SetupModal>
  );
}

function CopyConfigModal({
  open,
  onClose,
  fromClass,
  allClasses,
  term,
  academicYear,
  busy,
  setBusy,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  fromClass: string | null;
  allClasses: string[];
  term: string;
  academicYear: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onDone: () => void;
}) {
  const [targets, setTargets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setTargets(new Set());
  }, [open]);

  async function handleCopy() {
    if (!fromClass || targets.size === 0) return;
    setBusy(true);
    try {
      await timetableApi.copyClassConfig({
        fromClass,
        toClasses: [...targets],
        term,
        academicYear,
      });
      toast.success(`Configuration copied to ${targets.size} class(es)`);
      onDone();
    } catch {
      toast.error('Copy failed');
    } finally {
      setBusy(false);
    }
  }

  const options = allClasses.filter((c) => c !== fromClass);

  return (
    <SetupModal
      open={open}
      onClose={onClose}
      title="Copy Configuration"
      subtitle={fromClass ? `From ${fromClass}` : undefined}
      footer={
        <ModalFooterActions
          onCancel={onClose}
          onSave={() => void handleCopy()}
          saveLabel="Copy"
          saving={busy}
          disabled={targets.size === 0}
        />
      }
    >
      <p className="mb-3 text-sm text-muted">Copy course setup to other classes (teachers included). Adjust after copy if needed.</p>
      <div className="space-y-2">
        {options.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2">
            <input
              type="checkbox"
              checked={targets.has(c)}
              onChange={() => {
                const next = new Set(targets);
                if (next.has(c)) next.delete(c);
                else next.add(c);
                setTargets(next);
              }}
            />
            <span className="font-medium text-navy">{c}</span>
          </label>
        ))}
      </div>
    </SetupModal>
  );
}
