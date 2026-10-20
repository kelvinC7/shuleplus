'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { inventoryApi } from '@/services/inventory-api';
import type { StockRequest, Product } from '@/types';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export-dropdown';
import type { ExportColumn } from '@/lib/export-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';

export default function StockRequestsPage() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockRequest | null>(null);
  const [viewItem, setViewItem] = useState<StockRequest | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    departmentName: '', purpose: '', notes: '',
  });

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([
        inventoryApi.stockRequests.list(filterStatus || undefined),
        inventoryApi.products.list({}),
      ]);
      setRequests(r);
      setProducts(p);
    } catch {} finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ departmentName: '', purpose: '', notes: '' });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (r: StockRequest) => {
    setEditItem(r);
    setForm({ departmentName: r.departmentName, purpose: r.purpose || '', notes: r.notes || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await inventoryApi.stockRequests.update(editItem.id, form);
        toast.success('Request updated');
      } else {
        await inventoryApi.stockRequests.create(form);
        toast.success('Request created');
      }
      setDialogOpen(false);
      setTimeout(() => resetForm(), 250);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error saving request');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    toast('Delete this request?', {
      description: 'This action cannot be undone.',
      duration: 8000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await inventoryApi.stockRequests.remove(id);
            toast.success('Request deleted');
            if (viewItem?.id === id) setViewItem(null);
            load();
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error deleting request');
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const handleApprove = async (id: string) => {
    try {
      await inventoryApi.stockRequests.approve(id);
      toast.success('Request approved');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error approving request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await inventoryApi.stockRequests.reject(id);
      toast.success('Request rejected');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error rejecting request');
    }
  };

  const handleAddItem = async (productId: string, quantityRequested: number) => {
    if (!viewItem) return;
    try {
      await inventoryApi.stockRequests.addItem(viewItem.id, { productId, quantityRequested });
      toast.success('Item added');
      const updated = await inventoryApi.stockRequests.getById(viewItem.id);
      setViewItem(updated);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error adding item');
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (!viewItem) return;
    toast('Remove this item?', {
      description: 'The item will be removed from this request.',
      duration: 8000,
      action: {
        label: 'Remove',
        onClick: async () => {
          try {
            await inventoryApi.stockRequests.removeItem(viewItem.id, itemId);
            toast.success('Item removed');
            const updated = await inventoryApi.stockRequests.getById(viewItem.id);
            setViewItem(updated);
            load();
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error removing item');
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
    if (status === 'REJECTED') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Rejected</span>;
    if (status === 'ISSUED') return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Issued</span>;
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Request #', accessor: 'requestNumber' },
    { header: 'Department', accessor: 'department' },
    { header: 'Status', accessor: 'status' },
    { header: 'Items', accessor: 'items' },
    { header: 'Date', accessor: 'date' },
  ];

  const exportData = requests.map(r => ({
    requestNumber: r.requestNumber,
    department: r.departmentName || '-',
    status: r.status,
    items: r._count?.items ?? 0,
    date: new Date(r.createdAt).toLocaleDateString(),
  }));

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;

  if (viewItem) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewItem(null)} className="rounded-lg p-2 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>
              <div>
                <h1 className="text-2xl font-bold">{viewItem.requestNumber}</h1>
                <p className="text-sm text-muted-foreground">{viewItem.departmentName} &middot; {statusBadge(viewItem.status)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {viewItem.status === 'PENDING' && (
                <>
                  {viewItem.requestedBy && (
                    <button onClick={() => openEdit(viewItem)} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"><Pencil className="h-4 w-4" /> Edit</button>
                  )}
                  <button onClick={() => handleApprove(viewItem.id)} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"><CheckCircle className="h-4 w-4" /> Approve</button>
                  <button onClick={() => handleReject(viewItem.id)} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"><XCircle className="h-4 w-4" /> Reject</button>
                  <button onClick={() => handleDelete(viewItem.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4"><span className="text-xs text-muted-foreground">Department</span><p className="font-medium mt-1">{viewItem.departmentName}</p></div>
            <div className="rounded-xl border bg-white p-4"><span className="text-xs text-muted-foreground">Purpose</span><p className="font-medium mt-1">{viewItem.purpose || 'Not specified'}</p></div>
            <div className="rounded-xl border bg-white p-4"><span className="text-xs text-muted-foreground">Created</span><p className="font-medium mt-1">{new Date(viewItem.createdAt).toLocaleDateString()}</p></div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Items ({viewItem.items?.length || 0})</h2>
              {viewItem.status === 'PENDING' && (
                <AddItemDropdown products={products} onAdd={handleAddItem} />
              )}
            </div>
            {viewItem.items?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">SKU</th>
                    <th className="text-center px-4 py-3 font-medium">Quantity</th>
                    <th className="text-center px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewItem.items.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.product?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.product?.sku || '-'}</td>
                      <td className="px-4 py-3 text-center">{item.quantityRequested?.toString() || '0'}</td>
                      <td className="px-4 py-3 text-center">
                        {viewItem.status === 'PENDING' && (
                          <button onClick={() => handleRemoveItem(item.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No items yet. Add items to this request.</p>
            )}
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setTimeout(() => resetForm(), 250); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Request' : 'New Stock Request'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <input value={form.departmentName} onChange={e => setForm({ ...form, departmentName: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50" />}>Cancel</DialogClose>
                <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Requests</h1>
            <p className="text-sm text-muted-foreground">Manage stock requests from departments</p>
          </div>
          <div className="flex gap-2 pt-4 items-center justify-between sm:pt-0">
            <ExportDropdown title="Stock Requests" columns={exportColumns} data={exportData} />
            <Button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-all active:scale-95">
              <Plus className="h-4 w-4" /> New Request
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'REJECTED', 'ISSUED'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filterStatus === s ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setTimeout(() => resetForm(), 250); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Request' : 'New Stock Request'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <input value={form.departmentName} onChange={e => setForm({ ...form, departmentName: e.target.value })} required className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
              </div>
              <DialogFooter>
                <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50" />}>Cancel</DialogClose>
                <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Request #</th>
                <th className="text-left px-4 py-3 font-medium">Department</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Items</th>
                <th className="text-center px-4 py-3 font-medium">Date</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setViewItem(r)}>
                  <td className="px-4 py-3 font-medium">{r.requestNumber}</td>
                  <td className="px-4 py-3">{r.departmentName || '-'}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-center">{r._count?.items ?? 0}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      {r.status === 'PENDING' && (
                        <>
                          <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 hover:bg-gray-100" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleApprove(r.id)} className="rounded-lg p-1.5 hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                          <button onClick={() => handleReject(r.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-red-600" title="Reject"><XCircle className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(r.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No stock requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

function AddItemDropdown({ products, onAdd }: { products: Product[]; onAdd: (productId: string, qty: number) => void }) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    if (!productId) return;
    onAdd(productId, qty);
    setProductId('');
    setQty(1);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">
        <Plus className="h-4 w-4" /> Add Item
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border bg-white p-4 shadow-lg ring-1 ring-black/5 z-10">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Product</label>
              <SearchableSelect
                value={productId}
                onChange={setProductId}
                options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                placeholder="Select product"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Quantity</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full rounded-lg border px-2 py-1.5 text-sm" />
            </div>
            <button onClick={handleAdd} disabled={!productId || qty < 1} className="w-full rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
