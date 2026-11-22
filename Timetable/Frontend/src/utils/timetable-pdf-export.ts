import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PeriodSlotDefinition } from '@/types';
import { WEEK_DAYS } from '@/types';
import { colorToRgbTuple, resolveCourseColor } from '@/utils/timetable';
import { shortCourseCode } from '@/utils/course-code';

export interface TimetablePdfRow {
  className: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
}

interface PdfMeta {
  schoolName?: string;
  term: string;
  academicYear: string;
}

export interface TimetablePdfContext {
  periodSlots: PeriodSlotDefinition[];
  courses: Array<{ subjectName: string; courseCode?: string | null; color?: string | null }>;
}

const NAVY: [number, number, number] = [0, 4, 53];
const GOLD: [number, number, number] = [252, 176, 56];
const GRID: [number, number, number] = [226, 232, 240];
const MUTED: [number, number, number] = [100, 116, 139];
const BREAK_FILL: [number, number, number] = [241, 245, 249];

function orderedDays(rows: TimetablePdfRow[]): string[] {
  const present = new Set(rows.map((row) => row.dayOfWeek));
  const ordered = [...WEEK_DAYS].filter((day) => present.has(day));
  return ordered.length ? ordered : [...WEEK_DAYS].slice(0, 5);
}

function drawHeader(doc: jsPDF, title: string, subtitle: string, meta: PdfMeta): number {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 16, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 16, width, 1.4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(meta.schoolName || 'School Timetable', 7, 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(`${meta.term} · ${meta.academicYear}`, width - 7, 6.5, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(title, 7, 12.2, { maxWidth: width - 14 });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(190, 200, 220);
    doc.text(subtitle, width - 7, 12.2, { align: 'right', maxWidth: width - 80 });
  }
  return 21;
}

interface TableOptions {
  days?: string[];
  secondary: 'teacher' | 'class';
  showStream?: boolean;
  emptyText?: string;
  format?: 'a4' | 'a3';
  title?: string;
  subtitle?: string;
  meta: PdfMeta;
  startY?: number;
}

function metricsFor(periodCount: number, dayCount: number, format: 'a4' | 'a3') {
  const pageHeight = format === 'a3' ? 297 : 210;
  const available = pageHeight - 21 - 8;
  const dayRowHeight = Math.max(9, Math.min(18, available / Math.max(dayCount, 1)));
  const fontSize =
    periodCount > 14 ? 4.6 : periodCount > 12 ? 5 : periodCount > 10 ? 5.4 : 5.9;
  return {
    dayRowHeight,
    fontSize,
    dayColWidth: format === 'a3' ? 22 : 17,
    cellPadding: { top: 0.35, right: 0.7, bottom: 0.35, left: 0.7 },
  };
}

function lessonCell(
  rows: TimetablePdfRow[],
  ctx: TimetablePdfContext,
  day: string,
  slot: PeriodSlotDefinition,
  options: TableOptions,
  fontSize: number,
) {
  const lessons = rows.filter(
    (row) =>
      row.dayOfWeek === day &&
      row.startTime === slot.startTime &&
      (row.endTime === slot.endTime || !row.endTime),
  );

  if (!lessons.length) {
    return {
      content: options.emptyText ?? 'Free',
      styles: {
        textColor: [174, 186, 201] as [number, number, number],
        fontStyle: 'italic' as const,
        halign: 'center' as const,
        valign: 'middle' as const,
        fontSize: Math.max(4, fontSize - 1),
        fillColor: [255, 255, 255] as [number, number, number],
      },
    };
  }

  const primary = lessons[0]!;
  const cfg = ctx.courses.find((course) => course.subjectName === primary.subjectName);
  const code = shortCourseCode(cfg?.courseCode, primary.subjectName);
  const fill = colorToRgbTuple(
    resolveCourseColor(
      primary.subjectName,
      ctx.courses as unknown as Parameters<typeof resolveCourseColor>[1],
    ),
  );
  const secondary =
    options.secondary === 'class' ? primary.className : primary.teacherName;
  const lines = [code, secondary];
  if (options.showStream && lessons.length > 1) {
    lines.push(lessons.map((lesson) => lesson.className).join(' / '));
  }
  if (primary.room) lines.push(primary.room);

  return {
    content: lines.join('\n'),
    styles: {
      fillColor: fill,
      textColor: NAVY,
      halign: 'center' as const,
      valign: 'middle' as const,
      fontSize,
      overflow: 'linebreak' as const,
      minCellHeight: 8,
    },
  };
}

function buildBody(
  rows: TimetablePdfRow[],
  ctx: TimetablePdfContext,
  options: TableOptions,
  fontSize: number,
) {
  const days = options.days ?? orderedDays(rows);
  return days.map((day) => [
    {
      content: day.slice(0, 3),
      styles: {
        fillColor: [248, 250, 252] as [number, number, number],
        textColor: NAVY,
        fontStyle: 'bold' as const,
        halign: 'center' as const,
        valign: 'middle' as const,
        fontSize: fontSize + 0.4,
      },
    },
    ...ctx.periodSlots.map((slot) => {
      if (slot.isBreak) {
        return {
          content: slot.name,
          styles: {
            fillColor: BREAK_FILL,
            textColor: MUTED,
            fontStyle: 'bold' as const,
            halign: 'center' as const,
            valign: 'middle' as const,
            fontSize: Math.max(3.8, fontSize - 0.7),
          },
        };
      }
      return lessonCell(rows, ctx, day, slot, options, fontSize);
    }),
  ]);
}

function saveGridPdf(
  filename: string,
  title: string,
  subtitle: string,
  rows: TimetablePdfRow[],
  ctx: TimetablePdfContext,
  options: TableOptions,
) {
  const format = options.format ?? 'a4';
  const days = options.days ?? orderedDays(rows);
  const metrics = metricsFor(ctx.periodSlots.length, days.length, format);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format });
  const startY = drawHeader(doc, title, subtitle, options.meta);

  const head = [
    [
      'Day',
      ...ctx.periodSlots.map((slot) => `${slot.name}\n${slot.startTime}–${slot.endTime}`),
    ],
  ];

  autoTable(doc, {
    startY,
    margin: { left: 7, right: 7, bottom: 6 },
    head,
    body: buildBody(rows, ctx, options, metrics.fontSize) as never,
    styles: {
      fontSize: metrics.fontSize,
      cellPadding: metrics.cellPadding,
      valign: 'middle',
      lineColor: GRID,
      lineWidth: 0.12,
      overflow: 'linebreak',
      minCellHeight: metrics.dayRowHeight,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: Math.max(4.4, metrics.fontSize - 0.3),
      cellPadding: { top: 0.7, bottom: 0.7, left: 0.5, right: 0.5 },
      minCellHeight: 9,
    },
    columnStyles: {
      0: {
        cellWidth: metrics.dayColWidth,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: NAVY,
      },
    },
    rowPageBreak: 'avoid',
    showHead: 'firstPage',
  });

  doc.save(filename);
}

