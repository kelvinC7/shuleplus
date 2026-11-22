'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Layers,
  Printer,
  Users,
} from 'lucide-react';
import type { CourseConfig, PeriodSlotDefinition, TimetableRow } from '@/types';
import { SelectField, TextField } from '@/components/form-fields';
import { TimetableGrid } from '@/components/timetable-grid';
import { TimetableStreamMatrix } from '@/components/timetable-stream-matrix';
import {
  TimetablePrintPreview,
  type TimetablePrintGroup,
} from '@/components/timetable-print-preview';
import {
  buildClassStreamGroups,
  normalizeDayOrder,
} from '@/utils/timetable-reporting';
import { normalizeClassName, type ClassCatalogEntry } from '@/utils/timetable-summary';
import {
  exportAllStreamsTimetableExcel,
  exportClassTimetableExcel,
} from '@/utils/timetable-excel-export';
import { resolveCourseColor } from '@/utils/timetable';
import { shortCourseCode } from '@/utils/course-code';

interface ClassTimetableViewProps {
  rows: TimetableRow[];
  courses: CourseConfig[];
  periodSlots: PeriodSlotDefinition[];
  classes: string[];
  /** Student Management classes, with `name` and `stream` kept separate. */
  classCatalog?: ClassCatalogEntry[];
  days: string[];
  term: string;
  academicYear: string;
  schoolName?: string;
}

interface PrintState {
  title: string;
  subtitle?: string;
  groups: TimetablePrintGroup[];
}

