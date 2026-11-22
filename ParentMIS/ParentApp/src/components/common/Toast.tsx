import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Toast: React.FC = () => {
  const { toastMessage, showToast } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => showToast(''), 300);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!toastMessage && !visible) return null;

  return (
    <div
      className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none px-4 max-w-[90%] ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
      }`}
    >
      <div className="bg-[#13213D] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-white/10 text-[12px] font-semibold backdrop-blur-md">
        <CheckCircle2 className="w-4 h-4 text-[#F5A623] flex-shrink-0" />
        <span className="truncate">{toastMessage}</span>
      </div>
    </div>
  );
};
