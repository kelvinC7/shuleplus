'use client';

import { MainLayout } from '@/layouts/main-layout';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DisciplineCase } from '@/types/discipline';
import { toast } from 'sonner';

export default function CaseDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [row, setRow] = useState<DisciplineCase | null>(null);

  useEffect(() => {
    if (!id) return;
    disciplineApi
      .cases()
      .then((res) => setRow((res.data.data ?? []).find((c) => c.id === id) ?? null))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Could not load case')));
  }, [id]);

  return (
    <MainLayout>
      <DisciplinePageLayout title={row?.caseNumber ?? 'Case Details'} subtitle={row?.studentName ?? id}>
        {!row ? (
          <div className="hr-card p-8 text-center text-sm text-slate-500">Loading case…</div>
        ) : (
          <div className="hr-card space-y-4 p-6 text-sm">
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" className="btn-secondary" onClick={() => window.print()}>Print case sheet</button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  try {
                    await disciplineApi.notifyCase(row.id, ['SMS', 'InApp']);
                    toast.success('Parent notified');
                  } catch (err) {
                    toast.error(getApiErrorMessage(err, 'Could not notify parent'));
                  }
                }}
              >
                Notify parent
              </button>
            </div>
            <p><strong>Student:</strong> {row.studentName} · {row.className}</p>
            <p><strong>Type:</strong> {row.markName ?? row.customCaseName ?? row.category}</p>
            <p><strong>Status:</strong> {row.status}</p>
            <p><strong>Description:</strong> {row.description ?? '—'}</p>
          </div>
        )}
      </DisciplinePageLayout>
    </MainLayout>
  );
}
