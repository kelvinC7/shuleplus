import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sliders, Shield } from 'lucide-react';

export const SpendLimitSheet: React.FC = () => {
  const { activeKid, saveKidLimits, closeSheet, t } = useApp();

  const currentLimits = activeKid.limits || {
    daily: 1500,
    weekly: 8000,
    termly: 50000,
    canteenEnabled: true,
    shopEnabled: true,
  };

  const [daily, setDaily] = useState(currentLimits.daily);
  const [weekly, setWeekly] = useState(currentLimits.weekly);
  const [canteenEnabled, setCanteenEnabled] = useState(currentLimits.canteenEnabled);
  const [shopEnabled, setShopEnabled] = useState(currentLimits.shopEnabled);

  const handleSave = () => {
    saveKidLimits(activeKid.id, {
      daily,
      weekly,
      termly: currentLimits.termly,
      canteenEnabled,
      shopEnabled,
    });
    closeSheet();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[#6B7385]">
        <Sliders className="w-4 h-4 text-[#F5A623]" />
        <span>{t('Control canteen and stationery spending on {{name}}’s ShuleCard.', { name: activeKid.first })}</span>
      </div>

      {/* Daily limit */}
      <div className="bg-white p-4 rounded-2xl shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#13213D]">{t('Daily')} {t('limit')}</span>
          <b className="text-sm font-extrabold text-[#F5A623]">RWF {daily.toLocaleString()}</b>
        </div>
        <input
          type="range"
          min={500}
          max={5000}
          step={250}
          value={daily}
          onChange={(e) => setDaily(Number(e.target.value))}
          className="w-full accent-[#F5A623] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#6B7385] font-semibold mt-1">
          <span>500 RWF</span>
          <span>2,500 RWF</span>
          <span>5,000 RWF</span>
        </div>
      </div>

      {/* Weekly limit */}
      <div className="bg-white p-4 rounded-2xl shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#13213D]">{t('Weekly')} {t('limit')}</span>
          <b className="text-sm font-extrabold text-[#13213D]">RWF {weekly.toLocaleString()}</b>
        </div>
        <input
          type="range"
          min={2000}
          max={20000}
          step={1000}
          value={weekly}
          onChange={(e) => setWeekly(Number(e.target.value))}
          className="w-full accent-[#13213D] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#6B7385] font-semibold mt-1">
          <span>2,000 RWF</span>
          <span>10,000 RWF</span>
          <span>20,000 RWF</span>
        </div>
      </div>

      {/* Purchase Category Toggles */}
      <div className="bg-white p-4 rounded-2xl shadow-card space-y-3">
        <h4 className="text-xs font-bold text-[#13213D]">{t('Allowed Spending Channels')}</h4>
        <div className="flex items-center justify-between">
          <div>
            <b className="text-xs font-bold text-[#13213D] block">{t('School Canteen')}</b>
            <small className="text-[10px] text-[#6B7385]">{t('Snacks, hot lunch and drinks')}</small>
          </div>
          <input
            type="checkbox"
            checked={canteenEnabled}
            onChange={(e) => setCanteenEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#1FA971] cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E8EF]">
          <div>
            <b className="text-xs font-bold text-[#13213D] block">{t('School Papeterie / Shop')}</b>
            <small className="text-[10px] text-[#6B7385]">{t('Exercise books, pens, geometry sets')}</small>
          </div>
          <input
            type="checkbox"
            checked={shopEnabled}
            onChange={(e) => setShopEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#1FA971] cursor-pointer"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600">
        <Shield className="w-4 h-4 text-[#1FA971] flex-shrink-0" />
        <span>{t('Transactions exceeding limits are automatically declined at the POS terminal.')}</span>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 bg-[#13213D] text-white text-xs font-extrabold rounded-xl hover:bg-slate-900 active:scale-98 transition-all shadow-md"
      >
        {t('Save limit')}
      </button>
    </div>
  );
};
