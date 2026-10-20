'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { resolvePostLoginRoute, type AuthUser } from '@/lib/auth';
import { tryLaunchDefaultModule } from '@/lib/module-launch';
import { useAppLanguage } from '@/i18n/app-language';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  ArrowRightIcon,
  EyeIcon,
  LockIcon,
  ModernField,
  UserIcon,
} from '@/components/auth/modern-field';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAppLanguage();
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
      const { data } = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      if (data.data.requiresMfa) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.setItem('mfaSessionToken', data.data.mfaSessionToken);
        const deliveryMsg =
          data.data.deliveryMessage ??
          data.data.devOtpHint ??
          (data.data.otpDelivery?.sms
            ? `Code sent to email and SMS (${data.data.otpDelivery.phoneMasked})`
            : 'Code sent to your email');
        sessionStorage.setItem('mfaDeliveryHint', deliveryMsg);
        if (data.data.otpDelivery) {
          sessionStorage.setItem('mfaOtpDelivery', JSON.stringify(data.data.otpDelivery));
        }
        router.push(`/mfa?authenticator=${data.data.authenticatorEnabled ? 'true' : 'false'}`);
        return;
      }

      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      const user = data.data.user as AuthUser;
      if (
        tryLaunchDefaultModule(user, data.data.accessToken as string, data.data.refreshToken as string)
      ) {
        return;
      }

      if (user.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      const next = searchParams.get('next');
      if (next?.startsWith('/') && !next.startsWith('//')) {
        router.push(next);
        return;
      }

      router.push(resolvePostLoginRoute(user));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t.loginFailed;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      backHref="/"
      backLabel={t.backToHome}
      title={t.welcomeBack}
      mobileTitle={t.signIn}
      subtitle={t.signInSubtitle}
      compactMobile
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <ModernField
          label={t.emailLabel}
          icon={<UserIcon />}
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />

        <ModernField
          label={t.passwordLabel}
          labelRight={
            <Link
              href="/forgot-password"
              className="text-xs font-poppins-medium text-navy/50 hover:text-primary transition-colors"
            >
              {t.forgotLink}
            </Link>
          }
          icon={<LockIcon />}
          type={showPassword ? 'text' : 'password'}
          placeholder={t.passwordPlaceholder}
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          rightAction={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-navy/40 hover:text-navy transition-colors shrink-0"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          }
        />

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-navy/30 accent-primary"
          />
          <span className="text-sm text-navy/50 font-poppins-regular">{t.rememberMe}</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          suppressHydrationWarning
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-poppins-semibold text-primary shadow-[0_12px_28px_-10px_rgba(0,4,53,0.45)] transition hover:bg-navy-light hover:shadow-[0_16px_32px_-10px_rgba(0,4,53,0.5)] disabled:opacity-60 active:scale-[0.99]"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          ) : (
            <>
              {t.signIn}
              <ArrowRightIcon />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
