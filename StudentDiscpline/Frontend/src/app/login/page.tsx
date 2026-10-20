'use client';

import { FormEvent, Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Mail, Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { iamLogin } from '@/services/iam-auth-api';
import { storeRefreshToken, storeToken } from '@/shared/auth-token';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await iamLogin(email.trim(), password, true);

      if (result.requiresMfa) {
        setError('Multi-factor authentication is required. Contact your administrator.');
        return;
      }

      if (!result.accessToken || !result.refreshToken) {
        throw new Error('Login failed. Please try again.');
      }

      storeToken(result.accessToken);
      storeRefreshToken(result.refreshToken);

      const next = searchParams.get('next');
      if (next?.startsWith('/') && !next.startsWith('//') && next.startsWith('/gate')) {
        window.location.href = next;
        return;
      }

      window.location.href = '/gate';
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Login failed. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-bg flex min-h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
        <Image
          src="/logo.png"
          alt="Shule+"
          width={140}
          height={42}
          className="h-9 w-auto object-contain sm:h-10"
          priority
        />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-[0_28px_90px_-32px_rgba(0,4,53,0.28)]">
          <div className="bg-[#000435] px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcb038]">Gate Management</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Gate Officer Sign In</h1>
            <p className="mt-1.5 text-sm text-white/60">
              Use the email and temporary password provided by your administrator.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#000435]">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[#fcb038]/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#fcb038]/15">
                <Mail size={18} className="shrink-0 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="officer@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#000435] outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#000435]">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[#fcb038]/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#fcb038]/15">
                <KeyRound size={18} className="shrink-0 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Temporary password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#000435] outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-slate-400 hover:text-[#000435]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fcb038] px-4 py-3.5 text-sm font-bold text-[#000435] transition hover:bg-[#e09a2f] disabled:opacity-60"
            >
              <Shield size={18} />
              {loading ? 'Signing in…' : 'Sign in to Gate Dashboard'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Administrators can also sign in here. You will be routed to the right dashboard automatically.
            </p>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        <Link href="/login" className="hover:text-[#000435]">
          Gate Management · Student Discipline
        </Link>
      </footer>
    </div>
  );
}

export default function GateLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
