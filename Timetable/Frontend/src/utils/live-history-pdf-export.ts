import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LiveHistoryData, LiveHistoryRow } from '@/services/timetable-api';
import { liveStatusLabel } from '@/modules/live/live-status-utils';

const NAVY: [number, number, number] = [0, 4, 53];
const GOLD: [number, number, number] = [252, 176, 56];

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(title, 14, 11);
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(subtitle, 14, 19);
  doc.setTextColor(60, 60, 60);
}

export function exportLiveHistoryPdf(
  rows: LiveHistoryRow[],
  meta: {
    date: string;
    day: string;
    term: string;
    academicYear: string;
    summary?: LiveHistoryData['summary'];
  },
  filename = 'live-history.pdf'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  header(doc, 'Live History Report', `${meta.day} · ${meta.date} · ${meta.term} · ${meta.academicYear}`);

  if (meta.summary) {
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Periods: ${meta.summary.periods}   On Time: ${meta.summary.onTime}   Late: ${meta.summary.late}   Missing: ${meta.summary.missing}   Avg Delay: ${meta.summary.avgDelayMinutes}m   Verification: ${meta.summary.verificationRate}%`,
      14,
      34
    );
  }

  autoTable(doc, {
    startY: 38,
    head: [
      [
        'Period',
        'Time',
        'Teacher',
        'Course',
        'Class',
        'Location',
        'Check-In',
        'Check-Out',
        'Duration',
        'Status',
      ],
    ],
    body: rows.map((r) => [
      r.periodLabel,
      `${r.startTime} – ${r.endTime}`,
      r.teacher,
      r.subject,
      r.className,
      r.room,
      r.checkIn ?? '—',
      r.checkOut ?? '—',
      r.durationMinutes != null ? `${r.durationMinutes}m` : '—',
      liveStatusLabel(r.status),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}
