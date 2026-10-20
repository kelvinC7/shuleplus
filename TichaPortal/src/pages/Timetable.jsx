import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, BookOpen, User, Download, Image as ImageIcon,
  ChevronLeft, ChevronRight, Grid as GridIcon, List, Loader2,
  RefreshCw, FileText, Radio, ScanLine
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TeacherPageShell, { tpActionBtn, tpActionBtnPrimary } from '../components/TeacherPageShell';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchTeacherSchedule, fetchTeacherLive, flattenScheduleByDay } from '../services/teacherPortalApi';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SUBJECT_COLORS = [
  { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', glow: 'rgba(59,130,246,0.15)' },
  { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', glow: 'rgba(34,197,94,0.15)' },
  { bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce', glow: 'rgba(168,85,247,0.15)' },
  { bg: '#fff7ed', border: '#f97316', text: '#c2410c', glow: 'rgba(249,115,22,0.15)' },
  { bg: '#fff1f2', border: '#f43f5e', text: '#be123c', glow: 'rgba(244,63,94,0.15)' },
  { bg: '#f0fdfa', border: '#14b8a6', text: '#0f766e', glow: 'rgba(20,184,166,0.15)' },
  { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', glow: 'rgba(245,158,11,0.15)' },
  { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9', glow: 'rgba(139,92,246,0.15)' },
];

function getSubjectColor(subject, colorMap) {
  if (!colorMap[subject]) {
    const idx = Object.keys(colorMap).length % SUBJECT_COLORS.length;
    colorMap[subject] = SUBJECT_COLORS[idx];
  }
  return colorMap[subject];
}

export default function Timetable() {
  const { ready, settings, term: ctxTerm, academicYear: ctxYear } = useTpAcademic();
  const [view, setView] = useState('grid');
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday');
  const [schedule, setSchedule] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ classes: [], terms: [], academicYears: [], courses: [] });
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [colorMap] = useState({});
  const gridRef = useRef(null);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const loadLive = useCallback(async (silent = false) => {
    if (!silent) setLiveLoading(true);
    try {
      const data = await fetchTeacherLive();
      setLiveData(data);
      setLastRefresh(new Date());
    } catch {
      if (!silent) setLiveData(null);
    } finally {
      if (!silent) setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    setFilterOptions((prev) => ({
      ...prev,
      terms: settings?.terms || prev.terms,
      academicYears: settings?.academicYears || prev.academicYears,
    }));
    if (ctxTerm) setSelectedTerm(ctxTerm);
    if (ctxYear) setSelectedAcademicYear(ctxYear);
  }, [ready, settings, ctxTerm, ctxYear]);

  const loadSchedule = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchTeacherSchedule('weekly', {
        term: selectedTerm || undefined,
        academicYear: selectedAcademicYear || undefined,
        className: selectedClass || undefined,
        course: selectedCourse || undefined,
      });
      setSchedule(flattenScheduleByDay(data));
      setFilterOptions((prev) => ({
        ...prev,
        classes: Array.isArray(data?.classes) && data.classes.length ? data.classes : prev.classes,
        courses: Array.isArray(data?.courses) && data.courses.length ? data.courses : prev.courses,
        terms: prev.terms.length ? prev.terms : settings?.terms || [],
        academicYears: prev.academicYears.length ? prev.academicYears : settings?.academicYears || [],
      }));
    } catch {
      setSchedule([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedClass, selectedTerm, selectedAcademicYear, selectedCourse, settings]);

  useEffect(() => {
    if (!ready) return;
    loadSchedule();
  }, [ready, loadSchedule]);

  useEffect(() => {
    if (!ready) return;
    loadLive();
    const interval = setInterval(() => {
      loadLive(true);
      if (view === 'grid' || view === 'list') loadSchedule(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [ready, view, loadLive, loadSchedule]);

  const allTimes = [...new Set(schedule.map(s => s.time))].sort();
  const daySchedule = schedule.filter(s => s.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

  const dayIdx = DAYS.indexOf(selectedDay);
  const prevDay = () => setSelectedDay(DAYS[Math.max(0, dayIdx - 1)]);
  const nextDay = () => setSelectedDay(DAYS[Math.min(DAYS.length - 1, dayIdx + 1)]);

  const handleExportPDF = useCallback(async () => {
    if (!gridRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`timetable-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('PDF export failed', e); }
    finally { setExporting(false); }
  }, [exporting]);

  const handleExportImage = useCallback(async () => {
    if (!gridRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `timetable-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) { console.error('Image export failed', e); }
    finally { setExporting(false); }
  }, [exporting]);

  const totalPeriods = schedule.length;
  const uniqueSubjects = [...new Set(schedule.map(s => s.subject))].length;
  const uniqueClasses = [...new Set(schedule.map(s => s.group).filter(Boolean))].length;

  const todayLessonCount = liveData?.lessons?.length ?? liveData?.kpis?.todayClasses ?? 0;

  const shellStats = [
    { label: 'Total Periods', value: loading ? '-' : totalPeriods },
    { label: 'Subjects', value: loading ? '-' : uniqueSubjects },
    { label: 'Classes', value: loading ? '-' : uniqueClasses },
    { label: 'Today', value: loading ? '-' : todayLessonCount },
  ];

  const shellActions = (
    <>
      <div className="flex w-full gap-1 rounded-xl border border-black/[0.08] bg-white p-1 sm:w-auto">
        {[
          { id: 'grid', icon: <GridIcon size={14} />, label: 'Grid' },
          { id: 'list', icon: <List size={14} />, label: 'Day' },
          { id: 'live', icon: <Radio size={14} />, label: 'Live' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium sm:flex-none ${
              view === v.id ? 'bg-[#000435] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {v.icon}
            <span>{v.label}</span>
          </button>
        ))}
      </div>
      <button type="button" className={`${tpActionBtn} flex-1 sm:flex-none`} onClick={handleExportPDF} disabled={exporting}>
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
      </button>
      <button type="button" className={`${tpActionBtn} flex-1 sm:flex-none`} onClick={handleExportImage} disabled={exporting}>
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Image
      </button>
      <button
        type="button"
        className={tpActionBtn}
        onClick={() => {
          loadSchedule();
          loadLive();
        }}
        title="Refresh"
      >
        <RefreshCw size={14} className={liveLoading ? 'animate-spin' : ''} />
      </button>
    </>
  );

  return (
    <TeacherPageShell
      title="Timetable"
      subtitle="Your weekly schedule and live lessons"
      stats={shellStats}
      actions={shellActions}
    >
      <div className="tp-card overflow-hidden p-0">
          {lastRefresh && view === 'live' ? (
            <p className="border-b border-black/[0.06] px-4 py-2 text-[10px] text-slate-500">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · auto-refresh 30s
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-b border-black/[0.06] px-3 py-3 sm:px-4">
            {[
              { label: 'All Classes', value: selectedClass, setter: setSelectedClass, options: filterOptions.classes },
              { label: 'All Subjects', value: selectedCourse, setter: setSelectedCourse, options: filterOptions.courses },
              { label: 'All Terms', value: selectedTerm, setter: setSelectedTerm, options: filterOptions.terms },
              { label: 'All Years', value: selectedAcademicYear, setter: setSelectedAcademicYear, options: filterOptions.academicYears },
            ].map((f, i) => (
              <select
                key={i}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                className="tp-input h-9 min-w-[7rem] flex-1 py-1.5 text-xs sm:flex-none sm:min-w-[8.5rem]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
              >
                <option value="">{f.label}</option>
                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Timetable...</p>
            </div>
          )}

          {/* ── WEEKLY GRID VIEW ── */}
          {!loading && view === 'grid' && (
            <div ref={gridRef} className="overflow-x-auto custom-scrollbar bg-white" id="timetable-grid">
              {schedule.length === 0 ? (
                <EmptyState message="No timetable data found for your account." sub="Lessons appear when Timetable has your name on the grid (same as admin). Try All Classes / All Terms, then refresh." />
              ) : (
                <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 px-3 py-4 text-center" style={{ width: 80, minWidth: 80 }}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Time</span>
                      </th>
                      {DAYS.map(day => (
                        <th key={day} className="border-r border-b border-gray-100 px-3 py-4 text-center bg-gray-50" style={{ minWidth: 140 }}>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{day.substring(0, 3)}</div>
                          <div className="text-[8px] text-gray-300 font-bold uppercase tracking-wider mt-0.5">{day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimes.map((time, tIdx) => (
                      <tr key={time} className={tIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                        <td className="sticky left-0 z-10 border-r border-b border-gray-100 px-2 py-3 text-center" style={{ background: tIdx % 2 === 0 ? '#fff' : '#f9fafb', minWidth: 80 }}>
                          <div className="flex flex-col items-center gap-0.5">
                            <Clock size={10} className="text-gray-300" />
                            <span className="text-[10px] font-black text-gray-400 tabular-nums">{time}</span>
                          </div>
                        </td>
                        {DAYS.map(day => {
                          const sessions = schedule.filter(s => s.day === day && s.time === time);
                          const session = sessions[0];
                          const color = session ? getSubjectColor(session.subject, colorMap) : null;
                          const isToday = day === todayName;
                          const isLiveNow = isToday && liveData?.current &&
                            (liveData.current.startTime === time || liveData.current.timetableId === session?.id);
                          return (
                            <td key={`${day}-${time}`} className="border-r border-b border-gray-100 p-1.5 align-top" style={{ minWidth: 140, height: 100, ...(isToday ? { background: '#fffbf5' } : {}) }}>
                              {session ? (
                                <div
                                  className={`h-full rounded-xl p-2.5 flex flex-col gap-1 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default relative overflow-hidden ${isLiveNow ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
                                  style={{ background: color.bg, border: `1.5px solid ${isLiveNow ? '#f97316' : color.border + '30'}` }}
                                >
                                  {isLiveNow && (
                                    <span className="absolute top-1 right-1 text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-500 text-white">Live</span>
                                  )}
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-wide leading-tight truncate" style={{ color: color.text }}>
                                      {session.subject}
                                    </div>
                                    {session.group && (
                                      <div className="text-[9px] font-bold truncate mt-0.5" style={{ color: color.text + 'aa' }}>
                                        {session.periodLabel ? `${session.periodLabel} · ` : ''}{session.group}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-1.5">
                                      {session.room && (
                                        <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: color.border + '18', color: color.text }}>
                                          <MapPin size={7} /> {session.room}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── DAILY AGENDA VIEW ── */}
          {!loading && view === 'list' && (
            <div>
              {/* Day Navigator */}
              <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100 bg-white">
                <button onClick={prevDay} disabled={dayIdx === 0} className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-500 disabled:opacity-30 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 flex gap-1 overflow-x-auto custom-scrollbar">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className="flex-shrink-0 px-3 sm:px-4 h-9 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200"
                      style={selectedDay === day
                        ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 2px 12px rgba(249,115,22,0.35)' }
                        : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }
                      }
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.substring(0, 3)}</span>
                    </button>
                  ))}
                </div>
                <button onClick={nextDay} disabled={dayIdx === DAYS.length - 1} className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-500 disabled:opacity-30 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {daySchedule.length === 0 ? (
                  <EmptyState message={`No classes on ${selectedDay}`} sub="You have a free day. Enjoy!" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {daySchedule.map((session, idx) => {
                      const color = getSubjectColor(session.subject, colorMap);
                      return (
                        <div
                          key={session.id || idx}
                          className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider" style={{ background: color.bg, color: color.text }}>
                              <BookOpen size={9} /> {session.type || 'Lesson'}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg" style={{ background: '#f8fafc', color: '#94a3b8' }}>
                              <Clock size={9} /> {session.time}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-gray-800 tracking-tight leading-tight mb-1" style={{ color: color.text }}>
                            {session.subject}
                          </h3>
                          {session.group && (
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: color.text + '99' }}>
                              {session.group}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                            {session.room && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <MapPin size={10} className="text-gray-400" /> {session.room}
                              </span>
                            )}
                            {session.teacher_name && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <User size={10} className="text-gray-400" /> {session.teacher_name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LIVE TODAY VIEW ── */}
          {!loading && view === 'live' && (
            <div className="p-4 sm:p-6 space-y-4">
              {(liveData?.lessons || []).length === 0 ? (
                <EmptyState message="No lessons scheduled for today" sub="Try another term or refresh." />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(liveData?.lessons || []).map((lesson, idx) => {
                      const phase = lesson.phase || (lesson.isCurrent ? 'current' : lesson.isNext ? 'next' : 'upcoming');
                      const phaseStyles = {
                        current: 'border-orange-400 bg-orange-50 ring-2 ring-orange-200',
                        next: 'border-blue-300 bg-blue-50',
                        past: 'border-gray-200 bg-gray-50 opacity-75',
                        upcoming: 'border-gray-200 bg-white',
                      };
                      return (
                        <div key={lesson.timetableId || idx} className={`rounded-2xl border p-4 ${phaseStyles[phase] || phaseStyles.upcoming}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                              phase === 'current' ? 'bg-orange-500 text-white' :
                              phase === 'next' ? 'bg-blue-500 text-white' :
                              phase === 'past' ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {phase === 'current' ? 'In progress' : phase === 'next' ? 'Up next' : phase === 'past' ? 'Completed' : 'Scheduled'}
                            </span>
                            <span className="text-xs font-bold text-gray-500">{lesson.startTime} – {lesson.endTime}</span>
                          </div>
                          <h3 className="text-lg font-black text-gray-800">{lesson.subjectName}</h3>
                          <p className="text-sm font-bold text-gray-500 mt-0.5">{lesson.className}</p>
                          {lesson.room && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MapPin size={12} /> {lesson.room}</p>
                          )}
                          {phase === 'current' && (
                            <div className="flex gap-2 mt-4">
                              <Link to="/class-room-scan" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#000435] text-white text-[10px] font-black uppercase">
                                <ScanLine size={12} /> Scan QR
                              </Link>
                              <Link to="/attendance" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-orange-300 text-orange-700 text-[10px] font-black uppercase">
                                Attendance
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
      </div>
    </TeacherPageShell>
  );
}

function EmptyState({ message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)' }}>
        <Calendar size={28} className="text-orange-400" />
      </div>
      <p className="text-sm font-black uppercase tracking-widest text-gray-700">{message}</p>
      {sub && <p className="text-xs font-bold text-gray-400 text-center max-w-xs">{sub}</p>}
    </div>
  );
}
