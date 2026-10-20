'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { StatCard } from './stat-card';

export type AttendancePeriod = 'today' | 'month';

const GOLD = '#FCB038';

interface AttendanceRateStatCardProps {
  todayRate: number;
  monthRate: number;
  defaultPeriod?: AttendancePeriod;
}

export function AttendanceRateStatCard({
  todayRate,
  monthRate,
  defaultPeriod = 'today',
}: AttendanceRateStatCardProps) {
  const [period, setPeriod] = useState<AttendancePeriod>(defaultPeriod);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState<AttendancePeriod>(defaultPeriod);
  const dialogRef = useRef<HTMLDivElement>(null);

  const value = period === 'today' ? `${todayRate}%` : `${monthRate}%`;
  const delta =
    period === 'today' ? 'Staff present today' : 'Average attendance this month';

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  function openModal() {
    setDraftPeriod(period);
    setModalOpen(true);
  }

  function applyPeriod() {
    setPeriod(draftPeriod);
    setModalOpen(false);
  }

  return (
    <div className="relative">
      <StatCard
        filterable={false}
        label="Attendance Rate"
        value={value}
        delta={delta}
        showTrend={false}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        }
      />

      <button
        type="button"
        onClick={openModal}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCB038]/50"
        aria-label="Change attendance period"
      />

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-navy/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-period-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 id="attendance-period-title" className="text-base font-bold text-navy">
                  Attendance period
                </h3>
                <p className="mt-0.5 text-xs text-muted">Choose how attendance rate is calculated</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-5">
              {(
                [
                  {
                    id: 'today' as const,
                    title: 'Today',
                    description: 'Present staff compared to scheduled today',
                    rate: todayRate,
                  },
                  {
                    id: 'month' as const,
                    title: 'This Month',
                    description: 'Average daily attendance for the current month',
                    rate: monthRate,
                  },
                ] as const
              ).map((option) => {
                const selected = draftPeriod === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraftPeriod(option.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-[#FCB038] bg-[#FCB038]/10 ring-2 ring-[#FCB038]/25'
                        : 'border-border bg-slate-50 hover:border-[#FCB038]/40'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-navy">{option.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{option.description}</p>
                    </div>
                    <span className="text-lg font-extrabold text-navy">{option.rate}%</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-slate-50/80 px-5 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPeriod}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-navy transition hover:brightness-105"
                style={{ backgroundColor: GOLD }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