export function exportClassTimetablePdf(
  className: string,
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
  options?: { format?: 'a4' | 'a3' },
) {
  const classRows = rows.filter((row) => row.className === className);
  const periodCount = ctx.periodSlots.filter((slot) => !slot.isBreak).length;
  const days = orderedDays(classRows);
  saveGridPdf(
    `${className.replace(/\s+/g, '-')}-timetable-${meta.academicYear}.pdf`,
    `Class Timetable · ${className}`,
    `${classRows.length} lessons · ${periodCount} periods · ${days.length} days`,
    classRows,
    ctx,
    {
      secondary: 'teacher',
      format: options?.format ?? 'a4',
      meta,
    },
  );
}

export function exportAllStreamsTimetablePdf(
  group: string,
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
  options?: { format?: 'a4' | 'a3'; days?: string[] },
) {
  const streams = [...new Set(rows.map((row) => row.className))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  const format = options?.format ?? 'a4';
  const days = options?.days ?? orderedDays(rows);
  const metrics = metricsFor(ctx.periodSlots.length, days.length, format);
  const fontSize =
    streams.length > 2 ? Math.max(4.2, metrics.fontSize - 0.5) : metrics.fontSize;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format });
  const pageHeight = doc.internal.pageSize.getHeight();

  const startY = drawHeader(
    doc,
    `Class Timetable · ${group} · All Streams`,
    `${streams.length} stream${streams.length === 1 ? '' : 's'} · ${rows.length} lessons`,
    meta
  );

  const body: unknown[][] = [];
  for (const day of days) {
    streams.forEach((stream, index) => {
      const streamRows = rows.filter((row) => row.className === stream);
      const row: unknown[] = [];

      // One day cell spans every stream row for that day.
      if (index === 0) {
        row.push({
          content: day.slice(0, 3),
          rowSpan: streams.length,
          styles: {
            fillColor: [248, 250, 252] as [number, number, number],
            textColor: NAVY,
            fontStyle: 'bold' as const,
            halign: 'center' as const,
            valign: 'middle' as const,
            fontSize: fontSize + 0.4,
          },
        });
      }

      row.push({
        content: stream,
        styles: {
          fillColor: [255, 255, 255] as [number, number, number],
          textColor: NAVY,
          fontStyle: 'bold' as const,
          halign: 'left' as const,
          valign: 'middle' as const,
          fontSize: Math.max(4, fontSize - 0.2),
        },
      });

      for (const slot of ctx.periodSlots) {
        if (slot.isBreak) {
          row.push({
            content: slot.name,
            styles: {
              fillColor: BREAK_FILL,
              textColor: MUTED,
              fontStyle: 'bold' as const,
              halign: 'center' as const,
              valign: 'middle' as const,
              fontSize: Math.max(3.8, fontSize - 0.7),
            },
          });
        } else {
          row.push(
            lessonCell(
              streamRows,
              ctx,
              day,
              slot,
              { secondary: 'teacher', meta, days, emptyText: '' },
              fontSize
            )
          );
        }
      }

      body.push(row);
    });
  }

  autoTable(doc, {
    startY,
    margin: { left: 7, right: 7, bottom: 6 },
    head: [
      [
        'Day',
        'Stream',
        ...ctx.periodSlots.map((slot) => `${slot.name}\n${slot.startTime}–${slot.endTime}`),
      ],
    ],
    body: body as never,
    styles: {
      fontSize,
      cellPadding: metrics.cellPadding,
      valign: 'middle',
      lineColor: GRID,
      lineWidth: 0.12,
      overflow: 'linebreak',
      minCellHeight: Math.max(7, metrics.dayRowHeight * 0.8),
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: Math.max(4.4, fontSize - 0.3),
      minCellHeight: 9,
    },
    columnStyles: {
      0: {
        cellWidth: metrics.dayColWidth,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: NAVY,
      },
      1: {
        cellWidth: format === 'a3' ? 22 : 17,
        fontStyle: 'bold',
        textColor: NAVY,
      },
    },
    rowPageBreak: 'avoid',
    showHead: 'firstPage',
  });

  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `${meta.term} · ${meta.academicYear} · ${group} · all streams · page ${doc.getNumberOfPages()}`,
    7,
    pageHeight - 3
  );
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.2);
  doc.line(7, pageHeight - 4.5, doc.internal.pageSize.getWidth() - 7, pageHeight - 4.5);

  doc.save(`${group.replace(/\s+/g, '-')}-all-streams-timetable-${meta.academicYear}.pdf`);
}

