import { Link } from 'react-router-dom';
import { ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TripRowActions({ tripId, status }: { tripId: string; status: string }) {
  const editable = status === 'DRAFT' || status === 'CORRECTION_REQUESTED';

  return (
    <div className="flex justify-end gap-2">
      {editable ? (
        <Link to={`/school/trips/${tripId}/edit`}>
          <Button variant="outline" type="button" className="px-3 py-1.5 text-xs">
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
      ) : (
        <Link to={`/school/trips/${tripId}/edit`} className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:underline">
          View
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
