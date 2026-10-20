import { API_BASE_URL } from '../services/api';
import { gradeFromScale } from '../pages/coursesMarks/statusUtils.js';
import { convertScoreToCourseDefault, percentageFromScore } from './markScale.js';

const NAVY = [0, 4, 53];
const AMBER = [252, 176, 56];
const WHITE = [255, 255, 255];

const API_ORIGIN = String(API_BASE_URL || '').replace(/\/api\/?$/, '') || '';

function toAssetUrl(rawPath) {
  const p = String(rawPath || '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p) || p.startsWith('data:')) return p;
  return `${API_ORIGIN}${p.startsWith('/') ? p : `/${p}`}`;
}

async function loadImageDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMark(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '-';
  return Math.abs(x - Math.round(x)) < 0.001 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
}

function buildMarkRows(students, entries, maxMark, useConverted, displayMax, gradingScale) {
  return students.map((s) => {
    const e = entries[s.id] || {};
    const scoreNum = e.score === '' || e.score == null ? null : Number(e.score);
    const validEntered =
      scoreNum != null && Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= maxMark ? scoreNum : null;
    let displayScore = validEntered;
    if (validEntered != null && useConverted) {
      displayScore = convertScoreToCourseDefault(validEntered, maxMark, displayMax);
    }
    const gradePct = validEntered != null ? percentageFromScore(validEntered, maxMark) : null;
    const sortScore =
      displayScore != null && Number.isFinite(Number(displayScore)) ? Number(displayScore) : null;
    const name = String(s.fullName || s.studentCode || 'Student');
    let status = 'Missing';
    if (e.markStatus && e.markStatus !== 'PRESENT') status = e.markStatus;
    else if (displayScore != null) status = 'Entered';
    else if (scoreNum != null) status = 'Invalid';

    const scoreText =
      displayScore != null
        ? `${fmtMark(displayScore)} / ${fmtMark(displayMax)}`
        : scoreNum != null
          ? `${fmtMark(scoreNum)} / ${fmtMark(maxMark)}`
          : '—';
    const enteredSubtext =
      useConverted && validEntered != null
        ? `Quiz: ${fmtMark(validEntered)} / ${fmtMark(maxMark)}`
        : null;

    return {
      student: s,
      name,
      studentCode: s.studentCode ? String(s.studentCode) : '',
      sortScore,
      hasScore: sortScore != null,
      scoreText,
      enteredSubtext,
      pctText: gradePct != null ? `${Math.round(gradePct * 10) / 10}%` : '—',
      grade: gradePct != null ? gradeFromScale(gradePct, 100, gradingScale) || '-' : '-',
      status,
    };
  });
}

/** Highest score first; missing / invalid last, then alphabetical. */
function sortMarkRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.hasScore && !b.hasScore) return -1;
    if (!a.hasScore && b.hasScore) return 1;
    if (a.hasScore && b.hasScore && a.sortScore !== b.sortScore) {
      return b.sortScore - a.sortScore;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

async function drawSchoolHeader(doc, school, W, margin) {
  const logoData = await loadImageDataUrl(toAssetUrl(school?.logoUrl || school?.logo_url));
  const headerH = 44;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, headerH, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, headerH, W, 2, 'F');

  let textX = margin;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 8, 20, 20);
      textX = margin + 24;
    } catch {
      try {
        doc.addImage(logoData, 'JPEG', margin, 8, 20, 20);
        textX = margin + 24;
      } catch {
        /* skip logo */
      }
    }
  }

  const schoolName = String(school?.schoolName || school?.name || 'School').toUpperCase();
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, textX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const addr = String(school?.address || '').trim();
  if (addr) doc.text(addr.slice(0, 90), textX, 22);
  const contacts = [
    school?.phone ? `Tel: ${school.phone}` : null,
    school?.email ? `Email: ${school.email}` : null,
  ]
    .filter(Boolean)
    .join('  |  ');
  if (contacts) doc.text(contacts.slice(0, 100), textX, 28);

  return headerH + 6;
}

/**
 * @param {object} opts
 * @param {object} opts.school IAM organization profile
 * @param {object} opts.assessment
 * @param {Array} opts.students
 * @param {object} opts.entries studentId -> { score, markStatus }
 * @param {Array} opts.gradingScale
 */
