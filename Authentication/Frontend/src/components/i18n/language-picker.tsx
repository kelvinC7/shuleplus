'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { APP_LANGUAGES, useAppLanguage } from '@/i18n/app-language';
import type { AppLang } from '@/i18n/types';
import { cn } from '@/lib/utils';

function Flag({ code, alt }: { code: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={22}
      height={16}
      alt={alt}
      className="h-4 w-[22px] shrink-0 rounded-[3px] object-cover ring-1 ring-black/10"
    />
  );
}

type LanguagePickerVariant = 'navbar' | 'auth' | 'drawer';

export function LanguagePicker({
  variant = 'navbar',
  className,
}: {
  variant?: LanguagePickerVariant;
  className?: string;
}) {
  const { lang, setLang, t } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = APP_LANGUAGES.find((l) => l.code === lang) ?? APP_LANGUAGES[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const triggerClass =
    variant === 'navbar'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-white/85 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05] hover:text-white sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm'
      : variant === 'auth'
        ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy/10 bg-white/90 text-navy shadow-sm backdrop-blur-sm transition-all active:scale-95 hover:border-primary/40 hover:bg-white sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-3.5 sm:py-2 sm:text-sm sm:font-semibold'
        : '';

  if (variant === 'drawer') {
    return (
      <div className={cn('space-y-1', className)}>
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
          {t.language}
        </p>
        {APP_LANGUAGES.map((item) => {
          const active = lang === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code as AppLang)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/80 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <Flag code={item.flag} alt={item.alt} />
              <span className="flex-1 text-left">{item.display}</span>
              {active ? <Check className="h-4 w-4 text-amber-400" /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.language}
      >
        <Flag code={current.flag} alt={current.alt} />
        <span className={variant === 'auth' ? 'hidden sm:inline' : 'hidden sm:inline'}>
          {current.display}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform',
            variant === 'navbar' ? 'text-white/50' : 'text-navy/40',
            variant === 'auth' && 'hidden sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-navy-900/[0.06] bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(0,4,53,0.25)]"
          >
            {APP_LANGUAGES.map((item) => {
              const active = lang === item.code;
              return (
                <li key={item.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLang(item.code);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900/[0.04]"
                  >
                    <Flag code={item.flag} alt={item.alt} />
                    <span className="flex-1">{item.display}</span>
                    {active ? <Check className="h-3.5 w-3.5 text-amber-500" /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
