import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { TripApprovalLetterView, useSchoolAuthorizationLetterAssets } from '@/components/trip-approval-letter-view';
import type { AuthorizationLetterPayload } from '@/schools/types/authorization-letter';

export default function TripApprovalLetterPage() {
  const { tripId } = useParams();
  const [letter, setLetter] = useState<AuthorizationLetterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    (async () => {
      try {
        const { data } = await api.get<{ data: AuthorizationLetterPayload }>(`/trips/${tripId}/authorization-letter`);
        setLetter(data.data);
      } catch {
        setError('Authorization letter is not available yet. Final government approval is required.');
      }
    })();
  }, [tripId]);

  const assets = useSchoolAuthorizationLetterAssets(tripId ?? '', letter);

  return (
    <div className="space-y-6 pb-12 print:space-y-0 print:pb-0">
      <div data-print-hide>
        <PageHeader
          title="Trip authorization letter"
          description="Official clearance after final government approval · print or save as PDF."
          action={
            <Link
              to={tripId ? `/school/trips` : '/school/trips'}
              className="inline-flex rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-[#000435] shadow-sm hover:bg-slate-50"
            >
              ← My trips
            </Link>
          }
        />
      </div>
      {error ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">{error}</p>
      ) : letter ? (
        <TripApprovalLetterView
          letter={letter}
          signatureUrl={assets.signatureUrl}
          stampUrl={assets.stampUrl}
          loadingAssets={assets.loadingAssets}
        />
      ) : (
        <p className="text-sm text-slate-500">Loading letter…</p>
      )}
    </div>
  );
}
