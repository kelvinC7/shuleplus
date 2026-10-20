'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  formatAdminRole,
  formatLastLogin,
  getInitials,
  statusStyle,
  type PlatformAdmin,
} from '@/lib/platform-administrators';

interface AdminTableProps {
  admins: PlatformAdmin[];
  onSuspend: (id: string) => void;
  onActivate?: (id: string) => void;
  onResetPassword?: (admin: PlatformAdmin) => void;
  onDelete: (id: string, name: string) => void;
  busy?: boolean;
}

export function AdminTable({ admins, onSuspend, onActivate, onResetPassword, onDelete, busy }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-navy/[0.02] text-[11px] font-poppins-semibold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Administrator</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Orgs</th>
              <th className="px-5 py-3">Last Login</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const st = statusStyle(admin.status);
              return (
                <tr key={admin.id} className="border-b border-border/60 transition hover:bg-navy/[0.02]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy font-poppins-bold text-sm text-primary">
                        {getInitials(admin.firstName, admin.lastName)}
                        {admin.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success" />
                        )}
                      </span>
                      <div>
                        <p className="font-poppins-semibold text-navy">
                          {admin.firstName} {admin.lastName}
                        </p>
                        {admin.isOnline && (
                          <span className="text-[10px] font-poppins-medium text-success">Online</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-navy">{admin.email}</p>
                    <p className="text-xs text-muted">{admin.phone ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-navy/5 px-2.5 py-1 text-[11px] font-poppins-semibold text-navy">
                      {formatAdminRole(admin.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-poppins-semibold ${st.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {admin.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-poppins-medium text-navy">
                    {admin.organizationsManaged}
                  </td>
                  <td className="px-5 py-4 text-muted">{formatLastLogin(admin.lastLoginAt)}</td>
                  <td className="px-5 py-4">
                    <AdminActions
                      admin={admin}
                      onSuspend={onSuspend}
                      onActivate={onActivate}
                      onResetPassword={onResetPassword}
                      onDelete={onDelete}
                      busy={busy}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 p-4 md:hidden">
        {admins.map((admin) => {
          const st = statusStyle(admin.status);
          return (
            <div key={admin.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-poppins-bold text-sm text-primary">
                    {getInitials(admin.firstName, admin.lastName)}
                  </span>
                  <div>
                    <p className="font-poppins-semibold text-navy">{admin.firstName} {admin.lastName}</p>
                    <p className="text-xs text-muted">{admin.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-poppins-semibold ${st.chip}`}>
                  {admin.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted">Role:</span> {formatAdminRole(admin.role)}</div>
                <div><span className="text-muted">Orgs:</span> {admin.organizationsManaged}</div>
              </div>
              <div className="mt-3 flex justify-end">
                <AdminActions
                  admin={admin}
                  onSuspend={onSuspend}
                  onDelete={onDelete}
                  busy={busy}
                />
              </div>
            </div>
          );
        })}
      </div>

      {admins.length === 0 && (
        <p className="p-8 text-center text-sm text-muted">No platform administrators found.</p>
      )}
    </div>
  );
}

function AdminActions({
  admin,
  onSuspend,
  onActivate,
  onResetPassword,
  onDelete,
  busy,
}: {
  admin: PlatformAdmin;
  onSuspend: (id: string) => void;
  onActivate?: (id: string) => void;
  onResetPassword?: (admin: PlatformAdmin) => void;
  onDelete: (id: string, name: string) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-poppins-semibold text-navy transition hover:border-primary"
      >
        Actions ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">
            <Link
              href={`/root-admin/system-administrators/${admin.id}`}
              className="block px-4 py-2 text-xs font-poppins-medium text-navy hover:bg-navy/5"
              onClick={() => setOpen(false)}
            >
              View
            </Link>
            <Link
              href={`/root-admin/system-administrators/${admin.id}?tab=permissions`}
              className="block px-4 py-2 text-xs font-poppins-medium text-navy hover:bg-navy/5"
              onClick={() => setOpen(false)}
            >
              Edit Permissions
            </Link>
            {onResetPassword ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => { onResetPassword(admin); setOpen(false); }}
                className="block w-full px-4 py-2 text-left text-xs font-poppins-medium text-navy hover:bg-navy/5"
              >
                Reset Password
              </button>
            ) : null}
            {admin.status !== 'SUSPENDED' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => { onSuspend(admin.id); setOpen(false); }}
                className="block w-full px-4 py-2 text-left text-xs font-poppins-medium text-amber-600 hover:bg-amber-500/5"
              >
                Suspend
              </button>
            )}
            {admin.status === 'SUSPENDED' && onActivate ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => { onActivate(admin.id); setOpen(false); }}
                className="block w-full px-4 py-2 text-left text-xs font-poppins-medium text-success hover:bg-success/5"
              >
                Activate
              </button>
            ) : null}
            <Link
              href={`/root-admin/system-administrators/${admin.id}?tab=sessions`}
              className="block px-4 py-2 text-xs font-poppins-medium text-navy hover:bg-navy/5"
              onClick={() => setOpen(false)}
            >
              View Sessions
            </Link>
            <Link
              href={`/root-admin/system-administrators/${admin.id}?tab=activity`}
              className="block px-4 py-2 text-xs font-poppins-medium text-navy hover:bg-navy/5"
              onClick={() => setOpen(false)}
            >
              View Audit Logs
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                onDelete(admin.id, `${admin.firstName} ${admin.lastName}`);
              }}
              className="block w-full border-t border-border px-4 py-2 text-left text-xs font-poppins-medium text-danger hover:bg-danger/5"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
