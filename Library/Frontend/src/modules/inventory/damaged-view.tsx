'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { LibModal } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { BookCopy } from '@/types';

function getBookTitle(c: BookCopy) { return c.resource?.title ?? 'Unknown'; }

export default function DamagedView() {
  const [items, setItems] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<BookCopy | null>(null);
  const [repairTarget, setRepairTarget] = useState<BookCopy | null>(null);
  const [repairing, setRepairing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getDamaged();
      setItems(Array.isArray(data) ? data : data.copies ?? []);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRepair = async () => {
    if (!repairTarget) return;
    setRepairing(true);
    try {
      await libApi.updateCopyStatus(repairTarget.id, { status: 'AVAILABLE', condition: 'Good' });
      setRepairTarget(null);
      load();
    } catch { /* api */ } finally { setRepairing(false); }
  };

  return (
    <LibPageLayout
      title="Damaged Books"
      subtitle="Books reported as damaged"
      kpis={[{ label: 'Damaged', value: items.length, icon: <AlertTriangle size={20} /> }]}
    >
      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Damaged Copy" size="md">
        {viewing && (
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-muted">Barcode:</span> {viewing.barcode}</p>
            <p><span className="font-bold text-muted">Title:</span> {getBookTitle(viewing)}</p>
            <p><span className="font-bold text-muted">Condition:</span> {viewing.condition ?? 'Damaged'}</p>
            {viewing.notes && <p className="text-navy">{viewing.notes}</p>}
          </div>
        )}
      </LibModal>

      <ConfirmDialog
        open={Boolean(repairTarget)}
        onClose={() => setRepairTarget(null)}
        onConfirm={handleRepair}
        title="Mark as Repaired"
        message={`Mark "${repairTarget ? getBookTitle(repairTarget) : ''}" as available?`}
        confirmLabel="Mark Repaired"
        variant="default"
        loading={repairing}
      />

      <LibDataTable
        data={items}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No damaged books"
        onView={setViewing}
        onEdit={setRepairTarget}
        columns={[
          { key: 'barcode', header: 'Barcode', render: (c) => <span className="font-mono text-xs font-semibold text-navy">{c.barcode}</span> },
          { key: 'title', header: 'Title', render: (c) => <span className="font-semibold text-navy">{getBookTitle(c)}</span> },
          { key: 'condition', header: 'Condition', className: 'hidden sm:table-cell', render: (c) => <span className="badge bg-amber-50 text-amber-700 text-[11px]">{c.condition ?? 'Damaged'}</span> },
        ]}
      />
      <p className="mt-3 text-xs text-muted">Edit = Mark as repaired and available</p>
    </LibPageLayout>
  );
}
