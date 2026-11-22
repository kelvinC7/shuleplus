import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SheetModal: React.FC = () => {
  const { sheet, closeSheet } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    if (sheet.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sheet.isOpen, closeSheet]);

  if (!sheet.isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Scrim backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={closeSheet}
      />

      {/* Sheet card */}
      <div className="relative z-50 bg-[#F4F5F8] rounded-t-[32px] max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Grab bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab" onClick={closeSheet}>
          <div className="w-12 h-1.5 bg-[#CBD2E1] rounded-full" />
        </div>

        {/* Optional Header */}
        {(sheet.title || sheet.subtitle) && (
          <div className="px-6 py-2.5 flex items-center justify-between border-b border-[#E5E8EF] flex-shrink-0 bg-white">
            <div>
              {sheet.subtitle && (
                <small className="text-[10.5px] uppercase font-bold tracking-wider text-[#6B7385] block">
                  {sheet.subtitle}
                </small>
              )}
              {sheet.title && (
                <h3 className="text-[17px] font-extrabold text-[#13213D] tracking-tight">
                  {sheet.title}
                </h3>
              )}
            </div>
            <button
              onClick={closeSheet}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto max-h-[85vh] select-text">
          {sheet.content}
        </div>
      </div>
    </div>
  );
};
