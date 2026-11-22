import React, { useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportAbsenceSheet: React.FC<{ initialDate?: string }> = ({ initialDate }) => {
  const { activeKid, closeSheet, reportAbsenceAction, t } = useApp();

  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('Sick');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    { id: 'Sick', label: 'Sick' },
    { id: 'Medical appointment', label: 'Medical appointment' },
    { id: 'Family', label: 'Family emergency' },
    { id: 'Other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await reportAbsenceAction(date, reason, notes);
    setSubmitting(false);
    closeSheet();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs text-[#6B7385] mb-2 leading-relaxed">
          {t('The class teacher ({{teacher}}) and school staff are notified immediately.', { teacher: activeKid.ct })}
        </p>
      </div>

      {/* Date picker */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Date of Absence')}
        </label>
        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-semibold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
            required
          />
          <Calendar className="w-4 h-4 text-[#6B7385] absolute right-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Reason selector buttons */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Reason')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {reasons.map((r) => {
            const isSelected = reason === r.id;
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center border transition-all ${
                  isSelected
                    ? 'bg-[#13213D] text-white border-[#13213D] shadow-sm'
                    : 'bg-white text-slate-700 border-[#E5E8EF] hover:border-slate-300'
                }`}
              >
                {t(r.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes / explanation */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Additional Note (Optional)')}
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('Optional details for the school')}
          className="w-full bg-white border border-[#E5E8EF] rounded-xl p-3 text-xs text-[#13213D] focus:outline-none focus:border-[#F5A623]"
        />
      </div>

      <div className="bg-amber-50 p-3 rounded-xl flex items-start gap-2 border border-amber-200">
        <AlertCircle className="w-4 h-4 text-[#F5A623] flex-shrink-0 mt-0.5" />
        <span className="text-[11px] text-amber-900 leading-tight">
          {t('Reporting before 08:00 AM ensures the learner is marked excused.')}
        </span>
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
          disabled={submitting}
          className="flex-2 py-3 px-5 rounded-xl bg-[#F5A623] text-[#13213D] text-xs font-extrabold hover:bg-amber-400 active:scale-95 transition-all shadow-md"
        >
          {submitting ? t('Submitting...') : t('Send to school')}
        </button>
      </div>
    </form>
  );
};
