import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ScoreRing } from '../common/ScoreRing';
import { LineChart } from '../common/LineChart';
import { ReportAbsenceSheet } from '../modals/ReportAbsenceSheet';
import { AttendanceDaySheet } from '../modals/AttendanceDaySheet';
import { TimetablePanel } from '../modals/TimetablePanel';
import { DisciplinePanel } from '../modals/DisciplinePanel';
import { SubjectItem, HomeworkItem } from '../../types';
import {
  FileText,
  Calendar,
  BookOpen,
  Download,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const LearningView: React.FC = () => {
  const { activeKid, pushPanel, openSheet, showToast, t } = useApp();

  const [subTab, setSubTab] = useState<'overview' | 'subjects' | 'reports' | 'attendance' | 'discipline' | 'homework'>('overview');

  const openSubjectDetail = (subj: SubjectItem) => {
    pushPanel({
      title: subj.name,
      subtitle: `${t('Teacher')}: ${subj.teacher}`,
      content: (
        <div className="space-y-4 text-xs">
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] text-center">
            <span className="text-[10px] uppercase font-bold text-[#6B7385] tracking-wider block">
              {t('Term 3 Final Grade')}
            </span>
            <div className="text-4xl font-black text-[#13213D] my-1">
              {subj.score}%
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              {subj.score >= 80 ? t('Distinction') : subj.score >= 65 ? t('Credit') : t('Pass')}
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
            <h4 className="font-bold text-[#13213D] text-xs">{t('Assessment Breakdown')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('Midterm Exam (30%)')}</span>
                <b className="text-[#13213D]">{subj.midterm || subj.score - 2}%</b>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('Continuous Assignments (20%)')}</span>
                <b className="text-[#13213D]">{subj.assignments || subj.score}%</b>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[#6B7385]">{t('End of Term Exam (50%)')}</span>
                <b className="text-[#13213D]">{subj.endterm || subj.score + 2}%</b>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF]">
            <h4 className="font-bold text-[#13213D] text-xs mb-1.5">{t('Teacher Remarks')}</h4>
            <p className="text-slate-700 italic leading-relaxed">
              "{subj.comment}"
            </p>
            <span className="text-[10px] text-[#6B7385] font-semibold mt-2 block">
              — {subj.teacher}, Umucyo SS Academic Faculty
            </span>
          </div>
        </div>
      ),
    });
  };

  const handleDownloadReportPdf = (term: string) => {
    showToast(`${term} Report Card downloaded (PDF) for ${activeKid.first}`);
  };

  const openReportAbsence = () => {
    openSheet(<ReportAbsenceSheet />, t('Report an absence'));
  };

  const openTimetable = () => {
    pushPanel({
      title: `${activeKid.n} · ${activeKid.cls}`,
      subtitle: t('Timetable'),
      content: <TimetablePanel child={activeKid} />,
    });
  };

  return (
    <div className="space-y-4 px-4 -mt-12 relative z-20 pb-24 select-none">
      {/* Sub-navigation Pills */}
      <div className="flex bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-card border border-[#E5E8EF] overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'overview', label: t('Overview') },
          { id: 'subjects', label: t('Subjects') },
          { id: 'reports', label: t('Report cards') },
          { id: 'attendance', label: t('Attendance') },
          { id: 'discipline', label: t('Discipline & Conduct') },
          { id: 'homework', label: t('Homework') },
        ].map((tab) => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-1 text-center ${
                isActive
                  ? 'bg-[#13213D] text-white shadow-sm'
                  : 'text-[#6B7385] hover:text-[#13213D]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {subTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Trend Line Chart Card */}
          <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E5E8EF] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F5A623]" />
                <h4 className="text-xs font-extrabold text-[#13213D]">
                  {t('3-Term Marks Performance Trend')}
                </h4>
              </div>
              <span className="text-[10.5px] font-bold text-[#1FA971]">
                +{((activeKid.avg - activeKid.prev)).toFixed(1)}% {t('gain')}
              </span>
            </div>
            <LineChart
              values={activeKid.trend}
              labels={[t('Term 1'), t('Term 2'), t('Term 3 (Current)')]}
              classAverage={activeKid.cls_avg}
              min={60}
              max={85}
            />
          </div>

          {/* Doing Well vs Needs Support */}
          <div className="grid grid-cols-2 gap-3">
            {/* Doing Well */}
            <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-[#1FA971]" />
                <span>{t('Doing well')}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {activeKid.subj
                  .filter((s) => s.score >= 75)
                  .map((s) => (
                    <div key={s.name} className="flex justify-between items-center">
                      <span className="text-[#13213D] font-medium">{s.name}</span>
                      <b className="text-[#1FA971]">{s.score}%</b>
                    </div>
                  ))}
              </div>
            </div>

            {/* Needs Support */}
            <div className="bg-amber-50/70 p-4 rounded-3xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-[#F5A623]" />
                <span>{t('Needs support')}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {activeKid.subj
                  .filter((s) => s.score < 75)
                  .map((s) => (
                    <div key={s.name} className="flex justify-between items-center">
                      <span className="text-[#13213D] font-medium">{s.name}</span>
                      <b className="text-amber-800">{s.score}%</b>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Quick Timetable action */}
          <div
            onClick={openTimetable}
            className="bg-white p-4 rounded-3xl shadow-card border border-[#E5E8EF] flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#F5A623] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <b className="text-xs font-bold text-[#13213D] block">{t('Weekly Class Timetable')}</b>
                <span className="text-[11px] text-[#6B7385]">
                  {t('Full period schedule with room numbers & teachers')}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      )}

      {/* SUBJECTS TAB */}
      {subTab === 'subjects' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          {activeKid.subj.map((subj) => (
            <div
              key={subj.name}
              onClick={() => openSubjectDetail(subj)}
              className="bg-white p-4 rounded-3xl shadow-card border border-[#E5E8EF] flex items-center justify-between cursor-pointer hover:border-slate-300 active:scale-98 transition-all"
            >
              <div>
                <b className="text-sm font-extrabold text-[#13213D] block">
                  {subj.name}
                </b>
                <span className="text-xs text-[#6B7385]">
                  {t('Teacher')}: {subj.teacher}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-base font-black ${
                    subj.score >= 75
                      ? 'text-[#1FA971]'
                      : subj.score >= 60
                      ? 'text-[#F5A623]'
                      : 'text-[#E5484D]'
                  }`}
                >
                  {subj.score}%
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REPORT CARDS TAB */}
      {subTab === 'reports' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {[
            { term: 'Term 3 2026', status: 'Published', avg: activeKid.avg, rank: activeKid.rank },
            { term: 'Term 2 2026', status: 'Published', avg: activeKid.prev, rank: '7 of 48' },
            { term: 'Term 1 2026', status: 'Published', avg: activeKid.trend[0], rank: '8 of 48' },
          ].map((rc, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-sm font-extrabold text-[#13213D] block">
                    {rc.term} {t('Official Bulletin')}
                  </b>
                  <span className="text-xs text-[#6B7385]">
                    Umucyo Secondary School · Academic Council
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10.5px] font-extrabold rounded-full">
                    {t(rc.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E8EF] text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[#6B7385]">{t('Average:')}</span>
                  <b className="text-[#13213D] text-sm block">{rc.avg}%</b>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[#6B7385]">{t('Position:')}</span>
                  <b className="text-[#13213D] text-sm block">{t('Rank')} {rc.rank}</b>
                </div>
              </div>

              <button
                onClick={() => handleDownloadReportPdf(rc.term)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#13213D] text-xs font-extrabold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#F5A623]" />
                {t('Download Report Card (PDF)')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {subTab === 'attendance' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-sm font-extrabold text-[#13213D] block">
                  {t('October 2026 Attendance')}
                </b>
                <span className="text-xs text-[#6B7385]">
                  {t('Term Attendance Rate:')} <b className="text-[#1FA971]">{activeKid.att}%</b>
                </span>
              </div>
              <button
                onClick={openReportAbsence}
                className="px-3 py-1.5 rounded-xl bg-[#F5A623] text-[#13213D] text-xs font-bold hover:bg-amber-400 shadow-sm"
              >
                {t('+ Report Absence')}
              </button>
            </div>

            {/* Attendance Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-[#6B7385] pb-1">
                  {d}
                </span>
              ))}

              {activeKid.attendanceMonth?.map((item) => {
                const isPresent = item.status === 'P';
                const isLate = item.status === 'L';
                const isAbsent = item.status === 'A';
                const isExcused = item.status === 'E';

                return (
                  <div
                    key={item.day}
                    onClick={() =>
                      openSheet(
                        <AttendanceDaySheet day={item.day} status={item.status} child={activeKid} />,
                        t('Daily Attendance Punch')
                      )
                    }
                    title={item.dateStr || (isPresent ? t('Present') : t('Absent'))}
                    className={`h-9 rounded-xl flex flex-col items-center justify-center font-bold text-[11px] border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${
                      isPresent
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isLate
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : isAbsent
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    <span>{item.day}</span>
                    <span className="text-[7.5px] uppercase leading-none font-extrabold">
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-around text-[10px] text-[#6B7385] font-semibold pt-2 border-t border-[#E5E8EF]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1FA971]" /> P ({t('Present')})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#F5A623]" /> L ({t('Late')})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E5484D]" /> A ({t('Absent')})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3E7BFA]" /> E ({t('Excused')})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DISCIPLINE TAB */}
      {subTab === 'discipline' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <DisciplinePanel child={activeKid} />
        </div>
      )}

      {/* HOMEWORK TAB */}
      {subTab === 'homework' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {activeKid.hw.map((hw) => (
            <div
              key={hw.id}
              className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-2.5 text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <small className="text-[10px] uppercase font-bold text-[#F5A623] tracking-wide block">
                    {hw.subject}
                  </small>
                  <b className="text-sm font-extrabold text-[#13213D] block mt-0.5">
                    {hw.title}
                  </b>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                    hw.status === 'submitted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {hw.status === 'submitted' ? `${t('Submitted')} ✓` : hw.dueText}
                </span>
              </div>

              {hw.instructions && (
                <p className="text-[#6B7385] text-xs bg-slate-50 p-3 rounded-xl border border-[#E5E8EF]">
                  {hw.instructions}
                </p>
              )}

              {hw.score && (
                <div className="flex justify-between items-center pt-2 border-t border-[#E5E8EF] text-xs">
                  <span className="text-[#6B7385]">{t('Graded Score:')}</span>
                  <b className="text-[#1FA971] text-sm">{hw.score}</b>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
