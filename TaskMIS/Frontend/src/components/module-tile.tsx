'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface ModuleTileProps {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function ModuleTile({ href, label, description, icon: Icon }: ModuleTileProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm transition hover:border-ochre/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-ochre transition group-hover:bg-primary/20">
        <Icon size={20} />
      </div>
      <h3 className="mt-3 font-semibold text-navy">{label}</h3>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </Link>
  );
}
