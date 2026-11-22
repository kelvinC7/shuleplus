import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Target, PiggyBank, Calendar } from 'lucide-react';

export const NewGoalSheet: React.FC = () => {
  const { activeKid, createGoal, closeSheet, t } = useApp();

  const [name, setName] = useState('');
  const [target, setTarget] = useState(30000);
  const [category, setCategory] = useState<'trip' | 'gear' | 'education' | 'general'>('trip');
  const [deadline, setDeadline] = useState('2026-12-15');

  const categories = [
    { id: 'trip', label: 'School Trip' },
    { id: 'gear', label: 'Books & Gear' },
    { id: 'education', label: 'ICT & Science' },
    { id: 'general', label: 'General Fund' },
  ];

  // Calculate approximate weekly savings needed based on weeks remaining
  const weeksRemaining = Math.max(
    1,
    Math.round(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)
    )
  );
  const weeklyTarget = Math.round(target / weeksRemaining / 500) * 500;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGoal({
      id: 'goal-' + Date.now(),
      kid: activeKid.id,
      name,
      target,
      saved: 0,
      weekly: weeklyTarget,
      category,
      deadline,
    });
    closeSheet();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs text-[#6B7385] leading-relaxed">
          {t('Set up a disciplined weekly savings goal for {{name}}.', { name: activeKid.first })}
        </p>
      </div>

      {/* Goal Category */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Category')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => {
            const isSelected = category === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategory(c.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-[#13213D] text-white border-[#13213D] shadow-sm'
                    : 'bg-white text-slate-700 border-[#E5E8EF] hover:border-slate-300'
                }`}
              >
                {t(c.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal Title */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Goal Title')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('e.g. Nyungwe Forest Trip, Laptop Fund...')}
          required
          className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-semibold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
        />
      </div>

      {/* Target Amount */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Target Amount (RWF)')}
        </label>
        <div className="relative">
          <input
            type="number"
            step={1000}
            min={5000}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            required
            className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-bold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
          />
          <Target className="w-4 h-4 text-[#6B7385] absolute right-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Deadline Date */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Target Deadline')}
        </label>
        <div className="relative">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-semibold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
          />
          <Calendar className="w-4 h-4 text-[#6B7385] absolute right-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Weekly Savings Estimate Card */}
      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PiggyBank className="w-5 h-5 text-[#F5A623]" />
          <div>
            <span className="text-xs font-bold text-amber-950 block">{t('Suggested Weekly Target')}</span>
            <small className="text-[10px] text-amber-800 font-medium">{t('Over {{count}} weeks', { count: weeksRemaining })}</small>
          </div>
        </div>
        <b className="text-sm font-extrabold text-[#13213D]">
          RWF {weeklyTarget.toLocaleString()}/{t('wk')}
        </b>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={closeSheet}
          className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors"
        >
          {t('Cancel')}
        </button>
        <button
          type="submit"
          className="flex-2 py-3 px-5 rounded-xl bg-[#F5A623] text-[#13213D] text-xs font-extrabold hover:bg-amber-400 active:scale-95 transition-all shadow-md"
        >
          {t('Start saving')}
        </button>
      </div>
    </form>
  );
};
