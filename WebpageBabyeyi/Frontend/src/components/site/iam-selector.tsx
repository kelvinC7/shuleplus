'use client';

import { useEffect, useRef, useState } from 'react';
import type { IamRole } from '@/lib/types';
import { PARENT_PORTAL_URL } from '@/lib/auth-urls';
import { BookIcon, CardIcon, ChevronDownIcon, SchoolIcon, SendIcon, UserIcon } from './icons';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

const ROLE_PORTAL_URL: Partial<Record<IamRole, string>> = {
  parent: PARENT_PORTAL_URL,
};

const ROLE_ICONS: Record<IamRole, typeof SchoolIcon> = {
  school: SchoolIcon,
  teacher: BookIcon,
  parent: UserIcon,
};

export function IamSelector() {
  const { t } = useSiteLanguage();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<IamRole | null>(null);
  const [code, setCode] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const roles: Record<IamRole, { label: string; placeholder: string }> = {
    school: { label: t.iam.school, placeholder: t.iam.schoolPlaceholder },
    teacher: { label: t.iam.teacher, placeholder: t.iam.teacherPlaceholder },
    parent: { label: t.iam.parent, placeholder: t.iam.parentPlaceholder },
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function pick(r: IamRole) {
    const portalUrl = ROLE_PORTAL_URL[r];
    if (portalUrl) {
      window.location.href = portalUrl;
      return;
    }
    setRole(r);
    setCode('');
    setOpen(true);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex flex-nowrap items-center gap-1 rounded-[10px] border-[1.5px] border-ink-200 bg-white px-2 py-1.5 transition-colors hover:border-sky-300 sm:gap-1.5 sm:px-2.5 sm:py-2"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-sky-700 text-white">
          <SchoolIcon className="h-3.5 w-3.5" />
        </span>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.04em] text-ink-500 xl:inline">{t.iam.prefix}:</span>
        <span className="max-w-[88px] truncate whitespace-nowrap text-[12px] font-medium text-ink-900 sm:max-w-none sm:text-[12.5px]">
          {role ? roles[role].label : t.iam.selectRole}
        </span>
        <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-60 rounded-[14px] border border-ink-200 bg-white p-2 shadow-lg">
          {!role ? (
            <div className="flex flex-col gap-0.5">
              {(Object.keys(roles) as IamRole[]).map((r) => {
                const Icon = ROLE_ICONS[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium text-ink-700 transition-colors hover:bg-sky-50 hover:text-sky-700"
                  >
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {roles[r].label}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
            >
              <button
                type="button"
                aria-label={t.iam.changeRole}
                onClick={() => setRole(null)}
                className="flex h-[26px] w-[26px] shrink-0 cursor-pointer rounded-full bg-ink-100 text-base leading-none text-ink-700 hover:bg-ink-200"
              >
                ‹
              </button>
              <CardIcon className="h-4 w-4 shrink-0 text-sky-500" />
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={roles[role].placeholder}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-full border-[1.5px] border-ink-200 px-3 py-2 text-[12.5px] text-ink-900 outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                aria-label={t.iam.lookup}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-900 text-white hover:bg-sky-700"
              >
                <SendIcon className="h-3 w-3" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
