import React, { useState } from 'react';
import { SchoolTrip } from '../../types';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export const TripConsentSheet: React.FC<{ trip: SchoolTrip }> = ({ trip }) => {
  const { parent, activeKid, giveTripConsent, closeSheet, t } = useApp();

  const [step, setStep] = useState<number>(0);
  const [medicalNotes, setMedicalNotes] = useState(
    trip.consentDetails?.medicalNotes || 'No known allergies or medical restrictions.'
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    trip.consentDetails?.emergencyContact || parent.ph
  );
  const [agreed, setAgreed] = useState(true);

  const handleFinish = () => {
    giveTripConsent(trip.id, {
      guardianName: parent.n,
      phone: parent.ph,
      medicalNotes,
      emergencyContact: emergencyPhone,
    });
    closeSheet();
  };

  const steps = [t('Overview'), t('Safety & Rules'), t('Medical info'), t('Sign consent')];

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#13213D]">
          {t('Step')} {step + 1} {t('of')} 4: {steps[step]}
        </span>
        <span className="text-[#6B7385] text-[11px]">{trip.short}</span>
      </div>
      <div className="flex gap-1.5 h-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all ${
              i <= step ? 'bg-[#F5A623]' : 'bg-[#E5E8EF]'
            }`}
          />
        ))}
      </div>

      {/* Step 0: Overview */}
      {step === 0 && (
        <div className="space-y-3 text-xs">
          <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF]">
            <h4 className="font-extrabold text-[#13213D] text-sm mb-1">{trip.title}</h4>
            <p className="text-[#6B7385] mb-3">
              {t('Destination:')} {trip.short} · {t('Date:')} <b className="text-[#13213D]">{trip.date}</b>
            </p>
            <div className="space-y-1.5 pt-2 border-t border-[#E5E8EF]">
              <div className="flex justify-between">
                <span className="text-[#6B7385]">{t('Participating Child:')}</span>
                <b className="text-[#13213D]">{activeKid.n} ({activeKid.cls})</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7385]">{t('Approved By:')}</span>
                <span className="text-[#13213D]">{trip.approved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7385]">{t('Trip Reference:')}</span>
                <span className="font-mono text-[#13213D]">{trip.ref}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF]">
            <h5 className="font-bold text-[#13213D] mb-2">{t('What to Pack')}</h5>
            <ul className="space-y-1.5 text-[#6B7385]">
              {trip.whatToPack.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Step 1: Safety & Rules */}
      {step === 1 && (
        <div className="space-y-3 text-xs">
          <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF]">
            <h5 className="font-bold text-[#13213D] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1FA971]" />
              {t('School Safety Measures')}
            </h5>
            <ul className="space-y-2 text-[#6B7385]">
              {trip.safety.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FA971] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#F5A623] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-950">
              <b>{t('Code of Conduct:')}</b> {t('Students must remain with their assigned patron group at all times and follow instructor guidelines.')}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Medical & Emergency Contact */}
      {step === 2 && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
              {t('Medical Conditions & Dietary Requirements')}
            </label>
            <textarea
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              className="w-full bg-white border border-[#E5E8EF] rounded-xl p-3 text-xs text-[#13213D] focus:outline-none focus:border-[#F5A623]"
              placeholder={t('Specify asthma, allergies, medication or dietary notes...')}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
              {t('Emergency Contact Phone')}
            </label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-semibold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
            />
          </div>
        </div>
      )}

      {/* Step 3: Sign consent */}
      {step === 3 && (
        <div className="space-y-3 text-xs">
          <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Parent / Guardian:')}</span>
              <b className="text-[#13213D]">{parent.n}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Phone:')}</span>
              <span className="text-[#13213D]">{parent.ph}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Student:')}</span>
              <b className="text-[#13213D]">{activeKid.n}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7385]">{t('Trip:')}</span>
              <span className="text-[#13213D]">{trip.short}</span>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 accent-[#F5A623] mt-0.5"
            />
            <span className="text-[11px] text-amber-950 leading-snug">
              {t('I give my full parental consent for {{name}} to participate in this study trip under school supervision.', { name: activeKid.first })}
            </span>
          </label>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('Back')}
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-2 py-3 px-5 rounded-xl bg-[#13213D] text-white text-xs font-bold hover:bg-slate-900 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1"
          >
            {t('Continue')} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!agreed}
            onClick={handleFinish}
            className="flex-2 py-3 px-5 rounded-xl bg-[#F5A623] text-[#13213D] text-xs font-extrabold hover:bg-amber-400 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            {t('Give consent')}
          </button>
        )}
      </div>
    </div>
  );
};
