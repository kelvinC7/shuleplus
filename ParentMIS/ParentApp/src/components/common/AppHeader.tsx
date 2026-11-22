import React from 'react';
import { Bell, ChevronDown, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from './Avatar';
import { StudentProfilePanel } from '../modals/StudentProfilePanel';

interface AppHeaderProps {
  onOpenNotifications: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenNotifications }) => {
  const {
    parent,
    kids,
    activeKid,
    activeKidIndex,
    setActiveKidIndex,
    setShowLanding,
    pushPanel,
    unreadNotifsCount,
    t,
  } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? t('Good morning') : t('Good afternoon');
  };

  return (
    <div className="bg-[#13213D] text-white pt-2 pb-16 px-5 relative overflow-hidden select-none">
      {/* Decorative radial ambient glow */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

      {/* Top row: School brand + notification bell */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#F5A623] text-[#13213D] font-extrabold flex items-center justify-center text-sm shadow-md">
            yo
          </div>
          <div>
            <small className="text-[10px] text-[#9FB0D3] font-medium tracking-wide block leading-none">
              UMUCYO SECONDARY SCHOOL
            </small>
            <b className="text-[14px] font-bold text-white tracking-tight leading-snug">
              {t('Parent Portal')}
            </b>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick exit to Start / Landing page */}
          <button
            onClick={() => setShowLanding(true)}
            title={t('Start page')}
            className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white/90 text-[11px] font-semibold flex items-center gap-1 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="hidden sm:inline">{t('Start')}</span>
          </button>

          {/* Notifications bell */}
          <button
            onClick={onOpenNotifications}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 flex items-center justify-center relative text-white transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F5A623] ring-2 ring-[#13213D]" />
            )}
          </button>
        </div>
      </div>

      {/* Child Switcher Pills */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 relative z-10">
        {kids.map((kid, idx) => {
          const isActive = idx === activeKidIndex;
          return (
            <button
              key={kid.id}
              onClick={() => setActiveKidIndex(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-[#F5A623] text-[#13213D] shadow-md font-bold'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              <Avatar child={kid} size="sm" className="w-5 h-5 rounded-full text-[9px]" />
              <span>{kid.first}</span>
              <span className="text-[10px] opacity-75">{kid.cls}</span>
            </button>
          );
        })}
      </div>

      {/* Greeting and Presence */}
      <div className="mt-4 relative z-10">
        <p className="text-[12px] text-[#9FB0D3] font-medium">
          {getGreeting()}, {parent.n.split(' ')[0]}
        </p>
        <div className="flex items-center justify-between">
          <h2
            onClick={() =>
              pushPanel({
                title: activeKid.n,
                subtitle: `${activeKid.cls} · Profile`,
                content: <StudentProfilePanel child={activeKid} />,
              })
            }
            className="text-[22px] font-extrabold text-white tracking-tight cursor-pointer hover:underline flex items-center gap-1.5"
          >
            <span>{activeKid.n}</span>
            <ChevronDown className="w-4 h-4 text-white/60" />
          </h2>
        </div>

        {/* Presence indicator pill */}
        <div className="inline-flex items-center gap-2 mt-2.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/95">
          <span className="w-2 h-2 rounded-full bg-[#1FA971] animate-ping" />
          <span className="w-2 h-2 rounded-full bg-[#1FA971] -ml-4" />
          <span>
            {activeKid.first} {t('is in class')} · {activeKid.today.what}
          </span>
        </div>
      </div>
    </div>
  );
};
