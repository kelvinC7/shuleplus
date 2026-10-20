'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { Supplier } from '@/types';
import { Plus, Pencil, Building2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import {
  FormField,
  ModalFormShell,
  SectionHeading,
  SelectField,
} from '@/components/procurement-form-ui';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import {
  DataTable,
  DataTableCard,
  DataTableEmpty,
  DataTableHead,
  DataTableTh,
  ListFilterBar,
  PageLoading,
  StatusBadge,
} from '@/components/list-ui';
import { useAuth } from '@/contexts/auth-context';

const SUPPLIER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PREFERRED', label: 'Preferred' },
  { value: 'BLACKLISTED', label: 'Blacklisted' },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-600',
  PREFERRED: 'bg-blue-100 text-blue-700', BLACKLISTED: 'bg-red-100 text-red-700',
};

const initialFormState = {
  companyName: '', contactPerson: '', email: '', phone: '', alternativePhone: '',
  address: '', city: '', country: 'Rwanda', tinNumber: '', website: '', status: 'ACTIVE',
};

export default function SuppliersPage() {
  const { isSupervisor } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState(initialFormState);

  const load = useCallback(async () => {
    try {
      const data = await procurementApi.suppliers.list();
      setSuppliers(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(initialFormState); setEditItem(null); };

  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({
      companyName: s.companyName, contactPerson: s.contactPerson || '', email: s.email || '',
      phone: s.phone || '', alternativePhone: s.alternativePhone || '', address: s.address || '',
      city: s.city || '', country: s.country || 'Rwanda', tinNumber: s.tinNumber || '',
      website: s.website || '', status: s.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: Record<string, string> = { ...form };
      if (!body.tinNumber) delete body.tinNumber;
      if (!body.website) delete body.website;
      if (!body.alternativePhone) delete body.alternativePhone;
      if (!body.city) delete body.city;

      if (editItem) {
        await procurementApi.suppliers.update(editItem.id, body);
        toast.success('Supplier updated');
      } else {
        await procurementApi.suppliers.create(body);
        toast.success('Supplier created');
      }
      setDialogOpen(false); resetForm(); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error saving supplier');
    }
  };

  const filtered = suppliers.filter(s =>
    s.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = suppliers.filter(s => s.status === 'ACTIVE').length;
  const preferredCount = suppliers.filter(s => s.status === 'PREFERRED').length;

  const supplierTone = (status: string) => {
    if (status === 'ACTIVE' || status === 'PREFERRED') return status === 'PREFERRED' ? 'primary' : 'success';
    if (status === 'BLACKLISTED') return 'danger';
    return 'neutral';
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading suppliers…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Manage your suppliers and vendor contact details."
        actions={
          isSupervisor ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          ) : undefined
        }
        kpis={[
          {
            label: 'Total Suppliers',
            value: suppliers.length,
            icon: <Building2 size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Active',
            value: activeCount,
            icon: <Building2 size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Preferred',
            value: preferredCount,
            icon: <Star size={20} strokeWidth={1.75} />,
            valueClassName: 'text-sky-700',
          },
        ]}
      >
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by company name or contact person…"
        />

        <DataTableCard>
          <DataTable minWidth="960px">
            <DataTableHead>
              <DataTableTh>Company</DataTableTh>
              <DataTableTh>Contact</DataTableTh>
              <DataTableTh>Phone / Email</DataTableTh>
              <DataTableTh>Location</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh className="text-center">Orders</DataTableTh>
              <DataTableTh className="text-center">Actions</DataTableTh>
            </DataTableHead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/70 transition hover:bg-[#f8fafc]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                        <Building2 className="h-4 w-4 text-navy" />
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{s.companyName}</p>
                        {s.tinNumber ? (
                          <p className="text-xs text-muted">TIN: {s.tinNumber}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{s.contactPerson || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted">
                    <div>{s.phone || '—'}</div>
                    {s.email ? <div className="text-xs">{s.email}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {[s.address, s.city].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={supplierTone(s.status)}>{s.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-sm">
                    {s._count?.purchaseOrders ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isSupervisor ? (
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-1.5 transition hover:bg-navy/[0.04]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <DataTableEmpty colSpan={7} message="No suppliers found" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PlatformPageLayout>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setTimeout(resetForm, 250); } }}>
        <DialogContent className="max-h-[95vh] max-w-[calc(100%-1rem)] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
          <form onSubmit={handleSubmit}>
            <ModalFormShell
              title={editItem ? 'Edit Supplier' : 'New Supplier'}
              subtitle="Register supplier company and contact details."
              footer={
                <>
                  <DialogClose render={<button type="button" className="btn-secondary">Cancel</button>}>Cancel</DialogClose>
                  <button type="submit" className="btn-primary px-8">
                    {editItem ? 'Update Supplier' : 'Create Supplier'}
                  </button>
                </>
              }
            >
              <div className="space-y-8">
                <section>
                  <SectionHeading title="Company Information" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Company Name" required>
                      <input
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        required
                        className="input"
                        placeholder="Supplier company name"
                      />
                    </FormField>
                    <FormField label="Contact Person">
                      <input
                        value={form.contactPerson}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        className="input"
                        placeholder="Primary contact"
                      />
                    </FormField>
                    <FormField label="TIN Number">
                      <input
                        value={form.tinNumber}
                        onChange={(e) => setForm({ ...form, tinNumber: e.target.value })}
                        className="input"
                      />
                    </FormField>
                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => setForm({ ...form, status: value })}
                      options={SUPPLIER_STATUS_OPTIONS}
                    />
                  </div>
                </section>

                <section>
                  <SectionHeading title="Contact Details" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Email">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="input"
                        placeholder="email@company.com"
                      />
                    </FormField>
                    <FormField label="Phone">
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="input"
                        placeholder="+250 ..."
                      />
                    </FormField>
                    <FormField label="Address" className="sm:col-span-2">
                      <textarea
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="input min-h-[90px] resize-y"
                        rows={2}
                        placeholder="Street address"
                      />
                    </FormField>
                  </div>
                </section>
              </div>
            </ModalFormShell>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
