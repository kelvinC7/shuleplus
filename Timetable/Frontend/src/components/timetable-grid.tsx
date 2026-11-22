'use client';

import type { CourseConfig, PeriodSlotDefinition, TimetableRow } from '@/types';
import { shortCourseCode } from '@/utils/course-code';
import { resolveCourseColor } from '@/utils/timetable';

export interface TimetableGridRow extends TimetableRow {}

interface TimetableGridProps {
  rows: TimetableRow[];
  periodSlots: PeriodSlotDefinition[];
  days: string[];
  courses?: CourseConfig[];
  /** Show the class/stream name inside every lesson (All Streams view). */
  showStream?: boolean;
  /** Dim periods that do not match the search term. */
  search?: string;
  mode?: 'screen' | 'print';
  /** Base font size used by the print table (px). */
  printFontSize?: number;
  emptyLabel?: string;
  compact?: boolean;
}

function matchesSearch(row: TimetableRow, search: string): boolean {
  if (!search.trim()) return true;
  const needle = search.trim().toLowerCase();
  return [row.subjectName, row.teacherName, row.className, row.room ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

function dayLabel(day: string): string {
  return day.slice(0, 3).toUpperCase();
}

export function TimetableGrid({
  rows,
  periodSlots,
  days,
  courses = [],
  showStream = false,
  search = '',
  mode = 'screen',
  printFontSize,
  emptyLabel = 'Free',
  compact = false,
}: TimetableGridProps) {
  const isPrint = mode === 'print';
  const visibleDays = days.length ? days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const lessonsFor = (day: string, slot: PeriodSlotDefinition) =>
    rows.filter(
      (row) =>
        row.dayOfWeek === day &&
        row.startTime === slot.startTime &&
        (row.endTime === slot.endTime || !row.endTime)
    );

  return (
    <div className={isPrint ? 'timetable-print-table-wrap' : 'w-full overflow-x-auto'}>
      <table
        className={
          isPrint
            ? 'timetable-print-table w-full border-collapse text-navy'
            : `w-full border-separate border-spacing-0 text-navy ${compact ? 'text-[11px]' : 'text-xs'}`
        }
        style={isPrint && printFontSize ? { fontSize: `${printFontSize}px` } : undefined}
      >
        <thead>
          <tr>
            <th
              className={
                isPrint
                  ? 'timetable-print-dayhead sticky left-0 border border-slate-300 bg-navy px-1 py-1 text-left font-bold text-white'
                  : 'sticky left-0 top-0 z-20 min-w-[92px] rounded-tl-xl border-b border-r border-slate-200 bg-navy px-3 py-2.5 text-left font-semibold text-white'
              }
            >
              Day
            </th>
            {periodSlots.map((slot) => (
              <th
                key={slot.id}
                className={
                  isPrint
                    ? `border border-slate-300 px-1 py-1 text-center font-bold ${
                        slot.isBreak ? 'bg-slate-100 text-slate-500' : 'bg-navy text-white'
                      }`
                    : `min-w-[118px] border-b border-r border-slate-200 px-2 py-2 text-center align-middle ${
                        slot.isBreak
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-navy text-white'
                      }`
                }
              >
                <span className="block leading-tight">{slot.name}</span>
                <span
                  className={`mt-0.5 block font-medium ${
                    isPrint ? 'text-[0.7em]' : 'text-[9px]'
                  } ${
                    slot.isBreak ? 'text-slate-400' : 'text-white/60'
                  }`}
                >
                  {slot.startTime}–{slot.endTime}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleDays.map((day, dayIndex) => (
            <tr key={day} className={dayIndex % 2 === 1 && !isPrint ? 'bg-slate-50/40' : ''}>
              <th
                scope="row"
                className={
                  isPrint
                    ? 'sticky left-0 border border-slate-300 bg-slate-50 px-1 py-1 text-left font-bold'
                    : 'sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold'
                }
              >
                <span className={isPrint ? 'hidden' : 'hidden sm:inline'}>{day}</span>
                <span className={isPrint ? 'inline' : 'sm:hidden'}>{dayLabel(day)}</span>
              </th>
              {periodSlots.map((slot) => {
                if (slot.isBreak) {
                  return (
                    <td
                      key={`${day}-${slot.id}`}
                      className={
                        isPrint
                          ? 'timetable-print-break border border-slate-300 bg-slate-100 px-1 py-1 text-center align-middle text-[0.75em] font-semibold uppercase tracking-wide text-slate-400'
                          : 'border-b border-r border-slate-200 bg-[repeating-linear-gradient(135deg,#f8fafc,#f8fafc_6px,#f1f5f9_6px,#f1f5f9_12px)] px-1 py-1.5 text-center align-middle text-[9px] font-semibold uppercase tracking-wide text-slate-400'
                      }
                    >
                      {slot.slotType === 'LUNCH' ? 'Lunch' : slot.slotType === 'BREAK' ? 'Break' : slot.name}
                    </td>
                  );
                }

                const lessons = lessonsFor(day, slot);
                const matching = search.trim()
                  ? lessons.filter((lesson) => matchesSearch(lesson, search))
                  : lessons;
                const dimmed = Boolean(search.trim()) && lessons.length > 0 && matching.length === 0;

                return (
                  <td
                    key={`${day}-${slot.id}`}
                    className={
                      isPrint
                        ? `align-top border border-slate-300 p-0.5 ${
                            dimmed ? 'opacity-30' : ''
                          }`
                        : `align-top border-b border-r border-slate-200 p-1 ${
                            dimmed ? 'opacity-30' : ''
                          }`
                    }
                  >
                    {lessons.length === 0 ? (
                      <div
                        className={
                          isPrint
                            ? 'flex min-h-[18px] items-center justify-center text-[0.72em] italic text-slate-300'
                            : 'flex min-h-[54px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] italic text-slate-300'
                        }
                      >
                        {emptyLabel}
                      </div>
                    ) : (
                      <div className={isPrint ? 'space-y-px' : 'space-y-1'}>
                        {lessons.map((lesson) => {
                          const color = resolveCourseColor(lesson.subjectName, courses);
                          const code = shortCourseCode(
                            courses.find((course) => course.subjectName === lesson.subjectName)?.courseCode,
                            lesson.subjectName
                          );
                          const faded = Boolean(search.trim()) && !matchesSearch(lesson, search);
                          return (
                            <div
                              key={lesson.id}
                              className={
                                isPrint
                                  ? `rounded-[2px] border border-black/10 px-0.5 py-0.5 leading-tight ${
                                      faded ? 'opacity-30' : ''
                                    }`
                                  : `lesson-card cursor-default ${faded ? 'opacity-30' : ''}`
                              }
                              style={{ backgroundColor: color }}
                              title={`${lesson.subjectName} · ${lesson.teacherName} · ${lesson.className}`}
                            >
                              <span
                                className={
                                  isPrint
                                    ? 'block truncate font-bold'
                                    : 'block truncate font-bold text-[10px] leading-tight'
                                }
                              >
                                {code}
                              </span>
                              <span
                                className={
                                  isPrint
                                    ? 'block truncate text-[0.82em] text-slate-700'
                                    : 'block truncate text-[9px] leading-tight text-slate-700'
                                }
                              >
                                {lesson.teacherName}
                              </span>
                              {lesson.room ? (
                                <span
                                  className={
                                    isPrint
                                      ? 'block truncate text-[0.75em] text-slate-500'
                                      : 'block truncate text-[8px] leading-tight text-slate-500'
                                  }
                                >
                                  {lesson.room}
                                </span>
                              ) : null}
                              {showStream ? (
                                <span
                                  className={
                                    isPrint
                                      ? 'mt-px block truncate text-[0.75em] font-semibold uppercase text-navy/70'
                                      : 'mt-0.5 block truncate text-[8px] font-semibold uppercase leading-tight text-navy/70'
                                  }
                                >
                                  {lesson.className}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
