'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  LogIn,
  LogOut,
  Printer,
  X,
} from 'lucide-react';
import { AvatarInitials, PillBadge } from '@/components/discipline-data-table';
import { StatusBadge } from '@/components/status-badge';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { PermissionQrCode } from '@/modules/permissions/permission-qr-code';
import {
  displayStatus,
  formatDuration,
  formatPermissionDate,
  formatTime12h,
  permissionTypeLabel,
} from '@/modules/permissions/permission-utils';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { PermissionEvent, PermissionRequest } from '@/types/discipline';
import { toast } from 'sonner';

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface PermissionDetailViewProps {
  id: string;
}

export function PermissionDetailView({ id }: PermissionDetailViewProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [row, setRow] = useState<PermissionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await disciplineApi.permission(id);
      setRow(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load permission'));
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    action: 'approve' | 'reject' | 'cancel' | 'checkout' | 'return',
    title: string,
    message: string
  ) {
    const ok = await confirm({ title, message, confirmLabel: title, tone: action === 'reject' || action === 'cancel' ? 'danger' : 'default' });
    if (!ok) return;
    setActing(true);
    try {
      const { data } = await disciplineApi.permissionAction(id, action);
      setRow(data.data);
      toast.success(`${title} successful`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `${title} failed`));
    } finally {
      setActing(false);
    }
  }

  function printPage() {
    window.print();
  }

  if (loading) {
    return (
      <div className="hr-card p-12 text-center text-sm text-slate-500">Loading permission request…</div>
    );
  }

  if (!row) {
    return (
      <div className="hr-card p-12 text-center text-sm text-slate-500">
        Permission request not found.{' '}
        <button type="button" className="font-semibold text-[#000435] underline" onClick={() => router.push('/permissions')}>
          Back to list
        </button>
      </div>
    );
  }

  const status = displayStatus(row);
  const events = row.events ?? [];

  return (
    <div className="space-y-6">
      {dialog}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-[#000435]" onClick={() => router.push('/permissions')}>
            <ArrowLeft size={16} /> Back to permissions
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[#000435] sm:text-2xl">Permission Request</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{row.referenceNumber}</p>
          {row.scanCode ? (
            <p className="mt-0.5 font-mono text-xs font-semibold text-[#fcb038]">Scan code: {row.scanCode}</p>
          ) : null}
          <div className="mt-3">
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {row.status === 'Pending' ? (
            <>
              <button type="button" className="btn-primary" disabled={acting} onClick={() => void runAction('approve', 'Approve', 'Approve this permission request?')}>
                <Check size={16} /> Approve
              </button>
              <button type="button" className="btn-secondary text-red-600" disabled={acting} onClick={() => void runAction('reject', 'Reject', 'Reject this permission request?')}>
                <X size={16} /> Reject
              </button>
            </>
          ) : null}
          {row.status === 'Approved' ? (
            <button type="button" className="btn-primary" disabled={acting} onClick={() => void runAction('checkout', 'Check Out', 'Mark student as checked out?')}>
              <LogOut size={16} /> Check Out
            </button>
          ) : null}
          {row.status === 'Out' || row.isCurrentlyOut ? (
            <button type="button" className="btn-primary" disabled={acting} onClick={() => void runAction('return', 'Mark Returned', 'Mark student as returned to school?')}>
              <LogIn size={16} /> Mark Returned
            </button>
          ) : null}
          {!['Cancelled', 'Completed', 'Rejected'].includes(row.status) ? (
            <button type="button" className="btn-secondary" disabled={acting} onClick={() => void runAction('cancel', 'Cancel', 'Cancel this permission request?')}>
              Cancel
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={printPage}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="hr-card p-6">
            <div className="flex flex-wrap items-start gap-4">
              <AvatarInitials name={row.studentName} seed={row.studentId} />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-[#000435]">{row.studentName}</p>
                <p className="text-sm text-slate-500">{row.studentCode} · {row.className}</p>
                <div className="mt-4">
                  <PillBadge tone="blue">{permissionTypeLabel(row)} Permission</PillBadge>
                  <p className="mt-3 text-sm text-slate-600">{row.reason}</p>
                  {row.destination ? (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase text-slate-400">Destination</p>
                      <p className="font-semibold text-[#000435]">{row.destination}</p>
                      {row.destinationAddress ? <p className="mt-1 text-xs text-slate-500">{row.destinationAddress}</p> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-400">Departure</p>
                <p className="mt-1 font-semibold text-[#000435]">
                  {formatPermissionDate(row.departureDate)} — {formatTime12h(row.departureTime)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-400">Expected Return</p>
                <p className="mt-1 font-semibold text-[#000435]">
                  {formatPermissionDate(row.expectedReturnDate)} — {formatTime12h(row.expectedReturnTime)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-400">Duration</p>
                <p className="mt-1 font-semibold text-[#000435]">{formatDuration(row.durationMinutes)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-400">Leaving With</p>
                <p className="mt-1 font-semibold text-[#000435]">
                  {row.leavingWith === 'Parent / Guardian' && row.guardianName
                    ? `${row.leavingWith} — ${row.guardianName}`
                    : row.leavingWith === 'Authorized Person' && row.authorizedPersonName
                      ? `${row.authorizedPersonName} (${row.authorizedPersonRelationship ?? 'Authorized'})`
                      : row.leavingWith}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">Requested By</p>
                <p className="font-medium">{row.requestedByName ?? row.requestedBy}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {row.scanCode ? (
            <div className="hr-card flex flex-col items-center p-6 print:block">
              <h2 className="mb-4 text-sm font-semibold text-[#000435]">Permission QR Code</h2>
              <PermissionQrCode scanCode={row.scanCode} referenceNumber={row.referenceNumber} size={180} />
              <p className="mt-4 max-w-[220px] text-center text-xs text-slate-500">
                Gate officers can scan this code at checkout and return. Works with student cards linked to this permission.
              </p>
            </div>
          ) : null}

          <div className="hr-card p-6">
          <h2 className="text-sm font-semibold text-[#000435]">Permission Timeline</h2>
          <div className="mt-6 space-y-0">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No timeline events yet.</p>
            ) : (
              events.map((event: PermissionEvent, index: number) => (
                <div key={event.id} className="relative pb-8 pl-6 last:pb-0">
                  {index < events.length - 1 ? (
                    <span className="absolute left-[7px] top-3 h-full w-px bg-slate-200" />
                  ) : null}
                  <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#fcb038] bg-white" />
                  <p className="text-xs font-semibold text-[#000435]">{formatEventTime(event.createdAt)}</p>
                  <p className="text-sm font-medium text-[#000435]">{event.eventType}</p>
                  {event.actorName ? (
                    <p className="text-xs text-slate-500">by {event.actorName}{event.actorRole ? ` (${event.actorRole})` : ''}</p>
                  ) : null}
                  {event.notes ? <p className="mt-1 text-xs text-slate-500">{event.notes}</p> : null}
                  <p className="mt-0.5 text-[10px] text-slate-400">{formatEventDate(event.createdAt)}</p>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
