import React from 'react';
import { useApp } from '../../context/AppContext';
import { Child } from '../../types';
import { ReportAbsenceSheet } from './ReportAbsenceSheet';
import { Clock, ShieldCheck, AlertCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface AttendanceDaySheetProps {
  day: number;
  status: 'P' | 'A' | 'L' | 'E';
  child: Child;
}

export const AttendanceDaySheet: React.FC<AttendanceDaySheetProps> = ({ day, status, child }) => {
  const { closeSheet, openSheet, t } = useApp();

  const getStatusDetails = () => {
    switch (status) {
      case 'P':
        return {
          label: 'Present',
          gateIn: '07:14 AM',
          gateOut: child.bus ? '05:05 PM (Bus Route #3)' : '05:15 PM (Boarding hall)',
          notes: 'Full day attendance recorded at biometric gate.',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          iconColor: 'text-[#1FA971]',
        };
      case 'L':
        return {
          label: 'Late Arrival',
          gateIn: '07:44 AM (14 mins after bell)',
          gateOut: '05:10 PM',
          notes: 'Late gate slip issued by duty prefect.',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
          iconColor: 'text-[#F5A623]',
        };
      case 'A':
        return {
          label: 'Unexcused Absence',
          gateIn: 'No gate check-in recorded',
          gateOut: '—',
          notes: 'Automated SMS alert dispatched to parent phone at 08:05 AM.',
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          iconColor: 'text-[#E5484D]',
        };
      case 'E':
        return {
          label: 'Excused Absence',
          gateIn: 'Excused',
          gateOut: '—',
          notes: 'Medical or official leave registered by school clinic / office.',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: FileText,
          iconColor: 'text-[#3E7BFA]',
        };
    }
  };

  const details = getStatusDetails();
  const Icon = details.icon;

  const handleExplainAbsence = () => {
    closeSheet();
    setTimeout(() => {
      openSheet(<ReportAbsenceSheet initialDate={`2026-10-${day < 10 ? '0' + day : day}`} />, t('Report an absence'));
    }, 150);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-[#E5E8EF] flex items-center justify-center mx-auto shadow-sm">
          <Icon className={`w-6 h-6 ${details.iconColor}`} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#13213D]">
            {t('{{day}} October 2026', { day })}
          </h3>
          <span className="text-[11px] text-[#6B7385] font-semibold">
            {child.n} · {child.cls}
          </span>
        </div>
        <div className="pt-1">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${details.badgeClass}`}>
            {t(details.label)}
          </span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
        <b className="text-xs font-extrabold text-[#13213D] block">{t('Gate Punch Timestamps')}</b>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[#6B7385]">{t('Morning Arrival:')}</span>
            <b className="text-[#13213D] font-bold">{t(details.gateIn)}</b>
          </div>
          <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[#6B7385]">{t('Evening Departure:')}</span>
            <b className="text-[#13213D] font-bold">{t(details.gateOut)}</b>
          </div>
        </div>
        <p className="text-[11px] text-[#6B7385] leading-relaxed pt-1">
          {t(details.notes)}
        </p>
      </div>

      {status === 'A' ? (
        <div className="space-y-2 pt-2">
          <button
            onClick={handleExplainAbsence}
            className="w-full py-3.5 rounded-2xl bg-[#F5A623] hover:bg-amber-400 text-[#13213D] text-xs font-extrabold shadow-md active:scale-98 transition-all"
          >
            {t('Explain This Absence')}
          </button>
          <button
            onClick={closeSheet}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-[#6B7385] text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            {t('Dismiss')}
          </button>
        </div>
      ) : (
        <button
          onClick={closeSheet}
          className="w-full py-3.5 rounded-2xl bg-[#13213D] hover:bg-slate-900 text-white text-xs font-bold shadow-md active:scale-98 transition-all"
        >
          {t('Close')}
        </button>
      )}
    </div>
  );
};
