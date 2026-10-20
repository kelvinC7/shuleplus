'use client';

import Image from 'next/image';
import { Container, Reveal, SectionHeading } from './ui/Primitives';
import { useAppLanguage } from '@/i18n/app-language';

const partners: { name: string; logo: string }[] = [
  { name: 'Airtel', logo: '/partners/aitel.png' },
  { name: 'MTN', logo: '/partners/mtn-removebg-preview.png' },
  { name: 'Centrika', logo: '/partners/centripay-removebg-preview.png' },
  { name: 'Umwalimu SACCO', logo: '/partners/umwalimusacco-removebg-preview.png' },
  { name: 'NESA', logo: '/partners/nesa-logo.png' },
  { name: 'Iconic', logo: '/partners/iconic.png' },
];

export function Partners() {
  const { t } = useAppLanguage();

  return (
    <section id="partners" className="relative overflow-hidden border-y border-navy-900/[0.06] bg-[#F8F9FA] py-16 sm:py-20">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-navy-900/10 to-transparent"
        aria-hidden
      />
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.partnersEyebrow}
            title={t.partnersTitle}
            description={t.partnersDescription}
            align="center"
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-14 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-8 sm:gap-y-10">
          {partners.map((partner, i) => (
            <Reveal
              key={partner.name}
              index={i}
              className="group mx-auto flex w-full max-w-[136px] flex-col items-center text-center sm:w-[156px]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-[26px] border border-navy-900/[0.07] bg-white shadow-soft transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_24px_50px_-18px_rgba(0,4,53,0.28)]">
                <div className="absolute inset-4 sm:inset-5">
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    fill
                    sizes="156px"
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="mt-3 font-display text-sm font-bold text-navy-900 sm:mt-4">{partner.name}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
