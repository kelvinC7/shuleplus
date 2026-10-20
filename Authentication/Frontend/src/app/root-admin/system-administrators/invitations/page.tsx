'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { formatAdminRole, getInitials, statusStyle, type PlatformAdmin } from '@/lib/platform-administrators';

export default function InvitationsPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/root-admin/platform-administrators')
      .then((res) => setAdmins(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const pending = admins.filter(
    (a) => a.status === 'PENDING_VERIFICATION' || (a.mustChangePassword && !a.lastLoginAt)
  );
  const accepted = admins.filter(
    (a) => a.status === 'ACTIVE' && a.lastLoginAt
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <BackButton href="/root-admin/system-administrators" label="Back to Administrators" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-navy">Administrator Invitations</h1>
          <p className="text-sm text-muted">Secure invitation workflow for platform administrators</p>
        </div>
        <Link
          href="/root-admin/system-administrators/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-poppins-semibold text-navy"
        >
          + Send Invitation
        </Link>
      </div>

      {/* Workflow diagram */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6">
        <p className="mb-4 font-poppins-semibold text-navy">Invitation Workflow</p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-poppins-medium text-navy sm:gap-3">
          {['Create Admin', 'Send Invitation', 'Admin Accepts', 'Sets Password', 'Enable MFA'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-navy px-3 py-1.5 text-primary">{step}</span>
              {i < arr.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-montserrat text-lg font-bold text-navy">
          Pending Invitations ({pending.length})
        </h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-white/60" />
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No pending invitations.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((admin) => {
              const st = statusStyle(admin.status);
              return (
                <div key={admin.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-poppins-bold text-sm text-primary">
                      {getInitials(admin.firstName, admin.lastName)}
                    </span>
                    <div>
                      <p className="font-poppins-semibold text-navy">{admin.firstName} {admin.lastName}</p>
                      <p className="text-xs text-muted">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-poppins-semibold ${st.chip}`}>
                      Awaiting acceptance
                    </span>
                    <span className="text-xs text-muted">{formatAdminRole(admin.role)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-montserrat text-lg font-bold text-navy">
          Accepted ({accepted.length})
        </h2>
        <div className="space-y-2">
          {accepted.map((admin) => (
            <Link
              key={admin.id}
              href={`/root-admin/system-administrators/${admin.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-poppins-bold text-primary">
                  {getInitials(admin.firstName, admin.lastName)}
                </span>
                <div>
                  <p className="font-poppins-medium text-sm text-navy">{admin.firstName} {admin.lastName}</p>
                  <p className="text-xs text-muted">{admin.email}</p>
                </div>
              </div>
              <span className="text-xs font-poppins-semibold text-success">Active</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
