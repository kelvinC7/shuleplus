'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Mobile: photo on top, full width */}
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10] lg:hidden">
        <Image
          src="/logo-bg2.png"
          alt="A parent using the Shule+ app with her child"
          fill
          priority
          sizes="100vw"
          className="scale-[1.15] object-cover object-[85%_30%]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block h-14 w-full sm:h-20">
            <path d="M0,90 L0,45 C240,5 480,0 720,18 C960,36 1200,70 1440,40 L1440,90 Z" fill="#000435" />
          </svg>
        </div>
      </div>

      {/* Mobile: text panel on navy, below the photo */}
      <div className="relative px-4 pb-14 pt-2 text-center sm:px-6 lg:hidden" style={{ backgroundColor: '#000435' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <h1 className="font-display text-[1.55rem] font-extrabold uppercase leading-[1.2] tracking-tight text-white sm:text-3xl">
            <span className="block">An integrated digital tools</span>
            <span className="mt-1 block">for equitable</span>
            <span className="mt-1 block text-amber-500">school readiness</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/55 sm:text-base">
            One platform for enrolment, academics, fees, HR and operations — built for schools across Rwanda.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-400 sm:w-auto"
            >
              Onboard your school
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 sm:w-auto"
            >
              See how it works
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Desktop: true two-column grid — both panels share one row, so they're always the same height */}
      <div className="relative hidden lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[660px]">
        <div className="relative z-0 flex items-center px-10 py-16 xl:px-16" style={{ backgroundColor: '#000435' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-[520px]"
          >
            <h1 className="font-display text-[2.5rem] font-extrabold uppercase leading-[1.18] tracking-tight text-white xl:text-[2.9rem]">
              <span className="block">An integrated digital tools</span>
              <span className="mt-1 block">for equitable</span>
              <span className="mt-1 block text-amber-500">school readiness</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
              One platform for enrolment, academics, fees, HR and operations — built for schools across Rwanda.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-400"
              >
                Onboard your school
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
              >
                See how it works
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="relative z-0 overflow-hidden">
          <Image
            src="/logo-bg2.png"
            alt="A parent using the Shule+ app with her child"
            fill
            priority
            sizes="50vw"
            className="scale-[1.2] object-cover object-[82%_25%]"
          />
        </div>

        {/* wavy seam — one shape, spans the full row height, centered on the column boundary */}
        <svg
          className="pointer-events-none absolute inset-y-0 z-10 h-full w-[160px]"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
          viewBox="0 0 160 800"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,0 L100,0 C140,90 60,180 100,270 C140,360 60,450 100,540 C140,630 60,700 100,780 L100,800 L0,800 Z"
            fill="#000435"
          />
        </svg>
      </div>

      {/* bottom curve into the next (white) section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="hidden h-24 w-full lg:block">
          <path d="M0,100 L0,55 C240,10 480,0 720,15 C960,30 1200,70 1440,45 L1440,100 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}