import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { publicApi, type PublicTripVerification } from '@/services/public-api';
import { cn } from '@/shared/cn';

const CHECKLIST = [
  'Authorization number / trip reference verified',
  'Approved itinerary displayed',
  'Learner and staff totals match authorization',
  'Vehicle registration matches trip record',
  'Driver identity verified',
  'Road-safety checklist completed',
];

export default function CheckpointInspectionPage() {
  const [query, setQuery] = useState('');
  const [trip, setTrip] = useState<PublicTripVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'recommended' | 'not_recommended' | 'incomplete'>('incomplete');
  const [checks, setChecks] = useState<Record<number, 'pass' | 'fail' | 'na'>>({});

  async function lookup() {
    const ref = query.trim();
    if (!ref) return;
    setError(null);
    setTrip(null);
    try {
      const { data: res } = await publicApi.get<{ data: PublicTripVerification }>(
        `/public/trips/${encodeURIComponent(ref)}`
      );
      setTrip(res.data);
    } catch {
      setError('Trip not found · scan the school trip QR or enter the authorization reference.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checkpoint inspection"
        description="Search by trip reference or scan the trip QR. Checkpoint recommendation is separate from final government authorization."
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-line py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-navy"
              placeholder="Trip reference e.g. TR-2025-001"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
            />
          </div>
          <Button variant="primary" onClick={lookup}>
            Load trip
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </Card>

      {trip ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="text-xs font-bold uppercase text-slate-500">Authorization status</p>
            <div
              className={cn(
                'mt-3 rounded-2xl px-4 py-6 text-center font-black uppercase tracking-tight text-white',
                trip.access.allowed ? 'bg-emerald-600' : 'bg-red-600'
              )}
            >
              {trip.access.headline}
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">School</dt>
                <dd className="font-semibold">{trip.organizationName ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Learners</dt>
                <dd className="font-semibold">{trip.counts.participants}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Destination</dt>
                <dd className="font-semibold">{trip.destination ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Workflow status</dt>
                <dd className="font-semibold">{trip.status.replace(/_/g, ' ')}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <p className="text-sm font-bold text-slate-900">Road-safety checklist</p>
            <ul className="mt-4 space-y-2">
              {CHECKLIST.map((label, i) => (
                <li key={label} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['pass', 'fail', 'na'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setChecks((c) => ({ ...c, [i]: v }))}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-bold capitalize',
                          checks[i] === v
                            ? v === 'pass'
                              ? 'bg-emerald-600 text-white'
                              : v === 'fail'
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {v === 'na' ? 'N/A' : v}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs font-bold uppercase text-slate-500">Inspection outcome</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ['recommended', 'Recommended to travel'],
                  ['not_recommended', 'Not recommended'],
                  ['incomplete', 'Inspection incomplete'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutcome(key)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-bold',
                    outcome === key ? 'border-navy bg-navy text-white' : 'border-line bg-white text-slate-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button className="mt-4 w-full" variant="amber" disabled={outcome === 'incomplete'}>
              Save inspection record (audit trail · Stage 3 persistence)
            </Button>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
