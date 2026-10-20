'use client';

import { PhoneIcon } from './icons';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';
import type { SiteLang } from '@/lib/site-i18n';

const LANG_OPTIONS: { code: SiteLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'rw', label: 'RW' },
  { code: 'fr', label: 'FR' },
];

export function TopBar() {
  const { lang, setLang, t } = useSiteLanguage();

  return (
    <div className="bg-sky-900 text-[12.5px] text-sky-100">
      <div className="site-container flex flex-wrap items-center justify-between gap-1.5 py-2">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex items-center gap-5">
            {t.topBarLinks.map((l) => (
              <a key={l} href="#" className="opacity-85 transition-opacity hover:text-amber-300 hover:opacity-100">
                {l}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <PhoneIcon className="h-3 w-3" />
            +250 788 123 456
          </span>
          <div className="flex gap-0.5 rounded-full bg-white/10 p-0.5">
            {LANG_OPTIONS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                  lang === code ? 'bg-amber-400 text-[#402A00]' : 'text-sky-100 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
