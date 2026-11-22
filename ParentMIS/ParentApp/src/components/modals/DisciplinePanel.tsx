import React, { useState } from 'react';
import { Child, DisciplineRecord } from '../../types';
import {
  Award,
  ThumbsUp,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  FileCheck2,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DisciplinePanel: React.FC<{ child: Child }> = ({ child }) => {
  const { discipline, t } = useApp();
  const [filter, setFilter] = useState<'all' | 'merits' | 'notes' | 'leaves'>('all');

  const disc = discipline || {
    score: child.conduct || 100,
    records: child.disciplineRecords || [],
  };
  const score = disc.score ?? child.conduct ?? 100;
  const rawRecords: DisciplineRecord[] =
    (disc.records && disc.records.length > 0 ? disc.records : child.disciplineRecords) || [];

  const merits = rawRecords.filter((r) => r.points > 0 || r.type === 'MERIT');
  const notes = rawRecords.filter((r) => r.points < 0 || r.type !== 'MERIT');
  const leaves = child.permissions || [];

  const meritPoints = merits.reduce((s, r) => s + Math.max(0, r.points), 0);
  const deductionPoints = Math.abs(notes.reduce((s, r) => s + Math.min(0, r.points), 0));

  const getConductRating = (s: number) => {
    if (s >= 90) return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (s >= 75) return { color: 'bg-sky-100 text-sky-800 border-sky-200' };
    if (s >= 60) return { color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { color: 'bg-rose-100 text-rose-800 border-rose-200' };
  };

  const rating = getConductRating(score);

  const displayedRecords =
    filter === 'merits'
      ? merits
      : filter === 'notes'
      ? notes
      : rawRecords;

  return (
    <div className="space-y-4 pb-4">
      {/* Conduct Score Overview Card */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E5E8EF] text-center relative overflow-hidden">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-[#F5A623] mb-2 border-2 border-amber-200 shadow-sm">
          <Award className="w-8 h-8" />
        </div>
        <div className="text-3xl font-black text-[#13213D] leading-none">
          {score} <span className="text-base text-[#6B7385] font-bold">/ 100</span>
        </div>
        <div className="mt-2 flex justify-center">
          <span className={`inline-block px-3 py-1 text-xs font-extrabold rounded-full border ${rating.color}`}>
            {score >= 90
              ? t('Exemplary conduct')
              : score >= 75
              ? t('Good standing')
              : score >= 60
              ? t('Fair conduct')
              : t('Requires disciplinary attention')}
          </span>
        </div>
        <p className="text-xs text-[#6B7385] mt-2.5 max-w-xs mx-auto">
          {t('Monitored live by class teacher {{teacher}} and the school disciplinary board.', { teacher: child.ct })}
        </p>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#E5E8EF]">
          <div className="bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-100 text-center">
            <small className="text-[10px] uppercase font-bold text-emerald-800 block">{t('Merits')}</small>
            <b className="text-base font-extrabold text-emerald-700">+{meritPoints} pts</b>
            <span className="text-[9.5px] text-emerald-600 font-semibold block">{merits.length} {t('events')}</span>
          </div>
          <div className="bg-rose-50/70 p-2.5 rounded-2xl border border-rose-100 text-center">
            <small className="text-[10px] uppercase font-bold text-rose-800 block">{t('Demerits')}</small>
            <b className="text-base font-extrabold text-rose-700">-{deductionPoints} pts</b>
            <span className="text-[9.5px] text-rose-600 font-semibold block">{notes.length} {t('notes')}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
            <small className="text-[10px] uppercase font-bold text-slate-700 block">{t('Gate Passes')}</small>
            <b className="text-base font-extrabold text-[#13213D]">{leaves.length}</b>
            <span className="text-[9.5px] text-slate-500 font-semibold block">{t('All returned')}</span>
          </div>
        </div>
      </div>

      {/* Filter Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: `${t('All')} (${rawRecords.length})` },
          { id: 'merits', label: `${t('Merits')} (${merits.length})` },
          { id: 'notes', label: `${t('Conduct Notes')} (${notes.length})` },
          { id: 'leaves', label: `${t('Gate Passes')} (${leaves.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex-1 text-center whitespace-nowrap ${
              filter === tab.id
                ? 'bg-white text-[#13213D] shadow-sm'
                : 'text-[#6B7385] hover:text-[#13213D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Records Listing */}
      {filter === 'leaves' ? (
        <div className="space-y-2.5">
          {leaves.length > 0 ? (
            leaves.map((l) => (
              <div
                key={l.id}
                className="bg-white p-3.5 rounded-2xl border border-[#E5E8EF] shadow-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#13213D]">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>{l.type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md">
                    {t(l.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium">{l.reason}</p>
                <div className="text-[11px] text-[#6B7385] space-y-0.5 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>{t('Destination:')}</span>
                    <b className="text-slate-800">{l.destination}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Departure:')}</span>
                    <span>{new Date(l.departureDate).toLocaleDateString()}</span>
                  </div>
                  {l.actualReturnDate && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>{t('Returned On:')}</span>
                      <span>{new Date(l.actualReturnDate).toLocaleDateString()} · {t('On time')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-[#E5E8EF] text-center text-xs text-[#6B7385]">
              {t('No gate passes or leaves recorded this term.')}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedRecords.length > 0 ? (
            displayedRecords.map((r, idx) => {
              const isMerit = r.points > 0 || r.type === 'MERIT';
              return (
                <div
                  key={r.id || idx}
                  className={`p-3.5 rounded-2xl border shadow-card transition-all ${
                    isMerit
                      ? 'bg-white border-emerald-200/80 hover:border-emerald-300'
                      : 'bg-white border-rose-200/80 hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isMerit
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isMerit ? <ThumbsUp className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <b className="text-xs font-extrabold text-[#13213D]">
                            {isMerit ? t('Positive Merit') : t('Conduct Note')}
                          </b>
                          {r.category && (
                            <span className="px-2 py-0.5 text-[9.5px] font-bold bg-slate-100 text-slate-700 rounded-md">
                              {r.category}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#6B7385]">
                          {r.date ? new Date(r.date).toLocaleDateString() : t('This Term')}
                          {r.recordedBy ? ` · ${t('By')} ${r.recordedBy}` : ''}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-black rounded-lg shrink-0 ${
                        isMerit
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.points > 0 ? `+${r.points}` : r.points} pts
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-700 mt-2 font-medium leading-relaxed">
                    {r.description}
                  </p>

                  {/* Sanction or Commendation note if present */}
                  {r.sanction && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] flex items-center gap-1.5 text-slate-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <b>{t('Action / Note:')}</b> {r.sanction}
                      </span>
                    </div>
                  )}

                  {/* Status footer */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#6B7385]">
                    <span>{t('Status:')} <b className="text-slate-800 uppercase">{t(r.status || 'RECORDED')}</b></span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> {t('Transmitted to Parent')}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-[#E5E8EF] text-center text-xs text-[#6B7385]">
              {t('No disciplinary records matching this filter.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
