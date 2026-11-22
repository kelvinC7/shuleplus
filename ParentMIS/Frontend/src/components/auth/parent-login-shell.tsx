'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

function WelcomeCopy({
  className,
  tripOnly,
}: {
  className?: string;
  tripOnly?: boolean;
}) {
  return (
    <div className={className}>
      <h2 className="text-[clamp(1.75rem,3vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--yo-navy)]">
        {tripOnly ? 'School trips, made simple.' : 'Welcome back.'}
      </h2>

    </div>
  );
}

/**
 * The photo is a cut-out, so it is never scaled or cropped: it fills the space it is given
 * with object-contain and sits on the bottom edge of the amber panel.
 */
function HeroImage({
  className,
  sizes,
  variant = 'left',
}: {
  className?: string;
  sizes: string;
  variant?: 'left' | 'right';
}) {
  const src = variant === 'right' ? '/bg-logo-right.png' : '/bg-logo-left.png';
  return (
    <div className={`pointer-events-none relative select-none ${className ?? ''}`}>
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes={sizes}
        className="object-contain object-bottom"
      />
    </div>
  );
}

export function ParentLoginShell({
  backHref = '/',
  backLabel = 'Back to welcome',
  formTitle,
  formSubtitle,
  highlights,
  tripOnly,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  formTitle: string;
  formSubtitle?: string;
  highlights?: string[];
  tripOnly?: boolean;
  children: ReactNode;
}) {
  const pills =
    highlights ??
    (tripOnly
      ? ['Trip consent', 'Transport details', 'Trip alerts']
      : ['Pay fees', 'Follow marks', 'Top up pocket money']);
  return (
    <div className="yo-auth-bg flex min-h-[100dvh] flex-col gap-4 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:flex-none">
      {/* Mobile header: logo, copy on the left, photo on the right */}
      <div className="relative shrink-0 overflow-hidden bg-[var(--yo-amber)] min-[900px]:hidden">
        <div className="relative z-10 px-5 pt-5">
          <Link href="/">
            <Image src="/logo.png" alt="yoShule" width={280} height={80} className="h-8 w-auto" priority />
          </Link>
        </div>
        <WelcomeCopy className="relative z-10 px-5 pb-6 pt-4" tripOnly={tripOnly} />
      </div>

      {/* Desktop left panel */}
      <aside className="relative hidden flex-col overflow-hidden bg-[var(--yo-amber)] text-[var(--yo-navy)] min-[900px]:flex min-[900px]:min-h-[100dvh] min-[900px]:px-12 min-[900px]:pt-10">
        <div
          aria-hidden
          className="absolute -bottom-24 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-white/25 blur-3xl"
        />
        <Link href="/" className="relative shrink-0">
          <Image src="/logo.png" alt="yoShule" width={360} height={96} className="h-[34px] w-auto" priority />
        </Link>
        <WelcomeCopy className="relative mt-10 shrink-0" tripOnly={tripOnly} />
        <ul className="relative mt-5 flex shrink-0 flex-wrap gap-2">
          {pills.map((h) => (
            <li key={h} className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-bold text-[var(--yo-navy)]">
              {h}
            </li>
          ))}
        </ul>
        <HeroImage className="mt-6 min-h-[340px] flex-1" sizes="(min-width: 900px) 50vw, 100vw" variant="right" />
      </aside>

      <main className="flex flex-1 flex-col min-[900px]:min-h-[100dvh] min-[900px]:justify-center min-[900px]:bg-[var(--yo-bg)] min-[900px]:px-10 min-[900px]:py-10">
        <div className="-mt-7 flex flex-1 flex-col rounded-t-[28px] bg-[var(--yo-bg)] px-4 pb-8 pt-5 min-[900px]:mt-0 min-[900px]:w-full min-[900px]:max-w-[440px] min-[900px]:flex-none min-[900px]:self-center min-[900px]:rounded-[28px] min-[900px]:bg-transparent min-[900px]:p-0">
          <div className="flex flex-1 flex-col rounded-[28px] border border-[var(--yo-line)]/60 bg-white px-6 py-7 shadow-[0_16px_48px_rgba(19,33,61,0.07)] min-[900px]:px-8 min-[900px]:py-9">
            <Link
              href={backHref}
              className="mb-6 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[var(--yo-muted)] transition hover:text-[var(--yo-navy)]"
            >
              <span aria-hidden>←</span>
              {backLabel}
            </Link>

            <header className="border-b border-[var(--yo-line)] pb-5">
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[var(--yo-navy)] min-[900px]:text-[28px]">
                {formTitle}
              </h1>
              {formSubtitle ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--yo-muted)]">{formSubtitle}</p>
              ) : null}
            </header>

            <div className="flex flex-col gap-4 pt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}