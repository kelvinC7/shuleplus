import React from 'react';
import { useApp } from '../../context/AppContext';
import { StudentProfilePanel } from '../modals/StudentProfilePanel';
import { HealthPanel } from '../modals/HealthPanel';
import { DisciplinePanel } from '../modals/DisciplinePanel';
import { LeavePanel } from '../modals/LeavePanel';
import { TimetablePanel } from '../modals/TimetablePanel';
import { UniformOrderSheet } from '../modals/UniformOrderSheet';
import { TripConsentSheet } from '../modals/TripConsentSheet';
import { TripsPanel } from '../modals/TripsPanel';
import { OrdersPanel } from '../modals/OrdersPanel';
import { GoalsPanel } from '../modals/GoalsPanel';
import { NotificationsSheet } from '../modals/NotificationsSheet';
import { NewGoalSheet } from '../modals/NewGoalSheet';
import { LANGUAGES } from '../../constants/translations';
import {
  User,
  HeartPulse,
  Award,
  FileCheck2,
  Clock,
  ShoppingBag,
  Package,
  Compass,
  Globe,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export const MoreView: React.FC = () => {
  const {
    activeKid,
    parent,
    pushPanel,
    openSheet,
    closeSheet,
    trips,
    goals,
    orders,
    lang,
    setLang,
    logout,
    showToast,
    t,
  } = useApp();

  const menuSections = [
    {
      title: t('Learner & Wellbeing'),
      items: [
        {
          id: 'profile',
          label: t('Student profile'),
          icon: User,
          color: 'text-[#13213D]',
          bg: 'bg-slate-100',
          action: () =>
            pushPanel({
              title: activeKid.n,
              subtitle: t('Student profile'),
              content: <StudentProfilePanel child={activeKid} />,
            }),
        },
        {
          id: 'health',
          label: t('Health records'),
          icon: HeartPulse,
          color: 'text-red-500',
          bg: 'bg-red-50',
          action: () =>
            pushPanel({
              title: `${activeKid.n} · Health`,
              subtitle: t('Clinic & Immunizations'),
              content: <HealthPanel child={activeKid} />,
            }),
        },
        {
          id: 'discipline',
          label: t('Discipline and conduct'),
          icon: Award,
          color: 'text-[#F5A623]',
          bg: 'bg-amber-50',
          action: () =>
            pushPanel({
              title: `${activeKid.n} · Conduct`,
              subtitle: t('Merits & Leadership'),
              content: <DisciplinePanel child={activeKid} />,
            }),
        },
        {
          id: 'leave',
          label: t('Leave and permission'),
          icon: FileCheck2,
          color: 'text-[#1FA971]',
          bg: 'bg-emerald-50',
          action: () =>
            pushPanel({
              title: `${activeKid.n} · Passes`,
              subtitle: t('Leave & Gate Permissions'),
              content: <LeavePanel child={activeKid} />,
            }),
        },
        {
          id: 'timetable',
          label: t('Timetable'),
          icon: Clock,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
          action: () =>
            pushPanel({
              title: `${activeKid.n} · Timetable`,
              subtitle: t('Weekly Schedule'),
              content: <TimetablePanel child={activeKid} />,
            }),
        },
      ],
    },
    {
      title: t('School Services & Orders'),
      items: [
        {
          id: 'orders',
          label: `${t('Uniforms and shoes')} (${orders.length} orders)`,
          icon: ShoppingBag,
          color: 'text-[#F5A623]',
          bg: 'bg-amber-50',
          action: () =>
            openSheet(
              <div className="space-y-3 text-xs">
                <b className="text-sm font-extrabold text-[#13213D] block">{t('Uniforms & Shoes Services')}</b>
                <p className="text-xs text-[#6B7385] leading-relaxed">
                  {t('Order official student uniforms, sportswear, and leather shoes, or track your placed orders and request size exchanges.')}
                </p>
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <button
                    onClick={() => {
                      closeSheet();
                      setTimeout(() => openSheet(<UniformOrderSheet />, t('Order uniform')), 100);
                    }}
                    className="p-4 rounded-2xl bg-[#13213D] text-white font-extrabold flex items-center justify-between shadow-md active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5 text-[#F5A623]" />
                      <div className="text-left">
                        <span className="block text-xs">{t('Order New Uniforms or Shoes')}</span>
                        <span className="text-[10.5px] text-[#9FB0D3] font-normal">{t('Choose items, sizes and delivery')}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/60" />
                  </button>

                  <button
                    onClick={() => {
                      closeSheet();
                      setTimeout(() => pushPanel({
                        title: t('Uniforms and shoes'),
                        subtitle: t('My Orders & Size Exchanges'),
                        content: <OrdersPanel />,
                      }), 100);
                    }}
                    className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#13213D] font-extrabold flex items-center justify-between active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-[#F5A623]" />
                      <div className="text-left">
                        <span className="block text-xs">{t('View My Orders & Size Exchanges')}</span>
                        <span className="text-[10.5px] text-[#6B7385] font-normal">{orders.length} {t('order(s) placed')}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>,
              t('Uniforms and shoes')
            ),
        },
        {
          id: 'trips',
          label: `${t('School trips')} (${trips.length} active)`,
          icon: Compass,
          color: 'text-[#1FA971]',
          bg: 'bg-emerald-50',
          action: () =>
            pushPanel({
              title: t('School trips'),
              subtitle: t('Approved Field Studies, Consent & Live Follow'),
              content: <TripsPanel />,
            }),
        },
        {
          id: 'goals',
          label: `${t('Savings goals')} (${goals.length} goals)`,
          icon: ShieldCheck,
          color: 'text-indigo-500',
          bg: 'bg-indigo-50',
          action: () =>
            pushPanel({
              title: t('Savings goals'),
              subtitle: t('Save for Trips & School Gear'),
              content: <GoalsPanel />,
            }),
        },
        {
          id: 'notifications',
          label: t('Notification preferences & alerts'),
          icon: Bell,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          action: () =>
            openSheet(<NotificationsSheet initialTab="settings" />, t('Alert Channels & Settings')),
        },
      ],
    },
  ];

  const handleLanguageChange = (code: any) => {
    setLang(code);
    showToast(`${t('App language updated to')} ${LANGUAGES.find((l) => l.code === code)?.label}`);
  };

  return (
    <div className="space-y-4 px-4 -mt-12 relative z-20 pb-28 select-none">
      {/* Parent Account Card */}
      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#13213D] text-[#F5A623] font-black text-base flex items-center justify-center">
            {parent.n.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <b className="text-sm font-extrabold text-[#13213D] block">{parent.n}</b>
            <span className="text-xs text-[#6B7385] font-semibold">{parent.ph}</span>
            <small className="text-[10px] text-[#1FA971] font-bold block mt-0.5">
              {t('Verified Guardian Account')}
            </small>
          </div>
        </div>
      </div>

      {/* Menu Categories */}
      {menuSections.map((sec, idx) => (
        <div key={idx} className="space-y-2">
          <small className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7385] px-2 block">
            {sec.title}
          </small>
          <div className="bg-white rounded-3xl shadow-card border border-[#E5E8EF] overflow-hidden divide-y divide-[#E5E8EF]">
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#13213D]">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Language Selector Dropdown Card */}
      <div className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#F5A623]" />
          <b className="text-xs font-extrabold text-[#13213D]">
            {t('Language')}
          </b>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              className={`p-2.5 rounded-xl border font-bold text-left flex items-center justify-between transition-all ${
                lang === l.code
                  ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                  : 'bg-slate-50 border-[#E5E8EF] text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{l.native}</span>
              <span className="text-[10px] uppercase opacity-60">{l.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={logout}
        className="w-full py-4 rounded-3xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-extrabold flex items-center justify-center gap-2 border border-red-200 transition-colors shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        {t('Sign out')}
      </button>
    </div>
  );
};
