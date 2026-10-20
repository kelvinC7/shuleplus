'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchRepChiefAccountants, revokeRepChiefAccountant } from '@/lib/school-representative-api';
import { useConfirm, useToast } from '@/shared/notifications';

type Row = Awaited<ReturnType<typeof fetchRepChiefAccountants>>[number];

export function RepChiefAccountantAccess({ organizationId }: { organizationId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchRepChiefAccountants(organizationId));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return null;
  if (!rows.length) return null;

  async function handleRevoke(row: Row) {
    const ok = await confirm({
      title: 'Remove Chief Accountant from this school?',
      message: `${row.user.firstName} ${row.user.lastName} will lose access to this school only. The platform account is not deleted.`,
      confirmLabel: 'Remove access',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(row.userId);
    try {
      await revokeRepChiefAccountant(organizationId, row.userId);
      toast.success('Chief Accountant access removed for this school.');
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not remove access';
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border/80 bg-[#f8f9fc] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Chief Accountant</p>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.userId} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium text-navy">
              {row.user.firstName} {row.user.lastName}
            </span>
            <button
              type="button"
              disabled={busyId === row.userId}
              onClick={() => void handleRevoke(row)}
              className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              {busyId === row.userId ? '…' : 'Remove'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
