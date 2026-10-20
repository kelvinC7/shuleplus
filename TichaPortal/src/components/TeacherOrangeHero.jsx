import React from 'react';

/**
 * Welcome hero - clean flat amber (no photo overlay / shadow).
 */
export default function TeacherOrangeHero({
  title,
  subtitle,
  badgeLabel = 'ShuleTicha · Secure',
  rightSlot = null,
  children = null,
  className = '',
}) {
  return (
    <section
      className={`relative flex min-h-[200px] items-center overflow-hidden text-white md:min-h-[220px] ${className}`}
      style={{ background: 'linear-gradient(135deg, #e8940a 0%, #f59e0b 42%, #d97706 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 0%, transparent 45%), radial-gradient(circle at 80% 70%, #fff 0%, transparent 40%)',
        }}
        aria-hidden
      />

      {badgeLabel ? (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[9px] font-medium tracking-wide text-white sm:left-5 sm:top-5 sm:px-3.5 sm:text-[10px]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
          {badgeLabel}
        </div>
      ) : null}

      {rightSlot ? (
        <div className="absolute right-5 top-5 z-30 hidden md:flex flex-wrap items-center justify-end gap-2 max-w-[min(100%-12rem,28rem)]">
          {rightSlot}
        </div>
      ) : null}

      <div className="relative z-10 w-full max-w-4xl px-5 pb-7 pt-14 sm:px-6 sm:pb-8 sm:pt-12 md:px-10 md:pb-10 md:pt-10 pointer-events-none">
        <h1 className="mb-1.5 text-xl font-medium tracking-tight text-white sm:text-2xl md:text-[1.65rem] pointer-events-auto">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm font-normal text-white/90 md:text-base leading-relaxed pointer-events-auto">{subtitle}</p>
        ) : null}
        {children ? <div className="mt-4 flex flex-wrap gap-2 pointer-events-auto">{children}</div> : null}
      </div>
    </section>
  );
}