export function exportTeacherTimetablePdf(
  teacherUserId: string,
  teacherName: string,
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
  options?: { format?: 'a4' | 'a3' },
) {
  const teacherRows = rows.filter((row) => row.teacherUserId === teacherUserId);
  const classCount = new Set(teacherRows.map((row) => row.className)).size;
  saveGridPdf(
    `${teacherName.replace(/\s+/g, '-')}-timetable-${meta.academicYear}.pdf`,
    `Teacher Timetable · ${teacherName}`,
    `${teacherRows.length} lessons · ${classCount} class${classCount === 1 ? '' : 'es'}`,
    teacherRows,
    ctx,
    {
      secondary: 'class',
      format: options?.format ?? 'a4',
      meta,
    },
  );
}

export function exportMasterTimetablePdf(
  classes: string[],
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
  options?: { title?: string; filename?: string; format?: 'a4' | 'a3' },
) {
  const selected = classes.length
    ? classes
    : [...new Set(rows.map((row) => row.className))].sort();
  const format = options?.format ?? 'a4';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format });
  const pageHeight = doc.internal.pageSize.getHeight();

  let startY = 0;
  let first = true;
  for (const className of selected) {
    const classRows = rows.filter((row) => row.className === className);
    const days = orderedDays(classRows);
    const metrics = metricsFor(ctx.periodSlots.length, days.length, format);

    if (first) {
      startY = drawHeader(
        doc,
        options?.title ?? 'Master Timetable · Selected Classes',
        `${selected.length} class${selected.length === 1 ? '' : 'es'} · ${meta.term}`,
        meta,
      );
      first = false;
    } else if (startY > pageHeight - 40) {
      doc.addPage();
      startY = drawHeader(doc, className, `${meta.term} · ${meta.academicYear}`, meta);
    }

    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text(className, 7, startY - 1.5);
    startY += 1;

    autoTable(doc, {
      startY,
      margin: { left: 7, right: 7, bottom: 6 },
      head: [
        [
          'Day',
          ...ctx.periodSlots.map((slot) => `${slot.name}\n${slot.startTime}–${slot.endTime}`),
        ],
      ],
      body: buildBody(
        classRows,
        ctx,
        { secondary: 'teacher', meta, days },
        metrics.fontSize,
      ) as never,
      styles: {
        fontSize: metrics.fontSize,
        cellPadding: metrics.cellPadding,
        valign: 'middle',
        lineColor: GRID,
        lineWidth: 0.12,
        overflow: 'linebreak',
        minCellHeight: metrics.dayRowHeight,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: Math.max(4.4, metrics.fontSize - 0.3),
        minCellHeight: 9,
      },
      columnStyles: {
        0: {
          cellWidth: metrics.dayColWidth,
          fontStyle: 'bold',
          fillColor: [248, 250, 252],
          textColor: NAVY,
        },
      },
      rowPageBreak: 'avoid',
      showHead: 'firstPage',
    });

    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  doc.save(
    options?.filename ??
      `master-timetable-${meta.academicYear}-${meta.term.replace(/\s+/g, '-')}.pdf`
  );
}

