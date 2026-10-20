'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Loader2,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { lookupStaffByCode, type LookupStaff } from '@/LandingPage/services/portal-api';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-xl border border-navy-900/[0.05] bg-[#F8F9FA] px-3.5 py-2.5">
      <dt className="text-navy-700/50">{label}</dt>
      <dd className="text-right font-semibold text-navy-900">{value}</dd>
    </div>
  );
}

export function StaffQrProfileView() {
  const params = useParams();
  const staffId = decodeURIComponent(String(params.staffId ?? '')).trim();

  const [staff, setStaff] = useState<LookupStaff | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setStaff(null);

    lookupStaffByCode(staffId)
      .then((data) => {
        if (!cancelled) setStaff(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load staff profile';
        if (/not found|404/i.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staffId]);

  return (
    <div className="auth-bg flex min-h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="Shule+"
            width={160}
            height={48}
            style={{ width: 'auto', height: 'auto' }}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/80 px-4 py-2 text-sm font-semibold text-navy shadow-soft backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white"
        >
          Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-8 pt-2 sm:px-6 sm:pt-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-[0_28px_90px_-32px_rgba(0,4,53,0.28)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-navy/50">Loading staff profile…</p>
            </div>
          ) : notFound ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5">
                <QrCode className="h-8 w-8 text-navy/30" />
              </div>
              <div>
                <h1 className="font-montserrat text-xl font-bold text-navy">Staff member not found</h1>
                <p className="mt-2 text-sm text-navy/50">
                  No record matches ID <span className="font-semibold text-navy">{staffId}</span>.
                  Check the QR code or contact the school.
                </p>
              </div>
              <Link
                href="/"
                className="mt-2 rounded-2xl bg-navy px-6 py-3 text-sm font-semibold text-primary transition hover:bg-navy-light"
              >
                Go to Shule+ home
              </Link>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            </div>
          ) : staff ? (
            <>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#000435] via-[#12185a] to-[#1a2468] px-5 pb-6 pt-5 sm:px-6">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[28px] border-[#FCB038]/15"
                  aria-hidden
                />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCB038]">
                    Staff Smart ID · Verified
                  </p>
                  <p className="mt-1 text-[12px] text-white/55">Scanned from QR code</p>
                </div>

                <div className="relative mt-5 flex items-start gap-4">
                  <div className="flex h-[80px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-2 ring-[#FCB038]/35 sm:h-[88px] sm:w-[88px]">
                    {staff.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={staff.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-10 w-10 text-[#FCB038]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                        {staff.fullName}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-accent/15 px-2 py-0.5 text-[11px] font-semibold text-[#0D9B90]">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {staff.status}
                      </span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/70">
                      <Briefcase className="h-3.5 w-3.5 text-[#FCB038]" />
                      {staff.position}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-white/50">
                      <Building2 className="h-3.5 w-3.5" />
                      {staff.schoolName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <dl className="grid gap-2.5 text-[12.5px] sm:grid-cols-2">
                  <InfoRow label="Staff ID" value={staff.employeeNumber} />
                  <InfoRow label="Role" value={staff.position} />
                  <InfoRow label="Department" value={staff.department || '—'} />
                  <InfoRow label="School" value={staff.schoolName} />
                  {staff.phone ? <InfoRow label="Phone" value={staff.phone} /> : null}
                  {staff.email ? <InfoRow label="Email" value={staff.email} /> : null}
                </dl>

                {(staff.phone || staff.email) && (
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {staff.phone ? (
                      <a
                        href={`tel:${staff.phone}`}
                        className="flex items-center gap-3 rounded-2xl border border-navy/5 bg-[#F8F9FA] px-4 py-3.5 transition hover:border-primary/30"
                      >
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-navy">{staff.phone}</span>
                      </a>
                    ) : null}
                    {staff.email ? (
                      <a
                        href={`mailto:${staff.email}`}
                        className="flex items-center gap-3 rounded-2xl border border-navy/5 bg-[#F8F9FA] px-4 py-3.5 transition hover:border-primary/30"
                      >
                        <Mail className="h-5 w-5 text-primary" />
                        <span className="truncate text-sm font-semibold text-navy">{staff.email}</span>
                      </a>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="border-t border-navy/5 bg-[#FAFBFC] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2 rounded-2xl border border-[#008751]/20 bg-[#008751]/5 px-4 py-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#008751]" />
                  <p className="text-[12px] text-navy/70">
                    This profile was opened from an official school Smart Card QR code.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
