'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { Contract } from '@/types';
import { Plus, FileSignature, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { EntityCard, PageLoading, StatusBadge } from '@/components/list-ui';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700', EXPIRED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-gray-100 text-gray-600', PENDING_RENEWAL: 'bg-amber-100 text-amber-700',
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ supplierId: '', title: '', description: '', startDate: '', endDate: '', value: '', notes: '', renewalTerms: '' });
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([procurementApi.contracts.list(), procurementApi.suppliers.list()]);
      setContracts(c); setSuppliers(s);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = { ...form };
      if (body.value) body.value = Number(body.value);
      if (!body.supplierId) { toast.error('Select a supplier'); return; }
      await procurementApi.contracts.create(body);
      toast.success('Contract created'); setDialogOpen(false); setForm({ supplierId: '', title: '', description: '', startDate: '', endDate: '', value: '', notes: '', renewalTerms: '' }); load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;
  const expiringCount = contracts.filter((c) => {
    const daysLeft = getDaysUntilExpiry(c.endDate);
    return daysLeft <= 30 && daysLeft > 0;
  }).length;

  const contractTone = (status: string) => {
    if (status === 'ACTIVE') return 'success';
    if (status === 'PENDING_RENEWAL') return 'warning';
    if (status === 'EXPIRED') return 'danger';
    return 'neutral';
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading contracts…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Manage supplier contracts, renewals, and expiry alerts."
        actions={
          <button type="button" onClick={() => setDialogOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Contract
          </button>
        }
        kpis={[
          {
            label: 'Total Contracts',
            value: contracts.length,
            icon: <FileSignature size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Active',
            value: activeCount,
            icon: <FileSignature size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Expiring Soon',
            value: expiringCount,
            icon: <AlertTriangle size={20} strokeWidth={1.75} />,
            valueClassName: 'text-amber-600',
          },
        ]}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((c) => {
            const daysLeft = getDaysUntilExpiry(c.endDate);
            const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
            const isExpired = daysLeft <= 0;
            return (
              <EntityCard
                key={c.id}
                className={`space-y-3 ${isExpired ? 'border-red-200' : isExpiringSoon ? 'border-amber-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/20 p-2.5">
                      <FileSignature className="h-5 w-5 text-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy">{c.title}</h3>
                      <p className="text-xs text-muted">{c.contractNumber}</p>
                    </div>
                  </div>
                  <StatusBadge tone={contractTone(c.status)}>
                    {c.status.replace(/_/g, ' ')}
                  </StatusBadge>
                </div>
                <div className="space-y-1.5 text-sm text-muted">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />{' '}
                    {new Date(c.startDate).toLocaleDateString()} –{' '}
                    {new Date(c.endDate).toLocaleDateString()}
                  </p>
                  {c.value && (
                    <p className="font-semibold text-navy">
                      ${Number(c.value).toLocaleString()}
                    </p>
                  )}
                  {c.supplier && <p>Supplier: {c.supplier.companyName}</p>}
                </div>
                {isExpiringSoon && !isExpired && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Expires in {daysLeft} days
                  </div>
                )}
                {isExpired && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Expired
                  </div>
                )}
              </EntityCard>
            );
          })}
          {contracts.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-white py-16 text-center text-muted">
              No contracts yet
            </div>
          )}
        </div>
      </PlatformPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Supplier *</label>
              <select value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm bg-white" required>
                <option value="">Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Start Date *</label><input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">End Date *</label><input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Contract Value</label><input type="number" min="0" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} /></div>
            <div><label className="block text-sm font-medium mb-1">Renewal Terms</label><input value={form.renewalTerms} onChange={e => setForm({...form, renewalTerms: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <DialogFooter>
              <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>}>Cancel</DialogClose>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
