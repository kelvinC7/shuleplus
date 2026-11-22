import type { PeriodSlotDefinition, TimetableRow } from '@/types';
import { classStreamBase } from '@/utils/timetable-summary';
import type { TeacherWorkloadRow } from '@/utils/timetable-reporting';

type Cell = string | number | null | undefined;

function esc(value: Cell): string {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');
}

/**
 * Download a real spreadsheet-friendly file without adding a dependency.
 * Excel opens the styled HTML table as a workbook (`.xls`).
 */
function downloadExcel(
  filename: string,
  title: string,
  headers: string[],
  rows: Cell[][],
  meta: { schoolName?: string; term: string; academicYear: string }
) {
  const head = headers.map((header) => `<th>${esc(header)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`
    )
    .join('');
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8" />
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  th { background: #000435; color: #ffffff; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; }
  td { padding: 5px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  h1 { font-family: Calibri, Arial, sans-serif; font-size: 15pt; margin: 0 0 4px; color: #000435; }
  h2 { font-family: Calibri, Arial, sans-serif; font-size: 10pt; margin: 0 0 10px; color: #64748b; font-weight: 500; }
</style>
</head>
<body>
<h1>${esc(meta.schoolName || 'School')} — ${esc(title)}</h1>
<h2>${esc(meta.term)} · ${esc(meta.academicYear)} · Generated ${esc(new Date().toLocaleDateString())}</h2>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(filename)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportTeacherWorkloadExcel(
  teachers: TeacherWorkloadRow[],
  meta: { schoolName?: string; term: string; academicYear: string }
) {
  downloadExcel(
    `teacher-workload-${meta.academicYear}-${meta.term}`,
    'Teacher Workload',
    [
      'Teacher',
      'Employee No.',
      'Department',
      'Total Periods',
      'Classes',
      'Subjects',
      'Status',
    ],
    teachers.map((teacher) => [
      teacher.teacherName,
      teacher.employeeNumber ?? '',
      teacher.department,
      teacher.totalPeriods,
      teacher.classes.join(', '),
      teacher.subjects.join(', '),
      teacher.status === 'overloaded'
        ? 'Overloaded'
        : teacher.status === 'high'
          ? 'High load'
          : 'Normal',
    ]),
    meta
  );
}

export function exportTeacherDetailExcel(
  teacher: TeacherWorkloadRow,
  periodSlots: PeriodSlotDefinition[],
  meta: { schoolName?: string; term: string; academicYear: string }
) {
  downloadExcel(
    `${teacher.teacherName}-timetable-${meta.academicYear}`,
    `Teacher Timetable · ${teacher.teacherName}`,
    ['Day', 'Period', 'Time', 'Subject', 'Class / Stream', 'Room'],
    teacher.slots.map((slot) => {
      const period =
        periodSlots.find(
          (candidate) => candidate.startTime === slot.startTime && candidate.endTime === slot.endTime
        )?.name ?? slot.periodLabel;
      return [
        slot.dayOfWeek,
        period,
        `${slot.startTime}–${slot.endTime}`,
        slot.subjectName,
        slot.className,
        slot.room ?? '',
      ];
    }),
    meta
  );
}

export function exportClassTimetableExcel(
  className: string,
  rows: TimetableRow[],
  periodSlots: PeriodSlotDefinition[],
  days: string[],
  meta: { schoolName?: string; term: string; academicYear: string }
) {
  const headers = ['Day', ...periodSlots.map((slot) => `${slot.name}\n${slot.startTime}–${slot.endTime}`)];
  const body = days.map((day) => [
    day,
    ...periodSlots.map((slot) => {
      if (slot.isBreak) return slot.name;
      const lessons = rows.filter(
        (row) =>
          row.dayOfWeek === day &&
          row.startTime === slot.startTime &&
          (row.endTime === slot.endTime || !row.endTime)
      );
      if (!lessons.length) return '';
      return lessons
        .map(
          (lesson) =>
            `${lesson.subjectName} — ${lesson.teacherName}${lesson.room ? ` (${lesson.room})` : ''}`
        )
        .join(' | ');
    }),
  ]);

  downloadExcel(
    `${className}-timetable-${meta.academicYear}`,
    `Class Timetable · ${className}`,
    headers,
    body,
    meta
  );
}

export function exportAllStreamsTimetableExcel(
  rows: TimetableRow[],
  periodSlots: PeriodSlotDefinition[],
  days: string[],
  group: string,
  meta: { schoolName?: string; term: string; academicYear: string }
) {
  const streams = [...new Set(rows.map((row) => row.className))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  const headers = ['Day', 'Stream', ...periodSlots.map((slot) => `${slot.name}\n${slot.startTime}–${slot.endTime}`)];
  const body: Cell[][] = [];

  for (const day of days) {
    for (const stream of streams) {
      const streamRows = rows.filter((row) => row.className === stream);
      body.push([
        day,
        stream,
        ...periodSlots.map((slot) => {
          if (slot.isBreak) return slot.name;
          const lessons = streamRows.filter(
            (row) =>
              row.dayOfWeek === day &&
              row.startTime === slot.startTime &&
              (row.endTime === slot.endTime || !row.endTime)
          );
          if (!lessons.length) return '';
          return lessons
            .map(
              (lesson) =>
                `${lesson.subjectName} — ${lesson.teacherName}${lesson.room ? ` (${lesson.room})` : ''}`
            )
            .join(' | ');
        }),
      ]);
    }
  }

  downloadExcel(
    `${group}-all-streams-timetable-${meta.academicYear}`,
    `All Streams Timetable · ${classStreamBase(group)}`,
    headers,
    body,
    meta
  );
}
