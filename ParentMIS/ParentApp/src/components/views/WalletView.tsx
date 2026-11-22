import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TopUpSheet } from '../modals/TopUpSheet';
import { SpendLimitSheet } from '../modals/SpendLimitSheet';
import {
  CreditCard,
  Plus,
  Sliders,
  QrCode,
  ShieldAlert,
  ShoppingBag,
  Coffee,
  Book,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const WalletView: React.FC = () => {
  const { activeKid, openSheet, showToast, t } = useApp();

  const [filter, setFilter] = useState<'all' | 'canteen' | 'shop' | 'topup'>('all');
  const [isBlocked, setIsBlocked] = useState(false);

  const openTopUp = () => {
    openSheet(<TopUpSheet />, 'Top up ShuleCard');
  };

  const openLimits = () => {
    openSheet(<SpendLimitSheet />, `${t('ShuleCard')} · ${t('Spend limits')}`);
  };

  const toggleBlockCard = () => {
    setIsBlocked((b) => !b);
    showToast(
      !isBlocked
        ? t('ShuleCard has been temporarily blocked.')
        : t('ShuleCard is now active.')
    );
  };

  const transactions = activeKid.transactions || [];
  const filteredTx = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.category === filter;
  });

  return (
    <div className="space-y-4 px-4 -mt-12 relative z-20 pb-24 select-none">
      {/* Digital ShuleCard Card Visual */}
      <div
        className={`p-6 rounded-3xl text-white shadow-xl relative overflow-hidden transition-all duration-300 ${
          isBlocked
            ? 'bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-red-500'
            : 'bg-gradient-to-br from-[#13213D] via-[#1B2D52] to-[#24396A]'
        }`}
      >
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <QrCode className="w-48 h-48" />
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5A623] block">
              {t('SHULECARD POCKET MONEY')}
            </span>
            <b className="text-lg font-extrabold text-white block mt-0.5">
              {activeKid.n}
            </b>
            <span className="font-mono text-xs text-white/70 tracking-wider">
              {activeKid.cardno}
            </span>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl p-1 flex items-center justify-center border border-white/20">
            <QrCode className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/15 flex items-end justify-between relative z-10">
          <div>
            <span className="text-[10.5px] text-white/60 block font-semibold">
              {t('Available Canteen Balance')}
            </span>
            <b className="text-2xl font-black text-[#F5A623]">
              RWF {activeKid.card.toLocaleString()}
            </b>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
              isBlocked ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {isBlocked ? t('BLOCKED') : t('ACTIVE')}
          </span>
        </div>
      </div>

      {/* Primary Actions: Top Up + Set Limits */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={openTopUp}
          disabled={isBlocked}
          className="py-3.5 px-4 bg-[#F5A623] text-[#13213D] rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-card hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          {t('Top up ShuleCard')}
        </button>

        <button
          onClick={openLimits}
          className="py-3.5 px-4 bg-white text-[#13213D] rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-card border border-[#E5E8EF] hover:border-slate-300 active:scale-95 transition-all"
        >
          <Sliders className="w-4 h-4 text-[#F5A623]" />
          {t('Spend limits')}
        </button>
      </div>

      {/* Spend Limits Summary Card */}
      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
          <b className="text-xs font-extrabold text-[#13213D]">{t('Daily Spend Control')}</b>
          <span
            onClick={openLimits}
            className="text-[11px] text-[#F5A623] font-bold cursor-pointer hover:underline"
          >
            {t('Adjust')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-[#6B7385] block">{t('Daily')}</span>
            <b className="text-xs text-[#13213D] font-extrabold">
              RWF {activeKid.limits?.daily.toLocaleString()}
            </b>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-[#6B7385] block">{t('Weekly')}</span>
            <b className="text-xs text-[#13213D] font-extrabold">
              RWF {activeKid.limits?.weekly.toLocaleString()}
            </b>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-[#6B7385] block">{t('Termly')}</span>
            <b className="text-xs text-[#13213D] font-extrabold">
              RWF {activeKid.limits?.termly.toLocaleString()}
            </b>
          </div>
        </div>
      </div>

      {/* Top Canteen Items (Last 3 Weeks) */}
      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-2.5">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#F5A623]" />
            <b className="text-xs font-extrabold text-[#13213D]">{t('Top Canteen Items · Last 3 Weeks')}</b>
          </div>
          <span className="text-[10px] text-[#6B7385] font-semibold">{t('POS Terminal')}</span>
        </div>

        <div className="space-y-2.5 text-xs">
          {[
            { name: 'Fresh Milk & Sweet Bread', amount: 3600, count: 6 },
            { name: 'Fresh Mango & Passion Juice', amount: 2400, count: 4 },
            { name: 'Beef Samosa (2 pcs)', amount: 1800, count: 3 },
            { name: 'Fresh Fruit Bowl', amount: 1500, count: 3 },
            { name: 'Mathematical Set & Exercise Book', amount: 2500, count: 1 },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#13213D] font-bold">
                  {item.name} <span className="text-[#6B7385] font-normal">({item.count}x)</span>
                </span>
                <b className="text-[#F5A623]">RWF {item.amount.toLocaleString()}</b>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F5A623] rounded-full transition-all duration-500"
                  style={{ width: `${(item.amount / 3600) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History with Filter Pills */}
      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-4">
        <div className="flex items-center justify-between">
          <b className="text-xs font-extrabold text-[#13213D]">{t('Transactions')} ({t('Last 3 Weeks')})</b>
          <span className="text-[10.5px] text-[#6B7385] font-semibold">
            {filteredTx.length} {t('items')}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs gap-1">
          {[
            { id: 'all', label: t('All') },
            { id: 'canteen', label: t('Canteen') },
            { id: 'shop', label: t('School Shop') },
            { id: 'topup', label: t('Top-ups') },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                filter === f.id
                  ? 'bg-white text-[#13213D] shadow-sm'
                  : 'text-[#6B7385] hover:text-[#13213D]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {filteredTx.map((tx) => {
            const isTopup = tx.isCredit;
            const Icon =
              tx.category === 'canteen'
                ? Coffee
                : tx.category === 'shop'
                ? ShoppingBag
                : tx.category === 'library'
                ? Book
                : Plus;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-[#E5E8EF] text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isTopup
                        ? 'bg-emerald-100 text-[#1FA971]'
                        : 'bg-amber-100 text-[#F5A623]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <b className="text-xs text-[#13213D] block font-bold truncate max-w-[170px]">
                      {tx.title}
                    </b>
                    <small className="text-[#6B7385] text-[10px]">
                      {tx.date} · Ref: {tx.ref}
                    </small>
                  </div>
                </div>

                <b
                  className={`text-xs font-extrabold ${
                    isTopup ? 'text-[#1FA971]' : 'text-[#13213D]'
                  }`}
                >
                  {isTopup ? '+' : '-'} RWF {tx.amount.toLocaleString()}
                </b>
              </div>
            );
          })}
        </div>
      </div>

      {/* Block Card Action */}
      <div className="p-4 bg-slate-100 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <div>
            <b className="text-xs font-bold text-[#13213D] block">{t('Block card')}</b>
            <small className="text-[10px] text-[#6B7385]">
              {t('Disable POS usage immediately if lost')}
            </small>
          </div>
        </div>
        <button
          onClick={toggleBlockCard}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            isBlocked
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-red-500 text-white shadow-sm hover:bg-red-600'
          }`}
        >
          {isBlocked ? t('Unblock') : t('Block Now')}
        </button>
      </div>
    </div>
  );
};
