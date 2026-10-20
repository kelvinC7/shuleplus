'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import {
  Plus, X, Search, Package, RefreshCw, CheckCircle2, Clock, Truck,
  AlertCircle, Send, Trash2, CircleDot, Eye, Link2, Unlink, ExternalLink,
  FileCheck,
} from 'lucide-react';
import type { KitchenRequest } from '@/types';

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'ISSUED', 'RECEIVED', 'REJECTED'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'Submitted',   color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  APPROVED:  { label: 'Approved',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: CheckCircle2 },
  ISSUED:    { label: 'Ready',       color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: Truck },
  RECEIVED:  { label: 'Received',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CircleDot },
  REJECTED:  { label: 'Rejected',    color: 'text-red-700',   bg: 'bg-red-50 border-red-200',     icon: AlertCircle },
};

const WORKFLOW_STEPS = [
  { key: 'PENDING',  label: 'Requested',     sublabel: 'Sent to Inventory' },
  { key: 'APPROVED', label: 'Approved',       sublabel: 'By Inventory Manager' },
  { key: 'ISSUED',   label: 'Issued',         sublabel: 'Stock Allocated' },
  { key: 'RECEIVED', label: 'Received',       sublabel: 'Confirmed by Kitchen' },
];

export default function KitchenRequestsPage() {
  const [requests, setRequests] = useState<KitchenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<KitchenRequest | null>(null);
  const [inventoryDetails, setInventoryDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [grnDialogOpen, setGrnDialogOpen] = useState(false);
  const [grnTarget, setGrnTarget] = useState<KitchenRequest | null>(null);
  const [grnNotes, setGrnNotes] = useState('');
  const [grnSubmitting, setGrnSubmitting] = useState(false);

  const [formItems, setFormItems] = useState<Array<{ productId: string; quantityRequested: number; notes: string }>>([]);
  const [formNotes, setFormNotes] = useState('');
  const [inventoryProducts, setInventoryProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState<number | null>(null);

  const loadProducts = useCallback(async (search?: string) => {
    try {
      const data = await cafeteriaApi.inventoryProducts.list(search);
      setInventoryProducts(data);
    } catch {
      // silently fail — user can still type UUID manually
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (productDropdownOpen !== null) {
      loadProducts(productSearch || undefined);
    }
  }, [productSearch, productDropdownOpen, loadProducts]);

  const load = useCallback(async () => {
    try {
      const data = await cafeteriaApi.kitchenRequests.list(filterStatus || undefined);
      setRequests(data);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await cafeteriaApi.kitchenRequests.syncAll();
      toast.success('Status synced with Inventory');
      load();
    } catch {
      toast.error('Failed to sync status');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOne = async (id: string) => {
    try {
      await cafeteriaApi.kitchenRequests.syncStatus(id);
      toast.success('Status updated');
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to sync';
      toast.error(msg);
    }
  };

  const handleForward = async (id: string) => {
    setForwardingId(id);
    try {
      await cafeteriaApi.kitchenRequests.forward(id);
      toast.success('Forwarded to Inventory Manager');
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to forward';
      toast.error(msg);
    } finally {
      setForwardingId(null);
    }
  };

  const handleSubmit = async () => {
    if (formItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (formItems.some(i => !i.productId || i.quantityRequested <= 0)) {
      toast.error('Fill in all product IDs and quantities');
      return;
    }
    setSubmitting(true);
    try {
      await cafeteriaApi.kitchenRequests.create({ notes: formNotes, items: formItems });
      toast.success('Request submitted to Inventory');
      setDialogOpen(false);
      setFormItems([]);
      setFormNotes('');
      load();
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await cafeteriaApi.kitchenRequests.receive(id);
      toast.success('Receipt confirmed');
      load();
    } catch {
      toast.error('Failed to confirm receipt');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return;
    try {
      await cafeteriaApi.kitchenRequests.remove(id);
      toast.success('Request deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCreateGrn = async () => {
    if (!grnTarget) return;
    setGrnSubmitting(true);
    try {
      // Use the kitchen request items as GRN items (user confirms quantities)
      const items = (grnTarget.items || []).map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantityRequested),
      }));
      await cafeteriaApi.kitchenRequests.createGrn(grnTarget.id, {
        notes: grnNotes || undefined,
        items,
      });
      toast.success('Goods Received Note created — stock updated');
      setGrnDialogOpen(false);
      setGrnTarget(null);
      setGrnNotes('');
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create GRN';
      toast.error(msg);
    } finally {
      setGrnSubmitting(false);
    }
  };

  const handleViewDetails = async (req: KitchenRequest) => {
    setSelectedRequest(req);
    setInventoryDetails(null);
    setDetailOpen(true);

    if (req.stockRequestId) {
      setLoadingDetails(true);
      try {
        const details = await cafeteriaApi.kitchenRequests.getInventoryDetails(req.id);
        setInventoryDetails(details);
      } catch {
        // Details unavailable, show what we have
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const addItem = () => setFormItems([...formItems, { productId: '', quantityRequested: 1, notes: '' }]);
  const removeItem = (idx: number) => setFormItems(formItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...formItems];
    items[idx] = { ...items[idx], [field]: value };
    setFormItems(items);
  };

  const filtered = requests.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.requestNumber.toLowerCase().includes(q) && !(r.notes || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    issued: requests.filter(r => r.status === 'ISSUED').length,
    received: requests.filter(r => r.status === 'RECEIVED').length,
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading kitchen requests...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Stock Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Request ingredients from inventory — approvals handled by Inventory Manager
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync All
            </button>
            <button
              onClick={() => { setFormItems([]); setFormNotes(''); setDialogOpen(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#fcb038] px-4 py-2 text-sm font-semibold text-[#000435] hover:bg-[#e5a030] transition-all active:scale-[0.98] shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Request
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Approved', value: stats.approved, color: 'text-amber-600' },
            { label: 'Ready', value: stats.issued, color: 'text-purple-600' },
            { label: 'Received', value: stats.received, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search by request number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#fcb038] focus:ring-2 focus:ring-[#fcb038]/20 transition-all"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilterStatus('')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${!filterStatus ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All
            </button>
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Request Cards */}
        <div className="space-y-3">
          {filtered.map((req) => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            const currentStep = WORKFLOW_STEPS.findIndex(s => s.key === req.status);
            const isLinked = !!req.stockRequestId;

            return (
              <div key={req.id} className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.bg} border`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{req.requestNumber}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color} border`}>
                          {cfg.label}
                        </span>
                        {isLinked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Link2 className="h-3 w-3" />
                            Linked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                            <Unlink className="h-3 w-3" />
                            Not Linked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {req.notes || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {req.items && req.items.length > 0 && (
                          <span className="ml-2 text-gray-400">· {req.items.length} item{req.items.length > 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {req.status === 'ISSUED' && (
                      <button
                        onClick={() => handleReceive(req.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all active:scale-[0.98]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Receive
                      </button>
                    )}

                    {isLinked && req.inventoryStatus === 'APPROVED' && (
                      <button
                        onClick={() => { setGrnTarget(req); setGrnNotes(''); setGrnDialogOpen(true); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all active:scale-[0.98]"
                      >
                        <FileCheck className="h-4 w-4" />
                        Create GRN
                      </button>
                    )}

                    {!isLinked && req.status === 'PENDING' && (
                      <button
                        onClick={() => handleForward(req.id)}
                        disabled={forwardingId === req.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {forwardingId === req.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Forward to Inventory
                      </button>
                    )}

                    {isLinked && ['PENDING', 'APPROVED'].includes(req.status) && (
                      <button
                        onClick={() => handleSyncOne(req.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-all"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync
                      </button>
                    )}

                    {req.status === 'PENDING' && !isLinked && (
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleViewDetails(req)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </button>
                  </div>
                </div>

                {/* Workflow Progress Bar */}
                <div className="border-t bg-gray-50/50 px-5 py-3">
                  <div className="flex items-center">
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const isCompleted = currentStep > idx || req.status === 'RECEIVED';
                      const isCurrent = currentStep === idx;
                      const isRejected = req.status === 'REJECTED' && idx === 0;

                      return (
                        <div key={step.key} className="flex items-center flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                              isRejected ? 'bg-red-100 text-red-600 border-2 border-red-300' :
                              isCompleted ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-300' :
                              isCurrent ? 'bg-[#fcb038] text-[#000435] border-2 border-[#fcb038] ring-2 ring-[#fcb038]/30' :
                              'bg-gray-100 text-gray-400 border-2 border-gray-200'
                            }`}>
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            <div>
                              <p className={`text-xs font-medium ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>
                                {step.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{step.sublabel}</p>
                            </div>
                          </div>
                          {idx < WORKFLOW_STEPS.length - 1 && (
                            <div className="flex-1 mx-3">
                              <div className={`h-0.5 rounded-full ${isCompleted ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No kitchen requests found</p>
              <p className="text-sm text-muted-foreground mt-1">Create a new request to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* New Request Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">New Kitchen Request</h2>
                <p className="text-sm text-muted-foreground mt-0.5">This will be sent to the Inventory Manager for approval</p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Request Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#fcb038] focus:ring-2 focus:ring-[#fcb038]/20 transition-all resize-none"
                  rows={2}
                  placeholder="Why do you need these items?"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Items Required</label>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#fcb038] hover:text-[#e5a030] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </div>

                {formItems.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                    <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No items added yet</p>
                    <button onClick={addItem} className="mt-2 text-sm font-medium text-[#fcb038] hover:text-[#e5a030]">
                      + Add your first item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fcb038]/10 text-xs font-bold text-[#000435]">
                          {idx + 1}
                        </span>
                        <div className="flex-1 relative">
                          <input
                            placeholder="Search product by name or SKU..."
                            value={item.productId ? (inventoryProducts.find(p => p.id === item.productId)?.name || item.productId) : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                updateItem(idx, 'productId', '');
                                return;
                              }
                              const match = inventoryProducts.find(p => p.name.toLowerCase() === val.toLowerCase() || p.sku.toLowerCase() === val.toLowerCase());
                              if (match) {
                                updateItem(idx, 'productId', match.id);
                              } else {
                                updateItem(idx, 'productId', val);
                              }
                            }}
                            onFocus={() => setProductDropdownOpen(idx)}
                            onBlur={() => setTimeout(() => setProductDropdownOpen(null), 200)}
                            className="w-full rounded-md border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#fcb038]"
                          />
                          {productDropdownOpen === idx && inventoryProducts.length > 0 && (
                            <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg">
                              {inventoryProducts
                                .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                                .slice(0, 20)
                                .map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      updateItem(idx, 'productId', p.id);
                                      setProductDropdownOpen(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#fcb038]/10 transition-colors flex items-center justify-between"
                                  >
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                                  </button>
                                ))
                              }
                            </div>
                          )}
                          {productDropdownOpen === idx && (
                            <input
                              type="text"
                              placeholder="Filter products..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="absolute z-50 mt-1 right-0 w-1/2 rounded-md border bg-white px-2 py-1 text-xs outline-none"
                              style={{ top: '-28px' }}
                              onBlur={() => setTimeout(() => { setProductDropdownOpen(null); setProductSearch(''); }, 200)}
                              onFocus={() => setProductDropdownOpen(idx)}
                            />
                          )}
                        </div>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantityRequested || ''}
                          onChange={(e) => updateItem(idx, 'quantityRequested', parseInt(e.target.value) || 0)}
                          className="w-20 rounded-md border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#fcb038]"
                        />
                        <input
                          placeholder="Notes"
                          value={item.notes}
                          onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                          className="w-28 rounded-md border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#fcb038]"
                        />
                        <button
                          onClick={() => removeItem(idx)}
                          className="rounded-md p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4 bg-gray-50">
              <p className="text-xs text-muted-foreground">
                {formItems.length} item{formItems.length !== 1 ? 's' : ''} will be requested
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || formItems.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#000435] px-5 py-2 text-sm font-semibold text-white hover:bg-[#000328] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit to Inventory'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedRequest.requestNumber}</h2>
                <p className="text-sm text-muted-foreground">Request Details</p>
              </div>
              <button onClick={() => setDetailOpen(false)} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Status & Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {(() => {
                      const cfg = STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.PENDING;
                      const StepIcon = cfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color} border`}>
                          <StepIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Created</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Linked to Inventory</p>
                  <p className="text-sm font-medium mt-1">
                    {selectedRequest.stockRequestId ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Link2 className="h-3 w-3" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Unlink className="h-3 w-3" /> No
                      </span>
                    )}
                  </p>
                </div>
                {selectedRequest.inventoryStatus && (
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs font-medium text-amber-600">Inventory Status</p>
                    <p className="text-sm font-medium mt-1 text-amber-800">{selectedRequest.inventoryStatus}</p>
                  </div>
                )}
              </div>

              {/* Inventory Details (fetched live) */}
              {selectedRequest.stockRequestId && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      InventoryMIS Stock Request
                    </p>
                    {loadingDetails && <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />}
                  </div>

                  {inventoryDetails?.stockRequest ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-amber-600">Request #</p>
                          <p className="font-medium">{inventoryDetails.stockRequest.requestNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-amber-600">Store</p>
                          <p className="font-medium">{inventoryDetails.stockRequest.store?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-amber-600">Status</p>
                          <p className="font-medium">{inventoryDetails.stockRequest.status}</p>
                        </div>
                      </div>

                      {inventoryDetails.stockRequest.items && inventoryDetails.stockRequest.items.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-1">Items</p>
                          <div className="rounded-md bg-white border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Product</th>
                                  <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">SKU</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Requested</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Approved</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventoryDetails.stockRequest.items.map((item: any, idx: number) => (
                                  <tr key={idx} className="border-b last:border-0">
                                    <td className="px-3 py-1.5 font-medium">{item.product?.name || item.productId}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{item.product?.sku || '-'}</td>
                                    <td className="px-3 py-1.5 text-right">{item.quantityRequested}</td>
                                    <td className="px-3 py-1.5 text-right">{item.quantityApproved || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !loadingDetails && (
                    <p className="text-sm text-amber-600">Could not load inventory details</p>
                  )}
                </div>
              )}

              {/* GRN (Goods Received Note) Section */}
              {inventoryDetails?.grn && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2 mb-2">
                    <FileCheck className="h-4 w-4" />
                    Goods Received Note (GRN)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-xs text-emerald-600">GRN #</p>
                      <p className="font-medium">{inventoryDetails.grn.grnNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600">Received Date</p>
                      <p className="font-medium">
                        {inventoryDetails.grn.receivedDate
                          ? new Date(inventoryDetails.grn.receivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600">Store</p>
                      <p className="font-medium">{inventoryDetails.grn.store?.name || 'N/A'}</p>
                    </div>
                  </div>
                  {inventoryDetails.grn.items && inventoryDetails.grn.items.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-700 mb-1">Received Items</p>
                      <div className="rounded-md bg-white border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Product</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">SKU</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Quantity</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Batch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryDetails.grn.items.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="px-3 py-1.5 font-medium">{item.product?.name || item.productId}</td>
                                <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{item.product?.sku || '-'}</td>
                                <td className="px-3 py-1.5 text-right font-medium">{item.quantity}</td>
                                <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{item.batchNumber || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Kitchen Request Items */}
              {selectedRequest.notes && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.items && selectedRequest.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Requested Items ({selectedRequest.items.length})</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product ID</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Requested</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Approved</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Issued</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.items.map((item, idx) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{item.productId}</td>
                            <td className="px-3 py-2 text-right">{item.quantityRequested}</td>
                            <td className="px-3 py-2 text-right">{item.quantityApproved || '-'}</td>
                            <td className="px-3 py-2 text-right">{item.quantityIssued || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t px-6 py-3 bg-gray-50">
              <button
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Dialog */}
      {grnDialogOpen && grnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  Create Goods Received Note
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Confirm received items for {grnTarget.requestNumber}
                </p>
              </div>
              <button onClick={() => setGrnDialogOpen(false)} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#fcb038] focus:ring-2 focus:ring-[#fcb038]/20 transition-all resize-none"
                  rows={2}
                  placeholder="Delivery notes..."
                />
              </div>

              {grnTarget.items && grnTarget.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Items to Receive</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grnTarget.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{item.productId}</td>
                            <td className="px-3 py-2 text-right font-medium">{item.quantityRequested}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  This will create a GRN in InventoryMIS, update stock levels, and mark this request as received.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-6 py-4 bg-gray-50">
              <button
                onClick={() => setGrnDialogOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGrn}
                disabled={grnSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {grnSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                {grnSubmitting ? 'Creating...' : 'Confirm & Create GRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
