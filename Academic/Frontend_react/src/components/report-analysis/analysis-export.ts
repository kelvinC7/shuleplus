import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  ReportAnalysisClassRow,
  ReportAnalysisData,
  ReportAnalysisStudent,
} from '@/types/report-analysis';

function safeName(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function fileBase(data: ReportAnalysisData) {
  return `report-analysis-${safeName(data.period.classLabel || 'class')}-${safeName(data.period.reportKind)}-${safeName(data.period.term || data.period.academicYear)}`;
}

function studentRow(s: ReportAnalysisStudent) {
  return [
    s.name,
    s.admissionNo ?? '',
    s.average != null ? Number(s.average.toFixed(2)) : '',
    s.position ?? '',
    s.coursesBelow,
    s.missingCourses,
    s.band?.label ?? 'No marks',
    s.delta != null ? Number(s.delta.toFixed(2)) : '',
  ];
}

const STUDENT_HEAD = ['Student', 'Admission no.', 'Average %', 'Position', 'Courses below threshold', 'Missing marks', 'Status', 'Change vs previous (pts)'];

export function exportAnalysisExcel(data: ReportAnalysisData, list?: ReportAnalysisStudent[]) {
  const wb = XLSX.utils.book_new();

  const summary = [
    ['Class', data.period.classLabel],
    ['Academic year', data.period.academicYear],
    ['Term', data.period.term ?? ''],
    ['Report type', data.period.reportKind],
    ['Assessment status filter', data.period.status],
    ['Total students', data.summary.totalStudents],
    ['Assessed students', data.summary.assessedStudents],
    ['Class average %', data.summary.classAverage ?? ''],
    ['Good performers', data.summary.goodPerformers],
    ['Needs improvement', data.summary.needsImprovement],
    ['Students with missing marks', data.summary.missingMarksStudents],
    ['Generated', data.generatedAt],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  const courses = [
    ['Course', 'Teacher', 'Average %', 'Highest %', 'Lowest %', 'Assessed', 'Below threshold', 'Above threshold', 'Missing', 'Status', 'Previous %', 'Change (pts)'],
    ...data.courses.map((c) => [
      c.subject,
      c.teacherName ?? '',
      c.average ?? '',
      c.highest ?? '',
      c.lowest ?? '',
      c.assessed,
      c.below,
      c.above,
      c.missing,
      c.band?.label ?? 'No marks',
      c.previousAverage ?? '',
      c.delta ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(courses), 'Courses');

  const rows = list ?? data.students;
  const students = [STUDENT_HEAD, ...rows.map(studentRow)];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(students), 'Students');

  const needs = [STUDENT_HEAD, ...data.lists.needsImprovement.map(studentRow)];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(needs), 'Needs improvement');

  XLSX.writeFile(wb, `${fileBase(data)}.xlsx`);
}

export function exportAnalysisPdf(data: ReportAnalysisData, list?: ReportAnalysisStudent[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const navy: [number, number, number] = [0, 4, 53];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...navy);
  doc.text('Report Cards & Performance Analytics', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 115);
  doc.text(
    `${data.period.classLabel || 'Class'} · ${data.period.academicYear}${data.period.term ? ` · ${data.period.term}` : ''} · ${data.period.reportKind === 'beginning' ? 'Beginning of Term' : data.period.reportKind === 'midterm' ? 'Mid-Term' : 'Termly'}`,
    14,
    22,
  );

  autoTable(doc, {
    startY: 28,
    head: [['Total students', 'Assessed', 'Class average', 'Good performers', 'Needs improvement', 'Missing marks']],
    body: [[
      String(data.summary.totalStudents),
      String(data.summary.assessedStudents),
      data.summary.classAverage != null ? `${data.summary.classAverage.toFixed(1)}%` : '—',
      `${data.summary.goodPerformers} (${data.summary.goodPercent.toFixed(1)}%)`,
      `${data.summary.needsImprovement} (${data.summary.needsImprovementPercent.toFixed(1)}%)`,
      String(data.summary.missingMarksStudents),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: navy },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [['Course', 'Teacher', 'Average', 'Highest', 'Lowest', 'Below threshold', 'Missing', 'Status']],
    body: data.courses.map((c) => [
      c.subject,
      c.teacherName ?? '—',
      c.average != null ? `${c.average.toFixed(1)}%` : '—',
      c.highest != null ? `${c.highest.toFixed(1)}%` : '—',
      c.lowest != null ? `${c.lowest.toFixed(1)}%` : '—',
      String(c.below),
      String(c.missing),
      c.band?.label ?? 'No marks',
    ]),
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: navy },
  });

  const rows = list ?? data.students;
  doc.addPage();
  autoTable(doc, {
    startY: 14,
    head: [STUDENT_HEAD],
    body: rows.map((s) => studentRow(s).map((v) => String(v))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: navy },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Generated ${new Date(data.generatedAt).toLocaleString()} · Shule+`, 14, doc.internal.pageSize.getHeight() - 6);
    },
  });

  doc.save(`${fileBase(data)}.pdf`);
}

export function exportClassComparisonExcel(
  rows: ReportAnalysisClassRow[],
  meta: { groupLabel: string; stageLabel: string; academicYear: string; term?: string | null },
) {
  const ranked = [...rows].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  const best = ranked.find((r) => r.average != null)?.average ?? null;
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Class comparison', meta.groupLabel],
    ['Report type', meta.stageLabel],
    ['Academic year', meta.academicYear],
    ['Term', meta.term ?? ''],
    [],
    ['Rank', 'Class', 'Average %', 'Status', 'Gap to best (pts)', 'Assessed', 'Enrolled', 'Top bands', 'Below threshold'],
    ...ranked.map((c, i) => [
      i + 1,
      c.classLabel,
      c.average ?? '',
      c.band?.label ?? 'No marks',
      best != null && c.average != null ? Number((best - c.average).toFixed(2)) : '',
      c.assessed,
      c.students,
      c.good,
      c.below,
    ]),
  ]);
  sheet['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Class comparison');
  XLSX.writeFile(wb, `class-comparison-${safeName(meta.groupLabel || 'classes')}-${safeName(meta.stageLabel)}.xlsx`);
}
