'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Plus, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { BorrowerPicker, type BorrowerSelection } from '@/components/borrower-picker';
import { BookResourcePicker, type BookResourceSelection } from '@/components/book-search-picker';
import { libApi } from '@/services/lib-api';
import type { Reservation } from '@/types';

export default function ReservationsView() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [borrowerType, setBorrowerType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [borrower, setBorrower] = useState<BorrowerSelection | null>(null);
  const [resource, setResource] = useState<BookResourceSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fulfillTarget, setFulfillTarget] = useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getReservations();
      setReservations(Array.isArray(data) ? data : data.reservations ?? []);
    } catch { setReservations([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource || !borrower) {
      setError('Select a book and borrower');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await libApi.createReservation({
        resourceId: resource.id,
        borrowerType: borrower.type,
        borrowerId: borrower.id,
        borrowerName: borrower.name,
        borrowerClass: borrower.className,
      });
      setModalOpen(false);
      setBorrower(null);
      setResource(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally { setSaving(false); }
  };

  const handleFulfill = async () => {
    if (!fulfillTarget) return;
    setWorking(true);
    try {
      await libApi.fulfillReservation(fulfillTarget.id);
      setFulfillTarget(null);
      load();
    } catch { /* api */ } finally { setWorking(false); }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setWorking(true);
    try {
      await libApi.cancelReservation(cancelTarget.id);
      setCancelTarget(null);
      load();
    } catch { /* api */ } finally { setWorking(false); }
  };

  const pending = reservations.filter((r) => r.status === 'PENDING');

  return (
    <LibPageLayout
      title="Reservations"
      subtitle="Manage book reservations"
      actions={
        <button onClick={() => { setError(''); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> New Reservation
        </button>
      }
      kpis={[
        { label: 'Pending', value: pending.length, icon: <Bookmark size={20} /> },
        { label: 'Total', value: reservations.length, icon: <Bookmark size={20} /> },
      ]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title="New Reservation" subtitle="Reserve a book for a student or teacher" size="lg">
        <form onSubmit={handleReserve} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <BookResourcePicker value={resource} onChange={setResource} />
          <BorrowerPicker borrowerType={borrowerType} onTypeChange={setBorrowerType} value={borrower} onChange={setBorrower} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !resource || !borrower} className="btn-primary">
              {saving ? 'Saving…' : 'Reserve'}
            </button>
          </div>
        </form>
      </LibModal>

      <ConfirmDialog open={Boolean(fulfillTarget)} onClose={() => setFulfillTarget(null)} onConfirm={handleFulfill} title="Fulfill Reservation" message={`Fulfill reservation for "${fulfillTarget?.resource?.title ?? 'book'}"?`} confirmLabel="Fulfill" variant="default" loading={working} />
      <ConfirmDialog open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} title="Cancel Reservation" message="Cancel this reservation?" confirmLabel="Cancel Reservation" loading={working} />

      <LibDataTable
        data={reservations}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No reservations"
        onEdit={(r) => r.status === 'PENDING' && setFulfillTarget(r)}
        onDelete={(r) => r.status === 'PENDING' && setCancelTarget(r)}
        columns={[
          { key: 'book', header: 'Book', render: (r) => <span className="font-semibold text-navy">{r.resource?.title ?? 'Unknown'}</span> },
          {
            key: 'borrower',
            header: 'Borrower',
            render: (r) => (
              <span>
                <span className="text-navy">{r.borrowerName}</span>
                <span className="ml-1.5 badge bg-navy/5 text-navy text-[10px]">{r.borrowerType}</span>
              </span>
            ),
          },
          { key: 'reserved', header: 'Reserved', className: 'hidden sm:table-cell', render: (r) => <span className="text-muted">{new Date(r.reservationDate).toLocaleDateString()}</span> },
          { key: 'expires', header: 'Expires', className: 'hidden sm:table-cell', render: (r) => <span className="text-muted">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—'}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <p className="mt-3 text-xs text-muted">Edit = Fulfill · Delete = Cancel (pending only)</p>
    </LibPageLayout>
  );
}
