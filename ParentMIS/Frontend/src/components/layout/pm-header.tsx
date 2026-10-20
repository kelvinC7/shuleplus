'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Menu,
  Users,
  Check,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { clearTokens } from '@/shared/auth-token';
import { breadcrumbLabel } from '@/config/pm-sidebar';
import { api } from '@/services/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useNotificationStream, type LiveNotification } from '@/hooks/use-notification-stream';

interface PmHeaderProps {
  onToggleSidebar: () => void;
}

export function PmHeader({ onToggleSidebar }: PmHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, summary, linkedStudents, activeStudentId, setActiveStudent } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; body: string; createdAt: string; isRead: boolean; link: string | null }>>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const studentMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (studentMenuRef.current && !studentMenuRef.current.contains(e.target as Node)) {
        setStudentMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refreshNotifs = useCallback(() => {
    void api.get('/notifications').then((res) => {
      setUnread(res.data.data?.unread ?? 0);
      setNotifs((res.data.data?.items ?? []).slice(0, 8));
    }).catch(() => undefined);
  }, []);

  const onLiveNotification = useCallback((incoming: LiveNotification) => {
    setUnread((count) => count + (incoming.isRead ? 0 : 1));
    setNotifs((rows) => [incoming, ...rows.filter((n) => n.id !== incoming.id)].slice(0, 8));
  }, []);

  useNotificationStream(onLiveNotification);

  useEffect(() => {
    refreshNotifs();
  }, [pathname, refreshNotifs]);

  const activeStudent =
    linkedStudents.find((s) => s.id === activeStudentId) ??
    (summary?.student
      ? {
          id: summary.student.id,
          fullName: summary.student.fullName,
          className: summary.student.class,
          isPrimary: true,
        }
      : null);

  const displayName = activeStudent?.fullName || user?.email?.split('@')[0] || 'Parent';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const pageTitle = breadcrumbLabel(pathname);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const handleSwitch = (id: string) => {
    setActiveStudent(id);
    setStudentMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              className="shrink-0 rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden"
              onClick={onToggleSidebar}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted sm:text-xs">
                Parent Portal <span className="text-border">›</span>{' '}
                <span className="text-navy/80">{pageTitle}</span>
              </p>
              <h1 className="truncate text-base font-semibold text-navy lg:hidden">{pageTitle}</h1>
            </div>
          </div>

          <div className="relative hidden max-w-md flex-1 px-2 lg:block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search attendance, fees, store, timetable…"
              className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white"
              aria-label="Search"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Student switcher */}
            <div className="relative hidden sm:block" ref={studentMenuRef}>
              <button
                type="button"
                onClick={() => setStudentMenuOpen((prev) => !prev)}
                aria-expanded={studentMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2 transition hover:border-primary/40 sm:gap-2.5 sm:pr-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary">
                  {initials || 'P'}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[120px] truncate text-sm font-semibold leading-tight text-navy">
                    {activeStudent?.fullName ?? 'My Children'}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {activeStudent?.className ?? 'No student'}
                  </span>
                </span>
                <svg
                  className={`hidden text-navy/30 sm:block ${studentMenuOpen ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {studentMenuOpen && linkedStudents.length > 0 && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-xl animate-scale-in"
                >
                  <div className="border-b border-border bg-[#f8fafc] px-4 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      <Users size={12} className="text-primary" />
                      My Children
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-1.5">
                    {linkedStudents.map((student) => {
                      const isActive = student.id === activeStudentId;
                      return (
                        <button
                          key={student.id}
                          onClick={() => handleSwitch(student.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                            isActive ? 'bg-navy/[0.04]' : 'hover:bg-slate-50'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              isActive
                                ? 'bg-gradient-to-br from-navy to-navy-light text-primary'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {student.fullName
                              .split(' ')
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-navy">
                              {student.fullName}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {student.className || student.shuleCode}
                              {student.isPrimary ? ' · Primary' : ''}
                            </span>
                          </span>
                          {isActive && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-full border border-border bg-white p-2 text-navy transition hover:border-primary/40"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold text-navy">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </button>
              {notifOpen ? (
                <div className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-bold text-navy">Notifications</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-navy"
                      onClick={() => {
                        void api.put('/notifications/read-all').then(() => { setUnread(0); setNotifs((rows) => rows.map((n) => ({ ...n, isRead: true }))); });
                      }}
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length ? notifs.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={cn('block w-full border-b border-slate-50 px-4 py-3 text-left last:border-0', n.isRead ? 'bg-white' : 'bg-primary/[0.05]')}
                        onClick={() => {
                          if (!n.isRead) void api.put(`/notifications/${n.id}/read`);
                          setNotifOpen(false);
                          router.push(n.link || '/notifications');
                        }}
                      >
                        <p className="text-sm font-semibold text-navy">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                      </button>
                    )) : (
                      <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full border-t border-border px-4 py-2.5 text-sm font-semibold text-navy"
                    onClick={() => { setNotifOpen(false); router.push('/notifications'); }}
                  >
                    View all notifications
                  </button>
                </div>
              ) : null}
            </div>

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2 transition hover:border-primary/40 sm:gap-2.5 sm:pr-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary">
                  {initials || 'P'}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[120px] truncate text-sm font-semibold leading-tight text-navy">
                    {user?.email?.split('@')[0] || 'Parent'}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Parent Account
                  </span>
                </span>
                <svg
                  className={`hidden text-navy/30 sm:block ${menuOpen ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-border bg-white shadow-xl animate-scale-in"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                    <p className="truncate text-xs text-muted">{user?.email ?? 'Parent Portal'}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-navy/[0.03]"
                  >
                    <UserIcon size={16} className="text-muted" />
                    Student Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative w-full lg:hidden">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search attendance, fees, store, timetable…"
            className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white"
            aria-label="Search"
          />
        </div>
      </div>
    </header>
  );
}
