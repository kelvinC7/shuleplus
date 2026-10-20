'use client';

import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { Supplier } from '@/types';
import { Plus, Pencil, Phone, Mail, MapPin, Building2, CreditCard, Landmark, FileUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';

const PAYMENT_METHODS = [
  { value: 'MOMO', label: 'Mobile Money (MoMo)' },
  { value: 'BANK', label: 'Bank Transfer' },
];

const BANK_OPTIONS = [
  { value: 'Bank of Kigali', label: 'Bank of Kigali' },
  { value: 'Equity Bank Rwanda', label: 'Equity Bank Rwanda' },
  { value: 'Access Bank Rwanda', label: 'Access Bank Rwanda' },
  { value: 'GTBank Rwanda', label: 'GTBank Rwanda' },
  { value: 'Ecobank Rwanda', label: 'Ecobank Rwanda' },
  { value: 'Cogebanque', label: 'Cogebanque' },
  { value: 'BPR Bank Rwanda', label: 'BPR Bank Rwanda' },
  { value: 'I&M Bank Rwanda', label: 'I&M Bank Rwanda' },
  { value: 'Urwego Bank', label: 'Urwego Bank' },
  { value: 'AB Bank Rwanda', label: 'AB Bank Rwanda' },
];

const initialFormState = {
  name: '', contactPerson: '', email: '', phone: '', address: '',
  tinNumber: '', paymentMethod: '', mobileMoneyNumber: '',
  bankName: '', bankAccountNumber: '', contractUrl: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => inventoryApi.suppliers.list().then(setSuppliers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(initialFormState);
    setEditItem(null);
    setContractFile(null);
  };

  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({
      name: s.name, contactPerson: s.contactPerson || '', email: s.email || '',
      phone: s.phone || '', address: s.address || '', tinNumber: s.tinNumber || '',
      paymentMethod: s.paymentMethod || '', mobileMoneyNumber: s.mobileMoneyNumber || '',
      bankName: s.bankName || '', bankAccountNumber: s.bankAccountNumber || '',
      contractUrl: s.contractUrl || '',
    });
    setContractFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = { ...form };
      if (!body.tinNumber) delete body.tinNumber;
      if (!body.paymentMethod) {
        delete body.paymentMethod;
        delete body.mobileMoneyNumber;
        delete body.bankName;
        delete body.bankAccountNumber;
      } else if (body.paymentMethod === 'MOMO') {
        delete body.bankName;
        delete body.bankAccountNumber;
      } else if (body.paymentMethod === 'BANK') {
        delete body.mobileMoneyNumber;
      }
      if (!body.contractUrl) delete body.contractUrl;

      if (editItem) {
        await inventoryApi.suppliers.update(editItem.id, body);
        toast.success('Supplier updated');
      } else {
        await inventoryApi.suppliers.create(body);
        toast.success('Supplier created');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    setContractFile(file);
    setForm(prev => ({ ...prev, contractUrl: file.name }));
  };

  const handleRemoveFile = () => {
    setContractFile(null);
    setForm(prev => ({ ...prev, contractUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const paymentMethod = form.paymentMethod;

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Manage your suppliers and vendors</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <button onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setTimeout(() => resetForm(), 250); } }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Person</label>
                  <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">TIN Number</label>
                  <input value={form.tinNumber} onChange={e => setForm({ ...form, tinNumber: e.target.value })}
                    placeholder="Tax Identification Number"
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <SearchableSelect
                    value={form.paymentMethod}
                    onChange={v => setForm({ ...form, paymentMethod: v, mobileMoneyNumber: '', bankName: '', bankAccountNumber: '' })}
                    options={PAYMENT_METHODS}
                    placeholder="Select payment method"
                  />
                </div>

                {paymentMethod === 'MOMO' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Mobile Money Number *</label>
                    <input value={form.mobileMoneyNumber} onChange={e => setForm({ ...form, mobileMoneyNumber: e.target.value })}
                      placeholder="e.g. 0788123456" required
                      className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                )}

                {paymentMethod === 'BANK' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bank Name *</label>
                      <SearchableSelect
                        value={form.bankName}
                        onChange={v => setForm({ ...form, bankName: v })}
                        options={BANK_OPTIONS}
                        placeholder="Search bank"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Number *</label>
                      <input value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })}
                        placeholder="Bank account number" required
                        className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" rows={2} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Contract</label>
                  {form.contractUrl ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-gray-50 px-4 py-3">
                      <FileUp className="h-5 w-5 text-amber-600 shrink-0" />
                      <span className="text-sm flex-1 truncate">{form.contractUrl}</span>
                      <button type="button" onClick={handleRemoveFile}
                        className="rounded-lg p-1.5 hover:bg-red-100 text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-gray-50 transition-all flex flex-col items-center gap-2">
                      <FileUp className="h-6 w-6" />
                      <span>Click to upload contract (PDF, DOC — max 5MB)</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg"
                    onChange={handleFileSelect} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-all active:scale-95" />}>Cancel</DialogClose>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">{editItem ? 'Update' : 'Create'}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map(s => (
            <div key={s.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.contactPerson && <p className="text-xs text-muted-foreground">{s.contactPerson}</p>}
                  </div>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {s.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {s.email}</p>}
                {s.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {s.phone}</p>}
                {s.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {s.address}</p>}
                {s.tinNumber && <p className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" /> TIN: {s.tinNumber}</p>}
                {s.paymentMethod === 'MOMO' && s.mobileMoneyNumber && (
                  <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> MoMo: {s.mobileMoneyNumber}</p>
                )}
                {s.paymentMethod === 'BANK' && s.bankName && (
                  <p className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> {s.bankName}{s.bankAccountNumber ? ` ••${s.bankAccountNumber.slice(-4)}` : ''}</p>
                )}
                {s.contractUrl && (
                  <p className="flex items-center gap-2"><FileUp className="h-3.5 w-3.5" /> Contract attached</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                <span>{s._count?.products ?? 0} products · {s._count?.receivings ?? 0} receivings</span>
                <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No suppliers yet</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
