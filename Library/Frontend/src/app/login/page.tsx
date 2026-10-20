'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { storeToken, getToken, storeParentSession } from '@/shared/auth-token';
import { useAuth } from '@/contexts/auth-context';

const STUDENT_MGMT_API =
  process.env.NEXT_PUBLIC_STUDENT_MGMT_API_URL?.replace(/\/$/, '') || 'http://localhost:3052/api';

const LANDING_URL = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type Step = 'phone' | 'set-password' | 'login';

type StatusData = {
  phone: string | null;
  hasPassword: boolean;
  displayName: string;
  students: { id: string; name: string; studentCode: string | null; role: string }[];
};

async function smJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${STUDENT_MGMT_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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

function UnderlineField({
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
  icon: ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rightAction?: ReactNode;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-[#000435]">{label}</label>
      <div className="flex items-center gap-3 border-b border-[#000435]/20 pb-2 transition-colors focus-within:border-[#FCB038]">
        <span className="shrink-0 text-[#000435]/50">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-[#000435] outline-none placeholder:text-[#000435]/30"
        />
        {rightAction}
      </div>
    </div>
  );
}

export default function LibraryLoginPage() {
  const router = useRouter();
  const { reload } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  const title = useMemo(() => {
    if (step === 'set-password') return 'Create your password';
    if (step === 'login') return 'Welcome back';
    return 'Librarian login';
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === 'set-password') return 'Set a password for this phone to access the Library Module.';
    if (step === 'login') return 'Enter your password to continue.';
    return 'Use the phone number registered with your school account.';
  }, [step]);

  async function checkPhone(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('Enter the phone number registered at school');
      return;
    }
    setLoading(true);
    try {
      const data = await smJson<StatusData>(
        `/public/parents/auth/status?phone=${encodeURIComponent(phone.trim())}`
      );
      setStatus(data);
      setStep(data.hasPassword ? 'login' : 'set-password');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Phone lookup failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function finishAuth(
    path: '/public/parents/auth/login' | '/public/parents/auth/set-password',
    body: Record<string, string>
  ) {
    setLoading(true);
    setError('');
    try {
      const data = await smJson<{
        token: string;
        parent: {
          id: string;
          firstName: string;
          lastName: string;
          phone: string | null;
          email?: string | null;
          organizationId: string;
        };
        students: {
          id: string;
          name: string;
          firstName?: string;
          lastName?: string;
          studentCode: string | null;
          className: string | null;
          photo?: string | null;
          role?: string;
          organizationId?: string;
        }[];
      }>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      storeToken(data.token);
      storeParentSession({ parent: data.parent, students: data.students ?? [] });
      toast.success(path.includes('set-password') ? 'Password saved' : 'Welcome back');
      await reload();
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (step === 'set-password') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
      await finishAuth('/public/parents/auth/set-password', {
        phone: phone.trim(),
        password,
        confirmPassword: confirm,
      });
      return;
    }
    await finishAuth('/public/parents/auth/login', {
      phone: phone.trim(),
      password,
    });
  }

  function resetPhone() {
    setStep('phone');
    setPassword('');
    setConfirm('');
    setStatus(null);
    setError('');
  }

  return (
    <div className="auth-bg flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <Link href={LANDING_URL}>
          <Image
            src="/logo.png"
            alt="Shule+"
            width={160}
            height={48}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
        </Link>
        <a
          href={LANDING_URL}
          className="group inline-flex items-center gap-2 rounded-full border border-[#000435]/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[#000435] shadow-sm backdrop-blur-sm transition-all hover:border-[#FCB038]/40 hover:bg-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#000435]/5 transition-transform group-hover:-translate-x-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </span>
          Back to home
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-4">
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl md:max-w-5xl md:flex-row">
          {/* Left - branding */}
          <div className="relative hidden min-h-[560px] w-1/2 flex-col bg-[#FCB038] md:flex">
            <div className="relative z-20 shrink-0 px-10 pb-4 pt-24">
              <p className="block py-1 text-2xl font-black uppercase leading-[1.35] tracking-[0.14em] text-[#000435] xl:text-3xl">
                Library Module
              </p>
            </div>
            <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-2">
              <Image
                src="/logo-bg-left.png"
                alt="Library Module"
                width={480}
                height={520}
                className="mx-auto h-full max-h-[400px] w-auto max-w-full object-contain object-bottom"
                priority
              />
            </div>
            <p className="relative z-20 shrink-0 px-10 pb-10 pt-2 text-center text-base font-medium italic leading-relaxed text-[#000435]/80">
              &ldquo;Empowering minds through knowledge and reading.&rdquo;
            </p>
          </div>

          {/* Right - form */}
          <div className="flex w-full flex-col justify-center bg-white px-6 py-10 sm:px-12 sm:py-12 md:w-1/2">
            <div className="mb-8 md:hidden">
              <Image src="/logo.png" alt="Shule+" width={140} height={42} className="mb-4 h-9 w-auto" />
              <p className="text-lg font-black uppercase tracking-[0.18em] text-[#000435]">
                Library Module
              </p>
            </div>

            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCB038]">
                Library Module
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#000435]">{title}</h1>
              <p className="mt-1 text-sm text-[#000435]/55">{subtitle}</p>
            </div>

            {status && step !== 'phone' ? (
              <div className="mb-5 rounded-xl bg-[#000435]/[0.04] px-3.5 py-3 text-xs text-[#000435]">
                <p className="font-semibold">{status.displayName}</p>
                <p className="text-[#000435]/55">{status.phone}</p>
                {status.students.length > 0 ? (
                  <p className="mt-1 text-[#000435]/55">
                    Linked: {status.students.map((s) => s.name).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {step === 'phone' ? (
              <form onSubmit={checkPhone} className="space-y-7">
                <UnderlineField
                  label="Phone number"
                  icon={<PhoneIcon />}
                  placeholder="e.g. 0788… or +250…"
                  value={phone}
                  onChange={setPhone}
                  required
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#000435] py-3.5 text-sm font-semibold text-[#FCB038] transition hover:bg-[#0a0f52] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FCB038]/30 border-t-[#FCB038]" />
                  ) : (
                    <>
                      Continue
                      <ArrowRightIcon />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={submitPassword} className="space-y-7">
                <UnderlineField
                  label={step === 'set-password' ? 'New password' : 'Password'}
                  icon={<LockIcon />}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter password here …"
                  value={password}
                  onChange={setPassword}
                  required
                  autoComplete={step === 'set-password' ? 'new-password' : 'current-password'}
                  rightAction={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="shrink-0 text-[#000435]/40 transition-colors hover:text-[#000435]"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  }
                />

                {step === 'set-password' ? (
                  <UnderlineField
                    label="Confirm password"
                    icon={<LockIcon />}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Confirm password …"
                    value={confirm}
                    onChange={setConfirm}
                    required
                    autoComplete="new-password"
                  />
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#000435] py-3.5 text-sm font-semibold text-[#FCB038] transition hover:bg-[#0a0f52] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FCB038]/30 border-t-[#FCB038]" />
                  ) : (
                    <>
                      {step === 'set-password' ? 'Save & enter' : 'Enter Library Module'}
                      <ArrowRightIcon />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetPhone}
                  className="w-full text-center text-xs font-semibold text-[#000435]/55 hover:text-[#000435]"
                >
                  Use a different phone
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="shrink-0 space-y-1 pb-4 pt-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#000435]/60">
          Managed by <span className="font-bold text-[#FCB038]">EDUPOTO</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[#000435]/30">
          © 2026 EDUPOTO GLOBAL. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
