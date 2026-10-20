'use client';

import { useAuth } from '@/contexts/auth-context';
import { roleLabel } from '@/lib/nav';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/format';

export default function AccountPage() {
  const { user, profile, role } = useAuth();

  return (
    <div>
      <PageHeader title="Account" description="Your ShulePlus profile and canteen module role." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                {initials(profile?.displayName ?? user?.email)}
              </span>
              <div>
                <p className="text-lg font-semibold text-navy">{profile?.displayName ?? user?.email}</p>
                <p className="text-sm text-muted">{profile?.email ?? user?.email}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="info">{roleLabel(role)}</Badge>
              {user?.roles.map((r) => (
                <Badge key={r} variant="muted">{r}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-navy">Module access</h3>
            <p className="mt-1 text-sm text-muted">Modules licensed to this account.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(user?.modules ?? []).map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Organization ID</dt>
                <dd className="font-mono text-xs">{user?.organizationId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium">{profile?.phone ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">School code</dt>
                <dd className="font-medium">{profile?.schoolCode ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
