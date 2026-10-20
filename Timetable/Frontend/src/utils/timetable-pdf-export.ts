import jsPDF from 'jspdf';
import autoTable, { type CellHookData, type CellInput } from 'jspdf-autotable';
import type { PeriodSlotDefinition } from '@/types';
import { WEEK_DAYS } from '@/types';
import { SCHEDULE_SLOT_TYPE_LABELS } from '@/components/schedule-slot-type-icon';
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
const DAYS = [...WEEK_DAYS].slice(0, 5);

const BREAK_GRAY: [number, number, number] = [241, 245, 249];

const BREAK_FILL: Record<string, [number, number, number]> = {
  BREAK: BREAK_GRAY,
  LUNCH: BREAK_GRAY,
  ASSEMBLY: [224, 231, 255],
  ACTIVITY: [209, 250, 229],
  EXAMINATION: [254, 226, 226],
  MEETING: [237, 233, 254],
  CLUB: [252, 231, 243],
};

/** Slim header so the grid fits one A4 landscape page (≈11 periods + breaks). */
function compactHeader(doc: jsPDF, title: string, subtitle: string, meta: PdfMeta): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(meta.schoolName ?? 'School Timetable', 6, 5.2);
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text(`${meta.term} · ${meta.academicYear}`, w - 6, 5.2, { align: 'right' });
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7);
  const line2 = subtitle ? `${title} · ${subtitle}` : title;
  doc.text(line2, 6, 10.5, { maxWidth: w - 12 });
  return 13;
}

/** Row heights tuned to fit all schedule rows on one page. */
function singlePageTableMetrics(rowCount: number) {
  const pageH = 210;
  const startY = 14;
  const bottom = 4;
  const headH = 5.5;
  const available = pageH - startY - bottom - headH;
  const lessonRowH = Math.max(8.2, Math.min(11.5, available / Math.max(rowCount, 1)));
  const breakRowH = Math.max(4.8, Math.min(6.5, lessonRowH * 0.55));
  const baseFontSize = lessonRowH <= 9 ? 5 : 5.5;
  return {
    startY,
    lessonRowH,
    breakRowH,
    baseFontSize,
    cellPadding: { top: 0.35, right: 0.9, bottom: 0.35, left: 0.9 },
    periodColWidth: 20,
  };
}

type PdfCell = string | {
  content: string;
  colSpan?: number;
  styles?: Record<string, unknown>;
  lesson?: {
    subjectName: string;
    secondary: string;
    room?: string | null;
  };
};

function lessonCell(
  subjectName: string,
  secondary: string,
  fill: [number, number, number],
  minCellHeight: number,
  room?: string | null,
  compact?: boolean,
) {
  return {
    content: '',
    lesson: { subjectName, secondary, room: compact ? null : room },
    styles: {
      fillColor: fill,
      textColor: NAVY,
      halign: 'center' as const,
      valign: 'middle' as const,
      minCellHeight,
    },
  };
}

