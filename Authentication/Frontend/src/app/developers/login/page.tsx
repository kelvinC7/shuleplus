'use client';

import { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { developerLogin } from '@/lib/developer-api';

function isAllowedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost') return true;
    if (u.hostname.endsWith('.shuleplus.rw') || u.hostname === 'shuleplus.rw') return true;
    return false;
  } catch {
    return false;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await developerLogin(email, password, rememberMe);
      sessionStorage.setItem('devMfaSessionToken', result.mfaSessionToken);
      sessionStorage.setItem('devMfaUserName', result.user.firstName);
      sessionStorage.setItem('devMfaSetupRequired', result.setupRequired ? 'true' : 'false');
      if (returnUrl && isAllowedReturnUrl(returnUrl)) {
        sessionStorage.setItem('devReturnUrl', returnUrl);
      }
      router.push('/developers/mfa');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/">
          <Image src="/logo.png" alt="ShulePlus" width={140} height={42} className="h-10 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-navy/60 hover:text-primary">
          Platform login →
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-navy/10 bg-white p-8 shadow-[0_28px_90px_-32px_rgba(0,4,53,0.28)]">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">ShulePlus</p>
            <h1 className="mt-2 font-montserrat text-3xl font-bold text-navy">Developer Portal</h1>
            <p className="mt-2 text-sm text-muted">Welcome back</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-navy">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                required
                className="mt-2 w-full rounded-2xl border border-navy/10 bg-[#f8fafc] px-4 py-3.5 text-sm outline-none focus:border-primary/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(252,176,56,0.12)]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-navy">Password</label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full rounded-2xl border border-navy/10 bg-[#f8fafc] px-4 py-3.5 pr-12 text-sm outline-none focus:border-primary/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy/40"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-navy/60">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded accent-primary"
              />
              Remember this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-navy py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:bg-navy-light disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Continue Securely'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/forgot-password" className="hover:text-primary">
              Forgot password?
            </Link>
          </p>

          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
            🔒 Protected with multi-factor authentication
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DeveloperLoginPage() {
  return (
    <Suspense fallback={<div className="auth-bg flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
