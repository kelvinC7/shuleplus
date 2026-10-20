import type { CourseConfig, PeriodSlotDefinition, SchoolSchedule } from '@/types';
import { buildDaySlots, parseBreakDefs } from '@/utils/schedule-builder';

export const COURSE_COLOR_PALETTE = [
  '#93C5FD', // blue
  '#86EFAC', // green
  '#FCD34D', // amber
  '#F9A8D4', // pink
  '#A5B4FC', // indigo
  '#FDBA74', // orange
  '#5EEAD4', // teal
  '#D8B4FE', // purple
  '#FCA5A5', // red
  '#67E8F9', // cyan
  '#BEF264', // lime
  '#C4B5FD', // violet
  '#FDA4AF', // rose
  '#6EE7B7', // emerald
  '#FDE68A', // yellow
  '#7DD3FC', // sky
] as const;

export function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 82%)`;
}

export function defaultCourseColor(subjectName: string, index = 0): string {
  if (!subjectName.trim()) return COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURSE_COLOR_PALETTE[Math.abs(hash + index * 3) % COURSE_COLOR_PALETTE.length];
}

/** Pick the next unused palette color so each course looks distinct on the grid. */
export function nextUnusedCourseColor(existing: Array<string | null | undefined>): string {
  const used = new Set(
    existing.filter(Boolean).map((c) => String(c).trim().toLowerCase())
  );
  for (const swatch of COURSE_COLOR_PALETTE) {
    if (!used.has(swatch.toLowerCase())) return swatch;
  }
  return COURSE_COLOR_PALETTE[existing.length % COURSE_COLOR_PALETTE.length];
}

export function resolveCourseColor(subjectName: string, courses: CourseConfig[]): string {
  const course = courses.find((c) => c.subjectName === subjectName);
  if (course?.color) return course.color;
  const index = courses.findIndex((c) => c.subjectName === subjectName);
  return defaultCourseColor(subjectName, Math.max(0, index));
}

export function buildCourseColorMap(courses: CourseConfig[]): Map<string, string> {
  const map = new Map<string, string>();
  const assigned: string[] = [];
  courses.forEach((course, index) => {
    const color = course.color || nextUnusedCourseColor(assigned) || defaultCourseColor(course.subjectName, index);
    assigned.push(color);
    map.set(course.subjectName, color);
  });
  return map;
}

export function resolveSchedulePeriodSlots(schedule: SchoolSchedule): PeriodSlotDefinition[] {
  const transitionMinutes = schedule.transitionMinutes ?? 5;
  const breakDefs = parseBreakDefs(schedule.breaks, {
    dayStart: schedule.dayStart,
    periodDurationMinutes: schedule.periodDurationMinutes,
    transitionMinutes,
  });

  return buildDaySlots({
    dayStart: schedule.dayStart,
    dayEnd: schedule.dayEnd,
    periodDurationMinutes: schedule.periodDurationMinutes,
    transitionMinutes,
    breakDefs,
  });
}

export function slotLabel(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function uniqueClasses(assignments: { className: string }[]): string[] {
  return [...new Set(assignments.map((a) => a.className))].sort();
}

export function uniqueTeachers(rows: { teacherUserId: string; teacherName: string }[]) {
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.teacherUserId, r.teacherName);
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export function buildTimeRows(rows: TimetableRowLike[]): string[] {
  const times = new Set<string>();
  for (const r of rows) times.add(`${r.startTime}|${r.endTime}`);
  return [...times]
    .map((t) => {
      const [start, end] = t.split('|');
      return { start, end, key: t };
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((t) => t.key);
}

interface TimetableRowLike {
  startTime: string;
  endTime: string;
}

export function parseTimeKey(key: string) {
  const [startTime, endTime] = key.split('|');
  return { startTime, endTime };
}

export function timeSlotKey(startTime: string, endTime: string) {
  return `${startTime}|${endTime}`;
}

/** Convert CSS hex/hsl color to RGB tuple for jsPDF. */
export function colorToRgbTuple(color: string): [number, number, number] {
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = Number.parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const hslMatch = trimmed.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (hslMatch) {
    const h = Number(hslMatch[1]) / 360;
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
  }

  return [248, 250, 252];
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClassTimetableCsv(className: string, rows: Array<{
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  room?: string | null;
}>) {
  const header = 'Day,Start,End,Subject,Teacher,Room\n';
  const body = rows
    .map(
      (r) =>
        `${r.dayOfWeek},${r.startTime},${r.endTime},"${r.subjectName}","${r.teacherName}","${r.room ?? ''}"`
    )
    .join('\n');
  downloadTextFile(`${className}-timetable.csv`, header + body);
}
