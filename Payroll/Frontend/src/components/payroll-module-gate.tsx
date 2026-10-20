'use client';

import Image from 'next/image';
import { AlertCircle, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { clearToken } from '@/shared/auth-token';

const GOLD = '#FCB038';
const NAVY = '#000435';

export function PayrollModuleLoading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-[#FCB038]/[0.08] p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#FCB038]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-navy/[0.04] blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_20px_60px_-20px_rgba(0,4,53,0.18)] backdrop-blur-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy shadow-lg">
          <Image src="/logo.png" alt="ShulePlus" width={36} height={36} className="rounded-lg" />
        </div>

        <h1 className="text-lg font-bold tracking-tight text-navy">Payroll Center</h1>
        <p className="mt-1 text-sm text-muted">Preparing your workspace…</p>

        <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200"
            style={{ borderTopColor: GOLD }}
          />
        </div>

        <div className="mt-6 space-y-2 text-left">
          {['Checking your session', 'Verifying module license', 'Connecting to payroll service'].map((step, i) => (
            <div key={step} className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: i === 0 ? `${GOLD}22` : 'transparent',
                  color: i === 0 ? NAVY : '#94a3b8',
                  border: i === 0 ? `1px solid ${GOLD}55` : '1px solid #e2e8f0',
                }}
              >
                {i + 1}
              </span>
              <span className={`text-xs font-medium ${i === 0 ? 'text-navy' : 'text-muted'}`}>{step}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-muted">
          This usually takes a few seconds. If it takes longer, make sure the Payroll backend is running.
        </p>
      </div>
    </main>
  );
}

export function PayrollModuleDenied({
  error,
  onRetry,
  retrying,
}: {
  error: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3007/api';

  const isMissingToken = error?.toLowerCase().includes('missing access token');
  const isBackendDown =
    error?.toLowerCase().includes('could not reach') ||
    error?.toLowerCase().includes('timed out') ||
    error?.toLowerCase().includes('network');

  function goToIam() {
    clearToken();
    window.location.href = `${iamUrl}/organization-admin`;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-red-50/30 p-6">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(0,4,53,0.15)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <AlertCircle size={28} />
        </div>

        <h1 className="text-center text-xl font-bold text-navy">
          {isMissingToken ? 'Sign in required' : 'Unable to open Payroll'}
        </h1>

        <p className="mt-3 text-center text-sm leading-relaxed text-muted">
          {error ?? 'Module not licensed or access was denied.'}
        </p>

        {isMissingToken && (
          <div className="mt-5 rounded-2xl border border-[#FCB038]/25 bg-[#FCB038]/[0.06] px-4 py-3 text-left text-xs leading-relaxed text-navy">
            <p className="font-semibold">How to access Payroll</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
              <li>Log in to Organization Admin</li>
              <li>Open the Payroll module from your licensed apps</li>
              <li>Do not bookmark module URLs directly — always launch from the dashboard</li>
            </ol>
          </div>
        )}

        {isBackendDown && (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-xs text-muted">
            <p className="font-semibold text-navy">Payroll API not responding</p>
            <p className="mt-1">Expected at <span className="font-mono text-[11px]">{apiUrl}</span></p>
            <p className="mt-2">Start the Payroll backend, then retry.</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
              {retrying ? 'Retrying…' : 'Try again'}
            </button>
          )}
          <button type="button" onClick={goToIam} className="btn-secondary inline-flex items-center justify-center gap-2">
            <ArrowLeft size={16} />
            Back to Organization Admin
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          <ShieldCheck size={12} className="text-[#FCB038]" />
          Secured by ShulePlus IAM
        </p>
      </div>
    </main>
  );
}
