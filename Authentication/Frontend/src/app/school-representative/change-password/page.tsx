'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-navy">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-[#f8f9fc] px-4 py-3 transition focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-sm">
        <Lock className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-muted hover:text-navy"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function RepChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const requirements = useMemo(
    () => [
      { met: newPassword.length >= 8, text: 'At least 8 characters' },
      { met: confirm.length > 0 && newPassword === confirm, text: 'Passwords match' },
    ],
    [newPassword, confirm]
  );

  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirm && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      const user = getStoredUser();
      if (user) {
        user.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setSuccess(true);
      setTimeout(() => router.push('/school-representative/profile'), 1200);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to change password'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/school-representative/profile"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy">Change password</h1>
        <p className="mt-1 text-sm text-muted">Use a strong password you do not use elsewhere.</p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-emerald-900">
            <p className="font-semibold">Password updated</p>
            <p className="mt-1 text-sm">Redirecting to your profile…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <PasswordInput
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <PasswordInput
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />

            <ul className="space-y-2 rounded-2xl bg-[#f8f9fc] p-4">
              {requirements.map((req) => (
                <li key={req.text} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      req.met ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-border text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className={req.met ? 'text-navy' : 'text-muted'}>{req.text}</span>
                </li>
              ))}
            </ul>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center rounded-2xl bg-navy py-3.5 text-sm font-semibold text-primary transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
