import React, { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[44px] flex-shrink-0 flex items-center justify-between px-6 text-white text-[13px] font-semibold bg-[#13213D] select-none z-20">
      <span className="tracking-tight">{time || '09:41'}</span>
      <div className="flex items-center gap-2">
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-end gap-[1.5px] h-3">
          <div className="w-[3px] h-1.5 bg-white rounded-sm" />
          <div className="w-[3px] h-2 bg-white rounded-sm" />
          <div className="w-[3px] h-2.5 bg-white rounded-sm" />
          <div className="w-[3px] h-3 bg-white rounded-sm" />
        </div>
        <div className="w-5 h-2.5 border border-white/60 rounded-[3px] p-[1px] flex items-center">
          <div className="h-full w-3.5 bg-white rounded-[1.5px]" />
        </div>
      </div>
    </div>
  );
};
