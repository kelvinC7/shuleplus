import React from 'react';
import { Child } from '../../types';
import { HeartPulse, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HealthPanel: React.FC<{ child: Child }> = ({ child }) => {
  const { t } = useApp();
  return (
    <div className="space-y-4">
      {/* Vitals & Summary Card */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E5E8EF]">
        <div className="flex items-center gap-2 mb-3">
          <HeartPulse className="w-5 h-5 text-[#E5484D]" />
          <h3 className="text-sm font-extrabold text-[#13213D]">
            {t('School Health & Clinic Record')}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-[#6B7385] block">{t('Blood Group')}</span>
            <b className="text-sm text-[#13213D] font-extrabold">O+ Positive</b>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-[#6B7385] block">{t('Vaccinations')}</span>
            <b className="text-sm text-[#1FA971] font-extrabold">{t('Up to date')}</b>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-[#6B7385] block">{t('Fitness')}</span>
            <b className="text-sm text-[#13213D] font-extrabold">{t('PE cleared')}</b>
          </div>
        </div>
      </div>

      {/* Allergies & Precautions */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF]">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#13213D]">
          <AlertTriangle className="w-4 h-4 text-[#F5A623]" />
          <span>{t('Known Allergies & Conditions')}</span>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
          <b>Mild Seasonal Dust Allergy:</b> Student keeps an antihistamine inhaler in the dormitory. Cleared for all outdoor athletics.
        </div>
      </div>

      {/* Clinic Visit Log */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E5E8EF] space-y-3">
        <h4 className="text-xs font-bold text-[#13213D] flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#1FA971]" /> {t('Clinic Visits This Term')}
        </h4>
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E8EF]">
            <div className="flex justify-between font-bold text-[#13213D]">
              <span>Routine Dental & Vision Screening</span>
              <span className="text-[#6B7385] font-normal">14 Oct 2026</span>
            </div>
            <p className="text-[11px] text-[#6B7385] mt-1">
              Screening normal. 20/20 vision in both eyes. Attended by Nurse Diane.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E8EF]">
            <div className="flex justify-between font-bold text-[#13213D]">
              <span>Headache & Rest</span>
              <span className="text-[#6B7385] font-normal">28 Sep 2026</span>
            </div>
            <p className="text-[11px] text-[#6B7385] mt-1">
              Administered paracetamol, rested for 1 hour at the clinic, resumed classes after lunch.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1FA971] flex-shrink-0" />
        <span>{t('In case of emergency, school medical team immediately notifies registered guardian numbers.')}</span>
      </div>
    </div>
  );
};
