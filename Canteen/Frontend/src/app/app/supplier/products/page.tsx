'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/shared/loading';
import { formatRwf } from '@/lib/format';
import type { SupplierProduct } from '@/types';

export default function SupplierProductsPage() {
  const { profile } = useAuth();
  const supplierId = profile?.supplierId ?? '';
  const { data, loading, error, reload } = useApi<SupplierProduct[]>(supplierId ? `/suppliers/${supplierId}/products` : null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierProduct | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: '', price: '', description: '' });
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setForm({ name: '', category: '', unit: '', price: '', description: '' });
    setOpen(true);
  }

  function startEdit(p: SupplierProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category ?? '',
      unit: p.unit ?? '',
      price: String(p.price),
      description: p.description ?? '',
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.price) return toast.error('Name and price are required');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        unit: form.unit || undefined,
        price: Number(form.price),
        description: form.description || undefined,
      };
      if (editing) {
        await api.put(`/suppliers/${supplierId}/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post(`/suppliers/${supplierId}/products`, payload);
        toast.success('Product added');
      }
      setOpen(false);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: SupplierProduct) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${supplierId}/products/${p.id}`);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed');
    }
  }

  if (!supplierId) {
    return <EmptyState title="No supplier profile" description="You need a supplier account to manage a catalog." />;
  }

  return (
    <div>
      <PageHeader
        title="Product catalog"
        description="Items canteens can order from you."
        actions={
          <Button onClick={startCreate}>
            <Plus /> Add product
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Package className="h-10 w-10" />} title="No products yet" description="Add your first catalog item." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.category ?? 'General'} {p.unit ? `· ${p.unit}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(p)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
                <p className="text-lg font-bold text-navy">{formatRwf(p.price)}</p>
                {p.description ? <p className="mt-2 text-sm text-muted">{p.description}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit product' : 'Add product'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="">Unit…</option>
                <option>kg</option>
                <option>litre</option>
                <option>pack</option>
                <option>box</option>
                <option>pcs</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Price (RWF) *</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
