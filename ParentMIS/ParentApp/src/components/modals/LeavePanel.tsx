import React, { useState } from 'react';
import { Child } from '../../types';
import { useApp } from '../../context/AppContext';
import { Clock, CheckCircle2, Plus, QrCode, Calendar } from 'lucide-react';

export const LeavePanel: React.FC<{ child: Child }> = ({ child }) => {
  const { showToast, t } = useApp();
  const [showForm, setShowForm] = useState(false);

  const [startDate, setStartDate] = useState('2026-11-06');
  const [endDate, setEndDate] = useState('2026-11-08');
  const [leaveType, setLeaveType] = useState('Weekend Exeat');
  const [reason, setReason] = useState('');

  const [passes, setPasses] = useState([
    {
      id: 'PAS-9821',
      title: 'Family Gathering Exeat',
      from: '10 Oct 2026, 17:00',
      to: '12 Oct 2026, 17:00',
      status: 'Completed',
      approver: 'Patron Jean Bosco',
    },
    {
      id: 'PAS-9944',
      title: 'Dental Appointment Pass',
      from: '28 Sep 2026, 09:00',
      to: '28 Sep 2026, 13:00',
      status: 'Completed',
      approver: 'Class Teacher Patrick Rukundo',
    },
  ]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPass = {
      id: 'PAS-' + Math.floor(1000 + Math.random() * 9000),
      title: `${leaveType} (${reason || 'Guardian request'})`,
      from: `${startDate}, 16:30`,
      to: `${endDate}, 17:00`,
      status: 'Pending School Approval',
      approver: 'Pending Patron / Headmaster',
    };
    setPasses([newPass, ...passes]);
    setShowForm(false);
    showToast(t('Leave request submitted to school administration'));
  };

  return (
    <div className="space-y-4">
      {/* Action button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3.5 bg-[#13213D] text-white text-xs font-extrabold rounded-2xl hover:bg-slate-900 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-[#F5A623]" />
          {t('Request Leave or Permission Pass')}
        </button>
      ) : (
        <form
          onSubmit={handleRequestSubmit}
          className="bg-white p-5 rounded-2xl shadow-card border border-[#E5E8EF] space-y-3 text-xs"
        >
          <div className="flex justify-between items-center mb-1">
            <h4 className="font-extrabold text-[#13213D]">{t('New Leave Request')}</h4>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[#6B7385] hover:text-slate-900 font-bold"
            >
              {t('Cancel')}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-[#13213D] mb-1 block">
              {t('Leave Type')}
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-slate-50 border border-[#E5E8EF] rounded-xl px-3 py-2.5 font-semibold text-[#13213D]"
            >
              <option value="Weekend Exeat">{t('Weekend Exeat')}</option>
              <option value="Medical Leave">{t('Medical Leave')}</option>
              <option value="Family Emergency">{t('Family Emergency')}</option>
              <option value="Official School Representation">{t('Official School Representation')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-[#13213D] mb-1 block">
                {t('Departure Date')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-[#E5E8EF] rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#13213D] mb-1 block">
                {t('Return Date')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-[#E5E8EF] rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#13213D] mb-1 block">
              {t('Reason & Destination Details')}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('e.g. Attending sister’s wedding in Kigali...')}
              required
              className="w-full bg-slate-50 border border-[#E5E8EF] rounded-xl p-2.5 text-xs text-[#13213D]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#F5A623] text-[#13213D] font-extrabold rounded-xl hover:bg-amber-400 shadow-md transition-all mt-1"
          >
            {t('Submit for School Approval')}
          </button>
        </form>
      )}

      {/* Passes list */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[#13213D]">{t('Leave History & Active Passes')}</h4>
        {passes.map((p) => (
          <div
            key={p.id}
            className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] space-y-2 text-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <b className="text-sm font-extrabold text-[#13213D] block">{p.title}</b>
                <span className="font-mono text-[10px] text-[#6B7385]">{p.id}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold ${
                  p.status === 'Completed'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-amber-100 text-amber-800 animate-pulse'
                }`}
              >
                {t(p.status)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E5E8EF] text-[#6B7385] space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>
                  {t('From')} <b>{p.from}</b> {t('to')} <b>{p.to}</b>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971]" />
                <span>{t('Approved by:')} {p.approver}</span>
              </div>
            </div>

            {p.status === 'Completed' && (
              <div className="pt-2 border-t border-[#E5E8EF] flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> {t('Scanned at Gate Reader')}
                </span>
                <span>{t('Returned on time')} ✓</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
