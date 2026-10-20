'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, UserRound } from 'lucide-react';
import { useAppLanguage } from '@/i18n/app-language';
import { LanguagePicker } from '@/components/i18n/language-picker';
import { cn } from '@/lib/utils';

const SHULEKIT_URL =
  process.env.NEXT_PUBLIC_SHULEKIT_URL?.trim() || 'http://localhost:3039';

const MINI_WEBSITE_URL =
  process.env.NEXT_PUBLIC_MINI_WEBSITE_URL?.trim() || 'http://localhost:3054';

type NavLink =
  | { id: string; label: string; href: string; match?: 'exact' | 'prefix' }
  | { id: string; label: string; href: string; external: true }
  | { id: string; label: string; href: string; lookup: true };

function scrollToStudentLookup() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-student-lookup]'));
  const visible =
    targets.find((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return el.getClientRects().length > 0;
    }) ?? targets[0];
  if (!visible) return;
  visible.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const input = visible.querySelector<HTMLInputElement>('input');
  input?.focus({ preventScroll: true });
}

function useNavActive() {
  const pathname = usePathname();

  return function isActive(link: NavLink): boolean {
    if ('external' in link && link.external) return false;
    if (link.id === 'home') return pathname === '/';
    if (link.id === 'modules') {
      return pathname === '/enter-as-school' || pathname.startsWith('/onboard');
    }
    if (link.href.startsWith('/#')) return false;
    if ('match' in link && link.match === 'prefix') return pathname.startsWith(link.href);
    return pathname === link.href;
  };
}

function NavUnderline({ active }: { active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 transition-all duration-300 ease-out',
        active
          ? 'opacity-100 scale-x-100'
          : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:scale-x-100 group-focus-visible:opacity-100',
      )}
    />
  );
}

function DesktopNavLink({
  link,
  active,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  onNavigate?: () => void;
}) {
  const className = cn(
    'group relative flex h-[60px] shrink-0 items-center whitespace-nowrap px-2 text-[11px] font-semibold tracking-wide text-white/75 transition-colors duration-200 sm:h-[72px] sm:px-2.5 sm:text-[12px] lg:px-3 lg:text-[13px] xl:px-3.5 xl:text-[14px]',
    'hover:text-white focus-visible:text-white focus-visible:outline-none',
    active && 'text-white',
  );

  const content = (
    <>
      <span className="relative z-[1]">{link.label}</span>
      <NavUnderline active={active} />
    </>
  );

  if ('external' in link && link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  if ('lookup' in link && link.lookup) {
    return (
      <a
        href={link.href}
        className={className}
        onClick={(e) => {
          if (window.location.pathname === '/') {
            e.preventDefault();
            scrollToStudentLookup();
          }
          onNavigate?.();
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

function DrawerNavLink({
  link,
  active,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  onNavigate?: () => void;
}) {
  const className = cn(
    'group relative flex items-center rounded-lg border-l-[3px] py-3.5 pl-4 pr-3 text-[15px] font-semibold transition-all duration-200',
    active
      ? 'border-amber-400 bg-white/[0.06] text-white'
      : 'border-transparent text-white/80 hover:border-amber-400/70 hover:bg-white/[0.04] hover:text-white',
  );

  if ('external' in link && link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {link.label}
      </a>
    );
  }

  if ('lookup' in link && link.lookup) {
    return (
      <a
        href={link.href}
        className={className}
        onClick={(e) => {
          if (window.location.pathname === '/') {
            e.preventDefault();
            scrollToStudentLookup();
          }
          onNavigate?.();
        }}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export function Navbar(_props: { protrudeCta?: boolean } = {}) {
  const { t } = useAppLanguage();
  const isActive = useNavActive();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks: NavLink[] = [
    { id: 'home', label: t.navHome, href: '/' },
    { id: 'about', label: t.navAbout, href: '/#about-us' },
    { id: 'modules', label: t.navModules, href: '/enter-as-school' },
    { id: 'shulekit', label: t.navShuleKit, href: SHULEKIT_URL, external: true },
    { id: 'websites', label: t.navSchoolWebsites, href: MINI_WEBSITE_URL, external: true },
    { id: 'how', label: t.navHowItWorks, href: '/#how-it-works' },
    { id: 'pay', label: t.navPayFees, href: '/#student-lookup', lookup: true },
  ];

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-[#000435] transition-[box-shadow,background-color] duration-300',
        scrolled
          ? 'shadow-[0_4px_30px_rgba(0,0,0,0.35)] backdrop-blur-md bg-[#000435]/95'
          : 'shadow-none',
      )}
    >
      {/* Institutional accent line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent"
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-300',
          scrolled ? 'opacity-100' : 'opacity-60',
          'bg-gradient-to-r from-transparent via-white/12 to-transparent',
        )}
        aria-hidden
      />

      <div className="relative mx-auto flex h-[60px] max-w-[1400px] items-stretch gap-2 px-3 sm:h-[72px] sm:gap-3 sm:px-5 lg:gap-4 lg:px-6 xl:gap-5 xl:px-8">
        <Link href="/" className="flex shrink-0 items-center self-center">
          <Image
            src="/logo_white.png"
            alt="Shule+"
            width={140}
            height={42}
            className="h-8 w-auto sm:h-9 xl:h-10"
            priority
          />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-stretch justify-center gap-0 overflow-x-auto lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {navLinks.map((link) => (
            <DesktopNavLink
              key={link.id}
              link={link}
              active={isActive(link)}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 self-center sm:gap-2">
          <LanguagePicker variant="navbar" />

          <Link
            href="/login"
            className={cn(
              'inline-flex shrink-0 items-center justify-center text-white transition-all duration-200',
              'h-9 w-9 rounded-full border border-white/20 bg-white/[0.04]',
              'hover:border-amber-400/50 hover:bg-amber-500/10 hover:shadow-[0_0_0_1px_rgba(252,176,56,0.2)]',
              'sm:h-10 sm:w-10',
              'lg:h-auto lg:w-auto lg:gap-2 lg:rounded-lg lg:border-white/25 lg:px-4 lg:py-2.5 lg:text-sm lg:font-semibold',
              'lg:hover:border-amber-400/60 lg:hover:bg-amber-500/[0.12]',
            )}
            title={t.navLogin}
            aria-label={t.navLogin}
          >
            <UserRound className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <span className="hidden whitespace-nowrap lg:inline">{t.navLogin}</span>
          </Link>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-white transition-colors hover:border-white/10 hover:bg-white/[0.06] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={t.closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[#000435]/75 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-50 overflow-hidden border-t border-white/10 bg-[#000435] lg:hidden"
            >
              <div className="mx-auto max-h-[calc(100dvh-60px)] overflow-y-auto px-4 py-5 sm:max-h-[calc(100dvh-72px)]">
                <nav className="flex flex-col gap-0.5" aria-label="Main mobile">
                  {navLinks.map((link) => (
                    <DrawerNavLink
                      key={link.id}
                      link={link}
                      active={isActive(link)}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </nav>

                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                  <LanguagePicker variant="drawer" />
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
