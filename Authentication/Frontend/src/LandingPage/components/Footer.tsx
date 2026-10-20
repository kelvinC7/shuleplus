'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useAppLanguage } from '@/i18n/app-language';

const contactDetails = [
  { icon: Mail, label: 'iconicinnovatorz@gmail.com', href: 'mailto:iconicinnovatorz@gmail.com' },
  { icon: Phone, label: '+250 793 903 847 / +250 796 898 894', href: 'tel:+250796898894' },
  { icon: MapPin, label: 'Kigali, Rwanda', href: '#' },
];

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.992 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.4-3.68 3.55-3.68 1.03 0 2.1.18 2.1.18v2.32h-1.18c-1.17 0-1.53.73-1.53 1.48v1.78h2.61l-.42 2.91h-2.19V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.92A3.12 3.12 0 1 1 12 8.88a3.12 3.12 0 0 1 0 6.24zM17.76 6.96a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0z" />
      <path d="M12 2.16c-2.67 0-3.01.01-4.06.06-1.04.05-1.76.22-2.38.46a4.8 4.8 0 0 0-1.74 1.13 4.8 4.8 0 0 0-1.13 1.74c-.24.62-.41 1.34-.46 2.38-.05 1.05-.06 1.39-.06 4.07s.01 3.01.06 4.06c.05 1.04.22 1.76.46 2.38a4.8 4.8 0 0 0 1.13 1.74 4.8 4.8 0 0 0 1.74 1.13c.62.24 1.34.41 2.38.46 1.05.05 1.39.06 4.06.06s3.01-.01 4.06-.06c1.04-.05 1.76-.22 2.38-.46a4.8 4.8 0 0 0 1.74-1.13 4.8 4.8 0 0 0 1.13-1.74c.24-.62.41-1.34.46-2.38.05-1.05.06-1.39.06-4.06s-.01-3.01-.06-4.06c-.05-1.04-.22-1.76-.46-2.38a4.8 4.8 0 0 0-1.13-1.74 4.8 4.8 0 0 0-1.74-1.13c-.62-.24-1.34-.41-2.38-.46-1.05-.05-1.39-.06-4.06-.06zm0 1.62c2.62 0 2.93.01 3.97.06.96.04 1.48.2 1.83.34.46.18.79.39 1.13.73.34.34.55.67.73 1.13.14.35.3.87.34 1.83.05 1.04.06 1.35.06 3.97s-.01 2.93-.06 3.97c-.04.96-.2 1.48-.34 1.83-.18.46-.39.79-.73 1.13-.34.34-.67.55-1.13.73-.35.14-.87.3-1.83.34-1.04.05-1.35.06-3.97.06s-2.93-.01-3.97-.06c-.96-.04-1.48-.2-1.83-.34a3.05 3.05 0 0 1-1.13-.73 3.05 3.05 0 0 1-.73-1.13c-.14-.35-.3-.87-.34-1.83-.05-1.04-.06-1.35-.06-3.97s.01-2.93.06-3.97c.04-.96.2-1.48.34-1.83.18-.46.39-.79.73-1.13.34-.34.67-.55 1.13-.73.35-.14.87-.3 1.83-.34 1.04-.05 1.35-.06 3.97-.06z" />
    </svg>
  );
}

const socials = [
  { icon: IconX, href: 'https://x.com', label: 'X (Twitter)' },
  { icon: IconFacebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: IconInstagram, href: 'https://instagram.com', label: 'Instagram' },
];

export function Footer() {
  const { t } = useAppLanguage();

  const columns = [
    {
      title: t.footerProduct,
      links: [
        { label: t.footerTrackApplication, href: '/login' },
        { label: t.footerInstitutionalHelp, href: '/#how-it-works' },
      ],
    },
    {
      title: t.footerCompany,
      links: [
        { label: t.footerPrivacyPolicy, href: '#privacy' },
        { label: t.footerTermsOfService, href: '#terms' },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden text-white" style={{ backgroundColor: '#000435' }}>
      <Image
        src="/logo-bg2.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-[80%_center] opacity-[0.07]"
      />
      <div className="relative mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex">
              <Image
                src="/logo.png"
                alt="Shule+"
                width={140}
                height={42}
                className="h-9 w-auto brightness-0 invert sm:h-10"
              />
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60">{t.footerTagline}</p>
            <div className="mt-4 flex items-center gap-2.5">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-10">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/45">
                  {col.title}
                </h4>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] font-medium text-white/70 transition hover:text-amber-400"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/45">
                {t.footerContact}
              </h4>
              <ul className="mt-3 space-y-2.5">
                {contactDetails.map(({ icon: Icon, label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="flex items-start gap-2 text-[13px] font-medium text-white/70 transition hover:text-amber-400"
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                      <span className="break-all">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
          <p className="text-center text-xs text-white/40 sm:text-left">{t.footerCopyright}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="text-xs text-white/40 transition hover:text-amber-400">
              {t.privacy}
            </Link>
            <Link href="/terms" className="text-xs text-white/40 transition hover:text-amber-400">
              {t.terms}
            </Link>
            <Link href="/user-data-access" className="text-xs text-white/40 transition hover:text-amber-400">
              {t.userDataAccess}
            </Link>
          </div>
          <p className="text-center text-xs text-white/40 sm:text-right">
            {t.managedBy}{' '}
            <span className="font-bold tracking-wide text-white/70">
              SHULE<span className="text-amber-400">+</span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
