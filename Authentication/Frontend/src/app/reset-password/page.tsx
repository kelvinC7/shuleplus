'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Reset failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-center text-sm text-danger">
        Invalid reset link. Please request a new one.
      </p>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-success">Password reset successfully.</p>
        <Link href="/login" className="font-poppins-medium text-primary hover:underline">
          Sign in with new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Input
        label="New Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        placeholder="Minimum 8 characters"
      />

      <Input
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <Button type="submit" isLoading={isLoading}>
        Reset Password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset Password" subtitle="Choose a strong new password">
      <Suspense fallback={<p className="text-center text-sm text-muted">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
