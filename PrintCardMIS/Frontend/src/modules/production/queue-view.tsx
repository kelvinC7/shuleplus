'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Play, XCircle } from 'lucide-react';
import {
  cancelPrintBatch,
  fetchPrintQueue,
  formatPrintDate,
  type PrintBatch,
} from '@/services/print-card-api';
import {
  PrintCardPageLoader,
  SchoolScopeBar,
} from '@/components/school-scope-bar';
import { usePrintCardSchools } from '@/hooks/use-print-card-schools';

export function QueueView() {
  const {
    schools,
    selectedSchool,
    setSelectedSchool,
    canSelectSchools,
    viewAllSchools,
    setViewAllSchools,
    loading: loadingSchools,
    schoolNameById,
  } = usePrintCardSchools();
  const [queue, setQueue] = useState<PrintBatch[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const orgId = viewAllSchools && canSelectSchools ? undefined : selectedSchool?.id;
      if (!orgId && !viewAllSchools) {
        setQueue([]);
        return;
      }
      setQueue(await fetchPrintQueue(orgId));
    } finally {
      setLoadingQueue(false);
    }
  }, [selectedSchool?.id, viewAllSchools, canSelectSchools]);

  useEffect(() => {
    if (loadingSchools) return;
    void loadQueue();
  }, [loadingSchools, loadQueue]);

  async function cancel(id: string, organizationId: string) {
    await cancelPrintBatch(id, organizationId);
    void loadQueue();
  }

  if (loadingSchools) return <PrintCardPageLoader />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-navy sm:text-xl">Print Queue</h2>
        <p className="text-sm text-muted">
          {queue.length} batch{queue.length === 1 ? '' : 'es'} waiting or in progress
        </p>
      </div>

      <SchoolScopeBar
        schools={schools}
        selectedSchool={selectedSchool}
        onSchoolChange={setSelectedSchool}
        canSelectSchools={canSelectSchools}
        viewAllSchools={viewAllSchools}
        onViewAllChange={setViewAllSchools}
      />

      {loadingQueue ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((batch) => (
            <div
              key={batch.id}
              className="flex flex-col gap-3 border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-navy">{batch.batchNumber}</p>
                <p className="text-sm text-muted">
                  {batch.totalCards} {batch.personKind === 'STUDENT' ? 'Student' : 'Staff'} cards ·{' '}
                  {batch.status}
                </p>
                {viewAllSchools && (
                  <p className="text-xs font-medium text-navy">{schoolNameById(batch.organizationId)}</p>
                )}
                <p className="text-xs text-muted">Created {formatPrintDate(batch.createdAt)}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/cards/${batch.personKind === 'STUDENT' ? 'students' : 'staff'}?batch=${batch.id}&school=${batch.organizationId}`}
                  className="btn-secondary w-full justify-center gap-1 text-xs sm:w-auto"
                >
                  <Play className="h-3.5 w-3.5" /> Continue
                </Link>
                <Link
                  href={`/cards/history?batch=${batch.id}&school=${batch.organizationId}`}
                  className="btn-secondary w-full justify-center gap-1 text-xs sm:w-auto"
                >
                  <Eye className="h-3.5 w-3.5" /> Details
                </Link>
                <button
                  type="button"
                  onClick={() => void cancel(batch.id, batch.organizationId)}
                  className="btn-secondary w-full justify-center gap-1 text-xs text-red-600 sm:w-auto"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <p className="border border-dashed border-border py-16 text-center text-sm text-muted">
              No batches in the queue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
