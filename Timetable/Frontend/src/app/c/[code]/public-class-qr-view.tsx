'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  Globe2,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

type PublicClassQrInfo = {
  qrCode: string;
  className: string;
  roomNumber: string;
  building: string | null;
  schoolName: string;
  organizationCode: string | null;
  location: {
    address: string | null;
    province: string | null;
    district: string | null;
    sector: string | null;
    cell: string | null;
    village: string | null;
    label: string | null;
  };
  logoUrl: string | null;
  schoolMotto: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api';
const TICHA_URL = process.env.NEXT_PUBLIC_TICHA_URL ?? 'https://ticha.shuleplus.rw';

function resolveLogoUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const iamOrigin = (process.env.NEXT_PUBLIC_IAM_URL ?? 'https://app.shuleplus.rw').replace(/\/$/, '');
  return url.startsWith('/') ? `${iamOrigin}${url}` : `${iamOrigin}/${url}`;
}

export function PublicClassQrView() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params?.code ?? ''));
  const [data, setData] = useState<PublicClassQrInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setError('Missing class QR code');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/public/class-qr/${encodeURIComponent(code)}`);
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: PublicClassQrInfo;
          message?: string;
        };
        if (!res.ok || !body.data) {
          throw new Error(body.message ?? 'Class QR code not found');
        }
        if (!cancelled) setData(body.data);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Could not load class information');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#000435]" />
        Loading class information…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <QrCode size={28} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-[#000435]">Class not found</h1>
          <p className="mt-2 text-sm text-slate-500">{error ?? 'This QR code is not registered.'}</p>
        </div>
      </div>
    );
  }

  const logo = resolveLogoUrl(data.logoUrl);
  const locationLines = [
    data.location.address,
    [data.location.village, data.location.cell].filter(Boolean).join(', ') || null,
    [data.location.sector, data.location.district].filter(Boolean).join(', ') || null,
    data.location.province,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#fff7e8_0%,#f4f6fb_45%,#eef2ff_100%)] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-[28px] border border-[#000435]/10 bg-white shadow-[0_24px_60px_-28px_rgba(0,4,53,0.45)]">
          <div className="relative bg-gradient-to-br from-[#000435] via-[#0a1260] to-[#151b7a] px-6 pb-10 pt-7 text-white">
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
                ) : (
                  <Building2 className="h-7 w-7 text-[#FCB038]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCB038]">
                  ShulePlus · Class QR
                </p>
                <h1 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
                  {data.schoolName}
                </h1>
                {data.organizationCode ? (
                  <p className="mt-1 font-mono text-xs text-white/70">School code {data.organizationCode}</p>
                ) : null}
                {data.schoolMotto ? (
                  <p className="mt-2 text-sm italic text-white/75">&ldquo;{data.schoolMotto}&rdquo;</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative -mt-8 px-5 pb-6 sm:px-6">
            <div className="rounded-2xl border border-[#000435]/8 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FCB038]/15 text-[#000435]">
                  <GraduationCap size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Classroom
                  </p>
                  <p className="truncate text-2xl font-extrabold text-[#000435]">{data.className}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Class code</p>
                <code className="mt-1 block break-all font-mono text-sm font-bold text-[#000435]">
                  {data.qrCode}
                </code>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-[#000435]">
                  <MapPin size={18} className="text-[#FCB038]" />
                  <h2 className="text-sm font-bold">Location</h2>
                </div>
                {locationLines.length ? (
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    {locationLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">Location details are not published yet.</p>
                )}
                {data.building ? (
                  <p className="mt-3 text-xs font-semibold text-slate-500">Building · {data.building}</p>
                ) : null}
              </section>

              {(data.phone || data.email || data.website) && (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[#000435]">
                    <ShieldCheck size={18} className="text-[#FCB038]" />
                    <h2 className="text-sm font-bold">Contact</h2>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {data.phone ? (
                      <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-[#000435]">
                        <Phone size={15} className="text-slate-400" /> {data.phone}
                      </a>
                    ) : null}
                    {data.email ? (
                      <a href={`mailto:${data.email}`} className="flex items-center gap-2 text-slate-700 hover:text-[#000435]">
                        <Mail size={15} className="text-slate-400" /> {data.email}
                      </a>
                    ) : null}
                    {data.website ? (
                      <a
                        href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-slate-700 hover:text-[#000435]"
                      >
                        <Globe2 size={15} className="text-slate-400" /> {data.website}
                      </a>
                    ) : null}
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-[#FCB038]/30 bg-gradient-to-br from-[#FFF8EB] to-white p-4">
                <p className="text-sm font-bold text-[#000435]">Teachers</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Open <span className="font-semibold">Ticha Portal</span> and scan this poster to start
                  period attendance. This public page is for school and class information only.
                </p>
                <a
                  href={TICHA_URL}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#151b7a]"
                >
                  Open Ticha Portal
                </a>
              </section>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Powered by ShulePlus</p>
      </div>
    </div>
  );
}
