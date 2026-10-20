'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Label, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/loading';
import { formatRwf } from '@/lib/format';
import type { MenuItem } from '@/types';

const EMPTY = { name: '', category: '', price: '', description: '', imageUrl: '' };

export default function MenuPage() {
  const { data: items, loading, error, reload } = useApi<MenuItem[]>('/menu-items');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category ?? '',
      price: String(Number(item.price)),
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
    });
    setOpen(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('supplierId', 'menu');
      const { data } = await api.post('/images/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, imageUrl: data.data.imageUrl }));
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name || !form.price) return toast.error('Name and price are required');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        description: form.description,
        imageUrl: form.imageUrl,
      };
      if (editing) {
        await api.put(`/menu-items/${editing.id}`, payload);
        toast.success('Menu item updated');
      } else {
        await api.post('/menu-items', payload);
        toast.success('Menu item added');
      }
      setOpen(false);
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/menu-items/${item.id}`);
      toast.success('Menu item deleted');
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Delete failed');
    }
  }

  return (
    <div>
      <PageHeader
        title="Menu items"
        description="What the canteen sells to students."
        actions={
          <Button onClick={openNew}>
            <Plus /> Add menu item
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (items?.length ?? 0) === 0 ? (
        <EmptyState
          title="No menu items"
          description="Add your first menu item to start selling at the POS."
          action={
            <Button onClick={openNew}>
              <Plus /> Add menu item
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items?.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl.startsWith('/') ? item.imageUrl : item.imageUrl}
                  alt={item.name}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-muted/10">
                  <ImagePlus className="h-8 w-8 text-muted" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{item.name}</p>
                    <p className="text-xs text-muted">{item.category ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.isActive ? <Badge variant="danger">hidden</Badge> : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-bold text-primary">{formatRwf(item.price)}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(item)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit menu item' : 'Add menu item'}
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
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select…</option>
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Snacks</option>
                <option>Drinks</option>
                <option>Desserts</option>
              </Select>
            </div>
            <div>
              <Label>Price (RWF) *</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
              }}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner /> : <ImagePlus />} {form.imageUrl ? 'Change image' : 'Upload image'}
            </Button>
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="preview" className="mt-2 h-24 w-full rounded-lg object-cover" />
            ) : null}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
