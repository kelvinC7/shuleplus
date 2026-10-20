'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { storeToken, getToken, storeParentSession } from '@/shared/auth-token';
import { useAuth } from '@/contexts/auth-context';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const STUDENT_MGMT_API =
  process.env.NEXT_PUBLIC_STUDENT_MGMT_API_URL?.replace(/\/$/, '') || 'http://localhost:3052/api';

const LANDING_URL = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type Step = 'phone' | 'set-pin' | 'confirm-pin' | 'login';

const PIN_LENGTH = 5;

type StatusData = {
  phone: string | null;
  hasPassword: boolean;
  hasPin?: boolean;
  needsPinSetup?: boolean;
  displayName: string;
  students: { id: string; name: string; studentCode: string | null; role: string; className?: string | null }[];
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

function needsSetup(data: StatusData) {
  if (typeof data.needsPinSetup === 'boolean') return data.needsPinSetup;
  if (typeof data.hasPin === 'boolean') return !data.hasPin;
  return !data.hasPassword;
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function PinField({
  label,
  value,
  onChange,
  autoFocus,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-center text-sm font-semibold text-[#000435]">{label}</label>
      <InputOTP
        maxLength={PIN_LENGTH}
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus={autoFocus}
        value={value}
        onChange={(v) => onChange(v.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        containerClassName="justify-center gap-2.5 sm:gap-3"
      >
        <InputOTPGroup className="gap-2.5 border-0 bg-transparent shadow-none sm:gap-3">
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-12 rounded-2xl border-2 border-[#000435]/10 bg-white text-2xl font-bold text-[#000435] shadow-[0_8px_24px_-12px_rgba(0,4,53,0.35)] transition first:rounded-2xl last:rounded-2xl data-[active=true]:border-[#FCB038] data-[active=true]:ring-4 data-[active=true]:ring-[#FCB038]/20 sm:h-14 sm:w-14"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {hint ? <p className="text-center text-xs text-[#000435]/45">{hint}</p> : null}
    </div>
  );
}

function PhoneField({
  label,
  icon,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-[#000435]">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-[#000435]/10 bg-[#f8fafc] px-4 py-3.5 transition focus-within:border-[#FCB038] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#FCB038]/15">
        <span className="shrink-0 text-[#000435]/45">{icon}</span>
        <input
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="tel"
          inputMode="tel"
          className="min-w-0 flex-1 bg-transparent text-base text-[#000435] outline-none placeholder:text-[#000435]/30"
        />
      </div>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const map: Record<Step, number> = {
    phone: 0,
    login: 1,
    'set-pin': 1,
    'confirm-pin': 2,
  };
  const active = map[step];
  const total = step === 'confirm-pin' || step === 'set-pin' ? 3 : 2;
  return (
    <div className="mb-5 flex items-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === active ? 'w-8 bg-[#FCB038]' : i < active ? 'w-4 bg-[#FCB038]/50' : 'w-1.5 bg-[#000435]/12'
          }`}
        />
      ))}
    </div>
  );
}

export default function ParentLoginPage() {
  const router = useRouter();
  const { reload } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  const title = useMemo(() => {
    if (step === 'set-pin') return resetMode ? 'Reset your PIN' : 'Create your PIN';
    if (step === 'confirm-pin') return 'Confirm your PIN';
    if (step === 'login') return 'Welcome back';
    return 'Parent Login';
  }, [step, resetMode]);

  const subtitle = useMemo(() => {
    if (step === 'set-pin') {
      return resetMode
        ? 'Choose a new 5-digit PIN. It works on web and USSD.'
        : 'First time here? Choose a 5-digit PIN for web and USSD.';
    }
    if (step === 'confirm-pin') return 'Enter the same 5 digits again to confirm.';
    if (step === 'login') return 'Enter your 5-digit PIN to continue.';
    return "Use the phone number saved on your child's school profile.";
  }, [step, resetMode]);

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
      if (data.phone) setPhone(data.phone);
      setPin('');
      setConfirmPin('');
      setResetMode(false);
      setStep(needsSetup(data) ? 'set-pin' : 'login');
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
    body: Record<string, string | boolean>
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
      toast.success(path.includes('set-password') ? 'PIN saved. Welcome!' : 'Welcome back');
      await reload();
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (/no pin set/i.test(msg) || /create a 5-digit pin/i.test(msg)) {
        setResetMode(false);
        setStep('set-pin');
        setPin('');
        setConfirmPin('');
        setError('Create your 5-digit PIN to continue.');
        return;
      }
      if (/pin already set/i.test(msg) || /log in instead/i.test(msg)) {
        setStep('login');
        setPin('');
        setConfirmPin('');
        setResetMode(false);
        setError('PIN already set. Enter it to continue, or tap Reset PIN.');
        return;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
      setError('Enter a 5-digit PIN');
      return;
    }
    await finishAuth('/public/parents/auth/login', {
      phone: phone.trim(),
      pin,
    });
  }

  function goConfirmPin(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
      setError('Enter a 5-digit PIN');
      return;
    }
    setConfirmPin('');
    setStep('confirm-pin');
  }

  async function submitConfirmPin(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (confirmPin.length !== PIN_LENGTH || !/^\d+$/.test(confirmPin)) {
      setError('Confirm your 5-digit PIN');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Try again.');
      setConfirmPin('');
      return;
    }
    await finishAuth('/public/parents/auth/set-password', {
      phone: phone.trim(),
      pin,
      confirmPin,
      // Allow overwrite when resetting, or when status already had a PIN
      reset: resetMode || Boolean(status && !needsSetup(status)),
    });
  }

  function startResetPin() {
    setResetMode(true);
    setPin('');
    setConfirmPin('');
    setError('');
    setStep('set-pin');
  }

  function resetPhone() {
    setStep('phone');
    setPin('');
    setConfirmPin('');
    setStatus(null);
    setError('');
    setResetMode(false);
  }

  const primaryDisabled =
    loading ||
    (step === 'login' && pin.length !== PIN_LENGTH) ||
    (step === 'set-pin' && pin.length !== PIN_LENGTH) ||
    (step === 'confirm-pin' && confirmPin.length !== PIN_LENGTH);

  return (
    <div className="auth-bg flex min-h-[100dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-8 sm:py-5">
        <Link href={LANDING_URL} className="shrink-0">
          <Image src="/logo.png" alt="Shule+" width={160} height={48} className="h-9 w-auto object-contain sm:h-12" priority />
        </Link>
        <a
          href={LANDING_URL}
          className="inline-flex items-center gap-2 rounded-full border border-[#000435]/10 bg-white/90 px-3 py-2 text-xs font-semibold text-[#000435] shadow-sm backdrop-blur-sm transition hover:border-[#FCB038]/40 sm:px-4 sm:text-sm"
        >
          Home
        </a>
      </header>

      <main className="flex flex-1 items-stretch justify-center px-3 pb-4 pt-1 sm:items-center sm:px-4 sm:py-6">
        <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_90px_-28px_rgba(0,4,53,0.4)] md:max-w-5xl md:min-h-[620px] md:flex-row">
          {/* Left brand panel */}
          <div className="relative flex min-h-[200px] shrink-0 flex-col overflow-hidden bg-[#FCB038] md:w-[46%] md:min-h-full">
            <div className="relative z-20 px-6 pb-1 pt-5 md:px-9 md:pt-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#000435]/65 md:text-[11px]">
                Parent Portal
              </p>
              <p className="mt-2 max-w-[14rem] text-base font-semibold leading-snug text-[#000435] md:mt-3 md:max-w-xs md:text-lg md:leading-relaxed">
                Stay close to your child&apos;s school journey.
              </p>
            </div>
            <div className="pointer-events-none relative z-10 mt-auto flex flex-1 items-end justify-center overflow-hidden md:min-h-[480px]">
              <Image
                src="/logo-bg-left.png"
                alt="Parent and student"
                width={720}
                height={800}
                className="h-auto w-[110%] max-w-none translate-y-3 object-contain object-bottom drop-shadow-2xl sm:w-[100%] md:absolute md:bottom-0 md:left-1/2 md:w-[125%] md:max-w-none md:-translate-x-1/2 md:translate-y-2"
                priority
              />
            </div>
          </div>

          {/* Right form */}
          <div className="relative flex w-full flex-1 flex-col justify-center bg-gradient-to-b from-white to-[#fbfcfe] px-5 py-8 sm:px-10 sm:py-10 md:w-[52%] md:px-12">
            <StepDots step={step} />

            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCB038]">
                {step === 'set-pin' || step === 'confirm-pin'
                  ? resetMode
                    ? 'Reset PIN'
                    : 'First-time setup'
                  : 'Secure access'}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#000435] sm:text-[1.85rem]">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#000435]/55">{subtitle}</p>
            </div>

            {status && step !== 'phone' ? (
              <div className="mb-5 rounded-2xl border border-[#000435]/6 bg-[#000435]/[0.03] px-4 py-3.5 text-xs text-[#000435]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold sm:text-sm">{status.displayName}</p>
                    <p className="mt-0.5 text-[#000435]/55">{status.phone || phone}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      step === 'login' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FCB038]/20 text-[#000435]'
                    }`}
                  >
                    {step === 'login' ? 'PIN ready' : step === 'confirm-pin' ? 'Confirm' : 'Set PIN'}
                  </span>
                </div>
                {status.students.length > 0 ? (
                  <p className="mt-2 line-clamp-2 text-[#000435]/55">
                    Linked: {status.students.map((s) => s.name).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            ) : null}

            {step === 'phone' ? (
              <form onSubmit={checkPhone} className="space-y-6">
                <PhoneField
                  label="Phone number"
                  icon={<PhoneIcon />}
                  placeholder="e.g. 0788… or +250…"
                  value={phone}
                  onChange={setPhone}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#000435] py-3.5 text-sm font-semibold text-[#FCB038] shadow-lg shadow-[#000435]/25 transition hover:bg-[#0a0f52] active:scale-[0.99] disabled:opacity-60"
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
            ) : null}

            {step === 'login' ? (
              <form onSubmit={submitLogin} className="space-y-7">
                <PinField
                  label="Enter PIN"
                  value={pin}
                  onChange={setPin}
                  autoFocus
                  hint="5 digits. Same PIN works on USSD"
                />
                <button
                  type="submit"
                  disabled={primaryDisabled}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#000435] py-3.5 text-sm font-semibold text-[#FCB038] shadow-lg shadow-[#000435]/25 transition hover:bg-[#0a0f52] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FCB038]/30 border-t-[#FCB038]" />
                  ) : (
                    <>
                      Enter Parent Portal
                      <ArrowRightIcon />
                    </>
                  )}
                </button>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                  <button type="button" onClick={resetPhone} className="text-xs font-semibold text-[#000435]/55 hover:text-[#000435]">
                    Use a different phone
                  </button>
                  <button type="button" onClick={startResetPin} className="text-xs font-semibold text-[#FCB038] hover:underline">
                    Forgot PIN? Reset
                  </button>
                </div>
              </form>
            ) : null}

            {step === 'set-pin' ? (
              <form onSubmit={goConfirmPin} className="space-y-7">
                <PinField
                  label="New PIN"
                  value={pin}
                  onChange={setPin}
                  autoFocus
                  hint="Choose 5 digits you will remember"
                />
                <button
                  type="submit"
                  disabled={primaryDisabled}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#000435] py-3.5 text-sm font-semibold text-[#FCB038] shadow-lg shadow-[#000435]/25 transition hover:bg-[#0a0f52] active:scale-[0.99] disabled:opacity-60"
                >
                  Continue to confirm
                  <ArrowRightIcon />
                </button>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                  <button type="button" onClick={resetPhone} className="text-xs font-semibold text-[#000435]/55 hover:text-[#000435]">
                    Use a different phone
                  </button>
                  {!status || needsSetup(status) ? null : (
                    <button
                      type="button"
                      onClick={() => {
                        setResetMode(false);
                        setStep('login');
                        setPin('');
                        setError('');
                      }}
                      className="text-xs font-semibold text-[#000435]/55 hover:text-[#000435]"
                    >
                      Back to sign in
                    </button>
                  )}
                </div>
              </form>
            ) : null}

            {step === 'confirm-pin' ? (
              <form onSubmit={submitConfirmPin} className="space-y-7">
                <PinField
                  label="Confirm PIN"
                  value={confirmPin}
                  onChange={setConfirmPin}
                  autoFocus
                  hint="Re-enter the same 5 digits"
                />
                <button
                  type="submit"
                  disabled={primaryDisabled}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#000435] py-3.5 text-sm font-semibold text-[#FCB038] shadow-lg shadow-[#000435]/25 transition hover:bg-[#0a0f52] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FCB038]/30 border-t-[#FCB038]" />
                  ) : (
                    <>
                      Save PIN & enter portal
                      <ArrowRightIcon />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('set-pin');
                    setConfirmPin('');
                    setError('');
                  }}
                  className="w-full text-center text-xs font-semibold text-[#000435]/55 hover:text-[#000435]"
                >
                  Back to edit PIN
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="shrink-0 space-y-1 px-4 pb-5 pt-1 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#000435]/55">
          Managed by <span className="font-bold text-[#FCB038]">EDUPOTO</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[#000435]/30">
          © 2026 EDUPOTO GLOBAL. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
