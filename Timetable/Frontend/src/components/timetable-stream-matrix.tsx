'use client';

import { Fragment } from 'react';
import type { CourseConfig, PeriodSlotDefinition, TimetableRow } from '@/types';
import { shortCourseCode } from '@/utils/course-code';
import { resolveCourseColor } from '@/utils/timetable';
import { normalizeClassName } from '@/utils/timetable-summary';

interface TimetableStreamMatrixProps {
  rows: TimetableRow[];
  /** Ordered stream labels for the selected class, e.g. P6A, P6B. */
  streams: string[];
  periodSlots: PeriodSlotDefinition[];
  days: string[];
  courses?: CourseConfig[];
  search?: string;
  mode?: 'screen' | 'print';
  printFontSize?: number;
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

function breakLabel(slot: PeriodSlotDefinition): string {
  if (slot.slotType === 'LUNCH') return 'Lunch';
  if (slot.slotType === 'BREAK') return 'Break';
  return slot.name;
}

/**
 * One class, all streams, one paper.
 *
 *   Day | Stream | Period 1 | Period 2 | ...
 *   Monday (vertical span) -> P6A across all periods, then P6B across all periods
 *   Tuesday -> P6A, P6B ...
 *
 * Days stay grouped vertically while every stream keeps its own full period row.
 */
export function TimetableStreamMatrix({
  rows,
  streams,
  periodSlots,
  days,
  courses = [],
  search = '',
  mode = 'screen',
  printFontSize,
  compact = false,
}: TimetableStreamMatrixProps) {
  const isPrint = mode === 'print';
  const visibleDays = days.length ? days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const visibleStreams = streams.length
    ? streams
    : [...new Set(rows.map((row) => row.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
  const streamCount = Math.max(1, visibleStreams.length);

  const lessonsAt = (day: string, stream: string, slot: PeriodSlotDefinition) => {
    const target = normalizeClassName(stream);
    return rows.filter(
      (row) =>
        row.dayOfWeek === day &&
        normalizeClassName(row.className) === target &&
        row.startTime === slot.startTime &&
        (row.endTime === slot.endTime || !row.endTime)
    );
  };

  return (
    <div className={isPrint ? 'timetable-print-table-wrap' : 'w-full overflow-x-auto'}>
      <table
        className={
          isPrint
            ? 'timetable-print-table timetable-print-matrix w-full border-collapse text-navy'
            : `w-full border-separate border-spacing-0 text-navy ${compact ? 'text-[11px]' : 'text-xs'}`
        }
        style={isPrint && printFontSize ? { fontSize: `${printFontSize}px` } : undefined}
      >
        <thead>
          <tr>
            <th
              className={
                isPrint
                  ? 'timetable-print-dayhead border border-slate-300 px-1 py-1 text-left font-bold'
                  : 'sticky left-0 top-0 z-20 min-w-[78px] rounded-tl-xl border-b border-r border-slate-200 bg-navy px-2.5 py-2.5 text-left font-semibold text-white'
              }
            >
              Day
            </th>
            <th
              className={
                isPrint
                  ? 'border border-slate-300 bg-navy px-1 py-1 text-left font-bold text-white'
                  : 'min-w-[64px] border-b border-r border-slate-200 bg-navy px-2 py-2.5 text-left font-semibold text-white'
              }
            >
              Stream
            </th>
            {periodSlots.map((slot) => (
              <th
                key={slot.id}
                className={
                  isPrint
                    ? `border border-slate-300 px-1 py-1 text-center font-bold ${
                        slot.isBreak ? 'bg-slate-100 text-slate-500' : 'bg-navy text-white'
                      }`
                    : `min-w-[104px] border-b border-r border-slate-200 px-2 py-2 text-center align-middle ${
                        slot.isBreak ? 'bg-slate-100 text-slate-500' : 'bg-navy text-white'
                      }`
                }
              >
                <span className="block leading-tight">{slot.name}</span>
                <span
                  className={`mt-0.5 block font-medium ${
                    isPrint ? 'text-[0.7em]' : 'text-[9px]'
                  } ${slot.isBreak ? 'text-slate-400' : 'text-white/60'}`}
                >
                  {slot.startTime}–{slot.endTime}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleDays.map((day) => (
            <Fragment key={day}>
              {visibleStreams.map((stream, streamIndex) => {
                const dayStart = streamIndex === 0;
                return (
                  <tr
                    key={`${day}-${stream}`}
                    className={
                      dayStart
                        ? isPrint
                          ? 'timetable-print-daystart'
                          : 'border-t border-slate-300'
                        : undefined
                    }
                  >
                    {dayStart ? (
                      <th
                        scope="rowgroup"
                        rowSpan={streamCount}
                        className={
                          isPrint
                            ? 'timetable-print-dayhead border border-slate-300 bg-slate-50 px-1 py-1 text-left align-middle font-bold'
                            : 'sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-left align-middle font-semibold'
                        }
                      >
                        <span className="hidden sm:inline">{day}</span>
                        <span className="inline sm:hidden">{day.slice(0, 3)}</span>
                      </th>
                    ) : null}

                    <th
                      scope="row"
                      className={
                        isPrint
                          ? 'border border-slate-300 bg-white px-1 py-1 text-left font-bold text-navy'
                          : 'border-b border-r border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-navy'
                      }
                    >
                      {stream}
                    </th>

                    {periodSlots.map((slot) => {
                      if (slot.isBreak) {
                        // One tall break cell per day keeps the matrix clean.
                        if (!dayStart) return null;
                        return (
                          <td
                            key={`${day}-${slot.id}`}
                            rowSpan={streamCount}
                            className={
                              isPrint
                                ? 'timetable-print-break border border-slate-300 bg-slate-100 px-1 py-1 text-center align-middle text-[0.75em] font-semibold uppercase tracking-wide text-slate-400'
                                : 'border-b border-r border-slate-200 bg-[repeating-linear-gradient(135deg,#f8fafc,#f8fafc_6px,#f1f5f9_6px,#f1f5f9_12px)] px-1 py-1.5 text-center align-middle text-[9px] font-semibold uppercase tracking-wide text-slate-400'
                            }
                          >
                            {breakLabel(slot)}
                          </td>
                        );
                      }

                      const lessons = lessonsAt(day, stream, slot);
                      const matching = search.trim()
                        ? lessons.filter((lesson) => matchesSearch(lesson, search))
                        : lessons;
                      const dimmed =
                        Boolean(search.trim()) && lessons.length > 0 && matching.length === 0;

                      return (
                        <td
                          key={`${day}-${stream}-${slot.id}`}
                          className={
                            isPrint
                              ? `align-top border border-slate-300 p-0.5 ${dimmed ? 'opacity-30' : ''}`
                              : `align-top border-b border-r border-slate-200 p-1 ${dimmed ? 'opacity-30' : ''}`
                          }
                        >
                          {lessons.length === 0 ? (
                            <div className={isPrint ? 'min-h-[12px]' : 'min-h-[40px]'} />
                          ) : (
                            <div className={isPrint ? 'space-y-px' : 'space-y-1'}>
                              {lessons.map((lesson) => {
                                const color = resolveCourseColor(lesson.subjectName, courses);
                                const code = shortCourseCode(
                                  courses.find(
                                    (course) => course.subjectName === lesson.subjectName
                                  )?.courseCode,
                                  lesson.subjectName
                                );
                                const faded =
                                  Boolean(search.trim()) && !matchesSearch(lesson, search);
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
                                          : 'block truncate text-[10px] font-bold leading-tight'
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
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
