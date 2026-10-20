import type { Metadata } from 'next';
import { Globe, Building2 } from 'lucide-react';
import { Navbar } from '@/LandingPage/components/Navbar';
import { Footer } from '@/LandingPage/components/Footer';
import { SchoolWebsiteUnavailableActions } from '@/LandingPage/components/SchoolWebsiteUnavailableActions';

export const metadata: Metadata = {
  title: 'Mini Website Unavailable — Shule+',
  description: 'Your school does not have a published Mini Website on Shule+ yet.',
};

type PageProps = {
  searchParams: Promise<{ school?: string; code?: string }>;
};

export default async function SchoolWebsiteUnavailablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const schoolName = params.school?.trim() || 'Your school';
  const code = params.code?.trim() || undefined;

  return (
    <>
      <div className="sticky top-0 z-50 bg-[#000435]">
        <Navbar />
      </div>
      <main className="flex min-h-[calc(100dvh-72px)] w-full items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg rounded-[28px] border border-navy-900/[0.06] bg-white p-8 text-center shadow-[0_24px_64px_-28px_rgba(0,4,53,0.35)] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8640AA]/12 text-[#8640AA]">
            <Globe className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            Mini Website not available
          </h1>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-navy-700/65">
            <Building2 className="h-4 w-4 shrink-0 text-[#FCB038]" />
            <span>{schoolName}</span>
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-navy-700/75">
            Your school does not have a Mini Website yet. Contact your school administration if you
            expected news, admissions, or circulars to be published online.
          </p>
          <SchoolWebsiteUnavailableActions code={code} />
        </div>
      </main>
      <Footer />
    </>
  );
}
