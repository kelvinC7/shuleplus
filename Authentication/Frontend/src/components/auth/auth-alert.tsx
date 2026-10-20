'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type AuthAlertTone = 'error' | 'success' | 'info' | 'warning';

const TONE = {
 error: {
 wrap: 'border-rose-200/90 bg-gradient-to-br from-rose-50 to-white text-rose-900 shadow-[0_10px_30px_-18px_rgba(190,24,93,0.45)]',
 iconWrap: 'bg-rose-100 text-rose-600',
 title: 'text-rose-950',
 body: 'text-rose-800/85',
 Icon: AlertCircle,
 },
 success: {
 wrap: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 shadow-[0_10px_30px_-18px_rgba(5,150,105,0.4)]',
 iconWrap: 'bg-emerald-100 text-emerald-600',
 title: 'text-emerald-950',
 body: 'text-emerald-800/85',
 Icon: CheckCircle2,
 },
 info: {
 wrap: 'border-sky-200/90 bg-gradient-to-br from-sky-50 to-white text-sky-950 shadow-[0_10px_30px_-18px_rgba(2,132,199,0.35)]',
 iconWrap: 'bg-sky-100 text-sky-600',
 title: 'text-sky-950',
 body: 'text-sky-800/85',
 Icon: Info,
 },
 warning: {
 wrap: 'border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-950 shadow-[0_10px_30px_-18px_rgba(217,119,6,0.4)]',
 iconWrap: 'bg-amber-100 text-amber-600',
 title: 'text-amber-950',
 body: 'text-amber-900/80',
 Icon: AlertCircle,
 },
} as const;

export function AuthAlert({
 tone = 'error',
 title,
 message,
 onDismiss,
 className = '',
}: {
 tone?: AuthAlertTone;
 title?: string;
 message: string;
 onDismiss?: () => void;
 className?: string;
}) {
 const styles = TONE[tone];
 const Icon = styles.Icon;

 useEffect(() => {
 if (!onDismiss) return;
 if (tone !== 'success' && tone !== 'info') return;
 const t = window.setTimeout(onDismiss, 8000);
 return () => window.clearTimeout(t);
 }, [onDismiss, tone, message]);

 return (
 <div
 role={tone === 'error' || tone === 'warning' ? 'alert': 'status'}
 aria-live="polite"
 className={`relative flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${styles.wrap} ${className}`}
 >
 <span
 className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.iconWrap}`}
 >
 <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
 </span>
 <div className="min-w-0 flex-1 pr-6">
 {title ? (
 <p className={`text-sm font-bold leading-snug ${styles.title}`}>{title}</p>
 ): null}
 <p className={`text-[13px] leading-relaxed ${title ? 'mt-0.5': ''} ${styles.body}`}>
 {message}
 </p>
 </div>
 {onDismiss ? (
 <button
 type="button"
 onClick={onDismiss}
 aria-label="Dismiss message"
 className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-current/45 transition hover:bg-black/[0.04] hover:text-current"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 ): null}
 </div>
 );
}

/** Map API / network errors into short, parent-friendly copy. */
export function getFriendlyAuthMessage(
 err: unknown,
 fallback = 'Something went wrong. Please try again.'
): string {
 const raw =
 (err as { response?: { data?: { message?: string }; status?: number } })?.response?.data
 ?.message ||
 (err as { message?: string })?.message ||
 '';

 const status = (err as { response?: { status?: number } })?.response?.status;
 const text = String(raw);

 if (!text && (status === 0 || /failed to fetch|networkerror|load failed/i.test(String(err)))) {
 return 'We could not reach the server. Check your internet connection and try again.';
 }

 if (/invalid email or password|invalid credentials|unauthorized/i.test(text) || status === 401) {
 return 'Email or password is incorrect. Please check your details and try again.';
 }
 if (/locked|lockout|too many/i.test(text) || status === 423) {
 return 'This account is temporarily locked for security. Please wait a few minutes, then try again.';
 }
 if (/suspended|inactive|disabled/i.test(text)) {
 return 'This account is not active. Please contact your school or platform administrator.';
 }
 if (/passwords? (do )?not match|mismatch/i.test(text)) {
 return 'The passwords you entered do not match. Please type them again.';
 }
 if (/at least 12|password must|password policy|weak password|special character/i.test(text)) {
 return 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.';
 }
 if (/current password is incorrect|incorrect password/i.test(text)) {
 return 'Your current password is incorrect. Please try again.';
 }
 if (/invalid or has expired|invalid reset|expired|invalid token/i.test(text) || status === 400) {
 if (/reset|invitation|token/i.test(text)) {
 return text.length < 140
 ? text
: 'This link is invalid or has expired. Please request a new one.';
 }
 }
 if (/invalid code|otp|verification code/i.test(text)) {
 return 'That code is incorrect or expired. Request a new code and try again.';
 }
 if (status === 429 || /rate limit|too many requests/i.test(text)) {
 return 'Too many attempts. Please wait a moment before trying again.';
 }
 if (status && status >= 500) {
 return 'Our servers had a problem. Please try again in a moment.';
 }

 if (text && text.length <= 160 && !/ECONNREFUSED|ENOTFOUND|Internal Server/i.test(text)) {
 return text;
 }

 return fallback;
}
