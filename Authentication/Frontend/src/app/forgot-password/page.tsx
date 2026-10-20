'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppLanguage } from '@/i18n/app-language';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  ArrowRightIcon,
  MailIcon,
  ModernField,
} from '@/components/auth/modern-field';

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const { t } = useAppLanguage();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      const successMessage =
        data.message ??
        data.data?.message ??
        t.resetDefaultSuccess;
      setMessage(successMessage);
      setSent(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t.requestFailed;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      backHref="/login"
      backLabel={t.backToSignIn}
      title={t.forgotTitle}
      subtitle={t.forgotSubtitle}
    >
      {sent ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-emerald-600">
                <CheckCircleIcon />
              </span>
              <div>
                <p className="text-sm font-poppins-semibold text-emerald-900">{t.resetSentTitle}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-emerald-800/90">{message}</p>
              </div>
            </div>
          </div>
          <Link
            href="/login"
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-poppins-semibold text-primary shadow-[0_12px_28px_-10px_rgba(0,4,53,0.45)] transition hover:bg-navy-light active:scale-[0.99]"
          >
            {t.returnToSignIn}
            <ArrowRightIcon />
          </Link>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setMessage('');
            }}
            className="w-full text-center text-sm font-poppins-medium text-navy/50 transition hover:text-primary"
          >
            {t.useDifferentEmail}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <ModernField
            label={t.forgotEmailLabel}
            icon={<MailIcon />}
            type="email"
            placeholder={t.forgotEmailPlaceholder}
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-poppins-semibold text-primary shadow-[0_12px_28px_-10px_rgba(0,4,53,0.45)] transition hover:bg-navy-light hover:shadow-[0_16px_32px_-10px_rgba(0,4,53,0.5)] disabled:opacity-60 active:scale-[0.99]"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : (
              <>
                {t.sendResetLink}
                <ArrowRightIcon />
              </>
            )}
          </button>

          <p className="text-center text-sm text-navy/50">
            {t.forgotRememberPassword}{' '}
            <Link href="/login" className="font-poppins-semibold text-primary hover:underline">
              {t.signIn}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
