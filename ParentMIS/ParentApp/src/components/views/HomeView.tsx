import React from 'react';
import { useApp } from '../../context/AppContext';
import { ScoreRing } from '../common/ScoreRing';
import { Avatar } from '../common/Avatar';
import { TimetablePanel } from '../modals/TimetablePanel';
import { ReportAbsenceSheet } from '../modals/ReportAbsenceSheet';
import { DisciplinePanel } from '../modals/DisciplinePanel';
import { TripConsentSheet } from '../modals/TripConsentSheet';
import { UniformOrderSheet } from '../modals/UniformOrderSheet';
import { TripsPanel } from '../modals/TripsPanel';
import { GoalsPanel } from '../modals/GoalsPanel';
import { OrdersPanel } from '../modals/OrdersPanel';
import {
  Calendar,
  Award,
  Wallet,
  ShieldCheck,
  Clock,
  ArrowRight,
  BookOpen,
  ShoppingBag,
  Package,
  Bell,
  Compass,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    activeKid,
    setActiveTab,
    pushPanel,
    openSheet,
    trips,
    goals,
    discipline,
    t,
  } = useApp();

  const conductScore = discipline?.score ?? activeKid.conduct ?? 100;

  const openTodaySchedule = () => {
    pushPanel({
      title: `${activeKid.n} · ${activeKid.cls}`,
      subtitle: t('Today at School'),
      content: <TimetablePanel child={activeKid} />,
    });
  };

  const openReportAbsence = () => {
    openSheet(<ReportAbsenceSheet />, t('Report an absence'));
  };

  const openDisciplineModal = () => {
    pushPanel({
      title: `${activeKid.n} · ${t('Conduct')}`,
      subtitle: t('Discipline & Conduct'),
      content: <DisciplinePanel child={activeKid} />,
    });
  };

  const primaryTrip = trips.find((tr) => tr.kid === activeKid.id) || trips[0];
  const primaryGoal = goals.find((g) => g.kid === activeKid.id) || goals[0];

  return (
    <div className="space-y-4 px-4 -mt-12 relative z-20 pb-24">
      {/* Overall Score Card */}
      <div
        onClick={() => setActiveTab('learn')}
        className="bg-white rounded-3xl p-5 shadow-card flex items-center gap-4 border border-[#E5E8EF] cursor-pointer hover:border-slate-300 transition-all"
      >
        <ScoreRing score={activeKid.avg} label="INDEX" size={82} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-extrabold text-[#13213D] tracking-tight flex items-center justify-between">
            <span>{t('Learning Progress')}</span>
            <span className="text-[10px] font-bold text-[#F5A623] flex items-center gap-0.5">
              {t('Marks')} <ArrowRight className="w-3 h-3" />
            </span>
          </h4>
          <p className="text-xs text-[#6B7385] leading-relaxed mt-1">
            {t('Strong in Humanities & Languages. Math requires continued focus.')}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10.5px] font-bold rounded-md border border-emerald-200">
              {t('Rank')} {activeKid.rank}
            </span>
            <span className="text-[10px] text-[#6B7385] font-semibold">
              Term 3 2026
            </span>
          </div>
        </div>
      </div>

      {/* 4 KPIs Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Attendance KPI */}
        <div
          onClick={openReportAbsence}
          className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] cursor-pointer hover:border-slate-300 active:scale-97 transition-all"
        >
          <div className="flex items-center justify-between text-[#6B7385] mb-2">
            <span className="text-xs font-bold">{t('Attendance')}</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <b className="text-xl font-extrabold text-[#13213D] block">
            {activeKid.att}%
          </b>
          <span className="text-[10.5px] font-bold text-[#1FA971] flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1FA971]" />
            {t('Present today')}
          </span>
        </div>

        {/* Marks KPI */}
        <div
          onClick={() => setActiveTab('learn')}
          className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] cursor-pointer hover:border-slate-300 active:scale-97 transition-all"
        >
          <div className="flex items-center justify-between text-[#6B7385] mb-2">
            <span className="text-xs font-bold">{t('Marks average')}</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <b className="text-xl font-extrabold text-[#13213D] block">
            {activeKid.avg}%
          </b>
          <span className="text-[10.5px] font-bold text-amber-700 mt-1 block">
            {t('Up from')} {activeKid.prev}% {t('last term')}
          </span>
        </div>

        {/* Pocket Money KPI */}
        <div
          onClick={() => setActiveTab('wallet')}
          className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] cursor-pointer hover:border-slate-300 active:scale-97 transition-all"
        >
          <div className="flex items-center justify-between text-[#6B7385] mb-2">
            <span className="text-xs font-bold">{t('Pocket money')}</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <b className="text-xl font-extrabold text-[#13213D] block">
            RWF {activeKid.card.toLocaleString()}
          </b>
          <span className="text-[10.5px] font-semibold text-[#6B7385] mt-1 block">
            {t('Limit')}: RWF {activeKid.limits?.daily.toLocaleString()}{t('/day')}
          </span>
        </div>

        {/* Conduct KPI */}
        <div
          onClick={openDisciplineModal}
          className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] cursor-pointer hover:border-slate-300 active:scale-97 transition-all"
        >
          <div className="flex items-center justify-between text-[#6B7385] mb-2">
            <span className="text-xs font-bold">{t('Conduct')}</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <b className="text-xl font-extrabold text-[#13213D] block">
            {conductScore}/100
          </b>
          <span className="text-[10.5px] font-bold text-[#1FA971] mt-1 block">
            {conductScore >= 90 ? t('Exemplary conduct') : conductScore >= 75 ? t('Good standing') : t('Conduct notes')} · {t('View log')}
          </span>
        </div>
      </div>

      {/* Today At School Card */}
      <div
        onClick={openTodaySchedule}
        className="bg-white rounded-3xl p-5 shadow-card border border-[#E5E8EF] cursor-pointer hover:border-slate-300 transition-all space-y-3"
      >
        <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F5A623]" />
            <b className="text-xs font-extrabold text-[#13213D]">{t('Today at School')}</b>
          </div>
          <span className="text-[11px] text-[#F5A623] font-bold flex items-center gap-1">
            {t('Full timetable')} <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <span className="px-2 py-0.5 bg-slate-100 text-[#13213D] text-[10px] font-extrabold rounded-md">
              {activeKid.today.period} · {activeKid.today.time}
            </span>
            <h4 className="text-sm font-extrabold text-[#13213D] mt-1.5">
              {activeKid.today.what}
            </h4>
            <p className="text-xs text-[#6B7385] mt-0.5">
              {t('Teacher')}: {activeKid.today.with} · {activeKid.today.where}
            </p>
          </div>
        </div>
      </div>

      {/* Homework Due Soon */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E5E8EF] space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#F5A623]" />
            <b className="text-xs font-extrabold text-[#13213D]">{t('Homework')} {t('Due Soon')}</b>
          </div>
          <span
            onClick={() => setActiveTab('learn')}
            className="text-[11px] text-[#F5A623] font-bold cursor-pointer hover:underline"
          >
            {t('See all')}
          </span>
        </div>

        <div className="space-y-2">
          {activeKid.hw.map((hw) => (
            <div
              key={hw.id}
              className="p-3 bg-slate-50 rounded-2xl border border-[#E5E8EF] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E8EF] flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#F5A623] leading-none uppercase">
                    {hw.month}
                  </span>
                  <b className="text-[14px] font-extrabold text-[#13213D] leading-tight">
                    {hw.day}
                  </b>
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-[#6B7385] block">
                    {hw.subject}
                  </small>
                  <b className="text-xs text-[#13213D] font-bold block truncate max-w-[180px]">
                    {hw.title}
                  </b>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                  hw.status === 'submitted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {hw.dueText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trips & Savings Goals Preview */}
      {primaryTrip && (
        <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E5E8EF] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
            <div
              onClick={() =>
                pushPanel({
                  title: t('School trips'),
                  subtitle: t('Field Studies, Consent & Live Follow'),
                  content: <TripsPanel initialTripId={primaryTrip.id} />,
                })
              }
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
            >
              <Compass className="w-4 h-4 text-[#F5A623]" />
              <b className="text-xs font-extrabold text-[#13213D]">{t('School trips & Goals')}</b>
            </div>
            <span
              onClick={() =>
                pushPanel({
                  title: t('School trips'),
                  subtitle: t('Trip Details & Follow'),
                  content: <TripsPanel initialTripId={primaryTrip.id} />,
                })
              }
              className="text-[11px] text-[#F5A623] font-bold cursor-pointer hover:underline"
            >
              {t('See all')}
            </span>
          </div>

          <div
            onClick={() =>
              pushPanel({
                title: t('School trips'),
                subtitle: t('Trip Details & Follow'),
                content: <TripsPanel initialTripId={primaryTrip.id} />,
              })
            }
            className="bg-slate-50 p-3.5 rounded-2xl border border-[#E5E8EF] text-xs cursor-pointer hover:border-slate-300 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <b className="text-xs text-[#13213D] block font-bold">{primaryTrip.title}</b>
                <span className="text-[11px] text-[#6B7385] block mt-0.5">{primaryTrip.date}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  primaryTrip.consented
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {primaryTrip.consented ? t('Consent Given') : t('Consent Pending')}
              </span>
            </div>

            {primaryGoal && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  pushPanel({
                    title: t('Savings goals'),
                    subtitle: t('Save for Trips & School Gear'),
                    content: <GoalsPanel />,
                  });
                }}
                className="mt-3 pt-3 border-t border-[#E5E8EF] cursor-pointer hover:opacity-90"
              >
                <div className="flex justify-between text-[11px] mb-1 font-semibold">
                  <span className="text-[#13213D]">{t('Savings Goal')}: {primaryGoal.name}</span>
                  <span className="text-[#F5A623] font-bold">
                    RWF {primaryGoal.saved.toLocaleString()} / {primaryGoal.target.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F5A623] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (primaryGoal.saved / primaryGoal.target) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uniform & Shoes Store Shortcut */}
      <div
        onClick={() =>
          openSheet(
            <div className="space-y-3 text-xs">
              <b className="text-sm font-extrabold text-[#13213D] block">
                {t('Official School Uniform & Shoes')}
              </b>
              <p className="text-xs text-[#6B7385] leading-relaxed">
                {t('Order tailored uniform sets and leather shoes or manage placed orders.')}
              </p>
              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                  onClick={() => openSheet(<UniformOrderSheet />, 'Order Uniforms and Shoes')}
                  className="p-3.5 rounded-2xl bg-[#13213D] text-white font-extrabold flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-[#F5A623]" />
                    <span>{t('Order New Uniform / Shoes')}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60" />
                </button>
                <button
                  onClick={() => {
                    pushPanel({
                      title: t('Uniforms and shoes'),
                      subtitle: t('My Orders & Size Exchanges'),
                      content: <OrdersPanel />,
                    });
                  }}
                  className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#13213D] font-extrabold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-[#F5A623]" />
                    <span>{t('View Orders & Request Size Exchanges')}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>,
            t('Uniforms and shoes')
          )
        }
        className="bg-gradient-to-r from-[#13213D] to-[#24396A] text-white p-5 rounded-3xl shadow-lg flex items-center justify-between cursor-pointer active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <b className="text-sm font-extrabold text-white block">{t('Official School Uniform & Shoes')}</b>
            <span className="text-xs text-[#9FB0D3]">{t('Order official sets, choose size & track delivery')}</span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-white/70" />
      </div>
    </div>
  );
};
