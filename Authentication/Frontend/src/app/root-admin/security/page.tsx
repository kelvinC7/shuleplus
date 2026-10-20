'use client';

import Link from 'next/link';
import { getStoredUser } from '@/lib/auth';
import { BackButton } from '@/components/root-admin/back-button';

export default function SecurityPage() {
  const user = getStoredUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackButton href="/root-admin" />
        <h1 className="font-montserrat text-2xl font-bold text-navy">Security Center</h1>
      </div>

      <section className="rounded-2xl border border-border bg-white/90 p-6">
        <h2 className="font-poppins-semibold text-navy mb-4">MFA Requirement</h2>
        <p className="text-sm text-muted mb-4">
          ROOT_ADMIN accounts must use Email + Password + Authenticator App.
        </p>
        <p className="text-sm">
          Status:{' '}
          <span className={user?.mfaRequired ? 'text-danger font-poppins-semibold' : 'text-success'}>
            {user?.mfaRequired ? '⚠ MFA setup required' : '🟢 MFA configured'}
          </span>
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white/90 p-6">
        <h2 className="font-poppins-semibold text-navy mb-4">Device Tracking</h2>
        <div className="space-y-3 text-sm text-muted">
          <p>🖥 Chrome · Windows</p>
          <p>🦊 Firefox · Ubuntu</p>
          <p>📱 Safari · iPhone</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white/90 p-6">
        <h2 className="font-poppins-semibold text-navy mb-4">Login Alerts</h2>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-poppins-semibold text-navy">New Login Detected</p>
          <p className="text-muted mt-1">Location: Kigali · Device: Chrome · Time: Recent</p>
        </div>
      </section>

      <Link href="/root-admin/control-center" className="inline-block text-sm text-primary hover:underline">
        Open Emergency Control Center →
      </Link>
    </div>
  );
}
