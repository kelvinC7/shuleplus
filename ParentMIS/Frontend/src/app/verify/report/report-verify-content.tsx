'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, Lock, LogIn, School, ShieldCheck } from 'lucide-react';

type VerifyPayload = {
  valid: boolean;
  reportNumber: string;
  schoolName: string | null;
  message: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3048/api';
const PARENT_LOGIN = '/login';
const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') || 'http://localhost:3000';

export function ReportVerifyPageContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref')?.trim() ?? '';
  const org = searchParams.get('org')?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (ref) q.set('ref', ref);
    if (org) q.set('org', org);
    return q.toString();
  }, [ref, org]);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setFailed('Missing report reference. Scan the QR code on the official report card.');
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setFailed(null);
      try {
        const res = await fetch(`${API_BASE}/public/report-cards/verify?${query}`);
        const json = (await res.json()) as { success?: boolean; data?: VerifyPayload; message?: string };
        if (!res.ok || !json.data?.valid) {
          if (!cancelled) setFailed(json.message || 'This report could not be verified.');
          return;
        }
        if (!cancelled) setPayload(json.data ?? null);
      } catch {
        if (!cancelled) {
          setFailed(
            'Could not reach the verification service. Use Wi‑Fi on the same network as the school, or ask the school for a public verify link.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref, query]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-primary shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">Report verification</h1>
          <p className="mt-2 text-sm text-muted">Shule+ · Official school reports</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-[0_20px_50px_-20px_rgba(0,4,53,0.25)]">
          {loading ? (
            <div className="space-y-4 p-8">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          ) : failed ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-rose-700">{failed}</p>
            </div>
          ) : payload ? (
            <div className="p-8">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <BadgeCheck className="mt-0.5 h-8 w-8 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-lg font-bold text-emerald-950">Verified report</p>
                  <p className="mt-1 text-sm text-emerald-900/90">{payload.message}</p>
                </div>
              </div>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                  <dt className="text-muted">Reference</dt>
                  <dd className="font-mono text-xs font-bold text-navy">{payload.reportNumber}</dd>
                </div>
                {payload.schoolName ? (
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted">School</dt>
                    <dd className="text-right font-semibold text-navy">{payload.schoolName}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>
                  Marks and personal details are not shown here. Sign in as a parent or school staff to view the full
                  report card.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href={PARENT_LOGIN}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-navy/90"
                >
                  <LogIn className="h-4 w-4" />
                  Parent login
                </Link>
                <a
                  href={IAM_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-navy transition hover:bg-slate-50"
                >
                  <School className="h-4 w-4" />
                  School portal
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted">
          Only reports published by your school through Shule+ can be verified.
        </p>
      </div>
    </div>
  );
}
