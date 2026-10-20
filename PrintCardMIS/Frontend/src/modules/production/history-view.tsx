'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  fetchPrintBatch,
  fetchPrintHistory,
  formatPrintDate,
  type PrintBatch,
} from '@/services/print-card-api';
import {
  PrintCardPageLoader,
  SchoolScopeBar,
} from '@/components/school-scope-bar';
import { usePrintCardSchools } from '@/hooks/use-print-card-schools';

export function HistoryView() {
  const searchParams = useSearchParams();
  const batchParam = searchParams.get('batch');
  const schoolParam = searchParams.get('school');

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

  const [history, setHistory] = useState<PrintBatch[]>([]);
  const [detail, setDetail] = useState<PrintBatch | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const orgId = viewAllSchools && canSelectSchools ? undefined : selectedSchool?.id;
      if (!orgId && !viewAllSchools) {
        setHistory([]);
        return;
      }
      setHistory(await fetchPrintHistory(orgId));
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedSchool?.id, viewAllSchools, canSelectSchools]);

  useEffect(() => {
    if (loadingSchools) return;
    void loadHistory();
  }, [loadingSchools, loadHistory]);

  useEffect(() => {
    if (!batchParam) return;
    const orgId = schoolParam ?? selectedSchool?.id;
    if (!orgId) return;
    void fetchPrintBatch(batchParam, orgId).then(setDetail);
  }, [batchParam, schoolParam, selectedSchool?.id]);

  async function openBatch(batch: PrintBatch) {
    setDetail(await fetchPrintBatch(batch.id, batch.organizationId));
  }

  if (loadingSchools) return <PrintCardPageLoader />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy sm:text-xl">Print History</h2>
          <p className="text-sm text-muted">Audit trail of completed and partial print batches</p>
        </div>

        <SchoolScopeBar
          schools={schools}
          selectedSchool={selectedSchool}
          onSchoolChange={setSelectedSchool}
          canSelectSchools={canSelectSchools}
          viewAllSchools={viewAllSchools}
          onViewAllChange={setViewAllSchools}
        />

        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : (
          <div className="overflow-hidden border border-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Batch</th>
                  {viewAllSchools && <th className="px-4 py-3">School</th>}
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Cards</th>
                  <th className="px-4 py-3">Printed By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => (
                  <tr
                    key={b.id}
                    className="cursor-pointer border-t border-border/60 hover:bg-slate-50"
                    onClick={() => void openBatch(b)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{b.batchNumber}</td>
                    {viewAllSchools && (
                      <td className="px-4 py-3 text-xs">{schoolNameById(b.organizationId)}</td>
                    )}
                    <td className="px-4 py-3">{b.personKind === 'STUDENT' ? 'Students' : 'Staff'}</td>
                    <td className="px-4 py-3">{b.totalCards}</td>
                    <td className="px-4 py-3 text-xs">{b.createdByEmail ?? b.createdBy}</td>
                    <td className="px-4 py-3 text-xs">{formatPrintDate(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {history.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">No print history yet.</p>
            )}
          </div>
        )}
      </div>

      {detail && (
        <div className="border border-border bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-6 lg:self-start">
          <h3 className="font-bold text-navy">Batch {detail.batchNumber}</h3>
          <p className="mt-1 text-xs text-muted">{schoolNameById(detail.organizationId)}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total</dt>
              <dd>{detail.totalCards}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Successful</dt>
              <dd className="text-emerald-700">{detail.successCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Failed</dt>
              <dd className="text-red-600">{detail.failedCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Created</dt>
              <dd>{formatPrintDate(detail.createdAt)}</dd>
            </div>
          </dl>
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-xs">
            {detail.items?.map((item) => (
              <li key={item.id} className="flex justify-between bg-slate-50 px-2 py-1.5">
                <span>{item.cardRecord?.fullName}</span>
                <span
                  className={
                    item.result === 'SUCCESS'
                      ? 'text-emerald-700'
                      : item.result === 'FAILED'
                        ? 'text-red-600'
                        : 'text-muted'
                  }
                >
                  {item.result}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
