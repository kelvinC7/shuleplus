import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CreditCard, Smartphone, CheckCircle, ShieldCheck } from 'lucide-react';

export const TopUpSheet: React.FC = () => {
  const { activeKid, parent, updateKidWallet, closeSheet, showToast, t } = useApp();

  const presets = [2000, 5000, 10000, 20000];
  const [amount, setAmount] = useState<number>(5000);
  const [method, setMethod] = useState<'MTN MoMo' | 'Airtel Money' | 'Card'>('MTN MoMo');
  const [phoneNumber, setPhoneNumber] = useState(parent.ph);
  const [step, setStep] = useState<'amount' | 'processing' | 'done'>('amount');
  const [reference, setReference] = useState('');

  const handlePay = () => {
    setStep('processing');
    const ref = 'TOP-' + Math.floor(100000 + Math.random() * 900000);
    setReference(ref);

    setTimeout(() => {
      updateKidWallet(activeKid.id, amount, {
        id: 'tx-' + Date.now(),
        title: `Pocket money top-up (${method})`,
        category: 'topup',
        date: 'Just now',
        amount: amount,
        isCredit: true,
        ref: ref,
      });
      setStep('done');
      showToast(t('{{amount}} added to {{name}}’s ShuleCard.', { amount: `RWF ${amount.toLocaleString()}`, name: activeKid.first }));
    }, 1800);
  };

  if (step === 'processing') {
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-[#F5A623] border-t-transparent animate-spin mx-auto" />
        <h3 className="text-base font-extrabold text-[#13213D]">
          {t('Processing Top-up...')}
        </h3>
        <p className="text-xs text-[#6B7385] max-w-xs mx-auto">
          {method.includes('MoMo') || method.includes('Airtel')
            ? t('Please check your phone ({{phone}}) and approve the push notification.', { phone: phoneNumber })
            : t('Securely contacting payment gateway...')}
        </p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="py-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-extrabold text-[#13213D]">
          {t('Top-up Successful!')}
        </h3>
        <p className="text-xs text-[#6B7385]">
          {t('{{amount}} was credited to {{name}}’s ShuleCard.', { amount: `RWF ${amount.toLocaleString()}`, name: activeKid.first })}
        </p>
        <div className="bg-slate-50 p-4 rounded-xl text-left text-xs space-y-2 border border-[#E5E8EF]">
          <div className="flex justify-between">
            <span className="text-[#6B7385]">{t('Transaction Ref:')}</span>
            <b className="font-mono text-[#13213D]">{reference}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7385]">{t('Card Number:')}</span>
            <span className="font-mono text-[#13213D]">{activeKid.cardno}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7385]">{t('Payment Method:')}</span>
            <span className="text-[#13213D]">{method}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#E5E8EF]">
            <span className="text-[#6B7385]">{t('New Balance:')}</span>
            <b className="text-[#1FA971] text-sm font-extrabold">
              RWF {(activeKid.card).toLocaleString()}
            </b>
          </div>
        </div>
        <button
          onClick={closeSheet}
          className="w-full py-3.5 bg-[#13213D] text-white text-xs font-extrabold rounded-xl hover:bg-slate-900 active:scale-98 transition-all shadow-md"
        >
          {t('Done')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200">
        <small className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
          {t('Current ShuleCard Balance')}
        </small>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xs text-amber-900 font-semibold">{activeKid.first} · {activeKid.cardno}</span>
          <b className="text-lg font-extrabold text-[#13213D]">
            RWF {activeKid.card.toLocaleString()}
          </b>
        </div>
      </div>

      {/* Preset Amount Pills */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Select Top-up Amount')}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((p) => {
            const isSelected = amount === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setAmount(p)}
                className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                  isSelected
                    ? 'bg-[#13213D] text-white border-[#13213D] shadow-sm'
                    : 'bg-white text-slate-700 border-[#E5E8EF] hover:border-slate-300'
                }`}
              >
                {p >= 1000 ? `${p / 1000}k` : p}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            placeholder={t('Custom amount')}
            className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-bold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
          />
          <span className="absolute right-4 top-3 text-xs font-extrabold text-[#6B7385]">
            RWF
          </span>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
          {t('Payment Method')}
        </label>
        <div className="space-y-2">
          {[
            { id: 'MTN MoMo', label: t('MTN Mobile Money'), icon: Smartphone, extra: '*182#' },
            { id: 'Airtel Money', label: 'Airtel Money', icon: Smartphone, extra: '*182#' },
            { id: 'Card', label: t('Debit / Credit Card'), icon: CreditCard, extra: 'Visa/Mastercard' },
          ].map((m) => {
            const isSelected = method === m.id;
            const Icon = m.icon;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id as any)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-300 shadow-sm text-amber-950 font-bold'
                    : 'bg-white border-[#E5E8EF] text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#F5A623]" />
                  <span>{m.label}</span>
                </div>
                <small className="text-[#6B7385] text-[10px]">{m.extra}</small>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phone number verification */}
      {method !== 'Card' && (
        <div>
          <label className="text-xs font-bold text-[#13213D] mb-1.5 block">
            {t('MoMo / Airtel Phone Number')}
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs font-semibold text-[#13213D] focus:outline-none focus:border-[#F5A623]"
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-[#6B7385]">
        <ShieldCheck className="w-4 h-4 text-[#1FA971] flex-shrink-0" />
        <span>{t('Instant credit directly to student ShuleCard POS card reader.')}</span>
      </div>

      <button
        type="button"
        onClick={handlePay}
        className="w-full py-3.5 bg-[#F5A623] text-[#13213D] text-xs font-extrabold rounded-xl hover:bg-amber-400 active:scale-98 transition-all shadow-md"
      >
        {t('Top up {{amount}}', { amount: `RWF ${amount.toLocaleString()}` })}
      </button>
    </div>
  );
};
