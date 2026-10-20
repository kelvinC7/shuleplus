import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExamAttendance, ExamSchedule, ExamSeat, ExamSession, ExamTimeSlot } from './exam-types';
import { classLevelOf, streamsForLevel, uniqueLevels } from './exam-class';
import { dateLabel, isoDate } from './exam-ui';

export type ExamPdfKind = 'current' | 'class' | 'all' | 'rooms' | 'complete';

const NAVY: [number, number, number] = [0, 4, 53];
const AMBER: [number, number, number] = [252, 176, 56];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [148, 163, 184];
const SLATE: [number, number, number] = [71, 85, 105];
const LINE: [number, number, number] = [226, 232, 240];
const PAPER: [number, number, number] = [255, 255, 255];

function titles(kind: ExamPdfKind, level?: string): string {
  if (kind === 'class') return `Examination Timetable — ${level ?? 'Class'}`.trim();
  if (kind === 'rooms') return 'Examination Room Timetable';
  if (kind === 'complete') return 'Complete Examination Timetable';
  if (kind === 'all') return 'Examination Timetable — All Classes';
  return 'Examination Timetable';
}

function defaultSlots(session: ExamSession): ExamTimeSlot[] {
  return session.timeSlots?.length
    ? session.timeSlots
    : [
        { code: 'MORNING', label: 'Morning', startTime: '08:00', endTime: '10:00', durationMinutes: 120 },
        { code: 'AFTERNOON', label: 'Afternoon', startTime: '14:00', endTime: '16:00', durationMinutes: 120 },
      ];
}

function fileName(session: ExamSession, kind: ExamPdfKind, level?: string) {
  const safe = (session.name || 'examination').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  return `${safe}-${kind}${level ? `-${level}` : ''}.pdf`;
}

function courseCode(name: string) {
  const known: Record<string, string> = {
    english: 'ENG',
    mathematics: 'MATH',
    math: 'MATH',
    science: 'SCI',
    kinyarwanda: 'KIN',
    french: 'FRE',
    computer: 'COMP',
    est: 'EST',
    sst: 'SST',
    biology: 'BIO',
    chemistry: 'CHEM',
    physics: 'PHY',
    'p.e': 'PE',
    pe: 'PE',
    'r.e': 'RE',
    re: 'RE',
  };
  const key = name.trim().toLowerCase();
  if (known[key]) return known[key];
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 4);
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
}

type LogoAsset = { data: string; format: 'PNG' | 'JPEG' | 'WEBP' };

const logoCache = new Map<string, Promise<LogoAsset | null>>();

async function fetchLogoAsset(url: string): Promise<LogoAsset | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!data) return null;
    const format = data.includes('image/jpeg') ? 'JPEG' : data.includes('image/webp') ? 'WEBP' : 'PNG';
    return { data, format };
  } catch {
    return null;
  }
}

/** School logo from IAM onboarding, then Shule+ mark as fallback. */
async function loadLogo(schoolLogoUrl?: string | null): Promise<LogoAsset | null> {
  const fallback = `${window.location.origin}/yellow-icon.png`;
  const urls = [...new Set([schoolLogoUrl?.trim() || '', fallback].filter(Boolean))];
  const key = urls.join('|');
  const cached = logoCache.get(key);
  if (cached) return cached;
  const pending = (async () => {
    for (const url of urls) {
      const asset = await fetchLogoAsset(url);
      if (asset) return asset;
    }
    return null;
  })();
  logoCache.set(key, pending);
  return pending;
}

function placeLogo(doc: jsPDF, logo: LogoAsset, x: number, y: number, size: number) {
  try {
    doc.addImage(logo.data, logo.format, x, y, size, size);
  } catch {
    try { doc.addImage(logo.data, 'PNG', x, y, size, size); } catch { /* skip */ }
  }
}

function lastY(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
}

