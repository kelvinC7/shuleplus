'use client';

import { getToken } from '@/shared/auth-token';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function ProfileView() {
  const token = getToken();
  const payload = token ? decodeJwtPayload(token) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Profile</h1>
      <p className="text-sm text-muted">Identity is managed by IAM — this view shows your JWT claims.</p>
      <pre className="overflow-x-auto rounded-2xl border border-border bg-white p-6 text-xs text-navy">
        {payload ? JSON.stringify(payload, null, 2) : 'No token available'}
      </pre>
    </div>
  );
}
