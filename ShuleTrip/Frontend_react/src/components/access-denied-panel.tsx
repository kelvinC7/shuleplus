import { ArrowLeft, RefreshCw } from 'lucide-react';
import { BrandMark } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import type { AccessFailureCode } from '@/shared/access-error';
import { openOrganizationDashboard } from '@/shared/iam-login';

type PanelCopy = {
  title: string;
  lead: string;
  steps?: string[];
  primary: { label: string; action: 'dashboard' | 'signin' | 'retry' };
  showSignInLink?: boolean;
};

const COPY: Record<AccessFailureCode, PanelCopy> = {
  missing_token: {
    title: 'Open ShuleTrip from your dashboard',
    lead: 'You are not signed in to this app yet. Shule+ and ShuleTrip use separate browser storage.',
    steps: [
      'Go to your organization dashboard on Shule+.',
      'Click the ShuleTrip card · that passes your session here automatically.',
    ],
    primary: { label: 'Go to organization dashboard', action: 'dashboard' },
  },
  module_not_licensed: {
    title: 'ShuleTrip is not on your account',
    lead: 'Your sign-in worked, but this token does not include the ShuleTrip module.',
    steps: [
      'Ask an admin to assign ShuleTrip to your school.',
      'Sign out, sign in again, then open ShuleTrip from the dashboard.',
    ],
    primary: { label: 'Open organization dashboard', action: 'dashboard' },
  },
  session_rejected: {
    title: 'Session could not be verified',
    lead: 'Shule+ sent you here, but the ShuleTrip server rejected the access token. This is not a provisioning issue on the dashboard · it is usually a local setup mismatch.',
    steps: [
      'From the organization dashboard, click ShuleTrip again (fresh token in the URL).',
      'If you run the API locally: set ShuleTrip Backend JWT_ACCESS_SECRET to the same value as Authentication/Backend, then restart the backend on port 3076.',
    ],
    primary: { label: 'Open ShuleTrip from dashboard', action: 'dashboard' },
    showSignInLink: true,
  },
  tenant_missing: {
    title: 'School not set up in ShuleTrip yet',
    lead: 'The module is assigned in Shule+, but this school has no ShuleTrip tenant record.',
    steps: [
      'In Super Admin, confirm ShuleTrip is assigned and provisioning finished (no errors).',
      'Click ShuleTrip again from the organization dashboard after setup completes.',
    ],
    primary: { label: 'Back to organization dashboard', action: 'dashboard' },
  },
  network: {
    title: 'Cannot reach ShuleTrip server',
    lead: 'The app could not connect to the API on port 3076.',
    steps: [
      'Start ShuleTrip Backend (npm run dev in ShuleTrip/Backend).',
      'Check Frontend_react/.env · VITE_API_URL should point to http://localhost:3076/api.',
    ],
    primary: { label: 'Try again', action: 'retry' },
  },
  unknown: {
    title: 'Something went wrong',
    lead: 'We could not load the school portal. Try opening ShuleTrip from your organization dashboard again.',
    primary: { label: 'Open organization dashboard', action: 'dashboard' },
    showSignInLink: true,
  },
};

export function AccessDeniedPanel({
  failureCode,
  onRetry,
}: {
  failureCode: AccessFailureCode;
  onRetry?: () => void;
  /** Kept for callers that pass the originating route; navigation is handled by the copy actions. */
  returnPath?: string;
}) {
  const copy = COPY[failureCode] ?? COPY.unknown;

  function runPrimary() {
    if (copy.primary.action === 'dashboard') openOrganizationDashboard();
    else if (copy.primary.action === 'signin') window.location.href = '/login';
    else onRetry?.();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-line/80 bg-white shadow-xl shadow-navy/5">
          <div className="h-1.5 bg-gradient-to-r from-navy via-navy-muted to-amber" />
          <div className="px-8 pb-8 pt-10">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-navy shadow-lg shadow-navy/20">
              <BrandMark size={40} />
            </div>
            <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-amber-900/80">
              ShuleTrip · School portal
            </p>
            <h1 className="mt-2 text-center text-2xl font-extrabold tracking-tight text-navy">{copy.title}</h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">{copy.lead}</p>

            {copy.steps?.length ? (
              <ol className="mt-6 space-y-2.5 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
                {copy.steps.map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className="mt-8 flex flex-col gap-3">
              <Button variant="amber" type="button" className="h-11 w-full text-base font-bold" onClick={runPrimary}>
                {copy.primary.action === 'retry' ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {copy.primary.label}
                  </span>
                ) : (
                  copy.primary.label
                )}
              </Button>
              {copy.showSignInLink ? (
                <button
                  type="button"
                  className="text-center text-sm font-semibold text-navy underline-offset-2 hover:underline"
                  onClick={() => { window.location.href = '/login'; }}
                >
                  Sign in again with Shule+
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy"
                onClick={() => (window.location.href = '/')}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to welcome
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
