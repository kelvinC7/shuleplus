import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SchoolTrip } from '../../types';
import { TripConsentSheet } from './TripConsentSheet';
import { NewGoalSheet } from './NewGoalSheet';
import {
  Compass,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CreditCard,
  Radio,
  ChevronRight,
  ArrowLeft,
  Users,
  MapPin,
} from 'lucide-react';

interface TripsPanelProps {
  initialTripId?: string;
}

export const TripsPanel: React.FC<TripsPanelProps> = ({ initialTripId }) => {
  const { trips, activeKid, kids, openSheet, payTripFeeAction, t } = useApp();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    initialTripId || trips[0]?.id || null
  );
  const [showLiveFeed, setShowLiveFeed] = useState<boolean>(false);

  const activeTrip = trips.find((tr) => tr.id === selectedTripId) || trips[0];
  const kidForTrip = kids.find((k) => k.id === activeTrip?.kid) || activeKid;

  const handleOpenConsent = (trip: SchoolTrip) => {
    openSheet(<TripConsentSheet trip={trip} />, `${t('Consent')} · ${trip.short}`);
  };

  const handlePayFee = (trip: SchoolTrip) => {
    const balance = trip.fee - (trip.paid || 0);
    if (balance <= 0) return;
    payTripFeeAction(trip.id, balance);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* If looking at all trips or single trip */}
      {selectedTripId && activeTrip ? (
        <div className="space-y-4">
          {/* Back button if multiple trips */}
          <button
            onClick={() => setSelectedTripId(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#F5A623] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('All School Trips')}
          </button>

          {/* Trip Hero Header Card */}
          <div className="bg-gradient-to-br from-[#13213D] via-[#1B2D52] to-[#24396A] text-white p-5 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5A623] block">
                  {t('APPROVED STUDY TRIP')} · {activeTrip.ref}
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  {activeTrip.title}
                </h3>
                <span className="text-xs text-[#9FB0D3] mt-0.5 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#F5A623]" />
                  {activeTrip.place || activeTrip.short}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-white/60 block">{t('Date:')}</span>
                <b className="text-white">{activeTrip.date}</b>
              </div>
              <div>
                <span className="text-white/60 block">{t('Hours:')}</span>
                <b className="text-white">
                  {activeTrip.depart || '06:00'} — {activeTrip.ret || '19:00'}
                </b>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded-full border border-emerald-500/30">
                {t('Authorized by District Office')}
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/80 text-[10px] font-bold rounded-full">
                {t('{{students}} Students · {{staff}} Staff', { students: 45, staff: 4 })}
              </span>
            </div>
          </div>

          {/* Interactive Checklist (What you need to do) */}
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
            <b className="text-xs font-extrabold text-[#13213D] block">
              {t('Trip Preparation Checklist')}
            </b>

            <div className="space-y-2.5 text-xs">
              {/* Task 1: Parental Consent */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  activeTrip.consented
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/60 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeTrip.consented
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {activeTrip.consented ? '✓' : '1'}
                  </span>
                  <div>
                    <b className="block">{t('Give Parental Consent')}</b>
                    <small className="opacity-80 block text-[10.5px]">
                      {activeTrip.consented
                        ? t('Signed by {{name}}', { name: activeTrip.consentDetails?.guardianName || t('Guardian') })
                        : t('Review itinerary, safety rules & sign')}
                    </small>
                  </div>
                </div>

                {!activeTrip.consented ? (
                  <button
                    onClick={() => handleOpenConsent(activeTrip)}
                    className="px-3 py-1.5 bg-[#F5A623] hover:bg-amber-400 text-[#13213D] text-[11px] font-extrabold rounded-xl shadow-sm"
                  >
                    {t('Sign Now')}
                  </button>
                ) : (
                  <span className="text-[10.5px] font-bold text-emerald-700">
                    {t('Completed')} ✓
                  </span>
                )}
              </div>

              {/* Task 2: Health & Emergency Contact */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  activeTrip.consented
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeTrip.consented
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {activeTrip.consented ? '✓' : '2'}
                  </span>
                  <div>
                    <b className="block">{t('Health & Emergency Disclosure')}</b>
                    <small className="opacity-80 block text-[10.5px]">
                      {activeTrip.consented
                        ? t('Contact: {{contact}}', { contact: activeTrip.consentDetails?.emergencyContact || t('Verified') })
                        : t('Included in parental consent form')}
                    </small>
                  </div>
                </div>
                {activeTrip.consented && (
                  <span className="text-[10.5px] font-bold text-emerald-700">
                    {t('Verified')} ✓
                  </span>
                )}
              </div>

              {/* Task 3: Pay Trip Fee */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  activeTrip.paid >= activeTrip.fee
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/60 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeTrip.paid >= activeTrip.fee
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {activeTrip.paid >= activeTrip.fee ? '✓' : '3'}
                  </span>
                  <div>
                    <b className="block">{t('Trip Fee Payment')}</b>
                    <small className="opacity-80 block text-[10.5px]">
                      {activeTrip.paid >= activeTrip.fee
                        ? t('Paid in full · {{amount}}', { amount: `RWF ${activeTrip.fee.toLocaleString()}` })
                        : t('{{amount}} remaining', { amount: `RWF ${(activeTrip.fee - (activeTrip.paid || 0)).toLocaleString()}` })}
                    </small>
                  </div>
                </div>

                {activeTrip.paid < activeTrip.fee ? (
                  <button
                    onClick={() => handlePayFee(activeTrip)}
                    className="px-3 py-1.5 bg-[#13213D] hover:bg-slate-900 text-white text-[11px] font-extrabold rounded-xl shadow-sm"
                  >
                    {t('Pay Fee')}
                  </button>
                ) : (
                  <span className="text-[10.5px] font-bold text-emerald-700">
                    {t('Paid')} ✓
                  </span>
                )}
              </div>

              {/* Task 4: Follow on the Day */}
              <div className="p-3 rounded-2xl border bg-blue-50/60 border-blue-200 text-blue-950 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    4
                  </span>
                  <div>
                    <b className="block">{t('Follow the Trip on the Day')}</b>
                    <small className="opacity-80 block text-[10.5px]">
                      {t('Live timestamped updates & roll calls from lead teacher')}
                    </small>
                  </div>
                </div>

                <button
                  onClick={() => setShowLiveFeed((v) => !v)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-xl shadow-sm flex items-center gap-1"
                >
                  <Radio className="w-3 h-3 animate-pulse" />
                  {showLiveFeed ? t('Hide') : t('Live Feed')}
                </button>
              </div>
            </div>
          </div>

          {/* Live Updates Modal / Drawer if toggled */}
          {showLiveFeed && (
            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-3 animate-in fade-in duration-200 border border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <b className="text-xs font-bold text-white">Live Field Updates</b>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE CONNECTED</span>
              </div>

              <div className="space-y-3 text-xs">
                {(activeTrip.dayUpdates && activeTrip.dayUpdates.length > 0
                  ? activeTrip.dayUpdates
                  : [
                      {
                        time: '06:15 AM',
                        title: 'Departure Confirmed',
                        desc: 'Buses have left school gate under police escort. All students present.',
                        author: 'Lead Patron',
                      },
                      {
                        time: '09:00 AM',
                        title: 'Arrived at Destination',
                        desc: 'Safe arrival. Morning briefing underway.',
                        author: 'Lead Patron',
                      },
                    ]
                ).map((upd, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-center text-[10.5px] text-amber-400 font-bold mb-1">
                      <span>{upd.time}</span>
                      <span className="text-slate-400">{upd.author}</span>
                    </div>
                    <b className="text-xs text-white block">{upd.title}</b>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {upd.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan for the Day (Itinerary) */}
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
            <b className="text-xs font-extrabold text-[#13213D] block">
              Plan for the Day
            </b>
            <div className="space-y-2">
              {activeTrip.itinerary.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl text-xs"
                >
                  <span className="px-2 py-0.5 bg-[#13213D] text-[#F5A623] font-mono text-[10px] font-extrabold rounded-md flex-shrink-0">
                    {step.time}
                  </span>
                  <span className="text-slate-700 font-medium leading-relaxed">
                    {step.activity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Itemized Cost Breakdown */}
          {activeTrip.items && (
            <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
              <b className="text-xs font-extrabold text-[#13213D] block">
                Itemized Cost Breakdown
              </b>
              <div className="space-y-1.5 divide-y divide-[#E5E8EF] text-xs">
                {activeTrip.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center pt-1.5 first:pt-0">
                    <span className="text-[#6B7385]">{it.name}</span>
                    <b className="text-[#13213D]">RWF {it.amount.toLocaleString()}</b>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-extrabold text-sm text-[#13213D]">
                  <span>Total Trip Cost:</span>
                  <span className="text-[#F5A623]">RWF {activeTrip.fee.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Safety & Staffing */}
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1FA971]" />
              <b className="text-xs font-extrabold text-[#13213D]">Safety Protocol</b>
            </div>
            <ul className="space-y-2 text-xs text-[#6B7385]">
              {activeTrip.safety.map((sf, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971] flex-shrink-0 mt-0.5" />
                  <span>{sf}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        /* Trips List Overview */
        <div className="space-y-3">
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
            <div className="flex items-center justify-between">
              <b className="text-xs font-extrabold text-[#13213D]">
                Approved School Study Trips
              </b>
              <span className="text-xs text-[#F5A623] font-bold">
                {trips.length} active
              </span>
            </div>

            <div className="space-y-2.5">
              {trips.map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => setSelectedTripId(tr.id)}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-[#E5E8EF] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#F5A623]">
                      {tr.ref}
                    </span>
                    <b className="text-xs text-[#13213D] block font-extrabold">
                      {tr.title}
                    </b>
                    <span className="text-[11px] text-[#6B7385] block">
                      {tr.date} · RWF {tr.fee.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        tr.consented
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tr.consented ? 'Consented ✓' : 'Consent Pending'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Trips Archive */}
          <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
            <b className="text-xs font-extrabold text-[#13213D] block">Past Trips Archive</b>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <div>
                  <b className="text-[#13213D] block">S2 Field Study at Akagera</b>
                  <span className="text-[10px] text-[#6B7385]">Keza Uwimana · June 2026</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                  Completed
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <div>
                  <b className="text-[#13213D] block">P6 Educational Tour to Nyungwe</b>
                  <span className="text-[10px] text-[#6B7385]">Keza Uwimana · 2024</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                  Completed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
