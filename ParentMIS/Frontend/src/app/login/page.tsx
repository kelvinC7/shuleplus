'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { storeToken, getToken, getParentSession, storeParentSession } from '@/shared/auth-token';
import { useAuth } from '@/contexts/auth-context';
import {
  needsPinSetup,
  PARENT_PORTAL_SCHOOL,
  parentAuthJson,
  type ParentAuthStep,
  type StatusData,
  PIN_LENGTH,
} from '@/lib/parent-auth-api';
import { isShuleTripOnlyPortal } from '@/lib/portal-features';
import { ParentLoginShell } from '@/components/auth/parent-login-shell';
import {
  ArrowRightIcon,
  AuthStepDots,
  EmailField,
  PhoneField,
  PhoneIcon,
  PinField,
  YoAuthPrimaryButton,
} from '@/components/auth/parent-auth-fields';

export default function ParentLoginPage() {
  const router = useRouter();
  const { reload } = useAuth();
  const [step, setStep] = useState<ParentAuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [tripOnlyPortal, setTripOnlyPortal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void (async () => {
      const session = getParentSession();
      const sessionPhone = session?.parent.phone?.trim();
      if (sessionPhone) {
        try {
          const data = await parentAuthJson<StatusData>(
            `/public/parents/auth/status?phone=${encodeURIComponent(sessionPhone)}`
          );
          if (data.portalFeatures && session) {
            storeParentSession({ ...session, portalFeatures: data.portalFeatures });
          }
        } catch {
          /* dashboard load will retry */
        }
      }
      router.replace('/dashboard');
    })();
  }, [router]);

  useEffect(() => {
    if (step !== 'verify-email' || !phone.trim()) return;
    void (async () => {
      try {
        const hint = await parentAuthJson<{ hasEmailOnFile: boolean; maskedEmail?: string }>(
          `/public/parents/auth/reset-email-hint?phone=${encodeURIComponent(phone.trim())}`
        );
        setEmailHint(hint.hasEmailOnFile && hint.maskedEmail ? hint.maskedEmail : null);
      } catch {
        setEmailHint(null);
      }
    })();
  }, [step, phone]);

  const title = useMemo(() => {
    if (step === 'verify-email') return 'Verify your email';
    if (step === 'set-pin') return resetMode ? 'Reset your PIN' : 'Create your PIN';
    if (step === 'confirm-pin') return 'Confirm your PIN';
    if (step === 'login') return 'Welcome back';
    return 'Log in';
  }, [step, resetMode]);

  const subtitle = useMemo(() => {
    if (step === 'phone') return `Parent Console · ${PARENT_PORTAL_SCHOOL}`;
    if (step === 'verify-email') {
      return 'Enter the guardian email saved in Student Management or on your ShuleTrip learner manifest.';
    }
    if (step === 'set-pin') {
      return resetMode
        ? 'Choose a new 5-digit PIN. It works on web and USSD.'
        : 'First time here? Choose a 5-digit PIN for web and USSD.';
    }
    if (step === 'confirm-pin') return 'Enter the same 5 digits again to confirm.';
    if (step === 'login') return 'Enter your 5-digit PIN to continue.';
    return '';
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
      const data = await parentAuthJson<StatusData>(
        `/public/parents/auth/status?phone=${encodeURIComponent(phone.trim())}`
      );
      setStatus(data);
      setTripOnlyPortal(isShuleTripOnlyPortal(data.portalFeatures));
      if (data.phone) setPhone(data.phone);
      setPin('');
      setConfirmPin('');
      setResetMode(false);
      setResetToken('');
      setEmail('');
      setStep(needsPinSetup(data) ? 'set-pin' : 'login');
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
      const data = await parentAuthJson<{
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
        portalFeatures?: { studentManagement: boolean; shuleTrip: boolean };
      }>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      storeToken(data.token);
      storeParentSession({
        parent: data.parent,
        students: data.students ?? [],
        portalFeatures: data.portalFeatures,
      });
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pm-active-student');
      }
      setTripOnlyPortal(isShuleTripOnlyPortal(data.portalFeatures));
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
      if (/confirm your school email/i.test(msg)) {
        setStep('verify-email');
        setResetToken('');
        setError(msg);
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

  async function submitVerifyEmail(e: FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter the guardian email on file at school');
      return;
    }
    setLoading(true);
    try {
      const data = await parentAuthJson<{ resetToken: string }>('/public/parents/auth/verify-reset-email', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim(), email: trimmed }),
      });
      setResetToken(data.resetToken);
      setPin('');
      setConfirmPin('');
      setStep('set-pin');
      toast.success('Email verified — choose a new PIN');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Email verification failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
    const body: Record<string, string | boolean> = {
      phone: phone.trim(),
      pin,
      confirmPin,
    };
    if (resetMode) {
      body.reset = true;
      body.resetToken = resetToken;
    }
    await finishAuth('/public/parents/auth/set-password', body);
  }

  function startResetPin() {
    setResetMode(true);
    setPin('');
    setConfirmPin('');
    setEmail('');
    setResetToken('');
    setError('');
    setStep('verify-email');
  }

  function resetPhone() {
    setStep('phone');
    setPin('');
    setConfirmPin('');
    setEmail('');
    setResetToken('');
    setStatus(null);
    setError('');
    setResetMode(false);
    setEmailHint(null);
  }

  const primaryDisabled =
    loading ||
    (step === 'login' && pin.length !== PIN_LENGTH) ||
    (step === 'verify-email' && !email.trim().includes('@')) ||
    (step === 'set-pin' && pin.length !== PIN_LENGTH) ||
    (step === 'confirm-pin' && confirmPin.length !== PIN_LENGTH);

  const stepBadge =
    step === 'login'
      ? 'PIN ready'
      : step === 'verify-email'
        ? 'Verify email'
        : step === 'confirm-pin'
          ? 'Confirm'
          : 'Set PIN';

  return (
    <ParentLoginShell formTitle={title} formSubtitle={subtitle} tripOnly={tripOnlyPortal}>
      {step !== 'phone' ? <AuthStepDots step={step} resetFlow={resetMode} /> : null}

      {status && step !== 'phone' ? (
        <div className="rounded-2xl border border-[var(--yo-line)] bg-[var(--yo-bg)]/80 px-4 py-3.5 text-xs text-[var(--yo-navy)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{status.displayName}</p>
              <p className="mt-0.5 text-[var(--yo-muted)]">{status.phone || phone}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                step === 'login' ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--yo-amber-soft)] text-[var(--yo-navy)]'
              }`}
            >
              {stepBadge}
            </span>
          </div>
          {status.students.length > 0 ? (
            <p className="mt-2 line-clamp-2 text-[var(--yo-muted)]">
              Linked: {status.students.map((s) => s.name).join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[10px] bg-[#fde7e8] px-3 py-2.5 text-[13px] font-semibold text-[#b4262b]" role="alert">
          {error}
        </div>
      ) : null}

      {step === 'phone' ? (
        <form onSubmit={checkPhone} className="flex flex-col gap-4">
          <PhoneField
            label="Phone number"
            icon={<PhoneIcon />}
            placeholder="e.g. 0788… or +250…"
            value={phone}
            onChange={setPhone}
          />
          <YoAuthPrimaryButton loading={loading}>
            Continue
            <ArrowRightIcon />
          </YoAuthPrimaryButton>
          <p className="text-center text-xs leading-relaxed text-[var(--yo-muted)]">
            Use the guardian phone on the school trip manifest, or the number saved on your child&apos;s profile.
          </p>
        </form>
      ) : null}

      {step === 'verify-email' ? (
        <form onSubmit={submitVerifyEmail} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[var(--yo-line)]/80 bg-gradient-to-br from-[#fff8ea] to-white px-4 py-4">
            <p className="text-[13px] leading-relaxed text-[var(--yo-navy)]">
              For your security, we match the email the school saved for this guardian phone
              {emailHint ? (
                <>
                  {' '}
                  (hint: <span className="font-bold">{emailHint}</span>)
                </>
              ) : null}
              .
            </p>
          </div>
          <EmailField
            label="Guardian email"
            placeholder="name@example.com"
            value={email}
            onChange={setEmail}
            hint="Same email as Student Management parent profile or ShuleTrip manifest"
          />
          <YoAuthPrimaryButton disabled={primaryDisabled} loading={loading}>
            Verify & continue
            <ArrowRightIcon />
          </YoAuthPrimaryButton>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={resetPhone} className="text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]">
              Use a different phone
            </button>
            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setStep('login');
                setError('');
              }}
              className="text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]"
            >
              Back to sign in
            </button>
          </div>
        </form>
      ) : null}

      {step === 'login' ? (
        <form onSubmit={submitLogin} className="flex flex-col gap-4">
          <PinField label="Enter PIN" value={pin} onChange={setPin} autoFocus hint="5 digits. Same PIN works on USSD" />
          <YoAuthPrimaryButton disabled={primaryDisabled} loading={loading}>
            Log in
            <ArrowRightIcon />
          </YoAuthPrimaryButton>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={resetPhone} className="text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]">
              Use a different phone
            </button>
            <button type="button" onClick={startResetPin} className="text-xs font-bold text-[#b26b00] hover:underline">
              Forgot PIN? Reset
            </button>
          </div>
        </form>
      ) : null}

      {step === 'set-pin' ? (
        <form onSubmit={goConfirmPin} className="flex flex-col gap-4">
          <PinField label="New PIN" value={pin} onChange={setPin} autoFocus hint="Choose 5 digits you will remember" />
          <YoAuthPrimaryButton disabled={primaryDisabled} loading={false}>
            Continue to confirm
            <ArrowRightIcon />
          </YoAuthPrimaryButton>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={resetPhone} className="text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]">
              Use a different phone
            </button>
            {resetMode ? (
              <button
                type="button"
                onClick={() => {
                  setStep('verify-email');
                  setPin('');
                  setError('');
                }}
                className="text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]"
              >
                Re-verify email
              </button>
            ) : !status || needsPinSetup(status) ? null : (
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setStep('login');
                  setPin('');
                  setError('');
                }}
                className="text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]"
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>
      ) : null}

      {step === 'confirm-pin' ? (
        <form onSubmit={submitConfirmPin} className="flex flex-col gap-4">
          <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} autoFocus hint="Re-enter the same 5 digits" />
          <YoAuthPrimaryButton disabled={primaryDisabled} loading={loading}>
            Save PIN & enter portal
            <ArrowRightIcon />
          </YoAuthPrimaryButton>
          <button
            type="button"
            onClick={() => {
              setStep('set-pin');
              setConfirmPin('');
              setError('');
            }}
            className="w-full text-center text-xs font-bold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]"
          >
            Back to edit PIN
          </button>
        </form>
      ) : null}
    </ParentLoginShell>
  );
}