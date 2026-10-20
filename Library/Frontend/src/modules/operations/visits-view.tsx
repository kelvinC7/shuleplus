'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { BorrowerPicker, type BorrowerSelection } from '@/components/borrower-picker';
import { libApi } from '@/services/lib-api';
import type { LibraryVisit } from '@/types';

export default function VisitsView() {
  const [visits, setVisits] = useState<LibraryVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [borrowerType, setBorrowerType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [borrower, setBorrower] = useState<BorrowerSelection | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getVisits();
      setVisits(Array.isArray(data) ? data : data.visits ?? []);
    } catch { setVisits([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const todayCount = visits.filter((v) => new Date(v.checkIn).toDateString() === new Date().toDateString()).length;
  const inside = visits.filter((v) => !v.checkOut).length;

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrower) {
      setError('Select a visitor');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await libApi.checkInVisit({
        borrowerType: borrower.type,
        borrowerId: borrower.id,
        borrowerName: borrower.name,
        borrowerClass: borrower.className,
        reason: reason || undefined,
      });
      setModalOpen(false);
      setBorrower(null);
      setReason('');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check in');
    } finally { setSaving(false); }
  };

  const handleCheckOut = async (id: string) => {
    try { await libApi.checkOutVisit(id); load(); } catch { /* empty */ }
  };

  return (
    <LibPageLayout
      title="Library Visits"
      subtitle="Track library entry and exit times"
      actions={
        <button onClick={() => { setError(''); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Check In
        </button>
      }
      kpis={[
        { label: 'Inside Now', value: inside, icon: <Clock size={20} /> },
        { label: 'Visits Today', value: todayCount, icon: <Clock size={20} /> },
        { label: 'Total Visits', value: visits.length, icon: <Clock size={20} /> },
      ]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title="Check In Visitor" subtitle="Search and select a student or teacher" size="lg">
        <form onSubmit={handleCheckIn} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <BorrowerPicker borrowerType={borrowerType} onTypeChange={setBorrowerType} value={borrower} onChange={setBorrower} />
          <FormField label="Reason">
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Purpose of visit" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !borrower} className="btn-primary">
              {saving ? 'Checking in…' : 'Check In'}
            </button>
          </div>
        </form>
      </LibModal>

      <LibDataTable
        data={visits}
        rowKey={(v) => v.id}
        loading={loading}
        emptyMessage="No visits recorded"
        onEdit={(v) => !v.checkOut && handleCheckOut(v.id)}
        columns={[
          {
            key: 'visitor',
            header: 'Visitor',
            render: (v) => (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-primary text-xs font-bold">{v.borrowerName[0]}</div>
                <span className="font-semibold text-navy">{v.borrowerName}</span>
              </div>
            ),
          },
          { key: 'type', header: 'Type', render: (v) => <span className="badge bg-navy/5 text-navy text-[11px]">{v.borrowerType}</span> },
          { key: 'reason', header: 'Reason', className: 'hidden sm:table-cell', render: (v) => <span className="text-muted">{v.reason ?? '—'}</span> },
          { key: 'in', header: 'Check In', render: (v) => <span className="text-xs text-muted">{new Date(v.checkIn).toLocaleString()}</span> },
          {
            key: 'out',
            header: 'Check Out',
            render: (v) => v.checkOut
              ? <span className="text-xs text-muted">{new Date(v.checkOut).toLocaleString()}</span>
              : <span className="badge bg-emerald-50 text-emerald-700 text-[11px] font-bold">In Library</span>,
          },
        ]}
      />
      <p className="mt-3 text-xs text-muted">Edit = Check out (when still inside)</p>
    </LibPageLayout>
  );
}
