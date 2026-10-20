'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified. You can now sign in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err?.response?.data?.message ?? 'Verification failed. The link may have expired.'
        );
      });
  }, [token]);

  return (
    <div className="text-center space-y-4">
      {status === 'loading' && <p className="text-sm text-muted">Verifying your email...</p>}
      {status !== 'loading' && (
        <p className={`text-sm ${status === 'success' ? 'text-success' : 'text-danger'}`}>
          {message}
        </p>
      )}
      <Link href="/login" className="font-poppins-medium text-primary hover:underline text-sm">
        Go to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout title="Verify Email" subtitle="Confirming your email address">
      <Suspense fallback={<p className="text-center text-sm text-muted">Loading...</p>}>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
