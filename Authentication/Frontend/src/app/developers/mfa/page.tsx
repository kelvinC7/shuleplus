'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { developerVerifyMfa } from '@/lib/developer-api';
import { getDeveloperUser } from '@/lib/developer-auth';

export default function DeveloperMfaPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const userName = typeof window !== 'undefined' ? sessionStorage.getItem('devMfaUserName') ?? 'Developer' : 'Developer';

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const token = sessionStorage.getItem('devMfaSessionToken');
    if (!token) {
      router.replace('/developers/login');
      return;
    }
    const code = useBackup ? backupCode : digits.join('');
    try {
      const payload = await developerVerifyMfa(token, code);
      sessionStorage.removeItem('devMfaSessionToken');
      const setupRequired = sessionStorage.getItem('devMfaSetupRequired') === 'true';
      const returnUrl = sessionStorage.getItem('devReturnUrl');
      sessionStorage.removeItem('devReturnUrl');

      if (returnUrl) {
        try {
          const u = new URL(returnUrl);
          const allowed =
            u.hostname === 'localhost' ||
            u.hostname.endsWith('.shuleplus.rw') ||
            u.hostname === 'shuleplus.rw';
          if (allowed) {
            const user = payload.user ?? getDeveloperUser();
            const hash = new URLSearchParams({
              accessToken: payload.accessToken,
              refreshToken: payload.refreshToken,
              user: JSON.stringify(user),
            }).toString();
            window.location.href = `${returnUrl.split('#')[0]}#${hash}`;
            return;
          }
        } catch {
          /* fall through */
        }
      }

      if (setupRequired) {
        router.push('/developers/security?setup=mfa');
      } else {
        router.push('/developers');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid verification code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-navy/10 bg-white p-8 shadow-xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Secure Verification</p>
          <h1 className="mt-2 font-montserrat text-2xl font-bold text-navy">
            Welcome back, {userName} 👋
          </h1>
          <p className="mt-2 text-sm text-muted">
            {useBackup
              ? 'Enter one of your backup recovery codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {!useBackup ? (
            <div className="flex justify-center gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  className="h-14 w-11 rounded-xl border border-navy/15 text-center text-xl font-bold text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="w-full rounded-2xl border border-navy/10 px-4 py-3.5 text-center font-mono text-lg tracking-widest outline-none focus:border-primary"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-navy py-3.5 text-sm font-semibold text-primary disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setUseBackup((v) => !v)}
          className="mt-4 w-full text-center text-sm text-primary hover:underline"
        >
          {useBackup ? 'Use authenticator code instead' : 'Use backup code instead'}
        </button>

        <p className="mt-6 text-center text-xs text-muted">
          🔒 This login is protected with multi-factor authentication
        </p>

        <Link href="/developers/login" className="mt-4 block text-center text-sm text-muted hover:text-navy">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
