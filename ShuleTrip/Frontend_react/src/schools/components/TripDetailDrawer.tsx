import { Link } from 'react-router-dom';
import { Loader2, Pencil } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { TripFullView } from '@/schools/components/TripFullView';
import { useTripDetail } from '@/schools/hooks/use-trip-detail';
import { isSchoolTripAuthorized } from '@/schools/components/SchoolAuthorizationActions';
function statusPill(status: string) {
  return status.replace(/_/g, ' ');
}

export function TripDetailDrawer({
  tripId,
  onClose,
}: {
  tripId: string | null;
  onClose: () => void;
}) {
  const { trip, readiness, loading, error } = useTripDetail(tripId);
  const editable = trip?.status === 'DRAFT' || trip?.status === 'CORRECTION_REQUESTED';
  const authorized = trip ? isSchoolTripAuthorized(trip.status) : false;

  return (
    <Drawer
      open={Boolean(tripId)}
      onClose={onClose}
      title={trip?.title ?? 'Trip details'}
      subtitle={trip?.reference}
      width="full"
      variant="brand"
      headerExtra={
        trip ? (
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
            {statusPill(trip.status)}
          </span>
        ) : null
      }
      footer={
        tripId && trip ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!authorized || editable ? (
              <Link to={`/school/trips/${tripId}/edit`} className="w-full sm:w-auto">
                <Button variant={editable ? 'amber' : 'outline'} type="button" className="w-full sm:min-w-[140px]">
                  <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                  {editable ? 'Edit application' : 'Open wizard'}
                </Button>
              </Link>
            ) : null}
            <Button variant="outline" type="button" className="w-full sm:w-auto sm:min-w-[100px]" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null
      }
    >
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FCB038]" />
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : trip ? (
        <TripFullView trip={trip} readiness={readiness} initialTab="overview" density="comfortable" />
      ) : null}
    </Drawer>
  );
}
