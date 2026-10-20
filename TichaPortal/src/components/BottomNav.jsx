import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Presentation, ClipboardCheck, ClipboardList, Menu,
} from 'lucide-react';

const BottomNav = ({ onMenuClick }) => {
  const navItems = [
    { icon: LayoutDashboard, name: 'Home', path: '/', exact: true },
    { icon: Presentation, name: 'Teaching', path: '/my-teaching' },
    { icon: ClipboardCheck, name: 'Attendance', path: '/attendance' },
    { icon: ClipboardList, name: 'Marks', path: '/assessments' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] flex flex-col bg-white/95 backdrop-blur-xl border-t border-black/5 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-[68px] items-stretch gap-x-0.5 px-1 min-[400px]:px-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `
              relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-300
              ${isActive ? 'text-[#000435]' : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-[#FEBF10]" />
                )}
                <div className={`relative shrink-0 rounded-xl p-1 min-[400px]:p-1.5 transition-all ${isActive ? 'bg-[#000435]/5' : ''}`}>
                  <item.icon
                    className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#000435]' : ''}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span
                  className={`max-w-full text-center text-[8px] font-medium uppercase leading-tight tracking-tight min-[400px]:text-[9px] ${isActive ? 'text-[#c87800]' : 'text-slate-400'}`}
                >
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMenuClick}
          className="relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-1 text-slate-400 hover:text-slate-600"
          aria-label="Open menu"
        >
          <div className="relative shrink-0 rounded-xl p-1 min-[400px]:p-1.5">
            <Menu className="h-5 w-5 shrink-0" strokeWidth={2} />
          </div>
          <span className="max-w-full text-center text-[8px] font-medium uppercase leading-tight tracking-tight text-slate-400 min-[400px]:text-[9px]">
            Menu
          </span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
