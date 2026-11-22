import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { govApi } from '@/services/api';
import { TripApprovalLetterView } from '@/components/trip-approval-letter-view';
import type { AuthorizationLetterPayload } from '@/schools/types/authorization-letter';

export default function GovTripApprovalLetterPage() {
  const { tripId } = useParams();
  const [letter, setLetter] = useState<AuthorizationLetterPayload | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    (async () => {
      try {
        const { data } = await govApi.get<{ data: AuthorizationLetterPayload }>(
          `/government/applications/${tripId}/authorization-letter`
        );
        setLetter(data.data);
      } catch {
        setError('Letter not available for this application.');
      }
    })();
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;
    let s1: string | null = null;
    let s2: string | null = null;
    async function loadAssets() {
      if (!letter?.finalApproval?.id) return;
      setLoadingAssets(true);
      try {
        if (letter.finalApproval.hasSignatureFile) {
          const { data } = await govApi.get<Blob>(
            `/government/applications/${tripId}/approvals/${letter.finalApproval.id}/signature`,
            { responseType: 'blob' }
          );
          if (!cancelled) {
            s1 = URL.createObjectURL(data);
            setSignatureUrl(s1);
          }
        }
        if (letter.finalApproval.hasStampFile) {
          const { data } = await govApi.get<Blob>(
            `/government/applications/${tripId}/approvals/${letter.finalApproval.id}/stamp`,
            { responseType: 'blob' }
          );
          if (!cancelled) {
            s2 = URL.createObjectURL(data);
            setStampUrl(s2);
          }
        }
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    }
    loadAssets();
    return () => {
      cancelled = true;
      if (s1) URL.revokeObjectURL(s1);
      if (s2) URL.revokeObjectURL(s2);
    };
  }, [letter, tripId]);

  return (
    <div className="space-y-6 pb-12 print:space-y-0 print:pb-0">
      <Link
        to={`/government/review/${tripId}`}
        data-print-hide
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy"
      >
        ← Application
      </Link>
      {error ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{error}</p>
      ) : letter ? (
        <TripApprovalLetterView
          letter={letter}
          signatureUrl={signatureUrl}
          stampUrl={stampUrl}
          loadingAssets={loadingAssets}
        />
      ) : (
        <p className="text-sm text-slate-500">Loading…</p>
      )}
    </div>
  );
}
