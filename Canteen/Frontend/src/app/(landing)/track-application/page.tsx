'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/services/api';
import type { OnboardingRequest } from '@/types';

const TrackApplicationPage = () => {
  const router = useRouter();
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardingRequest | null>(null);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.get(`/public/applications/${encodeURIComponent(id.trim())}`);
      setResult(data.data);
    } catch (err: unknown) {
      console.error('Tracking Error:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'An error occurred while tracking your application. Please try again later.';
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        setError('No application found with this Registry ID. Please check and try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusDetails = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return {
          label: 'Approved & Active',
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          desc: 'Congratulations! Your application has been verified and your account is now active.',
        };
      case 'REJECTED':
        return {
          label: 'Application Rejected',
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          desc: 'Unfortunately, your application was not approved at this time. Please contact support for more details.',
        };
      case 'PENDING':
      default:
        return {
          label: 'Awaiting Review',
          icon: Clock,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          desc: 'Your application is currently being reviewed by our administrative team. We will notify you once a decision is made.',
        };
    }
  };

  const meta = result?.metadata as Record<string, unknown> | null | undefined;
  const locationObj = (meta?.location as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="w-full flex-1 bg-slate-50 min-h-[80vh] flex flex-col items-center py-20 px-6">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-navblue/40 hover:text-navblue transition-all mb-12"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Home</span>
        </button>

        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-black italic text-navblue tracking-tighter uppercase">
            Track <span className="text-shuleamber">Application</span>
          </h1>
          <p className="text-slate-400 font-medium text-sm max-w-md mx-auto">
            Enter your unique Registry ID to check the real-time status of your onboarding request.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleTrack} className="relative group mb-12">
          <div className="absolute inset-0 bg-navblue/5 blur-2xl group-hover:bg-navblue/10 transition-all rounded-full scale-95 opacity-50"></div>
          <div className="relative flex items-center bg-white rounded-3xl shadow-xl border border-slate-100 p-2 pl-6 overflow-hidden">
            <Search className="w-6 h-6 text-navblue/20" />
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Enter Registry ID (e.g., SUP-1234 or CAN-4321)"
              className="flex-1 bg-transparent border-none outline-none px-4 text-navblue font-bold placeholder:text-navblue/20"
            />
            <button
              type="submit"
              disabled={loading || !id.trim()}
              className="bg-navblue text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-shuleamber hover:text-navblue transition-all disabled:opacity-50 disabled:hover:bg-navblue disabled:hover:text-white"
            >
              {loading ? 'Searching...' : 'Track Application'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (() => {
          const status = getStatusDetails(result.status);
          const Icon = status.icon;
          const displayName =
            (meta?.schoolName as string | undefined) ??
            (meta?.companyName as string | undefined) ??
            (meta?.businessName as string | undefined) ??
            (meta?.canteenName as string | undefined) ??
            'Application';
          const displayLocation =
            (meta?.category as string | undefined) ??
            (locationObj.district as string | undefined) ??
            (locationObj.province as string | undefined) ??
            result.schoolCode ??
            '';
          return (
            <div className="bg-white rounded-[40px] shadow-2xl shadow-navblue/5 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="p-10 md:p-12 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl border flex items-center justify-center text-navblue/20">
                      <Building2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black italic text-navblue tracking-tight">
                        {displayName}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          Registry ID:
                        </span>
                        <span className="text-sm font-bold text-navblue italic">
                          #{result.id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-slate-50 border text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {result.entityType}
                  </div>
                </div>

                {/* Status Card */}
                <div className={`${status.bgColor} rounded-[2rem] p-8 md:p-10 border border-current/5 space-y-6`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm ${status.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        Current Pipeline Status
                      </p>
                      <h3 className={`text-xl font-black italic ${status.color}`}>{status.label}</h3>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-md">
                    {status.desc}
                  </p>
                </div>

                {/* Timeline / Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-50 pt-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      Registered On
                    </p>
                    <p className="text-sm font-bold text-navblue">
                      {new Date(result.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      Sector / Location
                    </p>
                    <p className="text-sm font-bold text-navblue">{displayLocation}</p>
                  </div>
                </div>
              </div>

              {/* Help Footer */}
              <div className="bg-slate-50/50 border-t border-slate-100 p-8 text-center flex flex-col md:flex-row items-center justify-center gap-4">
                <ShieldCheck className="w-5 h-5 text-navblue opacity-10" />
                <p className="text-[11px] font-bold text-navblue/40 uppercase tracking-widest">
                  Institutional support needed?{' '}
                  <span className="text-shuleamber hover:underline cursor-pointer">
                    Contact Compliance Desk
                  </span>
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default TrackApplicationPage;