export function exportTeacherWorkloadPdf(
  teachers: Array<{
    teacherName: string;
    employeeNumber?: string | null;
    department: string;
    totalPeriods: number;
    classes: string[];
    subjects: string[];
    status: 'normal' | 'high' | 'overloaded';
  }>,
  meta: PdfMeta,
  options?: { highThreshold?: number; overloadedThreshold?: number },
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawHeader(
    doc,
    'Teacher Workload',
    `${teachers.length} teachers · high ≥ ${options?.highThreshold ?? 25} · overloaded ≥ ${
      options?.overloadedThreshold ?? 30
    }`,
    meta,
  );

  autoTable(doc, {
    startY,
    margin: { left: 7, right: 7, bottom: 8 },
    head: [['Teacher', 'Employee No.', 'Department', 'Periods', 'Classes', 'Subjects', 'Status']],
    body: teachers.map((teacher) => [
      teacher.teacherName,
      teacher.employeeNumber ?? '—',
      teacher.department,
      String(teacher.totalPeriods),
      teacher.classes.join(', ') || '—',
      teacher.subjects.join(', ') || '—',
      teacher.status === 'overloaded' ? 'Overloaded' : teacher.status === 'high' ? 'High load' : 'Normal',
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 1.2,
      valign: 'top',
      lineColor: GRID,
      lineWidth: 0.12,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 34 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 54 },
      5: { cellWidth: 54 },
      6: { cellWidth: 24 },
    },
    rowPageBreak: 'avoid',
  });

  doc.save(
    `teacher-workload-${meta.academicYear}-${meta.term.replace(/\s+/g, '-')}.pdf`
  );
}