export async function exportAssessmentMarksPdf({
  school,
  assessment,
  students,
  entries,
  gradingScale = [],
  scoreMode = 'entered',
  courseDefaultMax = null,
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;

  let y = await drawSchoolHeader(doc, school, W, margin);
  y += 4;

  const subjectName = assessment?.subject?.name || 'Course';
  const classLabel = assessment?.class
    ? [assessment.class.name, assessment.class.stream].filter(Boolean).join(' ')
    : '';
  const title = `${subjectName}${classLabel ? ` · ${classLabel}` : ''}`;
  const courseCode = assessment?.subject?.code || assessment?.subjectCode || '-';
  const assessmentCode = assessment?.assessmentCode || '-';
  const maxMark = Number(assessment?.maxMark ?? assessment?.maxScore ?? 100);
  const componentLabel = assessment?.component?.name || assessment?.title || 'Assessment';
  const useConverted =
    scoreMode === 'converted' &&
    courseDefaultMax != null &&
    Number.isFinite(Number(courseDefaultMax)) &&
    Number(courseDefaultMax) > 0;
  const displayMax = useConverted ? Number(courseDefaultMax) : maxMark;

  doc.setTextColor(...NAVY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const metaLines = [
    `Course code: ${courseCode}`,
    `Assessment code: ${assessmentCode}`,
    `${componentLabel} · Assessment max ${maxMark}`,
    useConverted
      ? `Score format: converted to course total (out of ${fmtMark(displayMax)})`
      : `Score format: as entered on this assessment (out of ${fmtMark(maxMark)})`,
    'Student order: highest score first',
    [assessment?.academicYear, assessment?.term].filter(Boolean).join(' · '),
    assessment?.assessmentDate ? `Date: ${fmtDate(assessment.assessmentDate)}` : null,
  ].filter(Boolean);
  metaLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4.5;
  });
  y += 4;

  const colWidths = [9, 62, 34, 18, 14, 26];
  const scoreHeader = useConverted ? `Course /${fmtMark(displayMax)}` : `Score /${fmtMark(maxMark)}`;
  const headers = ['#', 'Student', scoreHeader, '%', 'Grade', 'Status'];
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  const colX = [];
  let colStart = margin;
  for (const w of colWidths) {
    colX.push(colStart);
    colStart += w;
  }

  const drawTableHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(margin, y - 4.5, tableW, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    headers.forEach((h, i) => {
      const alignRight = i >= 2 && i <= 3;
      const x = colX[i] + (alignRight ? colWidths[i] - 2 : 1.5);
      doc.text(h, x, y, { align: alignRight ? 'right' : 'left' });
    });
    y += 7;
  };

  const rows = sortMarkRows(buildMarkRows(students, entries, maxMark, useConverted, displayMax, gradingScale));

  drawTableHeader();

  rows.forEach((row, idx) => {
    const rowH = row.enteredSubtext ? 9.5 : row.studentCode ? 8 : 6.5;
    if (y > H - margin - rowH - 6) {
      doc.addPage();
      y = margin + 4;
      drawTableHeader();
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, tableW, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 4, 53);
    doc.setFontSize(8);

    doc.text(String(idx + 1), colX[0] + 1.5, y);

    doc.setFont('helvetica', 'bold');
    doc.text(row.name.slice(0, 38), colX[1] + 1.5, y);
    if (row.studentCode) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(row.studentCode.slice(0, 24), colX[1] + 1.5, y + 3.2);
      doc.setFontSize(8);
      doc.setTextColor(0, 4, 53);
    }

    doc.setFont('helvetica', 'bold');
    doc.text(row.scoreText, colX[2] + colWidths[2] - 2, y, { align: 'right' });
    if (row.enteredSubtext) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(row.enteredSubtext, colX[2] + colWidths[2] - 2, y + 3.2, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor(0, 4, 53);
    }

    doc.setFont('helvetica', 'normal');
    doc.text(row.pctText, colX[3] + colWidths[3] - 2, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(row.grade, colX[4] + colWidths[4] / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(row.status, colX[5] + 1.5, y);
    doc.setFontSize(8);

    y += rowH;
  });

  const footerY = H - 8;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 130);
  doc.text(
    `Generated ${new Date().toLocaleString()} · ${school?.schoolName || school?.name || 'School'}`,
    margin,
    footerY,
  );

  const slug = [assessmentCode, subjectName, classLabel].filter(Boolean).join('-').replace(/[^\w-]+/g, '_');
  doc.save(`assessment-marks-${slug || 'export'}.pdf`);
}
