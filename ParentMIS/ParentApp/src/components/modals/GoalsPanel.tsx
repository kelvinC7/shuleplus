import React from 'react';
import { useApp } from '../../context/AppContext';
import { SavingsGoal } from '../../types';
import { NewGoalSheet } from './NewGoalSheet';
import { ScoreRing } from '../common/ScoreRing';
import {
  ShieldCheck,
  Plus,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  Compass,
  Sparkles,
} from 'lucide-react';

export const GoalsPanel: React.FC = () => {
  const { goals, openSheet, topUpGoal, toggleGoalAutoSave, t } = useApp();

  const handleOpenNewGoal = () => {
    openSheet(<NewGoalSheet />, t('Create a Savings Goal'));
  };

  const totalSaved = goals.reduce((acc, g) => acc + g.saved, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.target, 0);

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-[#13213D] via-[#1B2D52] to-[#24396A] text-white p-5 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5A623] block">
              {t('SAVINGS & FUTURE GOALS')}
            </span>
            <b className="text-xl font-extrabold text-white block mt-0.5">
              RWF {totalSaved.toLocaleString()}
            </b>
            <span className="text-xs text-[#9FB0D3]">
              {t('Target: {{amount}} across {{count}} goals', { amount: `RWF ${totalTarget.toLocaleString()}`, count: goals.length })}
            </span>
          </div>

          <button
            onClick={handleOpenNewGoal}
            className="w-10 h-10 rounded-2xl bg-[#F5A623] text-[#13213D] flex items-center justify-center font-extrabold shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        <div className="pt-2 border-t border-white/10 text-[11px] text-white/70 flex items-center justify-between">
          <span>{t('Funds stay safe in your yoShule parent wallet')}</span>
          <span className="text-[#F5A623] font-bold">{t('Zero fees')}</span>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <b className="text-xs font-extrabold text-[#13213D]">{t('Active Goals')}</b>
          <button
            onClick={handleOpenNewGoal}
            className="text-[11px] text-[#F5A623] font-bold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {t('New Goal')}
          </button>
        </div>

        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          return (
            <div
              key={g.id}
              className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F5A623] block">
                    {t(({ trip: 'School Trip', gear: 'Books & Gear', education: 'ICT & Science', general: 'General Fund' } as const)[g.category])} {t('GOAL')}
                  </span>
                  <b className="text-sm font-extrabold text-[#13213D] block mt-0.5">
                    {g.name}
                  </b>
                  <span className="text-xs text-[#6B7385]">
                    {t('Target date:')} {g.deadline}
                  </span>
                </div>
                <ScoreRing score={pct} size={54} strokeWidth={5} label="%" />
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-[#13213D]">RWF {g.saved.toLocaleString()}</span>
                  <span className="text-[#6B7385]">RWF {g.target.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F5A623] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Weekly info and auto-save */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-[#E5E8EF] flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[#6B7385] block">{t('Weekly contribution:')}</span>
                  <b className="text-[#13213D]">RWF {g.weekly.toLocaleString()} / {t('week')}</b>
                </div>

                <button
                  onClick={() => toggleGoalAutoSave(g.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                    g.auto
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {g.auto ? (
                    <>
                      <Play className="w-3 h-3 fill-emerald-800" />
                      {t('Auto-save On')}
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 fill-slate-700" />
                      {t('Auto-save Paused')}
                    </>
                  )}
                </button>
              </div>

              {/* Add funds action */}
              <button
                onClick={() => topUpGoal(g.id, g.weekly)}
                className="w-full py-3 bg-[#13213D] hover:bg-slate-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4 text-[#F5A623]" />
                {t('Add {{amount}} Now', { amount: `RWF ${g.weekly.toLocaleString()}` })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