function tableHooks(baseFontSize = 5.5, compactDraw = true) {
  const subjectSize = baseFontSize + (compactDraw ? 0.5 : 1);
  const secondarySize = Math.max(4, baseFontSize - (compactDraw ? 0.5 : 1.5));

  return {
    didParseCell(data: CellHookData) {
      const raw = data.cell.raw as PdfCell;
      if (raw && typeof raw === 'object') {
        if ('colSpan' in raw && raw.colSpan) data.cell.colSpan = raw.colSpan;
        if ('styles' in raw && raw.styles) Object.assign(data.cell.styles, raw.styles);
        if ('lesson' in raw && raw.lesson) data.cell.text = [];
      }
    },
    didDrawCell(data: CellHookData) {
      if (data.section !== 'body' || data.column.index === 0) return;
      const raw = data.cell.raw as PdfCell;
      if (!raw || typeof raw !== 'object' || !raw.lesson) return;

      const doc = data.doc;
      const { subjectName, secondary, room } = raw.lesson;
      const padX = 0.8;
      const centerX = data.cell.x + data.cell.width / 2;
      const cellH = data.cell.height;
      const blockH = subjectSize * 0.38 + secondarySize * 0.38 + (room ? 3 : 1.2);
      let y = data.cell.y + Math.max(2.2, (cellH - blockH) / 2 + subjectSize * 0.35);

      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(subjectSize);
      doc.text(subjectName, centerX, y, {
        align: 'center',
        maxWidth: data.cell.width - padX * 2,
      });

      y += subjectSize * 0.38 + (compactDraw ? 0.6 : 1.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(secondarySize);
      doc.setTextColor(71, 85, 105);
      doc.text(secondary, centerX, y, {
        align: 'center',
        maxWidth: data.cell.width - padX * 2,
      });

      if (room) {
        y += secondarySize * 0.35 + 0.5;
        doc.setFontSize(Math.max(3.8, secondarySize - 0.5));
        doc.setTextColor(100, 116, 139);
        doc.text(room, centerX, y, {
          align: 'center',
          maxWidth: data.cell.width - padX * 2,
        });
      }
    },
  };
}

function buildPdfBody(
  rows: TimetablePdfRow[],
  ctx: TimetablePdfContext,
  options: {
    secondary: 'teacher' | 'class';
    lessonRowH?: number;
    breakRowH?: number;
    compact?: boolean;
  } = { secondary: 'teacher' },
): PdfCell[][] {
  const body: PdfCell[][] = [];
  const lessonRowH = options.lessonRowH ?? 11;
  const breakRowH = options.breakRowH ?? 5.5;
  const compact = options.compact ?? true;

  for (const slot of ctx.periodSlots) {
    const timeLabel = `${slot.startTime}-${slot.endTime}`;
    const timeCell = {
      content: slot.isBreak ? timeLabel : compact ? `${slot.name} ${timeLabel}` : `${slot.name}\n${timeLabel}`,
      styles: {
        fillColor: [248, 250, 252] as [number, number, number],
        fontStyle: 'bold' as const,
        textColor: NAVY,
        minCellHeight: slot.isBreak ? breakRowH : lessonRowH,
        fontSize: compact ? 5 : undefined,
      },
    };

    if (slot.isBreak) {
      body.push([
        timeCell,
        {
          content: compact
            ? `${slot.name} · ${slot.durationMinutes}m`
            : `${slot.name} · ${SCHEDULE_SLOT_TYPE_LABELS[slot.slotType]} · ${slot.durationMinutes} min`,
          colSpan: DAYS.length,
          styles: {
            fillColor: BREAK_FILL[slot.slotType] ?? BREAK_FILL.BREAK,
            fontStyle: 'bold',
            halign: 'center',
            textColor: NAVY,
            minCellHeight: breakRowH,
            fontSize: compact ? 5 : undefined,
          },
        },
      ]);
      continue;
    }

    const cells = DAYS.map((day) => {
      const lesson = rows.find(
        (r) =>
          r.dayOfWeek === day &&
          r.startTime === slot.startTime &&
          r.endTime === slot.endTime,
      );
      if (!lesson) {
        return {
          content: 'Free',
          styles: {
            fillColor: [255, 255, 255] as [number, number, number],
            textColor: [148, 163, 184] as [number, number, number],
            fontStyle: 'italic',
            halign: 'center',
          },
        };
      }
      const cfg = ctx.courses.find((c) => c.subjectName === lesson.subjectName);
      const code = shortCourseCode(cfg?.courseCode, lesson.subjectName);
      const fill = colorToRgbTuple(
        resolveCourseColor(lesson.subjectName, ctx.courses as Parameters<typeof resolveCourseColor>[1]),
      );
      const secondary =
        options.secondary === 'class' ? lesson.className : lesson.teacherName;
      return lessonCell(code, secondary, fill, lessonRowH, lesson.room, compact);
    });

    body.push([timeCell, ...cells]);
  }

  return body;
}

function saveGridPdf(
  filename: string,
  title: string,
  subtitle: string,
  meta: PdfMeta,
  rows: TimetablePdfRow[],
  ctx: TimetablePdfContext,
  options: { secondary: 'teacher' | 'class' } = { secondary: 'teacher' },
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const metrics = singlePageTableMetrics(ctx.periodSlots.length);
  compactHeader(doc, title, subtitle, meta);

  autoTable(doc, {
    startY: metrics.startY,
    margin: { left: 5, right: 5, bottom: metrics.startY === 14 ? 4 : 8 },
    head: [['Period / Time', ...DAYS.map((d) => d.slice(0, 3))]],
    body: buildPdfBody(rows, ctx, {
      ...options,
      lessonRowH: metrics.lessonRowH,
      breakRowH: metrics.breakRowH,
      compact: true,
    }) as CellInput[][],
    styles: {
      fontSize: metrics.baseFontSize,
      cellPadding: metrics.cellPadding,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
      minCellHeight: metrics.lessonRowH,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: metrics.baseFontSize + 0.5,
      cellPadding: { top: 0.5, bottom: 0.5, left: 0.8, right: 0.8 },
      minCellHeight: 5.5,
    },
    columnStyles: {
      0: {
        cellWidth: metrics.periodColWidth,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: NAVY,
        fontSize: metrics.baseFontSize,
      },
    },
    showHead: 'firstPage',
    rowPageBreak: 'avoid',
    ...tableHooks(metrics.baseFontSize, true),
  });

  doc.save(filename);
}

export function exportClassTimetablePdf(
  className: string,
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
) {
  const classRows = rows.filter((r) => r.className === className);
  const lessonCount = classRows.length;
  const periodCount = ctx.periodSlots.filter((s) => !s.isBreak).length;
  saveGridPdf(
    `${className.replace(/\s+/g, '-')}-timetable-${meta.academicYear}.pdf`,
    `Class Timetable · ${className}`,
    `${lessonCount} lessons · ${periodCount} periods per day`,
    meta,
    classRows,
    ctx,
  );
}

export function exportTeacherTimetablePdf(
  teacherUserId: string,
  teacherName: string,
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
) {
  const teacherRows = rows.filter((r) => r.teacherUserId === teacherUserId);
  const classCount = new Set(teacherRows.map((r) => r.className)).size;
  saveGridPdf(
    `${teacherName.replace(/\s+/g, '-')}-timetable-${meta.academicYear}.pdf`,
    `Teacher Timetable · ${teacherName}`,
    `${teacherRows.length} lessons · ${classCount} class${classCount === 1 ? '' : 'es'}`,
    meta,
    teacherRows,
    ctx,
    { secondary: 'class' },
  );
}

export function exportMasterTimetablePdf(
  classes: string[],
  rows: TimetablePdfRow[],
  meta: PdfMeta,
  ctx: TimetablePdfContext,
  options?: { title?: string; filename?: string },
) {
  const selected = classes.length
    ? classes
    : [...new Set(rows.map((r) => r.className))].sort();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const metrics = singlePageTableMetrics(ctx.periodSlots.length);
  compactHeader(
    doc,
    options?.title ?? 'Master Timetable · Selected Classes',
    `${selected.length} class${selected.length === 1 ? '' : 'es'} · ${meta.term}`,
    meta,
  );

  let startY = metrics.startY;
  for (const className of selected) {
    const classRows = rows.filter((r) => r.className === className);

    if (startY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      startY = metrics.startY;
    }

    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text(className, 6, startY - 1.5);
    startY += 2;

    autoTable(doc, {
      startY,
      head: [['Period / Time', ...DAYS.map((d) => d.slice(0, 3))]],
      body: buildPdfBody(classRows, ctx, {
        secondary: 'teacher',
        lessonRowH: metrics.lessonRowH,
        breakRowH: metrics.breakRowH,
        compact: true,
      }) as CellInput[][],
      styles: {
        fontSize: metrics.baseFontSize,
        cellPadding: metrics.cellPadding,
        valign: 'middle',
        overflow: 'linebreak',
        lineWidth: 0.1,
        minCellHeight: metrics.lessonRowH,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        halign: 'center',
        fontSize: metrics.baseFontSize + 0.5,
        minCellHeight: 5.5,
      },
      columnStyles: {
        0: { cellWidth: metrics.periodColWidth, fontStyle: 'bold', fillColor: [248, 250, 252] },
      },
      margin: { left: 5, right: 5 },
      rowPageBreak: 'avoid',
      ...tableHooks(metrics.baseFontSize, true),
    });

    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  doc.save(
    options?.filename ??
      `master-timetable-${meta.academicYear}-${meta.term.replace(/\s+/g, '-')}.pdf`,
  );
}
