'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useAppLanguage } from '@/i18n/app-language';
import { LanguagePicker } from '@/components/i18n/language-picker';
import { cn } from '@/lib/utils';

export function AuthShell({
  backHref,
  backLabel,
  title,
  subtitle,
  mobileTitle,
  mobileBrand = true,
  compactMobile = false,
  children,
  showBrandPanel = true,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  /** Shorter heading on mobile (e.g. "Sign in") */
  mobileTitle?: string;
  mobileBrand?: boolean;
  /** Minimal mobile layout — no subtitle, slim footer */
  compactMobile?: boolean;
  children: React.ReactNode;
  showBrandPanel?: boolean;
}) {
  const { t } = useAppLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <div className="auth-bg flex min-h-dvh flex-col overflow-x-hidden">
      <header
        className={cn(
          'shrink-0 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-6 md:px-8 md:py-5',
          compactMobile ? 'pb-4 sm:pb-3' : 'pb-2 sm:pb-3',
        )}
      >
        {/* Mobile: [←]  logo  [flag] */}
        <div className="mx-auto flex max-w-5xl items-center gap-2 md:hidden">
          <Link
            href={backHref}
            aria-label={backLabel}
            title={backLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy/10 bg-white/95 text-navy shadow-[0_2px_12px_-4px_rgba(0,4,53,0.18)] transition-all active:scale-95 hover:border-primary/45 hover:bg-white"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </Link>

          <Link href="/" className="flex min-w-0 flex-1 items-center justify-center">
            <Image
              src="/logo.png"
              alt="Shule+"
              width={160}
              height={48}
              style={{ width: 'auto', height: 'auto' }}
              className="h-8 w-auto max-w-[130px] object-contain"
              priority
            />
          </Link>

          <LanguagePicker variant="auth" className="shrink-0" />
        </div>

        {/* Desktop: logo left · lang + back right */}
        <div className="mx-auto hidden max-w-5xl items-center justify-between gap-4 md:flex">
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.png"
              alt="Shule+"
              width={160}
              height={48}
              style={{ width: 'auto', height: 'auto' }}
              className="h-10 w-auto object-contain lg:h-12"
              priority
            />
          </Link>

          <div className="flex items-center gap-2.5">
            <LanguagePicker variant="auth" />
            <Link
              href={backHref}
              className="group inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/90 px-4 py-2.5 text-sm font-semibold text-navy shadow-soft backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white hover:shadow-md"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/5 transition-transform group-hover:-translate-x-0.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <span>{backLabel}</span>
            </Link>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'flex flex-1 justify-center overflow-y-auto px-3 sm:px-6',
          compactMobile
            ? 'items-start pt-8 pb-6 sm:items-center sm:py-4'
            : 'items-start py-2 sm:items-center sm:py-4',
        )}
      >
        <div
          className={cn(
            'flex w-full flex-col overflow-hidden bg-white shadow-[0_20px_70px_-28px_rgba(0,4,53,0.26)]',
            compactMobile
              ? 'mt-2 rounded-xl border border-navy/8 sm:mt-0 sm:rounded-3xl'
              : 'rounded-2xl border border-navy/5 sm:rounded-3xl',
            showBrandPanel
              ? 'max-w-md md:max-w-5xl md:flex-row lg:max-w-6xl'
              : 'max-w-md md:max-w-lg',
          )}
        >
          <div
            className={cn(
              'flex w-full flex-col justify-center md:px-10 md:py-9',
              compactMobile ? 'px-4 py-6 sm:px-8 sm:py-8' : 'px-4 py-5 sm:px-8 sm:py-8',
              showBrandPanel && 'md:w-[48%] lg:w-[46%]',
            )}
          >
            <div className="mb-6 hidden md:block">
              <h1 className="font-montserrat text-2xl font-bold text-navy lg:text-[1.65rem]">{title}</h1>
              {subtitle ? (
                <p className="mt-1.5 text-sm leading-relaxed text-navy/50 font-poppins-regular">{subtitle}</p>
              ) : null}
            </div>

            {mobileBrand ? (
              <div className={cn('md:hidden', compactMobile ? 'mb-6 border-b border-navy/8 pb-5' : 'mb-5')}>
                <h1 className="font-montserrat text-lg font-bold tracking-tight text-navy sm:text-xl">
                  {mobileTitle ?? title}
                </h1>
                {subtitle && !compactMobile ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-navy/50 font-poppins-regular">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}

            {children}
          </div>

          {showBrandPanel ? (
            <div className="relative hidden w-[52%] flex-col overflow-hidden bg-gradient-to-br from-primary via-[#f5c04a] to-[#FCB038] md:flex lg:w-[54%]">
              <div
                className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-white/20 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-navy/5"
                aria-hidden
              />

              <div className="relative flex min-h-0 flex-1 flex-col justify-end">
                <div className="px-6 pb-4 pt-6 text-center lg:px-8">
                  <p className="mx-auto max-w-[320px] font-poppins-medium text-lg italic leading-snug text-navy/90 lg:max-w-sm lg:text-xl xl:text-[1.35rem]">
                    &ldquo;{t.brandQuote}&rdquo;
                  </p>
                </div>
                <div className="flex w-full shrink-0 justify-center">
                  <Image
                    src="/login-bg-removebg.png"
                    alt=""
                    width={560}
                    height={640}
                    className="block h-auto w-full max-w-[380px] object-contain object-bottom lg:max-w-[420px] xl:max-w-[480px]"
                    priority
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <footer
        className={cn(
          'shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center sm:px-4',
          compactMobile ? 'md:space-y-2' : 'space-y-1.5 sm:space-y-2',
        )}
      >
        {compactMobile ? (
          <p className="text-[10px] font-medium text-navy/45 md:hidden">
            {t.managedBy}{' '}
            <span className="font-semibold text-navy/70">EDUPOTO</span>
            <span className="mx-1.5 text-navy/25">·</span>
            <span className="text-navy/35">© {currentYear}</span>
          </p>
        ) : null}

        <p
          className={cn(
            'text-[10px] font-poppins-semibold tracking-widest text-navy/60 uppercase sm:text-xs',
            compactMobile && 'hidden md:block',
          )}
        >
          {t.managedBy}{' '}
          <span className="font-poppins-bold text-primary">EDUPOTO</span>
        </p>

        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-poppins-medium text-navy/40 uppercase tracking-wider sm:gap-x-4 sm:text-[11px]',
            compactMobile && 'hidden md:flex',
          )}
        >
          <Link href="/terms" className="hover:text-primary transition-colors">
            {t.terms}
          </Link>
          <span className="hidden h-3 w-px bg-navy/20 sm:inline" />
          <Link href="/privacy" className="hover:text-primary transition-colors">
            {t.privacy}
          </Link>
          <span className="hidden h-3 w-px bg-navy/20 sm:inline" />
          <Link href="/user-data-access" className="hover:text-primary transition-colors">
            {t.userDataAccess}
          </Link>
        </div>

        <p
          className={cn(
            'text-[9px] font-poppins-regular tracking-wider text-navy/30 uppercase sm:text-[10px]',
            compactMobile && 'hidden md:block',
          )}
        >
          © {currentYear} EDUPOTO . {t.allRightsReserved}
        </p>
      </footer>
    </div>
  );
}
