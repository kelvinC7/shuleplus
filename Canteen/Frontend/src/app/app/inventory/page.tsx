'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import type { InventoryItem } from '@/types';

export default function InventoryPage() {
  const { data, loading, error, reload } = useApi<InventoryItem[]>('/inventory');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', quantity: '', unit: 'pcs', reorderLevel: '' });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!form.name || !form.quantity) return toast.error('Name and quantity are required');
    setSaving(true);
    try {
      await api.post('/inventory', {
        name: form.name,
        quantity: Number(form.quantity),
        unit: form.unit,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
      });
      toast.success('Item added');
      setOpen(false);
      setForm({ name: '', quantity: '', unit: 'pcs', reorderLevel: '' });
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function adjust(item: InventoryItem, delta: number) {
    const newQty = Number(item.quantity) + delta;
    if (newQty < 0) return toast.error('Cannot go below zero');
    try {
      await api.patch(`/inventory/${item.id}/adjust`, { delta });
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    }
  }

  async function remove(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/inventory/${item.id}`);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    }
  }

  const lowStock = (data ?? []).filter((i) => Number(i.reorderLevel ?? 0) > 0 && Number(i.quantity) <= Number(i.reorderLevel));

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels for canteen supplies."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add item
          </Button>
        }
      />

      {lowStock.length > 0 ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>{lowStock.length} item(s) at or below reorder level:</strong>{' '}
          {lowStock.map((i) => i.name).join(', ')}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No inventory items" description="Add stock items to track your supplies." />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {data?.map((item) => {
              const low = Number(item.reorderLevel ?? 0) > 0 && Number(item.quantity) <= Number(item.reorderLevel);
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.unit} · reorder at {Number(item.reorderLevel ?? 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {low ? <Badge variant="warning">low</Badge> : null}
                    <span className={`text-lg font-bold ${low ? 'text-danger' : 'text-navy'}`}>
                      {Number(item.quantity)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjust(item, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjust(item, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(item)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add inventory item"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={saving}>{saving ? 'Adding…' : 'Add item'}</Button>
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
              <Label>Quantity *</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option>pcs</option>
                <option>kg</option>
                <option>litre</option>
                <option>pack</option>
                <option>box</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Reorder level</Label>
            <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
