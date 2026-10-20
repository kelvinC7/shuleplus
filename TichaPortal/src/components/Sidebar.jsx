import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import {
  LayoutDashboard, Users, BookOpen, Calendar, CalendarDays, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, LogOut, GraduationCap, ChevronDown,
  DollarSign, Shield, ListChecks, UserCircle, ShoppingCart, ScanLine, Building2,
  BarChart2, Award, Brain, FileText, Target, TrendingUp, AlertTriangle,
  NotebookPen, PieChart, Radio, Lightbulb, Search,
} from 'lucide-react';
import {
  resolveTeacherPhotoUrl,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';

const GOLD = '#FEBF10';
const NAVY = '#000435';

function pathIsActive(location, path) {
  if (!path) return false;
  if (location.pathname === path) return true;
  if (path !== '/' && location.pathname.startsWith(`${path}/`)) return true;
  return false;
}

const NavItem = ({ icon: Icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent
      ${
        isActive
          ? 'bg-white/[0.12] text-[#FEBF10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
          : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon
          size={18}
          strokeWidth={1.75}
          className={isActive ? 'text-[#FEBF10] shrink-0' : 'text-white/45 shrink-0'}
        />
        <span className="truncate flex-1">{name}</span>
        {badgeCount > 0 && (
          <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-[#FEBF10]/90 text-[#0B1530] font-medium shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const SubNavLink = ({ name, path, icon: SubIcon, onClose, end, badgeCount = 0 }) => (
  <NavLink
    to={path}
    end={end}
    onClick={onClose}
    className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
      ${isActive ? 'text-[#FEBF10] bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-[#FEBF10]' : 'bg-white/30'}`}
          aria-hidden
        />
        <span className="truncate flex-1">{name}</span>
        {badgeCount > 0 && (
          <span className="text-[9px] leading-none px-1.5 py-0.5 rounded-md bg-[#FEBF10]/90 text-[#0B1530] font-medium shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const ExpandableNavItem = ({ icon: Icon, name, subItems, onClose, defaultOpen = false }) => {
  const location = useLocation();
  const isAnyActive = subItems.some((s) => pathIsActive(location, s.path));
  const [open, setOpen] = useState(defaultOpen || isAnyActive);

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight border border-transparent
          ${
            isAnyActive
              ? 'bg-white/[0.12] text-[#FEBF10] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
      >
        <Icon
          size={18}
          strokeWidth={1.75}
          className={isAnyActive ? 'text-[#FEBF10] shrink-0' : 'text-white/45 shrink-0'}
        />
        <span className="flex-1 text-left truncate">{name}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {subItems.map((sub) => (
            <SubNavLink
              key={sub.path}
              name={sub.name}
              path={sub.path}
              icon={sub.icon}
              end={sub.end}
              onClose={onClose}
              badgeCount={sub.badgeCount || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ label }) => (
  <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-white/38 px-3 pt-4 pb-1">
    {label}
  </p>
);

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { teacher, logout } = useAuth();
  const unreadCount = useChatUnread();
  const [photoError, setPhotoError] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');

  const teacherPhoto = resolveTeacherPhotoUrl(teacher?.photo);
  const teacherName = teacherDisplayName(teacher);
  const teacherInitial = teacherInitials(teacher);

  useEffect(() => {
    setPhotoError(false);
  }, [teacher?.photo]);

  const navSections = useMemo(
    () => [
      {
        label: 'Academic',
        items: [
          {
            type: 'group',
            icon: GraduationCap,
            name: 'Teaching',
            subItems: [
              { name: 'Students', path: '/students' },
              { name: 'My Teaching', path: '/my-teaching' },
              { name: 'My Courses', path: '/my-courses' },
              { name: 'Homework', path: '/homework' },
              { name: 'Timetable', path: '/timetable' },
              { name: 'Examinations', path: '/examinations' },
            ],
          },
          {
            type: 'group',
            icon: BarChart2,
            name: 'Marks & Assessments',
            subItems: [
              { name: 'Assessments', path: '/assessments/schedule' },
              { name: 'Courses & Marks', path: '/assessments' },
              { name: 'Marks hub', path: '/marks' },
              { name: 'Record marks', path: '/marks/record-marks' },
            ],
          },
          {
            type: 'group',
            icon: NotebookPen,
            name: 'Lesson planning',
            subItems: [
              { name: 'Generate lesson plan', path: '/lesson-planning/generate' },
              { name: 'All lesson plans', path: '/lesson-planning/all' },
              { name: 'Download plan book', path: '/lesson-planning/book' },
              { name: 'Course performance', path: '/lesson-planning/performance' },
            ],
          },
          {
            type: 'group',
            icon: ClipboardCheck,
            name: 'Attendance',
            subItems: [
              { name: 'Period attendance', path: '/attendance' },
              { name: 'Classroom QR scan', path: '/class-room-scan' },
              { name: 'Round roll call', path: '/round-roll-call' },
              { name: 'My attendance', path: '/teacher-attendance' },
            ],
          },
        ],
      },
      {
        label: 'School Services & Tools',
        items: [
          {
            type: 'group',
            icon: Building2,
            name: 'School Services & Tools',
            subItems: [
              { name: 'Ticha Avance', path: '/shule-avance' },
              { name: 'My Payroll', path: '/payroll' },
              { name: 'Repayment Schedule', path: '/repayment-schedule' },
              { name: 'TichaDeals', path: '/ticha-deals' },
              { name: 'Permissions', path: '/permissions' },
              { name: 'School calendar', path: '/school-calendar' },
            ],
          },
          {
            type: 'link',
            icon: MessageSquare,
            name: 'Parent messages',
            path: '/parent-messages',
          },
        ],
      },
      {
        label: 'Account',
        items: [{ type: 'link', icon: UserCircle, name: 'My Profile', path: '/profile' }],
      },
    ],
    [unreadCount]
  );

  const filteredSections = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return navSections;
    return navSections
      .map((section) => {
        const items = section.items
          .map((item) => {
            if (item.type === 'link') {
              return item.name.toLowerCase().includes(q) ? item : null;
            }
            const labelMatch = item.name.toLowerCase().includes(q);
            const subItems = item.subItems.filter(
              (s) => labelMatch || s.name.toLowerCase().includes(q)
            );
            if (!subItems.length) return null;
            return { ...item, subItems };
          })
          .filter(Boolean);
        if (!items.length) return null;
        return { ...section, items };
      })
      .filter(Boolean);
  }, [menuQuery, navSections]);

  const dashboardActive = pathIsActive(location, '/');

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm font-sans"
      style={{ background: NAVY, colorScheme: 'dark', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <NavLink to="/" onClick={onClose} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FEBF10]/70">
          <img
            src="/logo_white.png"
            alt="Shule+"
            className="h-9 w-auto max-w-[200px] object-contain object-left"
          />
          <p className="mt-2 text-[10px] font-medium tracking-[0.14em] uppercase text-[#FEBF10]">
            Teacher portal
          </p>
        </NavLink>
      </div>

      <div className="px-3 pt-3 shrink-0">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="Search menu…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2 pl-9 pr-3 text-[12px] font-medium text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 focus:bg-white/[0.08]"
            aria-label="Search menu"
          />
        </div>
      </div>

      <nav
        className="flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-1 pr-1 custom-scrollbar"
        aria-label="Teacher navigation"
      >
        <NavLink
          to="/"
          end
          onClick={onClose}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent
            ${
              dashboardActive
                ? 'bg-white/[0.12] text-[#FEBF10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
                : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
            }`}
        >
          <LayoutDashboard
            size={18}
            strokeWidth={1.75}
            className={dashboardActive ? 'text-[#FEBF10] shrink-0' : 'text-white/45 shrink-0'}
          />
          <span className="truncate">Dashboard</span>
        </NavLink>

        {filteredSections.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-white/45">No menu items match your search.</p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.label}>
              <SectionLabel label={section.label} />
              {section.items.map((item) =>
                item.type === 'link' ? (
                  <NavItem
                    key={item.path}
                    icon={item.icon}
                    name={item.name}
                    path={item.path}
                    onClose={onClose}
                  />
                ) : (
                  <ExpandableNavItem
                    key={item.name}
                    icon={item.icon}
                    name={item.name}
                    subItems={item.subItems}
                    onClose={onClose}
                    defaultOpen={!!menuQuery.trim()}
                  />
                )
              )}
            </div>
          ))
        )}
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06]">
        <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-white/10 bg-white/10"
            style={teacherPhoto && !photoError ? undefined : { background: `linear-gradient(135deg,${GOLD},#f59e0b)` }}
          >
            {teacherPhoto && !photoError ? (
              <img
                src={teacherPhoto}
                alt={teacherName}
                className="w-full h-full object-cover"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <span className="text-xs font-medium text-[#0b1530]">{teacherInitial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">{teacherName}</p>
            <p className="text-[10px] text-white/45 truncate font-medium">
              {teacher?.email || 'Teacher account'}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
