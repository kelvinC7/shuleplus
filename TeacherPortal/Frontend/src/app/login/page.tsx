'use client';

import { FormEvent, Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { iamLogin } from '@/services/iam-auth-api';
import { storeRefreshToken, storeToken } from '@/shared/auth-token';

const IAM_URL = (process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ACADEMIC_URL = (process.env.NEXT_PUBLIC_ACADEMIC_URL ?? 'http://localhost:3004').replace(/\/$/, '');

function jwtPosition(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.position === 'string' ? payload.position : null;
  } catch {
    return null;
  }
}

function isInvigilatorAccount(position?: string | null, roles?: string[]) {
  if (roles?.includes('organization_admin')) return false;
  return /^invigilator$/i.test((position ?? '').trim());
}

function academicDeskUrl(accessToken: string, refreshToken?: string) {
  const url = new URL('/exams/invigilator-desk', ACADEMIC_URL);
  url.searchParams.set('token', accessToken);
  if (refreshToken) url.searchParams.set('refresh', refreshToken);
  return url.toString();
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ModernField({
  label,
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  rightAction,
  required,
  autoComplete,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rightAction?: React.ReactNode;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-navy">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-navy/10 bg-[#f8fafc] px-4 py-3.5 transition focus-within:border-primary/50 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(254,191,16,0.12)]">
        <span className="shrink-0 text-navy/40">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-navy placeholder:text-navy/30 outline-none"
        />
        {rightAction}
      </div>
    </div>
  );
}

export default function TeacherLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await iamLogin(email, password, rememberMe);

      if (result.requiresMfa) {
        sessionStorage.setItem('tp_mfaSessionToken', result.mfaSessionToken ?? '');
        const deliveryMsg =
          result.deliveryMessage ??
          result.devOtpHint ??
          (result.otpDelivery?.sms
            ? `Code sent to email and SMS (${result.otpDelivery.phoneMasked})`
            : 'Code sent to your email');
        sessionStorage.setItem('tp_mfaDeliveryHint', deliveryMsg);
        if (result.otpDelivery) {
          sessionStorage.setItem('tp_mfaOtpDelivery', JSON.stringify(result.otpDelivery));
        }
        router.push(`/mfa?authenticator=${result.authenticatorEnabled ? 'true' : 'false'}`);
        return;
      }

      if (!result.accessToken || !result.refreshToken) {
        throw new Error('Login failed. Please try again.');
      }

      storeToken(result.accessToken);
      storeRefreshToken(result.refreshToken);

      if (
        isInvigilatorAccount(result.user?.position ?? jwtPosition(result.accessToken), result.user?.roles)
        || result.user?.defaultLaunch?.entryPath === '/exams/invigilator-desk'
      ) {
        window.location.href = academicDeskUrl(result.accessToken, result.refreshToken);
        return;
      }

      const next = searchParams.get('next');
      if (next?.startsWith('/') && !next.startsWith('//')) {
        router.push(next);
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Login failed. Please try again.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-bg flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <Link href={IAM_URL}>
          <Image
            src="/logo.png"
            alt="Shule+"
            width={160}
            height={48}
            style={{ width: 'auto', height: 'auto' }}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
        </Link>
        <Link
          href={IAM_URL}
          className="group inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/80 px-4 py-2 text-sm font-semibold text-navy shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white hover:shadow-md"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/5 transition-transform group-hover:-translate-x-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </span>
          Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-4">
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-[0_28px_90px_-32px_rgba(0,4,53,0.28)] md:max-w-5xl md:flex-row">
          <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 sm:py-9 md:w-[48%]">
            <div className="mb-5 hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Teacher Portal</p>
              <h1 className="mt-2 text-2xl font-bold text-navy">Welcome back, educator</h1>
              <p className="mt-1.5 text-sm text-navy/50">
                Sign in to manage classes, attendance, timetable and school services.
              </p>
            </div>

            <div className="mb-6 md:hidden">
              <h1 className="text-3xl font-black leading-none text-navy">Shule Teacher</h1>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
                Portal sign in
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <ModernField
                label="Email | Phone Number"
                icon={<UserIcon />}
                placeholder="Enter your email or phone number"
                value={email}
                onChange={setEmail}
                required
                autoComplete="email"
              />

              <ModernField
                label="Password"
                icon={<LockIcon />}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-navy/40 transition-colors hover:text-navy"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                }
              />

              <label className="flex cursor-pointer select-none items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-navy/30 accent-primary"
                />
                <span className="text-sm text-navy/50">Keep me signed in</span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-semibold text-primary shadow-[0_12px_28px_-10px_rgba(0,4,53,0.45)] transition hover:bg-navy-light disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                ) : (
                  <>
                    Enter Teacher Portal
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="relative hidden w-[52%] flex-col overflow-hidden bg-gradient-to-br from-primary via-[#f5c04a] to-[#FCB038] md:flex">
            <div
              className="pointer-events-none absolute inset-0 bg-[url('/my_bg.png')] bg-cover bg-center opacity-[0.14]"
              aria-hidden
            />
            <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-white/20 blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-navy/5" aria-hidden />

            <div className="relative flex min-h-0 flex-1 flex-col justify-end">
              <div className="px-8 pb-2 pt-6 text-center">
                <p className="mx-auto max-w-[320px] text-xl font-medium italic leading-snug text-navy/90 lg:text-[1.35rem]">
                  &ldquo;Empowering teachers to focus on what matters most — teaching.&rdquo;
                </p>
              </div>
              <div className="flex w-full shrink-0 justify-center overflow-visible px-2 pb-0">
                <Image
                  src="/teacher.png"
                  alt="Teacher"
                  width={720}
                  height={820}
                  className="block h-auto w-[108%] max-w-[640px] translate-y-2 object-contain object-bottom drop-shadow-[0_24px_48px_rgba(0,4,53,0.22)] lg:max-w-[680px] xl:max-w-[720px]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 space-y-1 pb-4 pt-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-navy/60">
          Managed by <span className="font-bold text-primary">EDUPOTO</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-navy/30">
          © {currentYear} EDUPOTO · ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