export function ClassTimetableView({
  rows,
  courses,
  periodSlots,
  classes,
  classCatalog = [],
  days,
  term,
  academicYear,
  schoolName,
}: ClassTimetableViewProps) {
  const rowLabels = useMemo(
    () =>
      [...new Set(rows.map((row) => row.className).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [rows]
  );

  const allClasses = useMemo(() => {
    // Row labels first so they win when the catalog label differs slightly.
    return [...new Set([...rowLabels, ...classes.filter(Boolean)])];
  }, [rowLabels, classes]);

  const groups = useMemo(
    () => buildClassStreamGroups(allClasses, classCatalog),
    [allClasses, classCatalog]
  );
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStream, setSelectedStream] = useState('ALL');
  const [dayFilter, setDayFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [printState, setPrintState] = useState<PrintState | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroup('');
      return;
    }
    if (!groups.some((group) => group.group === selectedGroup)) {
      setSelectedGroup(groups[0]!.group);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
    setSelectedStream('ALL');
  }, [selectedGroup]);

  const activeGroup = groups.find((group) => group.group === selectedGroup) ?? groups[0];
  const members = activeGroup?.members ?? [];
  const streams = members.map((member) => member.className);

  const orderedDays = useMemo(
    () => [...days].sort((a, b) => normalizeDayOrder(a) - normalizeDayOrder(b)),
    [days],
  );
  const visibleDays = dayFilter === 'ALL' ? orderedDays : [dayFilter];

  const groupRowKeys = useMemo(
    () => new Set((activeGroup?.classes ?? []).map(normalizeClassName)),
    [activeGroup]
  );

  const groupRows = useMemo(
    () => rows.filter((row) => groupRowKeys.has(normalizeClassName(row.className))),
    [rows, groupRowKeys]
  );

  const viewRows = useMemo(
    () =>
      selectedStream === 'ALL'
        ? groupRows
        : groupRows.filter(
            (row) => normalizeClassName(row.className) === normalizeClassName(selectedStream)
          ),
    [groupRows, selectedStream]
  );

  const subjects = useMemo(
    () => [...new Set(viewRows.map((row) => row.subjectName))].sort((a, b) => a.localeCompare(b)),
    [viewRows]
  );

  const teacherCount = useMemo(
    () => new Set(viewRows.map((row) => row.teacherUserId).filter(Boolean)).size,
    [viewRows]
  );

  const currentMember = members.find(
    (member) => normalizeClassName(member.className) === normalizeClassName(selectedStream)
  );

  const currentLabel =
    selectedStream === 'ALL'
      ? `${selectedGroup} · All Streams`
      : `${selectedGroup}${currentMember?.stream ? ` · ${currentMember.stream}` : ` · ${selectedStream}`}`;

  const isAllStreams = selectedStream === 'ALL' && members.length > 1;

  function openPrint() {
    if (!activeGroup) return;

    setPrintState({
      title: isAllStreams
        ? `Class Timetable · ${selectedGroup} · All Streams`
        : `Class Timetable · ${currentLabel}`,
      subtitle: `${viewRows.length} scheduled lessons`,
      groups: [
        {
          key: isAllStreams ? `${selectedGroup}-all-streams` : selectedStream,
          title: isAllStreams ? `${selectedGroup} · All Streams` : selectedStream,
          subtitle: `${viewRows.length} scheduled lessons`,
          rows: viewRows,
          layout: isAllStreams ? 'stream-matrix' : 'grid',
          streams: isAllStreams ? streams : undefined,
        },
      ],
    });
  }

  async function handlePdf() {
    if (!activeGroup) return;
    setExporting(true);
    try {
      const { exportClassTimetablePdf, exportAllStreamsTimetablePdf } = await import(
        '@/utils/timetable-pdf-export'
      );
      if (selectedStream === 'ALL') {
        exportAllStreamsTimetablePdf(activeGroup.group, groupRows, {
          schoolName,
          term,
          academicYear,
        }, { periodSlots, courses }, { format: 'a4', days: visibleDays });
      } else {
        const target = currentMember?.className ?? selectedStream;
        const targetRows = groupRows.filter(
          (row) => normalizeClassName(row.className) === normalizeClassName(target)
        );
        exportClassTimetablePdf(target, targetRows, { schoolName, term, academicYear }, {
          periodSlots,
          courses,
        });
      }
    } finally {
      setExporting(false);
    }
  }

  function handleExcel() {
    if (!activeGroup) return;
    const meta = { schoolName, term, academicYear };
    if (selectedStream === 'ALL' && streams.length > 1) {
      exportAllStreamsTimetableExcel(
        groupRows,
        periodSlots,
        visibleDays,
        activeGroup.group,
        meta
      );
    } else {
      const target = selectedStream === 'ALL' ? activeGroup.group : currentMember?.className ?? selectedStream;
      const targetRows =
        selectedStream === 'ALL'
          ? groupRows
          : groupRows.filter(
              (row) => normalizeClassName(row.className) === normalizeClassName(target)
            );
      exportClassTimetableExcel(target, targetRows, periodSlots, visibleDays, meta);
    }
  }

  if (!allClasses.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-slate-50/60 px-6 py-14 text-center">
        <CalendarRange size={34} className="mx-auto text-muted/40" />
        <p className="mt-3 font-semibold text-navy">No classes configured yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Add teacher assignments or generate a timetable for a class. Classes and streams from
          Student Management appear here automatically.
        </p>
      </div>
    );
  }

  if (!groupRows.length) {
    return (
      <div className="space-y-5">
        <GroupPicker
          groups={groups}
          selectedGroup={selectedGroup}
          onChange={setSelectedGroup}
        />
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/60 px-6 py-14 text-center">
          <Layers size={32} className="mx-auto text-muted/40" />
          <p className="mt-3 font-semibold text-navy">No timetable for {selectedGroup}</p>
          <p className="mt-1 text-sm text-muted">
            This class/stream group exists, but no teaching periods are scheduled for {term}{' '}
            {academicYear}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="hr-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[190px] flex-1">
            <SelectField
              label="Class / Level"
              value={selectedGroup}
              onChange={setSelectedGroup}
              options={groups.map((group) => ({
                value: group.group,
                label: `${group.group}${group.classes.length > 1 ? ` (${group.classes.length} streams)` : ''}`,
              }))}
            />
          </div>
          <div className="min-w-[150px] flex-1">
            <SelectField
              label="Day"
              value={dayFilter}
              onChange={setDayFilter}
              options={[
                { value: 'ALL', label: 'All days' },
                ...orderedDays.map((day) => ({ value: day, label: day })),
              ]}
            />
          </div>
          <div className="min-w-[190px] flex-[1.4]">
            <TextField
              label="Search"
              value={search}
              onChange={setSearch}
              placeholder="Subject, teacher, room…"
            />
          </div>
        </div>

        {members.length > 1 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Streams
            </span>
            <button
              type="button"
              onClick={() => setSelectedStream('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedStream === 'ALL'
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              All Streams
            </button>
            {members.map((member) => {
              const active =
                normalizeClassName(selectedStream) === normalizeClassName(member.className);
              return (
                <button
                  key={member.className}
                  type="button"
                  onClick={() => setSelectedStream(member.className)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-navy text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {member.stream || member.className}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Layers size={17} />} label="Streams" value={streams.length} hint={selectedGroup} />
        <StatCard icon={<CalendarRange size={17} />} label="Scheduled periods" value={viewRows.length} hint={`${term} ${academicYear}`} />
        <StatCard icon={<Users size={17} />} label="Teachers" value={teacherCount} hint="Assigned to this view" />
        <StatCard icon={<FileText size={17} />} label="Subjects" value={subjects.length} hint="On the timetable" />
      </div>

      <div className="hr-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-navy">
              {selectedStream === 'ALL' && streams.length > 1
                ? `${selectedGroup} · All Streams`
                : currentLabel}
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {isAllStreams
                ? `All streams of ${selectedGroup} · days grouped down the page · periods across the top`
                : `Periods across the top · ${visibleDays.length} day${
                    visibleDays.length === 1 ? '' : 's'
                  } · ${periodSlots.filter((slot) => !slot.isBreak).length} teaching periods`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary py-2" onClick={openPrint}>
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="btn-secondary py-2"
              onClick={handleExcel}
              disabled={exporting}
            >
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button
              type="button"
              className="btn-secondary py-2"
              onClick={() => void handlePdf()}
              disabled={exporting}
            >
              <FileText size={15} /> PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto p-2 sm:p-3">
          {isAllStreams ? (
            <TimetableStreamMatrix
              rows={groupRows}
              streams={streams}
              periodSlots={periodSlots}
              days={visibleDays}
              courses={courses}
              search={search}
            />
          ) : (
            <TimetableGrid
              rows={viewRows}
              periodSlots={periodSlots}
              days={visibleDays}
              courses={courses}
              showStream={false}
              search={search}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3 sm:px-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Subjects</span>
          {subjects.length ? (
            subjects.map((subject) => {
              const code = shortCourseCode(
                courses.find((course) => course.subjectName === subject)?.courseCode,
                subject
              );
              return (
                <span
                  key={subject}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-navy"
                  style={{ backgroundColor: resolveCourseColor(subject, courses) }}
                  title={subject}
                >
                  <span className="font-bold">{code}</span>
                  <span className="text-navy/70">{subject}</span>
                </span>
              );
            })
          ) : (
            <span className="text-xs text-muted">No subjects in this view.</span>
          )}
        </div>
      </div>

      {printState ? (
        <TimetablePrintPreview
          open
          onClose={() => setPrintState(null)}
          groups={printState.groups}
          periodSlots={periodSlots}
          days={visibleDays}
          courses={courses}
          schoolName={schoolName}
          term={term}
          academicYear={academicYear}
          title={printState.title}
          subtitle={printState.subtitle}
        />
      ) : null}
    </div>
  );
}

function GroupPicker({
  groups,
  selectedGroup,
  onChange,
}: {
  groups: Array<{ group: string; classes: string[] }>;
  selectedGroup: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="hr-card max-w-sm p-4">
      <SelectField
        label="Class / Level"
        value={selectedGroup}
        onChange={onChange}
        options={groups.map((group) => ({
          value: group.group,
          label: `${group.group}${group.classes.length > 1 ? ` (${group.classes.length} streams)` : ''}`,
        }))}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="hr-card flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-navy">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-bold leading-tight text-navy">{value}</p>
        {hint ? <p className="truncate text-[11px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
