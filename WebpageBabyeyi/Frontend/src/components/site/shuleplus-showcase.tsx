'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { BoaSunMark } from './icons';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

interface Slide {
  id: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  image: string;
  variant: 'photo' | 'logo';
  chipIcon?: ReactNode;
}

const SLIDE_META = [
  { id: 'boa-fees', image: '/PayFees.jpeg', variant: 'photo' as const, chipIcon: <BoaSunMark className="h-3.5 w-3.5" /> },
  { id: 'shulekit', image: '/ShuleKit.jpeg', variant: 'photo' as const },
  { id: 'shulecard', image: '/shulecard.png', variant: 'photo' as const },
];

const SLIDE_BG = 'bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500';
const CHIP_CLASS = 'border border-[#402A00]/15 bg-white/70 text-[#402A00]';
const CTA_CLASS = 'bg-[#0B2545] text-white hover:bg-[#123568]';
const AUTOPLAY_MS = 5000;

export function ShuleplusShowcase() {
  const { t } = useSiteLanguage();
  const slides: Slide[] = t.showcase.slides.map((copy, i) => ({ ...SLIDE_META[i], ...copy }));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = (next: number) =>
    setIndex((current) => {
      const base = typeof next === 'number' ? next : current;
      return ((base % slides.length) + slides.length) % slides.length;
    });

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  return (
    <div className="site-container relative z-[3] -mt-14 max-sm:-mt-10 sm:-mt-12">
      <section
        aria-roledescription="carousel"
        aria-label={t.showcase.ariaLabel}
        className="relative h-[300px] select-none overflow-hidden rounded-[22px] shadow-lg max-sm:h-[min(520px,calc(100dvh-220px))] sm:h-[320px] lg:h-[300px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchStartX.current = null;
        }}
      >
        {slides.map((slide, i) => {
          const active = i === index;
          const isPhoto = slide.variant === 'photo';

          return (
            <article
              key={slide.id}
              role="group"
              aria-label={`${t.showcase.goTo(i + 1)} (${i + 1}/${slides.length})`}
              aria-hidden={!active}
              className={cn(
                'absolute inset-0 transition-all duration-700 ease-out',
                active ? 'z-10 scale-100 opacity-100' : 'pointer-events-none z-0 scale-[1.06] opacity-0',
                SLIDE_BG,
              )}
            >
              <span
                aria-hidden
                className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
              />
              <span
                aria-hidden
                className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-black/10 blur-2xl"
              />

              <div className="relative z-[2] flex h-full items-center gap-6 px-9 max-sm:flex-col max-sm:justify-center max-sm:gap-4 max-sm:px-5 max-sm:py-7 max-sm:pb-14 sm:px-7">
                {/* Image — large and centered on mobile */}
                <div
                  className={cn(
                    'relative shrink-0 overflow-hidden bg-white shadow-xl transition-all delay-100 duration-500',
                    'rounded-[24px] max-sm:mx-auto',
                    isPhoto
                      ? 'h-[190px] w-[190px] max-sm:h-[min(220px,52vw)] max-sm:w-[min(300px,82vw)] sm:h-[170px] sm:w-[170px] lg:h-[190px] lg:w-[190px]'
                      : 'flex h-[190px] w-[190px] items-center justify-center p-4 max-sm:h-[120px] max-sm:w-[min(260px,72vw)] sm:h-[170px] sm:w-[170px] lg:h-[190px] lg:w-[190px]',
                    active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                  )}
                >
                  {isPhoto ? (
                    <Image
                      src={slide.image}
                      alt=""
                      fill
                      priority={i === 0}
                      sizes="(max-width: 640px) 82vw, 190px"
                      className="object-cover object-center"
                    />
                  ) : (
                    <Image
                      src={slide.image}
                      alt="ShuleCard"
                      width={260}
                      height={140}
                      sizes="(max-width: 640px) 72vw, 160px"
                      className="h-auto w-full object-contain"
                    />
                  )}
                </div>

                <div
                  className={cn(
                    'flex max-w-[520px] flex-col items-start gap-3 transition-all delay-150 duration-500',
                    'max-sm:w-full max-sm:max-w-none max-sm:items-center max-sm:text-center',
                    active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.05em]',
                      CHIP_CLASS,
                    )}
                  >
                    {slide.chipIcon}
                    <span className="truncate sm:whitespace-normal">{slide.tag}</span>
                  </span>

                  <h3 className="text-[27px] font-semibold leading-[1.14] text-white drop-shadow-sm max-lg:text-[23px] max-sm:text-[1.35rem] max-sm:leading-[1.18]">
                    {slide.title}
                  </h3>
                  <p className="-mt-0.5 max-w-[430px] text-[13.5px] leading-relaxed text-white/90 max-sm:max-w-[34ch] max-sm:text-[13px]">
                    {slide.desc}
                  </p>

                  <button
                    type="button"
                    tabIndex={active ? 0 : -1}
                    className={cn(
                      'mt-0.5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg',
                      'max-sm:min-h-[44px] max-sm:w-full max-sm:max-w-[280px]',
                      CTA_CLASS,
                    )}
                  >
                    {slide.cta}
                    <ArrowRightIcon className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        <button
          type="button"
          aria-label={t.showcase.prev}
          onClick={() => go(index - 1)}
          className="pointer-events-auto absolute left-3.5 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 max-sm:left-2 max-sm:top-[38%] max-sm:h-9 max-sm:w-9 sm:left-2.5"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={t.showcase.next}
          onClick={() => go(index + 1)}
          className="pointer-events-auto absolute right-3.5 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 max-sm:right-2 max-sm:top-[38%] max-sm:h-9 max-sm:w-9 sm:right-2.5"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>

        <div className="pointer-events-auto absolute bottom-4 left-9 z-30 flex gap-2 max-sm:bottom-5 max-sm:left-1/2 max-sm:-translate-x-1/2 sm:left-7">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={t.showcase.goTo(i + 1)}
              aria-current={i === index}
              onClick={() => go(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/70',
              )}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
