'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Fingerprint,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '@/services/api';
import { LoadingScreen } from '@/components/shared/loading';
import type { OnboardingRequest } from '@/types';

const CanteenProfilePage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [result, setResult] = useState<OnboardingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api
      .get(`/public/applications/${encodeURIComponent(id)}`)
      .then((res) => setResult(res.data.data))
      .catch((err: unknown) => {
        console.error('Profile Error:', err);
        if ((err as { response?: { status?: number } })?.response?.status === 404) {
          setError('No school profile found for this Registry ID.');
        } else {
          setError('Something went wrong while loading this profile. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const meta = result?.metadata as Record<string, unknown> | null | undefined;
  const locationObj = (meta?.location as Record<string, unknown> | undefined) ?? {};
  const schoolName =
    (meta?.schoolName as string | undefined) ??
    (meta?.canteenName as string | undefined) ??
    (meta?.companyName as string | undefined) ??
    'ShuleCanteen Partner';
  const contactName =
    (meta?.contactName as string | undefined) ??
    (meta?.fullName as string | undefined) ??
    (meta?.contactPerson as string | undefined) ??
    '—';
  const contactPhone =
    (meta?.contactPhone as string | undefined) ??
    (meta?.phone as string | undefined) ??
    '—';
  const estimatedStudents =
    (meta?.estimatedStudents as string | number | undefined) ??
    (meta?.estimatedStudentCount as string | number | undefined) ??
    0;
  const province = (locationObj.province as string | undefined) ?? '—';
  const district = (locationObj.district as string | undefined) ?? '—';

  const getStatusDetails = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return {
          label: 'Verified & Live',
          icon: CheckCircle,
          color: 'text-green-500',
          bg: 'bg-green-500/10 border-green-500/20',
        };
      case 'REJECTED':
        return {
          label: 'Application Rejected',
          icon: XCircle,
          color: 'text-red-500',
          bg: 'bg-red-500/10 border-red-500/20',
        };
      default:
        return {
          label: 'Awaiting Review',
          icon: Clock,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20',
        };
    }
  };

  if (loading) return <LoadingScreen label="Loading school profile…" />;

  if (error || !result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 bg-navblue/5 rounded-3xl flex items-center justify-center text-navblue/20">
          <Building2 className="w-10 h-10" />
        </div>
        <h2 className="mt-6 text-2xl font-black italic text-navblue tracking-tighter uppercase">Profile Not Found</h2>
        <p className="mt-2 text-sm font-medium text-slate-400 max-w-sm">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 bg-navblue text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-shuleamber hover:text-navblue transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const status = getStatusDetails(result.status);
  const StatusIcon = status.icon;
  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/profile/canteen/${id}`;

  const stats = [
    {
      icon: Users,
      label: 'Student Base',
      value: Number(estimatedStudents).toLocaleString(),
    },
    {
      icon: Fingerprint,
      label: 'Registry ID',
      value: `#${result.id}`,
    },
    {
      icon: Calendar,
      label: 'Registered',
      value: new Date(result.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }),
    },
  ];

  return (
    <div className="w-full flex-1 bg-slate-50 min-h-[80vh] flex flex-col items-center py-20 px-6">
      <div className="max-w-4xl w-full">
        <button
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-navblue/40 hover:text-navblue transition-all mb-12"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Home</span>
        </button>

        {/* Header */}
        <div className="bg-navblue rounded-[2.5rem] p-10 md:p-14 text-white overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-shuleamber/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-3xl flex items-center justify-center text-navblue shadow-2xl">
              <Building2 className="w-12 h-12" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-shuleamber">
                  Verified School Profile
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                  {result.entityType}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter">{schoolName}</h1>
              <div className="flex items-center gap-2 text-white/60 text-sm font-semibold">
                <MapPin className="w-4 h-4 text-shuleamber" />
                {district === '—' && province === '—' ? 'Location pending' : `${district}, ${province}`}
              </div>
            </div>

            {/* Status Pill */}
            <div className={`${status.bg} border rounded-2xl px-5 py-3 flex items-center gap-3`}>
              <StatusIcon className={`w-6 h-6 ${status.color}`} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Pipeline Status</p>
                <p className={`text-sm font-black italic ${status.color}`}>{status.label}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Stats Card */}
          <div className="md:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-navblue/5 p-8 md:p-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="space-y-3">
                  <div className="w-12 h-12 bg-navblue/5 rounded-2xl flex items-center justify-center text-shuleamber">
                    <s.icon className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{s.label}</p>
                  <p className="text-lg font-black italic text-navblue tracking-tight">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-8 space-y-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-navblue">Institutional Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Administrator</p>
                  <p className="font-bold text-navblue">{contactName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Contact Number</p>
                  <p className="font-bold text-navblue">{contactPhone}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                This profile is issued by the ShuleCanteen ecosystem. Scan the QR code to verify authenticity.
              </p>
            </div>
          </div>

          {/* QR Card */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-navblue/5 p-8 md:p-10 flex flex-col items-center justify-center text-center space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">Scan to Verify</p>
            <div className="bg-white rounded-3xl border-4 border-shuleamber/20 p-4 shadow-lg shadow-shuleamber/10">
              <QRCodeSVG value={qrUrl} size={180} fgColor="#001f3f" bgColor="#ffffff" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
              Authenticate this institution with any registry officer or ecosystem partner device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanteenProfilePage;
