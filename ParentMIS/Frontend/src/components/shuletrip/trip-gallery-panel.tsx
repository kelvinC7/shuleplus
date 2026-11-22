'use client';

import Image from 'next/image';
import { ShieldCheck, Video } from 'lucide-react';
import type { SchoolTrip } from '@/types/shuletrip';
import { tripConsentState } from '@/lib/shuletrip-utils';

export function TripGalleryPanel({ trip }: { trip: SchoolTrip }) {
  const approved = tripConsentState(trip) === 'approved';
  const items = (trip.gallery ?? []).filter((g) => g.schoolApproved);

  if (!approved) {
    return (
      <p className="rounded-2xl bg-[var(--yo-bg)] px-4 py-6 text-center text-sm text-[var(--yo-muted)]">
        Gallery is available after you approve the trip and the school publishes media.
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="rounded-2xl bg-[var(--yo-bg)] px-4 py-6 text-center text-sm text-[var(--yo-muted)]">
        No school-approved photos yet. You will be notified when the gallery is published.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <figure key={item.id} className="hr-card overflow-hidden rounded-[20px]">
          <div className="relative aspect-[4/3] bg-[var(--yo-navy)]">
            {item.type === 'photo' ? (
              <Image src={item.url} alt={item.caption} fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                <Video className="size-10" />
              </div>
            )}
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              <ShieldCheck className="size-3" /> School approved
            </span>
          </div>
          <figcaption className="space-y-1 p-3">
            <p className="text-sm font-bold text-[var(--yo-navy)]">{item.caption}</p>
            {item.approvedBy ? (
              <p className="text-[11px] text-[var(--yo-muted)]">Approved by {item.approvedBy}</p>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
