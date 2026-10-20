'use client';

import { Button } from '@/components/ui/button';
import { REGISTER_SCHOOL_URL } from '@/lib/auth-urls';
import { ArrowRightIcon } from './icons';
import { useSiteLanguage } from './language-provider';

export function CtaBanner() {
  const { t } = useSiteLanguage();

  return (
    <div className="site-container my-20">
      <div className="relative flex items-center justify-center gap-11 overflow-hidden rounded-[22px] bg-gradient-to-br from-amber-400 to-amber-500 px-14 py-[52px] text-[#402A00] max-md:flex-col max-md:gap-6 max-md:px-7 max-md:py-10 max-md:text-center">
        <span aria-hidden className="absolute -left-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-white/25" />
        <span aria-hidden className="absolute -bottom-[80px] -right-[60px] h-[220px] w-[220px] rounded-full bg-white/15" />

        <div className="relative max-w-[520px] text-left max-md:text-center">
          <h2 className="mb-2 text-[26px] font-semibold">{t.cta.title}</h2>
          <p className="text-[14.5px] opacity-85">{t.cta.desc}</p>
        </div>

        <Button asChild variant="inverse" className="relative shrink-0">
          <a href={REGISTER_SCHOOL_URL}>
            {t.cta.button}
            <ArrowRightIcon className="h-[15px] w-[15px]" />
          </a>
        </Button>
      </div>
    </div>
  );
}
