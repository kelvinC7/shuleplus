'use client';

import { useMemo } from 'react';
import { SCHOOL_FOOTER_LINKS } from '@/lib/auth-urls';
import { Logo } from './logo';
import { FacebookIcon, InstagramIcon, MapPinIcon, PhoneIcon, TwitterIcon } from './icons';
import { useSiteLanguage } from './language-provider';

const SOCIALS = [
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
];

export function SiteFooter() {
  const { t } = useSiteLanguage();

  const columns = useMemo(
    () => [
      { title: t.footer.forParents, links: t.footer.parentLinks.map((label) => ({ label, href: '#' })) },
      {
        title: t.footer.forSchools,
        links: t.footer.schoolLinks.map((label, i) => ({
          label,
          href: SCHOOL_FOOTER_LINKS[i] ?? '#',
        })),
      },
      { title: t.footer.company, links: t.footer.companyLinks.map((label) => ({ label, href: '#' })) },
    ],
    [t],
  );

  return (
    <footer className="mt-5 bg-sky-900 text-sky-100">
      <div className="site-container grid grid-cols-[1.4fr_repeat(3,1fr)] gap-10 pb-8 pt-14 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-7">
        <div>
          <Logo inverted className="mb-3.5" />
          <p className="mb-3.5 max-w-[280px] text-[13.5px] leading-[1.7] text-sky-300">{t.footer.blurb}</p>
          <div className="mb-2 flex items-start gap-2 text-[13px] text-sky-200">
            <MapPinIcon className="mt-0.5 h-[15px] w-[15px] shrink-0 text-amber-400" />
            KG 7 Ave, Kigali, Rwanda
          </div>
          <div className="flex items-start gap-2 text-[13px] text-sky-200">
            <PhoneIcon className="mt-0.5 h-[15px] w-[15px] shrink-0 text-amber-400" />
            +250 788 123 456
          </div>
          <div className="mt-[18px] flex gap-2.5">
            {SOCIALS.map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/10 text-sky-100 transition-colors hover:bg-amber-500 hover:text-[#402A00]"
              >
                <Icon className="h-[15px] w-[15px]" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-[13.5px] font-medium uppercase tracking-[0.05em] text-white">{col.title}</h4>
            {col.links.map((link) => (
              <a key={link.label} href={link.href} className="block py-1.5 text-[13.5px] text-sky-200 transition-colors hover:text-amber-400">
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="site-container flex flex-wrap justify-between gap-2.5 py-5 text-[12.5px] text-sky-300 max-sm:flex-col max-sm:text-center">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.motto}</span>
        </div>
      </div>
    </footer>
  );
}
