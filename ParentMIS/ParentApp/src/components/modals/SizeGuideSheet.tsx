import React, { useState } from 'react';
import { Ruler } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SizeGuideSheet: React.FC = () => {
  const { t } = useApp();
  const [activeType, setActiveType] = useState<'shoes' | 'uniform'>('uniform');

  const shoesData = [
    { size: '36 EU', footLength: '22.5 cm', age: '11 - 12 yrs' },
    { size: '37 EU', footLength: '23.2 cm', age: '12 - 13 yrs' },
    { size: '38 EU', footLength: '24.0 cm', age: '13 - 14 yrs' },
    { size: '39 EU', footLength: '24.7 cm', age: '14 - 15 yrs' },
    { size: '40 EU', footLength: '25.3 cm', age: '15 - 16 yrs' },
    { size: '41 EU', footLength: '26.0 cm', age: '16+ yrs' },
  ];

  const uniformData = [
    { size: 'XS (12-13)', chest: '78 - 82 cm', waist: '64 - 68 cm', height: '145 - 152 cm' },
    { size: 'S (13-14)', chest: '83 - 88 cm', waist: '69 - 73 cm', height: '153 - 160 cm' },
    { size: 'M (14-15)', chest: '89 - 94 cm', waist: '74 - 78 cm', height: '161 - 168 cm' },
    { size: 'L (15-16)', chest: '95 - 101 cm', waist: '79 - 84 cm', height: '169 - 175 cm' },
    { size: 'XL (16+)', chest: '102 - 108 cm', waist: '85 - 90 cm', height: '176 - 182 cm' },
  ];

  return (
    <div className="space-y-4">
      {/* Type Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveType('uniform')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeType === 'uniform' ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
          }`}
        >
          {t('Uniform Sizes')}
        </button>
        <button
          onClick={() => setActiveType('shoes')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeType === 'shoes' ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
          }`}
        >
          {t('Shoe Sizes')}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E8EF]">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#13213D]">
          <Ruler className="w-4 h-4 text-[#F5A623]" />
          <span>{activeType === 'uniform' ? t('Uniform Sizing Guide') : t('Foot Measurement Guide')}</span>
        </div>

        {activeType === 'uniform' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EF] text-[#6B7385]">
                  <th className="pb-2 font-bold">{t('Size')}</th>
                  <th className="pb-2 font-bold">{t('Chest')}</th>
                  <th className="pb-2 font-bold">{t('Waist')}</th>
                  <th className="pb-2 font-bold">{t('Height')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EF] text-slate-800">
                {uniformData.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 font-extrabold text-[#13213D]">{row.size}</td>
                    <td className="py-2 text-[#6B7385]">{row.chest}</td>
                    <td className="py-2 text-[#6B7385]">{row.waist}</td>
                    <td className="py-2 text-[#6B7385]">{row.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EF] text-[#6B7385]">
                  <th className="pb-2 font-bold">{t('Shoe Size')}</th>
                  <th className="pb-2 font-bold">{t('Foot Length')}</th>
                  <th className="pb-2 font-bold">{t('Recommended Age')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EF] text-slate-800">
                {shoesData.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 font-extrabold text-[#13213D]">{row.size}</td>
                    <td className="py-2 text-[#6B7385]">{row.footLength}</td>
                    <td className="py-2 text-[#6B7385]">{row.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#6B7385] text-center">
        {t('Free size exchanges are available at the school store within 14 days of delivery.')}
      </p>
    </div>
  );
};
