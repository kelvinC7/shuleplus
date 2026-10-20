'use client';

import { FormEvent, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { activateDeveloperAccount, validateActivationToken } from '@/lib/developer-api';

function ActivateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [info, setInfo] = useState<{ email: string; firstName: string; partnerName: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    validateActivationToken(token)
      .then(setInfo)
      .catch(() => setError('Invalid or expired activation link'));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await activateDeveloperAccount(token, password);
      setRecoveryCodes(result.recoveryCodes);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Activation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className="w-full max-w-lg rounded-3xl border border-navy/10 bg-white p-8 shadow-xl">
        <h1 className="font-montserrat text-2xl font-bold text-navy">Account Activated ✓</h1>
        <p className="mt-2 text-sm text-muted">Save these backup recovery codes securely. Each can only be used once.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-navy/5 p-4 font-mono text-sm">
          {recoveryCodes.map((c) => (
            <span key={c} className="rounded-lg bg-white px-3 py-2 text-center">{c}</span>
          ))}
        </div>
        <p className="mt-4 text-sm text-amber-700">⚠ Store these before leaving this page.</p>
        <button
          type="button"
          onClick={() => router.push('/developers/login')}
          className="mt-6 w-full rounded-2xl bg-navy py-3.5 text-sm font-semibold text-primary"
        >
          Continue to Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-navy/10 bg-white p-8 shadow-xl">
      <h1 className="font-montserrat text-2xl font-bold text-navy">Activate Developer Access</h1>
      {info ? (
        <p className="mt-2 text-sm text-muted">
          Hi {info.firstName}, you&apos;ve been granted access to <strong>{info.partnerName}</strong> on the ShulePlus Developer Portal.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">Verifying activation link…</p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {info && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-navy">Email</label>
            <input value={info.email} readOnly className="mt-2 w-full rounded-2xl border border-navy/10 bg-navy/5 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-navy">Create Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-2 w-full rounded-2xl border border-navy/10 px-4 py-3.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-navy">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-navy/10 px-4 py-3.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-navy py-3.5 text-sm font-semibold text-primary disabled:opacity-60"
          >
            {loading ? 'Activating…' : 'Activate & Set Up MFA'}
          </button>
        </form>
      )}

      <Link href="/developers/login" className="mt-4 block text-center text-sm text-muted hover:text-navy">
        Already activated? Sign in
      </Link>
    </div>
  );
}

export default function DeveloperActivatePage() {
  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-8">
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <ActivateForm />
      </Suspense>
    </div>
  );
}
