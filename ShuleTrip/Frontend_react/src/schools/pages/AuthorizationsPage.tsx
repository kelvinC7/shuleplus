import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { TripPassQr } from '@/components/trip-pass-qr';
import { tripVerifyUrl } from '@/shared/trip-qr';
import { formatTripDateTime } from '@/schools/utils/trip-display';

type TripRow = {
  id: string;
  reference: string;
  title: string;
  destination: string | null;
  status: string;
  departAt: string | null;
};

export default function AuthorizationsPage() {
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ data: TripRow[] }>('/trips?status=APPROVED');
        if (!cancelled) setRows(data.data ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorizations"
        description="Only trips with final government approval appear here. Verify travel with the secure trip QR or public link."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading authorizations…</p>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No authorized trips yet. Approval must be recorded before travel is permitted.</p>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((t) => {
            return (
              <li key={t.id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <StatusBadge status={t.status} />
                    <h3 className="mt-2 text-lg font-extrabold text-navy">{t.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">{t.reference}</p>
                    <dl className="mt-3 space-y-1 text-sm">
                      <div>
                        <span className="text-slate-500">Destination: </span>
                        <span className="font-medium">{t.destination ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Departure: </span>
                        <span className="font-medium">{formatTripDateTime(t.departAt)}</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-800">Government approval recorded for this reference.</p>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        to={`/school/trips/${t.id}/approval-letter`}
                        className="text-sm font-bold text-emerald-800 hover:underline"
                      >
                        Authorization letter
                      </Link>
                      <Link to={`/school/trips/${t.id}/edit`} className="text-sm font-bold text-navy hover:underline">
                        View trip
                      </Link>
                      <a
                        href={tripVerifyUrl(t.reference)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-navy hover:underline"
                      >
                        Public verify page
                      </a>
                    </div>
                  </div>
                  <TripPassQr reference={t.reference} size={96} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
