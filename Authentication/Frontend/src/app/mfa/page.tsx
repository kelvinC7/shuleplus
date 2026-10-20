'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { resolvePostLoginRoute, type AuthUser } from '@/lib/auth';
import { tryLaunchDefaultModule } from '@/lib/module-launch';
import { useToast } from '@/shared/notifications';
import { useAppLanguage } from '@/i18n/app-language';
import { AuthShell } from '@/components/auth/auth-shell';

type MfaMethod = 'email_otp' | 'authenticator';
type Step = 'verify' | 'setup';

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function MfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useAppLanguage();
  const authenticatorEnabled = searchParams.get('authenticator') === 'true';

  const [step, setStep] = useState<Step>('verify');
  const [method, setMethod] = useState<MfaMethod>('email_otp');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [authenticatorReady, setAuthenticatorReady] = useState(authenticatorEnabled);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);

  useEffect(() => {
    const token = sessionStorage.getItem('mfaSessionToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    setMfaSessionToken(token);
    setHint(sessionStorage.getItem('mfaDeliveryHint') ?? sessionStorage.getItem('mfaDevHint') ?? '');
    try {
      const delivery = sessionStorage.getItem('mfaOtpDelivery');
      if (delivery) setSmsEnabled(JSON.parse(delivery).sms === true);
    } catch {
      setSmsEnabled(false);
    }
    if (authenticatorEnabled) setMethod('email_otp');
  }, [router, authenticatorEnabled]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/mfa/verify', {
        mfaSessionToken,
        code,
        method,
      });

      if (data.data?.requiresSecondOtp) {
        setOtpStep(2);
        setCode('');
        setHint(
          data.data.deliveryMessage ??
            'Step 2: enter the SMS verification code sent to your phone.'
        );
        if (data.data.devOtpHint) {
          sessionStorage.setItem('mfaDevHint', data.data.devOtpHint);
        }
        return;
      }

      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      sessionStorage.removeItem('mfaSessionToken');
      sessionStorage.removeItem('mfaDevHint');
      sessionStorage.removeItem('mfaDeliveryHint');
      sessionStorage.removeItem('mfaOtpDelivery');

      const user = data.data.user as AuthUser;
      if (
        tryLaunchDefaultModule(user, data.data.accessToken as string, data.data.refreshToken as string)
      ) {
        return;
      }

      router.push(resolvePostLoginRoute(user));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!mfaSessionToken) {
      const message = 'Session expired. Please log in again.';
      setError(message);
      toast.error(message, 'Resend failed');
      return;
    }

    setError('');
    setIsResending(true);
    try {
      const { data } = await api.post('/auth/mfa/resend-otp', { mfaSessionToken });
      const successMessage =
        data.message ?? (data.devMode ? 'Check backend terminal console for OTP' : 'A new verification code has been sent');
      setHint(successMessage);
      if (data.otpDelivery) {
        setSmsEnabled(data.otpDelivery.sms === true);
        sessionStorage.setItem('mfaOtpDelivery', JSON.stringify(data.otpDelivery));
      }
      toast.success(successMessage, 'Code resent');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to resend code. Please try again.';
      setError(message);
      toast.error(message, 'Resend failed');
    } finally {
      setIsResending(false);
    }
  }

  async function startAuthenticatorSetup() {
    setError('');
    try {
      const { data } = await api.post('/auth/mfa/authenticator/setup', { mfaSessionToken });
      setOtpauthUrl(data.data.otpauthUrl);
      setStep('setup');
    } catch {
      setError('Failed to start authenticator setup');
    }
  }

  async function confirmSetup(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/mfa/authenticator/confirm', {
        mfaSessionToken,
        code: setupCode,
      });
      setStep('verify');
      setMethod('authenticator');
      setAuthenticatorReady(true);
      setHint('Authenticator enabled. Enter the 6-digit code from your app.');
    } catch {
      setError('Invalid authenticator code');
    } finally {
      setIsLoading(false);
    }
  }

  if (!mfaSessionToken) return null;

  return (
    <AuthShell
      backHref="/login"
      backLabel={t.mfaBackToLogin}
      title={otpStep === 2 ? 'Step 2 — SMS verification' : t.mfaTitle}
      subtitle={otpStep === 2 ? 'Enter the code sent to your mobile phone.' : t.mfaSubtitle}
      showBrandPanel={false}
      mobileBrand={false}
    >
      <div className="md:col-span-2">

        {step === 'verify' && (
          <>
            <div className="mb-6 flex rounded-xl border border-border p-1">
              <button
                type="button"
                onClick={() => setMethod('email_otp')}
                className={`flex-1 rounded-lg py-2 text-xs font-poppins-semibold transition ${method === 'email_otp' ? 'bg-navy text-primary' : 'text-muted'}`}
              >
                {t.mfaEmailOtp}{smsEnabled ? ' / SMS' : ''}
              </button>
              <button
                type="button"
                onClick={() => setMethod('authenticator')}
                disabled={!authenticatorReady}
                className={`flex-1 rounded-lg py-2 text-xs font-poppins-semibold transition ${method === 'authenticator' ? 'bg-navy text-primary' : 'text-muted'} disabled:opacity-40`}
              >
                {t.mfaAuthenticator}
              </button>
            </div>

            {hint && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-navy">
                {hint}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              {error && <p className="text-sm text-danger">{error}</p>}

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t.mfaCodePlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                suppressHydrationWarning
                className="w-full rounded-lg border border-border px-4 py-3 text-center text-2xl font-poppins-bold tracking-[0.5em] text-navy outline-none focus:border-primary"
              />

              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="w-full rounded-xl bg-navy py-3 text-sm font-poppins-semibold text-primary disabled:opacity-60"
              >
                {isLoading ? '...' : t.mfaVerify}
              </button>
            </form>

            {!authenticatorReady && (
              <button
                type="button"
                onClick={startAuthenticatorSetup}
                className="mt-4 w-full text-sm text-muted hover:text-navy"
              >
                Set up Authenticator App →
              </button>
            )}

            {method === 'email_otp' && (
              <div className="mt-6 space-y-3 border-t border-border/60 pt-5">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border border-navy/15 bg-navy/[0.03] px-4 py-3 text-sm font-poppins-semibold text-navy transition hover:border-primary/40 hover:bg-primary/5 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshIcon className={`text-primary ${isResending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  {isResending ? '...' : t.mfaResend}
                </button>

                <Link
                  href="/login"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-poppins-medium text-muted transition hover:bg-navy/[0.04] hover:text-navy"
                >
                  <ArrowLeftIcon className="transition group-hover:-translate-x-0.5" />
                  {t.mfaBackToLogin}
                </Link>
              </div>
            )}

            {method !== 'email_otp' && (
              <div className="mt-6 border-t border-border/60 pt-5">
                <Link
                  href="/login"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-poppins-medium text-muted transition hover:bg-navy/[0.04] hover:text-navy"
                >
                  <ArrowLeftIcon className="transition group-hover:-translate-x-0.5" />
                  {t.mfaBackToLogin}
                </Link>
              </div>
            )}

          </>
        )}

        {step === 'setup' && otpauthUrl && (
          <form onSubmit={confirmSetup} className="space-y-4">
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`}
                alt="Authenticator QR Code"
                width={180}
                height={180}
                className="rounded-lg border border-border"
              />
            </div>
            <p className="text-xs text-center text-muted">
              Scan with Google Authenticator, Microsoft Authenticator, or Authy
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter code from app"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full rounded-lg border border-border px-4 py-3 text-center text-xl tracking-widest"
            />
            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-navy py-3 text-sm font-poppins-semibold text-primary">
              Confirm Authenticator
            </button>
            <button type="button" onClick={() => setStep('verify')} className="w-full text-sm text-muted">
              ← Back to verification
            </button>
          </form>
        )}

        {step === 'setup' && (
          <div className="mt-6 border-t border-border/60 pt-5">
            <Link
              href="/login"
              className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-poppins-medium text-muted transition hover:bg-navy/[0.04] hover:text-navy"
            >
              <ArrowLeftIcon className="transition group-hover:-translate-x-0.5" />
              {t.mfaBackToLogin}
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<div className="auth-bg min-h-screen flex items-center justify-center text-muted">Loading...</div>}>
      <MfaContent />
    </Suspense>
  );
}
