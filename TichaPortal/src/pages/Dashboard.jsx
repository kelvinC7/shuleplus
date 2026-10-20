import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  MessageSquare,
  BookOpen,
  Users,
  ArrowRight,
  ChevronRight,
  CheckSquare,
  ClipboardList,
  Presentation,
  ScanLine,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import TeacherDashboardTimetable from '../components/TeacherDashboardTimetable';
import TeacherDashboardSchoolChart from '../components/TeacherDashboardSchoolChart';
import useTpAcademic from '../hooks/useTpAcademic';
import {
  fetchTeacherToday,
  fetchTeacherSchedule,
  fetchMyClasses,
  fetchClassStudents,
  flattenScheduleByDay,
  tpAcademicParams,
} from '../services/teacherPortalApi';

const Dashboard = () => {
  const { teacher } = useAuth();
  const { ready, term, academicYear } = useTpAcademic();

  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [schoolOverview, setSchoolOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const ac = tpAcademicParams(term, academicYear);
        const [today, week, classesData] = await Promise.all([
          fetchTeacherToday(ac).catch(() => null),
          fetchTeacherSchedule('weekly', ac).catch(() => null),
          fetchMyClasses().catch(() => null),
        ]);
        if (cancelled) return;

        const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
        const totalClasses = today?.kpis?.todayClasses ?? lessons.length;
        const activeStudents = Array.isArray(classesData?.classes)
          ? classesData.classes.reduce((sum, item) => sum + (Number(item.studentsCount) || 0), 0)
          : 0;

        setStats([
          { label: 'Total Classes', value: totalClasses },
          { label: 'Active Students', value: activeStudents },
          { label: 'Today Attendance', value: today?.kpis?.attendance ?? 0 },
          { label: 'Lessons Done', value: today?.kpis?.lessonsDone ?? 0 },
        ]);
        setSchedule(
          lessons.map((l) => ({
            time: l.startTime,
            end_time: l.endTime,
            title: [l.periodLabel, l.subjectName, l.className].filter(Boolean).join(' · '),
            room: l.room || l.className || '',
            active: l.phase === 'current',
            period_checked_in: Boolean(l.qrVerified || l.scannedAt),
            entry_time: l.scannedAt || null,
            periodLabel: l.periodLabel,
          }))
        );
        setWeeklySchedule(flattenScheduleByDay(week));

        const classList = Array.isArray(classesData?.classes) ? classesData.classes : [];
        const first = classList[0];
        let students = [];
        if (first?.id) {
          students = await fetchClassStudents(first.id, first.label || first.name).catch(() => []);
        }
        if (cancelled) return;
        const list = Array.isArray(students) ? students : [];
        const girls = list.filter((s) => /^f/i.test(String(s.gender || ''))).length;
        const boys = list.filter((s) => /^m/i.test(String(s.gender || ''))).length;
        setSchoolOverview({
          students: list.length,
          girls,
          boys,
          classNames: classList.map((c) => c.label || c.name).filter(Boolean),
        });
      } catch (e) {
        console.error('Failed to fetch dashboard', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, term, academicYear]);

  const quickTools = [
    { title: 'Ticha AI', desc: 'Lesson planning assistant', icon: MessageSquare, color: 'text-slate-700 bg-slate-50', path: '/ticha-ai' },
    { title: 'Ticha Deals', desc: 'Get discounts on goods & services', icon: ShoppingBag, color: 'text-amber-600 bg-amber-50', path: '/ticha-deals' },
    { title: 'Ticha Avance', desc: 'Teacher credit & advances', icon: Wallet, color: 'text-amber-700 bg-amber-50', path: '/shule-avance' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f2f9]">
        <div className="w-10 h-10 rounded-full border-4 border-[#000435]/15 border-t-[#000435] animate-spin" />
        <p className="text-sm text-re-text-muted">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 min-h-full pb-24 lg:pb-10">
      <TeacherOrangeHero
        title="Dashboard"
        subtitle={`Welcome back, ${teacher?.first_name || 'Teacher'}. Ready to inspire your students today?`}
      />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-5 pb-10">
        {stats.length > 0 && (
          <div className="tp-stat-grid shadow-sm">
            {stats.map((stat, i) => {
              const isLast = i === stats.length - 1;
              const isOddCol = i % 2 === 0;
              const showBottomBorder = i < 2 && stats.length > 2;

              return (
                <div
                  key={i}
                  className={`tp-stat-cell border-black/[0.05]
                    ${!isLast && isOddCol ? 'border-r' : ''}
                    ${showBottomBorder ? 'border-b sm:border-b-0' : ''}
                    ${i < stats.length - 1 ? 'sm:border-r' : ''}`}
                >
                  <span className="tp-stat-value">{stat.value}</span>
                  <p className="tp-stat-label">{stat.label}</p>
                </div>
              );
            })}
          </div>
        )}

<div className="tp-card overflow-hidden">
          <div className="tp-card-header">
            <Sparkles size={15} className="text-[#c87800]" strokeWidth={1.75} />
            <h3>Quick access</h3>
          </div>

          <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.path} to={tool.path} className="tp-tool-tile group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tool.color}`}>
                    <Icon size={17} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm text-[#000435] leading-snug font-normal">{tool.title}</h4>
                    <p className="text-xs text-re-text-muted mt-0.5 leading-relaxed">{tool.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-[#c87800] group-hover:gap-1.5 transition-all">
                      Open <ArrowRight size={12} strokeWidth={2} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden divide-y divide-black/[0.06]">
            {quickTools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors ${i === 0 ? 'rounded-t-[inherit]' : ''}`}
                >
                  <Icon size={22} strokeWidth={1.75} className="text-[#c87800]/80 shrink-0" />
                  <span className="text-sm text-[#000435] flex-1">{tool.title}</span>
                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div> 

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
          <div className="lg:col-span-2 min-w-0">
            <TeacherDashboardTimetable schedule={schedule} weeklySchedule={weeklySchedule} />
          </div>

          {/* <div className="lg:col-span-3 min-w-0">
            <TeacherDashboardSchoolChart overview={schoolOverview} />
          </div> */}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
