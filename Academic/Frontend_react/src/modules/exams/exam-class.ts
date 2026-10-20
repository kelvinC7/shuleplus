import type { ExamSchedule, ExamSeat } from './exam-types';
import { isoDate } from './exam-ui';

export function classLevelOf(className: string) {
  const raw = className.trim();
  const spaced = raw.match(/^([A-Za-z]+)\s*(\d+)\s*([A-Za-z])?$/);
  if (spaced) return `${spaced[1].toUpperCase()}${spaced[2]}`;
  const glued = raw.match(/^([A-Za-z]+)(\d+)([A-Za-z])?$/);
  if (glued) return `${glued[1].toUpperCase()}${glued[2]}`;
  return raw.replace(/[\s_-]*[A-Za-z]$/, '').trim() || raw;
}

export function streamOf(className: string) {
  const raw = className.trim();
  const spaced = raw.match(/^[A-Za-z]+\s*\d+\s*([A-Za-z])$/);
  if (spaced) return spaced[1].toUpperCase();
  const glued = raw.match(/^[A-Za-z]+\d+([A-Za-z])$/);
  if (glued) return glued[1].toUpperCase();
  return null;
}

export function uniqueLevels(schedules: ExamSchedule[]) {
  return [...new Set(schedules.map((s) => classLevelOf(s.className)))].sort();
}

export function streamsForLevel(schedules: ExamSchedule[], level: string) {
  return [...new Set(schedules.filter((s) => classLevelOf(s.className) === level).map((s) => s.className))].sort();
}

export function subjectAt(schedules: ExamSchedule[], level: string, date: string, slotCode: string) {
  return schedules.find((s) => classLevelOf(s.className) === level && isoDate(s.examDate) === date && s.slotCode === slotCode);
}

export function examPaperKey(s: ExamSchedule) {
  return `${classLevelOf(s.className)}|${s.subjectName}|${isoDate(s.examDate)}|${s.slotCode}`;
}

export function examPapers(schedules: ExamSchedule[]) {
  const map = new Map<string, ExamSchedule[]>();
  for (const s of schedules) {
    const key = examPaperKey(s);
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return [...map.entries()].map(([key, rows]) => {
    const first = rows[0];
    const streams = [...new Set(rows.map((s) => s.className))].sort();
    const rooms = [...new Set(rows.flatMap((s) => (s.rooms ?? []).map((r) => r.name)))].sort();
    return {
      key,
      subjectName: first.subjectName,
      level: classLevelOf(first.className),
      date: isoDate(first.examDate),
      slotCode: first.slotCode,
      startTime: first.startTime,
      endTime: first.endTime,
      streams,
      rooms,
      studentCount: rows.reduce((n, s) => n + (s.studentCount || 0), 0),
      scheduleIds: rows.map((s) => s.id),
    };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.subjectName.localeCompare(b.subjectName));
}

export function examLevels(schedules: ExamSchedule[]) {
  const map = new Map<string, ExamSchedule[]>();
  for (const s of schedules) {
    const level = classLevelOf(s.className);
    map.set(level, [...(map.get(level) ?? []), s]);
  }
  return [...map.entries()].map(([level, rows]) => {
    const streams = [...new Set(rows.map((s) => s.className))].sort();
    const rooms = [...new Set([
      ...rows.flatMap((s) => (s.rooms ?? []).map((r) => r.name)),
    ].filter(Boolean))].sort();
    const subjects = [...new Set(rows.map((s) => s.subjectName))].sort();
    const byClass = new Map<string, number>();
    for (const s of rows) {
      const key = s.classId || s.className;
      byClass.set(key, Math.max(byClass.get(key) ?? 0, s.studentCount || 0));
    }
    return {
      key: level,
      level,
      streams,
      rooms,
      subjects,
      studentCount: [...byClass.values()].reduce((n, v) => n + v, 0),
      scheduleIds: rows.map((s) => s.id),
    };
  }).sort((a, b) => a.level.localeCompare(b.level));
}

export function uniqueSeats(seats: ExamSeat[]) {
  const map = new Map<string, ExamSeat>();
  for (const s of seats) {
    const key = `${s.studentId}|${s.roomName}|${s.seatCode}`;
    if (!map.has(key)) map.set(key, s);
  }
  return [...map.values()].sort((a, b) =>
    a.roomName.localeCompare(b.roomName)
    || a.seatCode.localeCompare(b.seatCode)
    || a.fullName.localeCompare(b.fullName));
}
