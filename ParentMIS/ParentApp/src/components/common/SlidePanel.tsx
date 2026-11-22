import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SlidePanel: React.FC = () => {
  const { panels, popPanel } = useApp();

  if (panels.length === 0) return null;

  return (
    <>
      {panels.map((panel, idx) => (
        <div
          key={panel.id}
          style={{ zIndex: 30 + idx }}
          className="fixed inset-0 bg-[#F4F5F8] flex flex-col animate-in slide-in-from-right duration-250 overflow-hidden"
        >
          {/* Panel Header */}
          <div className="bg-[#13213D] text-white px-5 pt-3 pb-4 shadow-md flex items-center gap-3.5 flex-shrink-0">
            <button
              onClick={popPanel}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              {panel.subtitle && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#9FB0D3] block truncate">
                  {panel.subtitle}
                </span>
              )}
              <h2 className="text-[17px] font-extrabold text-white tracking-tight truncate leading-tight">
                {panel.title}
              </h2>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-5 pb-20 select-text">
            {panel.content}
          </div>
        </div>
      ))}
    </>
  );
};
