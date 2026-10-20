'use client';

import { useState, useEffect } from 'react';
import { BookX } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { LibModal } from '@/components/lib-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { BookCopy } from '@/types';

function getBookTitle(c: BookCopy) { return c.resource?.title ?? 'Unknown'; }

export default function LostView() {
  const [items, setItems] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<BookCopy | null>(null);
  const [recoverTarget, setRecoverTarget] = useState<BookCopy | null>(null);
  const [recovering, setRecovering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getLost();
      setItems(Array.isArray(data) ? data : data.copies ?? []);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRecover = async () => {
    if (!recoverTarget) return;
    setRecovering(true);
    try {
      await libApi.updateCopyStatus(recoverTarget.id, { status: 'AVAILABLE', condition: 'Fair' });
      setRecoverTarget(null);
      load();
    } catch { /* api */ } finally { setRecovering(false); }
  };

  return (
    <LibPageLayout
      title="Lost Books"
      subtitle="Books reported as lost"
      kpis={[{ label: 'Lost', value: items.length, icon: <BookX size={20} /> }]}
    >
      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Lost Copy" size="md">
        {viewing && (
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-muted">Barcode:</span> {viewing.barcode}</p>
            <p><span className="font-bold text-muted">Library ID:</span> {viewing.libraryId}</p>
            <p><span className="font-bold text-muted">Title:</span> {getBookTitle(viewing)}</p>
            {viewing.notes && <p className="text-navy">{viewing.notes}</p>}
          </div>
        )}
      </LibModal>

      <ConfirmDialog
        open={Boolean(recoverTarget)}
        onClose={() => setRecoverTarget(null)}
        onConfirm={handleRecover}
        title="Recover Book"
        message={`Mark "${recoverTarget ? getBookTitle(recoverTarget) : ''}" as recovered and available?`}
        confirmLabel="Recover"
        variant="default"
        loading={recovering}
      />

      <LibDataTable
        data={items}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No lost books"
        onView={setViewing}
        onEdit={setRecoverTarget}
        columns={[
          { key: 'barcode', header: 'Barcode', render: (c) => <span className="font-mono text-xs font-semibold text-navy">{c.barcode}</span> },
          { key: 'title', header: 'Title', render: (c) => <span className="font-semibold text-navy">{getBookTitle(c)}</span> },
          { key: 'libraryId', header: 'Library ID', render: (c) => <span className="font-mono text-xs text-muted">{c.libraryId}</span> },
        ]}
      />
      <p className="mt-3 text-xs text-muted">Edit = Mark as recovered</p>
    </LibPageLayout>
  );
}