function drawHeader(doc: jsPDF, schoolName: string, session: ExamSession, title: string, logo: LogoAsset | null) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 28, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, 28, w, 1.4, 'F');
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.rect(10.5, 4.2, 19.2, 19.2, 'F');
    placeLogo(doc, logo, 11.6, 5.3, 17);
  }
  const x = logo ? 34 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName, x, 11);
  doc.setFontSize(10);
  doc.text(title, x, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`${session.name}  ·  ${session.examType}  ·  ${session.academicYear}  ·  ${session.term}`, x, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text('Generated by Shule+', w - 14, 12, { align: 'right' });
}

function drawFooter(doc: jsPDF, logo: LogoAsset | null) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(14, h - 18, w - 14, h - 18);
    if (logo) placeLogo(doc, logo, 14, h - 14.5, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('Generated by Shule+', logo ? 24 : 14, h - 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    ['Prepared by', 'Director of Studies', 'Head Teacher'].forEach((label, idx) => {
      const sx = 78 + idx * 40;
      doc.setDrawColor(148, 163, 184);
      doc.line(sx, h - 9, sx + 32, h - 9);
      doc.text(label, sx, h - 5.5);
    });
    doc.text(`${generated}  ·  Page ${i} of ${pages}`, w - 14, h - 5.5, { align: 'right' });
  }
}

function drawStacked(doc: jsPDF, x: number, y: number, title: string, sub?: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(title, x, y);
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(sub, x, y + 4.4);
  }
}

type DayCell = { title: string; sub: string };

