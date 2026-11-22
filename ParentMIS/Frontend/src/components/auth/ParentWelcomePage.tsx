'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { PARENT_HELP_PHONE, PARENT_PORTAL_SCHOOL } from '@/lib/parent-auth-api';
import { ParentFindChild } from './ParentFindChild';

/* ---- Configure here ------------------------------------------------------------------------
 * Store links and YouTube video IDs. Leave a value empty and the button / video shows "coming soon".
 * Set them in .env.local (NEXT_PUBLIC_*) or paste the values below.
 */
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? '';
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '';
/** Direct APK — host file at public/downloads/ or set a full HTTPS URL */
const PARENT_APK_URL = process.env.NEXT_PUBLIC_PARENT_APK_URL ?? '/downloads/yoshule-parent.apk';
const TRAINING: { title: string; length: string; videoId: string }[] = [
  { title: 'Pay school fees', length: '2 min', videoId: process.env.NEXT_PUBLIC_VIDEO_PAY_FEES ?? '' },
  { title: 'Get the Babyeyi', length: '1 min', videoId: process.env.NEXT_PUBLIC_VIDEO_BABYEYI ?? '' },
  { title: 'Using the Parent Console', length: '3 min', videoId: process.env.NEXT_PUBLIC_VIDEO_CONSOLE ?? '' },
];
const NAV_LINKS = [
  { label: 'Find a child', href: '#find' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Get the app', href: '#app' },
];

const Svg = ({ d, className = 'h-5 w-5' }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const FEATURES: { title: string; body: string; cta: string; href: string; icon: ReactNode }[] = [
  {
    title: 'Pay school fees',
    body: 'Pay in full or in parts with Mobile Money, card or bank, and get an instant receipt.',
    cta: 'Pay a fee', href: '#find', icon: <Svg d="M3 6h18v12H3zM3 10h18" />,
  },
  {
    title: 'Follow learning',
    body: 'See marks, attendance, homework and teacher comments for each child in one place.',
    cta: 'Open Parent Console', href: '/login', icon: <Svg d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5" />,
  },
  {
    title: 'Top up ShuleCard',
    body: 'Add pocket money to your child’s card and see every purchase as it happens.',
    cta: 'Log In to Top Up', href: '/login', icon: <Svg d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4" />,
  },
];

function SectionHead({ eyebrow, title, body, light }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <div className="max-w-[540px]">
      <span className={`text-[11px] font-bold uppercase tracking-[.14em] ${light ? 'text-[var(--yo-amber)]' : 'text-[var(--yo-muted)]'}`}>{eyebrow}</span>
      <h2 className={`mt-2.5 text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] min-[900px]:text-[34px] ${light ? 'text-white' : 'text-[var(--yo-navy)]'}`}>{title}</h2>
      {body ? <p className={`mt-3 text-[15px] leading-relaxed ${light ? 'text-white/70' : 'text-[var(--yo-muted)]'}`}>{body}</p> : null}
    </div>
  );
}

/** Full-width section with one consistent rhythm: same width, same padding, flat colour. */
function Band({ id, children, variant = 'page' }: { id?: string; children: ReactNode; variant?: 'page' | 'white' | 'navy' }) {
  const bg = variant === 'navy' ? 'bg-[var(--yo-navy)]' : variant === 'white' ? 'bg-white' : 'bg-[var(--yo-bg)]';
  return (
    <section id={id} className={`scroll-mt-4 ${bg}`}>
      <div className="mx-auto max-w-[1100px] px-5 py-14 min-[900px]:px-14 min-[900px]:py-20">{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- hero art */
function WelcomeHeroArt() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden min-[900px]:inset-x-auto min-[900px]:left-[38%] min-[900px]:right-0 min-[900px]:top-20 min-[900px]:block min-[900px]:h-auto">
        <Image src="/bg-logo-left.png" alt="" fill priority sizes="55vw" className="object-contain object-right-bottom" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[0] bg-gradient-to-b from-[var(--yo-amber)] via-[var(--yo-amber)] to-[#e8940f] min-[900px]:bg-none" aria-hidden />
    </>
  );
}

/* ------------------------------------------------------------------------ training video */
function TrainingVideo() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = TRAINING[active];

  return (
    <Band id="how-it-works" variant="white">
      <SectionHead eyebrow="How it works" title="Learn it in a few minutes" body="Short videos walk you through every step, from finding your child to getting your receipt." />
      <div className="mt-9 grid gap-6 min-[900px]:mt-12 min-[900px]:grid-cols-[1.7fr_1fr] min-[900px]:gap-8">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[var(--yo-navy)]">
          {playing && current.videoId ? (
            <iframe
              key={current.videoId}
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1&rel=0`}
              title={current.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#13213d] to-[#24396a] px-6 text-center text-white">
              <button
                type="button"
                onClick={() => current.videoId && setPlaying(true)}
                disabled={!current.videoId}
                aria-label={current.videoId ? `Play: ${current.title}` : `${current.title} — coming soon`}
                className="grid h-16 w-16 place-items-center rounded-full bg-white text-[var(--yo-navy)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <svg className="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
              </button>
              <div>
                <b className="block text-base min-[900px]:text-lg">{current.title}</b>
                <span className="mt-0.5 block text-xs text-white/65">{current.videoId ? `${current.length} · Training video` : 'Video coming soon'}</span>
              </div>
            </div>
          )}
        </div>

        <ul className="grid content-start gap-3">
          {TRAINING.map((t, i) => (
            <li key={t.title}>
              <button
                type="button"
                onClick={() => { setActive(i); setPlaying(false); }}
                aria-pressed={i === active}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${i === active ? 'border-[var(--yo-navy)] bg-white' : 'border-[var(--yo-line)] bg-[var(--yo-bg)] hover:border-[var(--yo-navy)]/30'}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${i === active ? 'bg-[var(--yo-navy)] text-white' : 'bg-white text-[var(--yo-navy)]'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[15px] text-[var(--yo-navy)]">{t.title}</b>
                  <small className="text-xs text-[var(--yo-muted)]">{t.length}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Band>
  );
}

/* ------------------------------------------------------------------------- get the app */
const PLAY_ICON = 'M3.6 2.2v19.6L14.5 12 3.6 2.2zM16.9 9.9 5.4 3.3l9.1 8.2 2.4-1.6zM5.4 20.7l11.5-6.6-2.4-1.6-9.1 8.2zM21 12c0-.6-.3-1-.8-1.3l-2.6-1.5L15.1 12l2.5 2.8 2.6-1.5c.5-.3.8-.7.8-1.3z';
const APPLE_ICON = 'M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.21 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.61 1.09zM15.53 3.83c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.45 2.34-1.27 3.71 1.34.1 2.72-.69 3.55-1.7z';

function StoreButton({ href, label, name, icon }: { href: string; label: string; name: string; icon: string }) {
  const ready = Boolean(href);
  return (
    <a
      href={ready ? href : undefined}
      target={ready ? '_blank' : undefined}
      rel={ready ? 'noopener noreferrer' : undefined}
      aria-disabled={!ready}
      className={`flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-white px-5 text-[var(--yo-navy)] transition min-[480px]:flex-none min-[480px]:justify-start ${ready ? 'hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(0,0,0,.25)]' : 'cursor-default'}`}
    >
      <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={icon} /></svg>
      <span className="leading-tight">
        <small className="block text-[10px] font-semibold text-[var(--yo-muted)]">{ready ? label : 'Coming soon on'}</small>
        <b className="text-[15px]">{name}</b>
      </span>
    </a>
  );
}

function GetTheApp() {
  const apkReady = Boolean(PARENT_APK_URL);
  return (
    <Band id="app" variant="navy">
      <div className="grid items-center gap-12 min-[900px]:grid-cols-2 min-[900px]:gap-10">
        <div>
          <SectionHead light eyebrow="Mobile app" title="Take yoShule with you" body="Pay fees, check marks and top up the ShuleCard from your phone, wherever you are." />
          <div className="mt-8 flex flex-col gap-3 min-[480px]:flex-row">
            <StoreButton href={PLAY_STORE_URL} label="Get it on" name="Google Play" icon={PLAY_ICON} />
            <StoreButton href={APP_STORE_URL} label="Download on the" name="App Store" icon={APPLE_ICON} />
          </div>
          {apkReady && (
            <p className="mt-6 text-sm text-white/60">
              No Google Play?{' '}
              <a
                href={PARENT_APK_URL}
                {...(PARENT_APK_URL.startsWith('/') ? { download: 'yoshule-parent.apk' } : { target: '_blank', rel: 'noopener noreferrer' })}
                className="font-bold text-[var(--yo-amber)] underline-offset-4 hover:underline"
              >
                Download the Android APK
              </a>
              <span className="mt-1 block text-xs text-white/40">Allow installs from your browser when prompted.</span>
            </p>
          )}
        </div>

        <div className="hidden justify-center min-[900px]:flex min-[900px]:justify-end">
          <Image
            src="/mobileimage.jpeg"
            alt="The yoShule parent app on a phone"
            width={560}
            height={720}
            className="h-auto w-[min(100%,320px)] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.4)]"
          />
        </div>
      </div>
    </Band>
  );
}

/* ------------------------------------------------------------------------------- page */
export function ParentWelcomePage() {
  return (
    <div className="yo-auth-bg min-h-[100dvh] bg-[var(--yo-bg)]">
      <section className="relative overflow-hidden bg-[var(--yo-amber)] text-[var(--yo-navy)]">
        <WelcomeHeroArt />

        <header className="relative z-10 mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5 min-[900px]:px-14 min-[900px]:py-7">
          <Link href="/" className="shrink-0 rounded-lg bg-white/40 px-2 py-1 backdrop-blur-sm">
            <Image src="/logo.png" alt="yoShule" width={360} height={96} className="h-[34px] w-auto" priority />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hidden rounded-full px-3.5 py-2 text-[13px] font-bold transition hover:bg-white/40 min-[900px]:inline-flex">{l.label}</a>
            ))}
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1100px] px-5 pb-6 pt-2 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(280px,46%)] min-[900px]:items-end min-[900px]:gap-8 min-[900px]:px-14 min-[900px]:pb-0 min-[900px]:pt-4">
          <div className="max-w-[560px] pb-8 min-[900px]:pb-28 min-[900px]:pt-14">
            <span className="inline-block rounded-full bg-white/55 px-3 py-1.5 text-xs font-bold">{PARENT_PORTAL_SCHOOL} · Parent portal</span>
            <h1 className="mt-5 text-[clamp(2rem,6.4vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">Equitable school readiness, in your pocket.</h1>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[#5c3d00] min-[900px]:text-[17px]">
              Pay fees, follow your children&apos;s progress and top up pocket money, from your phone or computer.
            </p>
            <div className="mt-7 grid gap-3 min-[480px]:flex min-[900px]:mt-9">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--yo-navy)] px-6 text-sm font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_10px_24px_rgba(19,33,61,.28)] transition hover:-translate-y-px"
              >
                Log In to Parent Console
              </Link>
              <a
                href="#find"
                className="inline-flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-[var(--yo-navy)]/25 px-6 text-sm font-extrabold uppercase tracking-[0.04em] transition hover:bg-white/40"
              >
                Find a Child
              </a>
            </div>
          </div>
          <div className="hidden min-[900px]:block" aria-hidden />
        </div>
      </section>

      <ParentFindChild />

      <Band id="features">
        <SectionHead eyebrow="What you can do" title="Everything in one place" />
        <div className="mt-9 grid gap-4 min-[900px]:mt-12 min-[900px]:grid-cols-3 min-[900px]:gap-5">
          {FEATURES.map((f) => (
            <article key={f.title} className="flex flex-col rounded-2xl border border-[var(--yo-line)] bg-white p-6 transition duration-200 hover:border-[var(--yo-navy)]/25 hover:shadow-[0_12px_32px_rgba(19,33,61,.07)] min-[900px]:p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--yo-bg)] text-[var(--yo-navy)]">{f.icon}</span>
              <h3 className="mt-5 text-[17px] font-bold text-[var(--yo-navy)]">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--yo-muted)]">{f.body}</p>
              <Link href={f.href} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--yo-navy)]/20 text-sm font-bold text-[var(--yo-navy)] transition hover:border-[var(--yo-navy)] hover:bg-[var(--yo-navy)] hover:text-white">
                {f.cta}
                <Svg d="M5 12h14M13 6l6 6-6 6" className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </Band>

      <TrainingVideo />
      <GetTheApp />

      <footer className="bg-[var(--yo-navy)] px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-2 text-center text-xs font-semibold text-white/55">
        <div className="mx-auto max-w-[1100px] border-t border-white/10 pt-6">
          Powered by yoShule · Need help?{' '}
          <a href={`tel:${PARENT_HELP_PHONE.replace(/\s/g, '')}`} className="text-white underline-offset-2 hover:underline">{PARENT_HELP_PHONE}</a>
        </div>
      </footer>
    </div>
  );
}
