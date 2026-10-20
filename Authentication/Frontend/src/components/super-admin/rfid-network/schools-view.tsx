'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import { fetchRfidSchools } from '@/lib/device-rfid-api';

export function RfidSchoolsView() {
  const searchParams = useSearchParams();
  const province = searchParams.get('province') ?? undefined;
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRfidSchools({ province, limit: 50 });
      setRows(data.data ?? []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Unable to load schools.');
    } finally {
      setLoading(false);
    }
  }, [province]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Schools</h1>
        <p className="text-sm text-muted">{province ? `Province: ${province}` : 'All schools with RFID readers'}</p>
      </div>
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
          <button type="button" className="ml-3 font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="flex gap-2 py-12 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((s) => (
            <Link
              key={String(s.organizationId)}
              href={`/super-admin/rfid-network/schools/${s.organizationId}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary/30"
            >
              <div>
                <p className="font-semibold text-navy">{String(s.organizationName)}</p>
                <p className="mt-1 text-xs text-muted">
                  {String(s.deviceCount)} devices · {String(s.online)} online · {String(s.offline)} offline
                </p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