function dayRows(session: ExamSession, rows: ExamSchedule[], level: string) {
  const days = [...new Set(rows.filter((s) => classLevelOf(s.className) === level).map((s) => isoDate(s.examDate)))].sort();
  const slots = defaultSlots(session);
  return days.map((date, i) => {
    const cells: DayCell[] = [
      {
        title: dateLabel(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        sub: `Day ${i + 1}`,
      },
    ];
    for (const slot of slots) {
      const hit = rows.find((s) => classLevelOf(s.className) === level && isoDate(s.examDate) === date && s.slotCode === slot.code);
      cells.push(hit
        ? { title: hit.subjectName, sub: courseCode(hit.subjectName) }
        : { title: '—', sub: '' });
    }
    return cells;
  });
}

function drawDayGrid(
  doc: jsPDF,
  session: ExamSession,
  rows: ExamSchedule[],
  level: string,
  startY: number,
) {
  const slots = defaultSlots(session);
  const data = dayRows(session, rows, level);
  const streams = streamsForLevel(rows, level);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  if (startY > pageH - 50) {
    doc.addPage();
    startY = 34;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(level, 14, startY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  const note = streams.length > 1
    ? `${streams.join(', ')} share this timetable. Rooms may differ.`
    : `Examination dates ${dateLabel(session.startDate)} – ${dateLabel(session.endDate)}`;
  doc.text(note, 14, startY + 5, { maxWidth: pageW - 28 });

  autoTable(doc, {
    startY: startY + 9,
    theme: 'grid',
    head: [['Date', ...slots.map((s) => `${s.label}  (${s.startTime} – ${s.endTime})`)]],
    body: data.map((row) => row.map(() => '')),
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.25,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      minCellHeight: 16,
      valign: 'middle',
      halign: 'left',
      fillColor: PAPER,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      minCellHeight: 10,
    },
    columnStyles: {
      0: { cellWidth: 52 },
    },
    margin: { left: 14, right: 14, bottom: 22 },
    tableLineColor: LINE,
    tableLineWidth: 0.25,
    didParseCell: (hook) => {
      if (hook.section === 'body') hook.cell.text = [];
    },
    didDrawCell: (hook) => {
      if (hook.section !== 'body') return;
      const row = data[hook.row.index];
      const cell = row?.[hook.column.index];
      if (!cell) return;
      drawStacked(doc, hook.cell.x + 5.5, hook.cell.y + 7.2, cell.title, cell.sub);
    },
  });

  return lastY(doc) + 10;
}

function drawRoomGrid(doc: jsPDF, rows: ExamSchedule[], startY: number) {
  const list = rows
    .flatMap((s) => (s.rooms ?? []).map((r) => ({ ...s, roomName: r.name })))
    .sort((a, b) => a.roomName.localeCompare(b.roomName) || isoDate(a.examDate).localeCompare(isoDate(b.examDate)));

  const data = list.map((s) => [
    { title: s.roomName, sub: s.className },
    { title: dateLabel(s.examDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), sub: `${s.startTime} – ${s.endTime}` },
    { title: s.subjectName, sub: courseCode(s.subjectName) },
  ]);

  autoTable(doc, {
    startY,
    theme: 'grid',
    head: [['Room / Class', 'Date / Time', 'Course']],
    body: data.map((row) => row.map(() => '')),
    styles: {
      font: 'helvetica',
      fontSize: 10,
      lineColor: LINE,
      lineWidth: 0.25,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      minCellHeight: 16,
      valign: 'middle',
      fillColor: PAPER,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
    },
    margin: { left: 14, right: 14, bottom: 22 },
    didParseCell: (hook) => {
      if (hook.section === 'body') hook.cell.text = [];
    },
    didDrawCell: (hook) => {
      if (hook.section !== 'body') return;
      const cell = data[hook.row.index]?.[hook.column.index];
      if (!cell) return;
      drawStacked(doc, hook.cell.x + 5.5, hook.cell.y + 7.2, cell.title, cell.sub);
    },
  });
}

export async function downloadExamPdf(opts: {
  kind: ExamPdfKind;
  session: ExamSession;
  schoolName: string;
  rows: ExamSchedule[];
  level?: string;
  logoUrl?: string | null;
}) {
  const { kind, session, schoolName, rows, level, logoUrl } = opts;
  const title = titles(kind, level);
  const logo = await loadLogo(logoUrl);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  drawHeader(doc, schoolName, session, title, logo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(`Examination period  ${dateLabel(session.startDate)}  –  ${dateLabel(session.endDate)}`, 14, 32);

  const levels = kind === 'class' && level ? [level] : uniqueLevels(rows);
  let y = 36;

  if (kind === 'rooms') {
    drawRoomGrid(doc, rows, y);
  } else {
    for (const lv of levels) {
      y = drawDayGrid(doc, session, rows, lv, y);
    }
  }

  drawFooter(doc, logo);
  doc.save(fileName(session, kind, level));
}

function roomCapacityLabel(session: ExamSession, roomName: string) {
  const cfg = (session.rooms ?? []).find((r) => r.name === roomName);
  return cfg?.capacity ? `Capacity ${cfg.capacity}` : '';
}

type InvigilatorPdfRow = { title: string; sub: string };

function invigilatorDutyRows(session: ExamSession, dateFilter?: string) {
  const slots = defaultSlots(session);
  return (session.duties ?? [])
    .filter((d) => !dateFilter || isoDate(d.examDate) === dateFilter)
    .map((d) => {
      const sch = session.schedules.find((s) => s.id === d.scheduleId);
      const slot = slots.find((s) => s.code === d.slotCode);
      const time = sch ? `${sch.startTime} – ${sch.endTime}` : slot ? `${slot.startTime} – ${slot.endTime}` : d.slotCode;
      return {
        date: isoDate(d.examDate),
        slotCode: d.slotCode,
        slotLabel: slot?.label || d.slotCode,
        slotTime: slot ? `${slot.startTime} – ${slot.endTime}` : time,
        room: d.roomName,
        name: d.invigilatorName,
        cells: [
          { title: d.invigilatorName, sub: d.locked ? 'Locked' : d.mode === 'MANUAL' ? 'Manual' : 'On duty' },
          { title: sch?.subjectName || '—', sub: sch?.subjectName ? courseCode(sch.subjectName) : d.slotCode },
          { title: sch?.className || '—', sub: slot?.label || d.slotCode },
          { title: time, sub: slot?.label || '' },
          { title: d.roomName, sub: roomCapacityLabel(session, d.roomName) },
        ] as InvigilatorPdfRow[],
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)
      || a.slotTime.localeCompare(b.slotTime)
      || a.room.localeCompare(b.room)
      || a.name.localeCompare(b.name));
}

function examDayNumbers(session: ExamSession) {
  const dates = [
    ...new Set([
      ...(session.days ?? []).map((d) => isoDate(d.date)),
      ...(session.schedules ?? []).map((s) => isoDate(s.examDate)),
      ...(session.duties ?? []).map((d) => isoDate(d.examDate)),
    ].filter(Boolean)),
  ].sort();
  return dates;
}

export async function downloadInvigilatorPdf(opts: {
  session: ExamSession;
  schoolName: string;
  date?: string;
  logoUrl?: string | null;
}) {
  const { session, schoolName, date, logoUrl } = opts;
  const rows = invigilatorDutyRows(session, date);
  const days = [...new Set(rows.map((r) => r.date))].sort();
  const allDays = examDayNumbers(session);
  const logo = await loadLogo(logoUrl);
  const title = date
    ? `Invigilation Duty Roster — ${dateLabel(date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Invigilation Duty Roster — All exam days';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, schoolName, session, title, logo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    date
      ? `${rows.length} assignment${rows.length === 1 ? '' : 's'}  ·  ${dateLabel(date)}`
      : `${days.length} examination days  ·  ${rows.length} assignments  ·  ${dateLabel(session.startDate)} – ${dateLabel(session.endDate)}`,
    14,
    32,
  );

  let y = 36;
  days.forEach((day) => {
    const dayList = rows.filter((r) => r.date === day);
    const slotOrder = [...new Set(dayList.map((r) => r.slotCode))];
    const dayNo = Math.max(1, allDays.indexOf(day) + 1);
    if (y > pageH - 52) {
      doc.addPage();
      y = 34;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(dateLabel(day, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }), 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Day ${dayNo}  ·  ${dayList.length} invigilators  ·  ${slotOrder.length} session${slotOrder.length === 1 ? '' : 's'}`, 14, y + 5);
    y += 10;

    slotOrder.forEach((slotCode) => {
      const slotRows = dayList.filter((r) => r.slotCode === slotCode);
      const sample = slotRows[0];
      if (y > pageH - 42) {
        doc.addPage();
        y = 34;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(`${sample?.slotLabel || slotCode}  (${sample?.slotTime || ''})`, 14, y);

      autoTable(doc, {
        startY: y + 3,
        theme: 'grid',
        head: [['Invigilator', 'Course', 'Class', 'Time', 'Room']],
        body: slotRows.map((r) => r.cells.map(() => '')),
        styles: {
          font: 'helvetica',
          fontSize: 10,
          lineColor: LINE,
          lineWidth: 0.25,
          cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
          minCellHeight: 16,
          valign: 'middle',
          fillColor: PAPER,
        },
        headStyles: {
          fillColor: NAVY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
        },
        columnStyles: {
          0: { cellWidth: 58 },
          3: { cellWidth: 38 },
          4: { cellWidth: 32 },
        },
        margin: { left: 14, right: 14, bottom: 22 },
        didParseCell: (hook) => {
          if (hook.section === 'body') hook.cell.text = [];
        },
        didDrawCell: (hook) => {
          if (hook.section !== 'body') return;
          const cell = slotRows[hook.row.index]?.cells[hook.column.index];
          if (!cell) return;
          drawStacked(doc, hook.cell.x + 5.5, hook.cell.y + 7.2, cell.title, cell.sub);
        },
      });
      y = lastY(doc) + 8;
    });
    y += 4;
  });

  if (!days.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text('No invigilator assignments for this selection. Generate the invigilation plan first.', 14, 42);
  }

  drawFooter(doc, logo);
  const safe = (session.name || 'examination').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`${safe}-invigilators${date ? `-${date}` : '-all-days'}.pdf`);
}

function seatCodeOrder(a: string, b: string) {
  const ra = a.replace(/\d+/g, '');
  const rb = b.replace(/\d+/g, '');
  if (ra !== rb) return ra.localeCompare(rb);
  return (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0);
}

export async function downloadSeatingPdf(opts: {
  session: ExamSession;
  schoolName: string;
  seats: ExamSeat[];
  examName?: string;
  roomName?: string;
  logoUrl?: string | null;
}) {
  const { session, schoolName, examName, roomName, logoUrl } = opts;
  const list = [...opts.seats]
    .filter((s) => !roomName || s.roomName === roomName)
    .sort((a, b) => a.roomName.localeCompare(b.roomName) || seatCodeOrder(a.seatCode, b.seatCode) || a.fullName.localeCompare(b.fullName));
  const rooms = [...new Set(list.map((s) => s.roomName))];
  const logo = await loadLogo(logoUrl);
  const title = roomName
    ? `Seating Arrangement — ${roomName}`
    : examName
      ? `Seating Arrangement — ${examName}`
      : 'Seating Arrangement';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, schoolName, session, title, logo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    [
      examName || session.name,
      roomName || `${rooms.length} room${rooms.length === 1 ? '' : 's'}`,
      `${list.length} student${list.length === 1 ? '' : 's'}`,
    ].join('  ·  '),
    14,
    32,
  );

  let y = 36;
  rooms.forEach((room) => {
    const roomSeats = list.filter((s) => s.roomName === room);
    if (y > pageH - 48) {
      doc.addPage();
      y = 34;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(room, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${roomSeats.length} student${roomSeats.length === 1 ? '' : 's'}`, 14, y + 5);

    const cells = roomSeats.map((s, i) => [
      { title: String(i + 1), sub: '' },
      { title: s.fullName, sub: [s.className, s.studentCode].filter(Boolean).join('  ·  ') },
      { title: s.roomName, sub: examName || '' },
      { title: s.seatCode, sub: 'Seat' },
    ]);

    autoTable(doc, {
      startY: y + 8,
      theme: 'grid',
      head: [['No.', 'Student name', 'Room', 'Seat']],
      body: cells.map((row) => row.map(() => '')),
      styles: {
        font: 'helvetica',
        fontSize: 10,
        lineColor: LINE,
        lineWidth: 0.25,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        minCellHeight: 16,
        valign: 'middle',
        fillColor: PAPER,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 120 },
        2: { cellWidth: 70 },
        3: { cellWidth: 32, halign: 'center' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 22 },
      didParseCell: (hook) => {
        if (hook.section === 'body') hook.cell.text = [];
      },
      didDrawCell: (hook) => {
        if (hook.section !== 'body') return;
        const cell = cells[hook.row.index]?.[hook.column.index];
        if (!cell) return;
        const centered = hook.column.index === 0 || hook.column.index === 3;
        const x = centered ? hook.cell.x + hook.cell.width / 2 : hook.cell.x + 5.5;
        if (centered) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(hook.column.index === 0 ? 10 : 12);
          doc.setTextColor(...(hook.column.index === 3 ? NAVY : INK));
          doc.text(cell.title, x, hook.cell.y + (cell.sub ? 7.2 : 10), { align: 'center' });
          if (cell.sub) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text(cell.sub, x, hook.cell.y + 11.6, { align: 'center' });
          }
          return;
        }
        drawStacked(doc, x, hook.cell.y + 7.2, cell.title, cell.sub);
      },
    });
    y = lastY(doc) + 10;
  });

  if (!rooms.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text('No seats assigned for this selection. Generate seating first.', 14, 42);
  }

  drawFooter(doc, logo);
  const safe = (session.name || 'examination').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const examPart = (examName || 'seating').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const roomPart = roomName ? `-${roomName.replace(/[^\w]+/g, '-')}` : '-all-rooms';
  doc.save(`${safe}-${examPart}${roomPart}.pdf`);
}

export async function downloadAttendancePdf(opts: {
  session: ExamSession;
  schoolName: string;
  rows: Array<ExamAttendance & { scheduleId?: string }>;
  examName?: string;
  roomName?: string;
  logoUrl?: string | null;
}) {
  const { session, schoolName, examName, roomName, logoUrl } = opts;
  const list = [...opts.rows]
    .filter((s) => !roomName || s.roomName === roomName)
    .sort((a, b) => a.roomName.localeCompare(b.roomName) || (a.seatCode || '').localeCompare(b.seatCode || '') || a.fullName.localeCompare(b.fullName));
  const rooms = [...new Set(list.map((s) => s.roomName))];
  const logo = await loadLogo(logoUrl);
  const title = roomName
    ? `Examination Attendance — ${roomName}`
    : examName
      ? `Examination Attendance — ${examName}`
      : 'Examination Attendance';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, schoolName, session, title, logo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    [
      examName || session.name,
      roomName || `${rooms.length} room${rooms.length === 1 ? '' : 's'}`,
      `${list.length} student${list.length === 1 ? '' : 's'}`,
    ].join('  ·  '),
    14,
    32,
  );

  let y = 36;
  rooms.forEach((room) => {
    const roomRows = list.filter((s) => s.roomName === room);
    if (y > pageH - 48) {
      doc.addPage();
      y = 34;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(room, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const cap = roomCapacityLabel(session, room);
    doc.text(`${roomRows.length} students${cap ? `  ·  ${cap}` : ''}`, 14, y + 5);

    const cells = roomRows.map((s, i) => [
      { title: String(i + 1), sub: '' },
      { title: s.fullName, sub: [s.className, s.studentCode].filter(Boolean).join('  ·  ') },
      { title: s.roomName, sub: cap },
      { title: s.seatCode || '—', sub: 'Seat' },
      { title: (s.status || 'NOT_ARRIVED').replace('_', ' '), sub: s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString() : 'Not arrived' },
    ]);

    autoTable(doc, {
      startY: y + 8,
      theme: 'grid',
      head: [['No.', 'Student name', 'Room', 'Seat', 'Status']],
      body: cells.map((row) => row.map(() => '')),
      styles: {
        font: 'helvetica',
        fontSize: 10,
        lineColor: LINE,
        lineWidth: 0.25,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        minCellHeight: 16,
        valign: 'middle',
        fillColor: PAPER,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 40 },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 46 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 22 },
      didParseCell: (hook) => {
        if (hook.section === 'body') hook.cell.text = [];
      },
      didDrawCell: (hook) => {
        if (hook.section !== 'body') return;
        const cell = cells[hook.row.index]?.[hook.column.index];
        if (!cell) return;
        const centered = hook.column.index === 0 || hook.column.index === 3;
        const x = centered ? hook.cell.x + hook.cell.width / 2 : hook.cell.x + 5.5;
        if (centered) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(hook.column.index === 0 ? 10 : 12);
          doc.setTextColor(...(hook.column.index === 3 ? NAVY : INK));
          doc.text(cell.title, x, hook.cell.y + (cell.sub ? 7.2 : 10), { align: 'center' });
          if (cell.sub) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text(cell.sub, x, hook.cell.y + 11.6, { align: 'center' });
          }
          return;
        }
        drawStacked(doc, x, hook.cell.y + 7.2, cell.title, cell.sub);
      },
    });
    y = lastY(doc) + 10;
  });

  if (!rooms.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text('No students found for this room filter.', 14, 42);
  }

  drawFooter(doc, logo);
  const safe = (session.name || 'examination').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const examPart = (examName || 'attendance').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const roomPart = roomName ? `-${roomName.replace(/[^\w]+/g, '-')}` : '-all-rooms';
  doc.save(`${safe}-${examPart}${roomPart}.pdf`);
}
