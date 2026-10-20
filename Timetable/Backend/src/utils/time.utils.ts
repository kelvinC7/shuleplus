export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export interface TimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotIndex: number;
  isBreak: boolean;
  label?: string;
}

export interface BreakWindow {
  start: string;
  end: string;
  label?: string;
}

export function normalizeTime(time: string): string {
  const parts = time.trim().split(':').map((p) => p.padStart(2, '0'));
  return `${parts[0]}:${parts[1] ?? '00'}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

export function isMorningSlot(startTime: string, dayStart: string, dayEnd: string): boolean {
  const midpoint = (timeToMinutes(dayStart) + timeToMinutes(dayEnd)) / 2;
  return timeToMinutes(startTime) < midpoint;
}

export function isAfternoonSlot(startTime: string, dayStart: string, dayEnd: string): boolean {
  return !isMorningSlot(startTime, dayStart, dayEnd);
}

export function slotKey(day: string, start: string, end: string): string {
  return `${day}|${normalizeTime(start)}|${normalizeTime(end)}`;
}

export function generateTimeSlots(input: {
  dayStart: string;
  dayEnd: string;
  periodDurationMinutes: number;
  activeDays: string[];
  breaks: BreakWindow[];
  periodSlots?: Array<{
    name: string;
    startTime: string;
    endTime: string;
    isBreak: boolean;
  }>;
}): TimeSlot[] {
  if (input.periodSlots?.length) {
    const slots: TimeSlot[] = [];
    let lessonIndex = 0;
    for (const day of input.activeDays) {
      lessonIndex = 0;
      for (const def of input.periodSlots) {
        if (!def.isBreak) {
          slots.push({
            dayOfWeek: day,
            startTime: normalizeTime(def.startTime),
            endTime: normalizeTime(def.endTime),
            slotIndex: lessonIndex,
            isBreak: false,
            label: def.name,
          });
          lessonIndex += 1;
        } else {
          slots.push({
            dayOfWeek: day,
            startTime: normalizeTime(def.startTime),
            endTime: normalizeTime(def.endTime),
            slotIndex: -1,
            isBreak: true,
            label: def.name,
          });
        }
      }
    }
    return slots;
  }

  const slots: TimeSlot[] = [];
  const breakWindows = input.breaks.map((b) => ({
    start: timeToMinutes(normalizeTime(b.start)),
    end: timeToMinutes(normalizeTime(b.end)),
    label: b.label,
  }));

  for (const day of input.activeDays) {
    let cursor = timeToMinutes(input.dayStart);
    const dayEnd = timeToMinutes(input.dayEnd);
    let periodIndex = 0;

    while (cursor + input.periodDurationMinutes <= dayEnd) {
      const periodStart = cursor;
      const periodEnd = cursor + input.periodDurationMinutes;

      const overlappingBreak = breakWindows.find(
        (b) => periodStart < b.end && b.start < periodEnd
      );

      if (overlappingBreak) {
        if (cursor < overlappingBreak.start) {
          slots.push({
            dayOfWeek: day,
            startTime: minutesToTime(cursor),
            endTime: minutesToTime(overlappingBreak.start),
            slotIndex: periodIndex,
            isBreak: false,
            label: `Period ${periodIndex + 1}`,
          });
          periodIndex += 1;
        }
        slots.push({
          dayOfWeek: day,
          startTime: minutesToTime(overlappingBreak.start),
          endTime: minutesToTime(overlappingBreak.end),
          slotIndex: -1,
          isBreak: true,
          label: overlappingBreak.label ?? 'Break',
        });
        cursor = overlappingBreak.end;
        continue;
      }

      slots.push({
        dayOfWeek: day,
        startTime: minutesToTime(periodStart),
        endTime: minutesToTime(periodEnd),
        slotIndex: periodIndex,
        isBreak: false,
        label: `Period ${periodIndex + 1}`,
      });
      periodIndex += 1;
      cursor = periodEnd;
    }
  }

  return slots;
}

export function teachingSlotsOnly(slots: TimeSlot[]): TimeSlot[] {
  return slots.filter((s) => !s.isBreak);
}

export function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 92%)`;
}
