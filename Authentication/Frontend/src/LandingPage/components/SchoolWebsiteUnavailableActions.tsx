'use client';

import Link from 'next/link';
import { ArrowLeft, UserRound } from 'lucide-react';

export function SchoolWebsiteUnavailableActions({ code }: { code?: string }) {
  const trimmed = code?.trim();
  const profileHref = trimmed
    ? `/?lookup=profile&code=${encodeURIComponent(trimmed)}`
    : '/';

  return (
    <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
      {trimmed ? (
        <Link
          href={profileHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12185a]"
        >
          <UserRound className="h-4 w-4" />
          Back to student profile
        </Link>
      ) : null}
      <Link
        href="/"
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
          trimmed
            ? 'border border-navy-900/12 text-navy-900 hover:bg-navy-900/[0.03]'
            : 'bg-[#000435] text-white hover:bg-[#12185a]'
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
