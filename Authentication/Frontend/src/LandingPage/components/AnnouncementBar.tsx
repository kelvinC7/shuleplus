'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full text-white" style={{ backgroundColor: '#000435' }}>
      <div className="relative mx-auto flex min-h-[46px] max-w-[1400px] items-center justify-center gap-3 px-12 py-2.5 text-center sm:gap-4 sm:px-16">
        <p className="text-[12px] font-medium leading-snug text-white sm:text-[13.5px]">
          Unlock efficient school management with Shule+. Here&apos;s everything you need to know.
        </p>
        <a
          href="/#how-it-works"
          className="hidden shrink-0 rounded-full border border-white px-4 py-[5px] text-[11px] font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
        >
          Learn more
        </a>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:bg-white/15 sm:right-5"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
