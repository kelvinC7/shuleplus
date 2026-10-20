'use client';

import { useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStoredUser, getAccessToken, getRefreshToken, resolvePostLoginRoute } from '@/lib/auth';
import { tryLaunchDefaultModule } from '@/lib/module-launch';
import { useAppLanguage } from '@/i18n/app-language';
import { AuthShell } from '@/components/auth/auth-shell';
import { EyeIcon, LockIcon } from '@/components/auth/modern-field';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-poppins-semibold text-navy">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-navy/10 bg-[#f8fafc] px-4 py-3.5 transition focus-within:border-primary/50 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(252,176,56,0.12)]">
        <span className="shrink-0 text-navy/40">
          <LockIcon />
        </span>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-base text-navy placeholder:text-navy/30 outline-none font-poppins-regular sm:text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="shrink-0 text-navy/40 transition hover:text-navy"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useAppLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dashboardHref = useMemo(() => {
    const user = getStoredUser();
    return user ? resolvePostLoginRoute(user) : '/login';
  }, []);

  const requirements = useMemo(
    () => [
      { met: newPassword.length >= 8, text: t.reqMinChars },
      { met: confirm.length > 0 && newPassword === confirm, text: t.reqMatch },
    ],
    [newPassword, confirm, t.reqMinChars, t.reqMatch],
  );

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirm &&
    !isLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError(t.passwordsMismatch);
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });

      const user = getStoredUser();
      if (user) {
        user.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(user));
        if (user.roles?.includes('school_representative')) {
          router.push('/school-representative');
          return;
        }
        if (user.roles?.includes('chief_accountant')) {
          router.push('/chief-accountant');
          return;
        }
        const token = getAccessToken();
        if (token && tryLaunchDefaultModule(user, token, getRefreshToken())) {
          return;
        }
        router.push(resolvePostLoginRoute(user));
      } else {
        router.push('/login');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t.requestFailed,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      backHref={dashboardHref}
      backLabel={t.backToDashboard}
      title={t.changePasswordTitle}
      subtitle={t.changePasswordSubtitle}
      mobileBrand={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <PasswordField
          label={t.currentPassword}
          placeholder={t.passwordPlaceholder}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          label={t.newPassword}
          placeholder={t.passwordPlaceholderNew}
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label={t.confirmPassword}
          placeholder={t.passwordPlaceholderNew}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        <ul className="space-y-2 rounded-2xl bg-[#f8fafc] p-4">
          {requirements.map((req) => (
            <li key={req.text} className="flex items-center gap-2.5 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                  req.met ? 'bg-amber-500 text-white' : 'bg-white text-muted ring-1 ring-border'
                }`}
              >
                {req.met ? <CheckIcon /> : null}
              </span>
              <span className={req.met ? 'text-navy' : 'text-muted'}>{req.text}</span>
            </li>
          ))}
        </ul>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-poppins-semibold text-primary shadow-[0_12px_28px_-10px_rgba(0,4,53,0.45)] transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          ) : (
            t.updatePassword
          )}
        </button>
      </form>
    </AuthShell>
  );
}
