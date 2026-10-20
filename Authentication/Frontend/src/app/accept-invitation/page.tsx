'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useToast } from '@/shared/notifications';

interface InviteInfo {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

function AcceptInvitationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalid('No invitation token was provided.');
      setLoading(false);
      return;
    }
    api
      .get('/root-admin/invitations/verify', { params: { token } })
      .then((res) => setInvite(res.data.data))
      .catch((err) => {
        setInvalid(
          err?.response?.data?.message ?? 'This invitation is invalid or has expired.'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      toast.error('Password must be at least 12 characters.', 'Weak password');
      return;
    }
    if (password !== confirm) {
      toast.error('The passwords you entered do not match.', 'Passwords mismatch');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/root-admin/invitations/accept', { token, password });
      toast.success('Your account is ready. You can now sign in.', 'Invitation accepted');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not accept invitation.';
      toast.error(message, 'Failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Image
            src="/logo.png"
            alt="Shule+"
            width={140}
            height={42}
            className="mx-auto h-10 w-auto"
            style={{ width: 'auto', height: 'auto' }}
          />
          <h1 className="mt-4 font-montserrat text-xl font-bold text-navy">
            Accept Your Invitation
          </h1>
          <p className="mt-1 text-sm text-muted">Set your password to activate your account</p>
        </div>

        {loading && <p className="text-center text-sm text-muted">Verifying invitation…</p>}

        {!loading && invalid && (
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-sm text-danger">{invalid}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 text-sm font-poppins-semibold text-navy underline"
            >
              Go to login
            </button>
          </div>
        )}

        {!loading && invite && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-[#F8FAFC] p-4 text-sm">
              <p className="font-poppins-semibold text-navy">
                {invite.firstName} {invite.lastName}
              </p>
              <p className="text-muted">{invite.email}</p>
              <span className="mt-2 inline-block rounded-full bg-navy px-3 py-1 text-xs font-poppins-semibold text-primary">
                {invite.role.replace(/_/g, ' ')}
              </span>
            </div>

            <input
              type="password"
              placeholder="New password (min 12 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-lg border border-border px-4 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-navy py-3 text-sm font-poppins-semibold text-primary disabled:opacity-60"
            >
              {submitting ? 'Activating…' : 'Activate Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationInner />
    </Suspense>
  );
}
