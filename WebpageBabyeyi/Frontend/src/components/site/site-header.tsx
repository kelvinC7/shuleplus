'use client';

import { useMemo, useState } from 'react';
import { Logo } from './logo';
import { IamSelector } from './iam-selector';
import { Button, buttonVariants } from '@/components/ui/button';
import { BookIcon, CloseIcon, MenuIcon } from './icons';
import { cn } from '@/lib/utils';
import { REGISTER_SCHOOL_URL } from '@/lib/auth-urls';
import { useSiteLanguage } from './language-provider';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useSiteLanguage();

  const navItems = useMemo(
    () => [
      { label: t.nav.explore, href: '#', active: true },
      { label: t.nav.studyChina, href: '#' },
      { label: t.nav.jobsNews, href: '#' },
      { label: t.nav.about, href: '#' },
    ],
    [t],
  );

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_var(--color-ink-200)]">
      <div className="site-container grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 lg:gap-4 lg:py-3">
        <Logo className="shrink-0" />

        <nav aria-label="Main" className="hidden min-w-0 justify-center lg:flex">
          <div className="flex max-w-full items-center gap-4 xl:gap-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'relative shrink-0 whitespace-nowrap py-1.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:text-sky-600 xl:text-sm',
                  item.active && 'text-sky-600',
                )}
              >
                {item.label}
                {item.active && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-[3px] bg-amber-500" />
                )}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <div className="hidden xl:block">
            <IamSelector />
          </div>
          <Button variant="outline" size="sm" className="hidden whitespace-nowrap lg:inline-flex">
            {t.nav.signIn}
          </Button>
          <a
            href={REGISTER_SCHOOL_URL}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'hidden whitespace-nowrap px-3 text-xs lg:inline-flex xl:px-4 xl:text-sm',
            )}
          >
            {t.nav.registerSchool}
          </a>
          <button
            type="button"
            aria-label={t.nav.menu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="shrink-0 rounded-md p-1.5 text-sky-700 lg:hidden"
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav
        className={cn(
          'flex-col border-t border-ink-200 bg-white shadow-md lg:hidden',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={cn(
              'border-b border-ink-100 px-6 py-3.5 text-[15px] font-medium text-ink-700',
              item.active && 'text-sky-600',
            )}
          >
            {item.label}
          </a>
        ))}
        <div className="flex flex-col gap-2.5 p-6">
          <IamSelector />
          <Button variant="outline" size="sm" className="w-full">
            {t.nav.signIn}
          </Button>
          <Button asChild size="sm" className="w-full">
            <a href={REGISTER_SCHOOL_URL}>{t.nav.registerSchool}</a>
          </Button>
          <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
            <BookIcon className="h-3 w-3" /> {t.nav.tagline}
          </p>
        </div>
      </nav>
    </header>
  );
}
