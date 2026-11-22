import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TripPicker } from '@/schools/components/TripPicker';
import { TripFullView, type TripViewTab } from '@/schools/components/TripFullView';
import { useSchoolTrips } from '@/schools/hooks/use-school-trips';
import { useTripDetail } from '@/schools/hooks/use-trip-detail';

export function TripWorkspaceShell({
  title,
  description,
  initialTab,
  headerAction,
}: {
  title: string;
  description: string;
  initialTab: TripViewTab;
  headerAction?: ReactNode;
}) {
  const { rows, loading: listLoading } = useSchoolTrips();
  const [tripId, setTripId] = useState('');
  const { trip, readiness, loading: detailLoading } = useTripDetail(tripId || null);

  useEffect(() => {
    if (!tripId && rows[0]) setTripId(rows[0].id);
  }, [rows, tripId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          headerAction ??
          (tripId ? (
            <Link to={`/school/trips/${tripId}/edit`}>
              <Button variant="amber">Edit in wizard</Button>
            </Link>
          ) : null)
        }
      />

      <Card className="p-5">
        <TripPicker trips={rows} value={tripId} onChange={setTripId} loading={listLoading} />
      </Card>

      <Card className="p-5 md:p-6">
        {detailLoading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading trip…</p>
        ) : trip ? (
          <TripFullView trip={trip} readiness={readiness} initialTab={initialTab} />
        ) : (
          <p className="py-16 text-center text-sm text-slate-500">Select a trip or register a new application.</p>
        )}
      </Card>
    </div>
  );
}
