'use client';

import { SessionExpiredIllustration } from './session-expired-illustration';

export type SessionAccessDeniedProps = {
 error?: string | null;
 moduleName?: string;
 /** Defaults to NEXT_PUBLIC_IAM_URL or http://localhost:3000 */
 iamUrl?: string;
 primaryHref?: string;
 primaryLabel?: string;
 showTryAgain?: boolean;
 idPrefix?: string;
};

function isSessionIssue(error?: string | null) {
 return /expired|invalid|missing access token|session|token/i.test(error ?? '') || !error;
}

function isDeactivated(error?: string | null) {
 return /deactivat|suspend/i.test(error ?? '');
}

/**
 * Shared Shule+ Access Denied / Session Ended screen (Meet-style animated SVG).
 */
export function SessionAccessDeniedScreen({
 error,
 moduleName = 'this module',
 iamUrl,
 primaryHref,
 primaryLabel,
 showTryAgain = true,
 idPrefix = 'sp-sess',
}: SessionAccessDeniedProps) {
 const base =
 (iamUrl ??
 (typeof process !== 'undefined'
 ? process.env.NEXT_PUBLIC_IAM_URL || process.env.VITE_IAM_URL
: undefined) ??
 'http://localhost:3000'
 ).replace(/\/$/, '');

 const href = primaryHref ?? `${base}/organization-admin`;
 const cta = primaryLabel ?? 'Back to Organization Dashboard';
 const session = isSessionIssue(error);
 const deactivated = isDeactivated(error);

 const title = deactivated ? 'Module deactivated': session ? 'Session ended': 'Access Denied';
 const eyebrow = deactivated ? 'Unavailable': session ? 'Session required': 'Access blocked';
 const body =
 deactivated
 ? 'This module is not available for your organization. Contact your administrator.'
: error ??
 `Your ${moduleName} session is no longer valid. Reopen the module from your organization dashboard to continue.`;

 return (
 <div
 className="flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6"
 style={{
 backgroundColor: '#f4f6fb',
 backgroundImage:
 'radial-gradient(circle at 12% 8%, rgba(252,176,56,0.08), transparent 38%), radial-gradient(circle at 88% 92%, rgba(0,4,53,0.06), transparent 42%)',
 }}
 >
 <div
 className="w-full max-w-lg overflow-hidden border border-[#e2e8f0] bg-white"
 style={{
 borderRadius: 8,
 boxShadow: '0 1px 2px rgba(0,4,53,0.04), 0 4px 12px -2px rgba(0,4,53,0.08)',
 }}
 >
 <div className="bg-[#F8FAFC] px-4 pt-4 sm:px-6 sm:pt-6">
 <SessionExpiredIllustration idPrefix={idPrefix} />
 </div>
 <div className="space-y-4 px-5 py-6 text-center sm:px-8 sm:py-7">
 <div>
 <p
 className="text-[11px] font-semibold uppercase tracking-[0.14em]"
 style={{ color: '#FCB038' }}
 >
 {eyebrow}
 </p>
 <h1
 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
 style={{ color: '#000435' }}
 >
 {title}
 </h1>
 <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: '#64748b' }}>
 {body}
 </p>
 </div>
 <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
 <a
 href={href}
 className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold sm:w-auto"
 style={{
 borderRadius: 6,
 backgroundColor: '#FCB038',
 color: '#000435',
 textDecoration: 'none',
 }}
 >
 {cta}
 </a>
 {showTryAgain ? (
 <button
 type="button"
 onClick={() => window.location.reload()}
 className="inline-flex w-full items-center justify-center gap-2 border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold sm:w-auto"
 style={{ borderRadius: 6, color: '#000435', cursor: 'pointer' }}
 >
 Try again
 </button>
 ): null}
 </div>
 <p className="text-[11px]" style={{ color: '#64748b' }}>
 Tip: open {moduleName} from Org Admin so refresh can renew your session automatically.
 </p>
 </div>
 </div>
 </div>
 );
}
