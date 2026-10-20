'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { iamResendMfaOtp, iamVerifyMfa } from '@/services/iam-auth-api';
import { storeRefreshToken, storeToken } from '@/shared/auth-token';

function MfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authenticatorEnabled = searchParams.get('authenticator') === 'true';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('tp_mfaSessionToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    setMfaSessionToken(token);
    setHint(sessionStorage.getItem('tp_mfaDeliveryHint') ?? '');
  }, [router]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await iamVerifyMfa(mfaSessionToken, code, 'email_otp');
      storeToken(result.accessToken);
      storeRefreshToken(result.refreshToken);
      sessionStorage.removeItem('tp_mfaSessionToken');
      sessionStorage.removeItem('tp_mfaDeliveryHint');
      sessionStorage.removeItem('tp_mfaOtpDelivery');
      router.push('/dashboard');
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
      router.replace('/login');
      return;
    }
    setError('');
    setIsResending(true);
    try {
      const result = await iamResendMfaOtp(mfaSessionToken);
      if (result.deliveryMessage) {
        setHint(result.deliveryMessage);
        sessionStorage.setItem('tp_mfaDeliveryHint', result.deliveryMessage);
      }
    } catch {
      setError('Could not resend code. Please log in again.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-navy/5 bg-white p-8 shadow-[0_28px_90px_-32px_rgba(0,4,53,0.28)]">
        <Image src="/logo.png" alt="Shule Teacher" width={140} height={42} className="mx-auto h-10 w-auto object-contain" />
        <h1 className="mt-6 text-center text-xl font-bold text-navy">Verify your identity</h1>
        <p className="mt-2 text-center text-sm text-navy/50">
          {hint || 'Enter the verification code sent to you.'}
        </p>
        {authenticatorEnabled ? (
          <p className="mt-2 text-center text-xs text-navy/40">You can also use your authenticator app code.</p>
        ) : null}

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
          ) : null}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit code"
            inputMode="numeric"
            required
            className="input text-center text-lg tracking-[0.35em]"
          />
          <button type="submit" disabled={isLoading || code.length < 6} className="btn-primary w-full">
            {isLoading ? 'Verifying…' : 'Continue to Teacher Portal'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" onClick={() => void handleResend()} disabled={isResending} className="font-semibold text-navy/60 hover:text-primary">
            {isResending ? 'Sending…' : 'Resend code'}
          </button>
          <Link href="/login" className="font-semibold text-navy/60 hover:text-primary">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TeacherMfaPage() {
  return (
    <Suspense fallback={null}>
      <MfaForm />
    </Suspense>
  );
}
