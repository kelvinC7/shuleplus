'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { PurchaseOrder, Supplier } from '@/types';
import { Plus, Eye, Truck, Package, Trash2, ShoppingCart, DollarSign, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AddItemButton,
  FormField,
  ItemFormCard,
  ModalFormShell,
  MoneyDisplay,
  SectionHeading,
  SelectField,
} from '@/components/procurement-form-ui';
import { formatFrw as formatMoney } from '@/utils/currency';
import { useAuth } from '@/contexts/auth-context';
import { downloadPurchaseOrderPdf } from '@/modules/documents/po-order-pdf';
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700', PREPARING: 'bg-purple-100 text-purple-700',
  IN_TRANSIT: 'bg-orange-100 text-orange-700', DELIVERED: 'bg-teal-100 text-teal-700',
  PARTIALLY_DELIVERED: 'bg-amber-100 text-amber-700', CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-700', PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-200 text-red-800',
};

const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const;

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED'];
const UNITS = ['EA', 'PCS', 'KG', 'Box', 'Carton', 'Pack', 'Set'];

const initialItemState = { itemName: '', description: '', unit: 'EA', quantity: '', unitPrice: '' };
const initialFormState = {
  supplierId: '', prId: '', discount: '', tax: '', shippingCost: '', items: [{ ...initialItemState }],
};

export default function PurchaseOrdersPage() {
  const { isSupervisor } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const [o, s] = await Promise.all([
        procurementApi.purchaseOrders.list(params),
        procurementApi.suppliers.list(),
      ]);
      setOrders(o); setSuppliers(s);
    } catch {} finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm(initialFormState);

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...initialItemState }] }));
  const removeItem = (idx: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: string) => setForm(prev => ({
    ...prev, items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
  }));

  const totals = form.items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    acc.subtotal += qty * price;
    return acc;
  }, { subtotal: 0 });

  const totalAmount = totals.subtotal - (Number(form.discount) || 0) + (Number(form.tax) || 0) + (Number(form.shippingCost) || 0);

  const handleSubmit = async () => {
    if (!form.supplierId) { toast.error('Please select a supplier'); return; }
    if (form.items.some(i => !i.itemName || !i.quantity || !i.unitPrice)) { toast.error('Please fill all item details'); return; }
    setSubmitting(true);
    try {
      await procurementApi.purchaseOrders.create(form);
      toast.success('Purchase order created'); setFormOpen(false); resetForm(); load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to create PO'); }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await procurementApi.purchaseOrders.updateStatus(id, status);
      toast.success(`Order status updated to ${status.replace(/_/g, ' ').toLowerCase()}`); load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Update failed'); }
  };

  const handlePaymentChange = async (id: string, paymentStatus: string) => {
    try {
      await procurementApi.purchaseOrders.updatePayment(id, paymentStatus);
      toast.success(`Payment updated to ${paymentStatus.replace(/_/g, ' ').toLowerCase()}`);
      load();
      if (selectedPO?.id === id) {
        setSelectedPO((prev) => (prev ? { ...prev, paymentStatus } : prev));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Payment update failed');
    }
  };

  const viewDetail = async (po: PurchaseOrder) => {
    try {
      const detail = await procurementApi.purchaseOrders.getById(po.id);
      setSelectedPO(detail); setDetailOpen(true);
    } catch { toast.error('Failed to load details'); }
  };

  const handleDownloadPdf = async (po: PurchaseOrder) => {
    setPdfLoading(true);
    try {
      const [detail, profile, receiptSettings, supplier] = await Promise.all([
        procurementApi.purchaseOrders.getById(po.id),
        procurementApi.settings.getOrgProfile(),
        procurementApi.settings.getReceipt(),
        po.supplier?.id
          ? procurementApi.suppliers.getById(po.supplier.id)
          : Promise.resolve(null),
      ]);
      await downloadPurchaseOrderPdf(detail, {
        schoolName: profile?.schoolName ?? 'School',
        logoUrl: profile?.logoUrl,
        receiptSettings,
        supplier,
      });
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDelete = (po: PurchaseOrder) => {
    if (po.status !== 'DRAFT') { toast.error('Only draft orders can be deleted'); return; }
    toast(`Delete "${po.poNumber}"?`, {
      duration: 8000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try { await procurementApi.purchaseOrders.remove(po.id); toast.success('Deleted'); load(); }
          catch (err: any) { toast.error(err?.response?.data?.message || 'Delete failed'); }
        },
      },
    });
  };

  const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const inTransitCount = orders.filter((o) => o.status === 'IN_TRANSIT').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  const paymentTone = (status: string) => {
    if (status === 'PAID') return 'success';
    if (status === 'OVERDUE' || status === 'UNPAID') return 'danger';
    if (status === 'PARTIALLY_PAID') return 'warning';
    return 'neutral';
  };

  const orderTone = (status: string) => {
    if (status === 'COMPLETED' || status === 'DELIVERED') return 'success';
    if (status === 'IN_TRANSIT' || status === 'PREPARING') return 'warning';
    if (status === 'CANCELLED') return 'danger';
    return 'info';
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading purchase orders…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Manage and track all purchase orders from draft to delivery."
        actions={
          isSupervisor ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New Order
            </button>
          ) : undefined
        }
        kpis={[
          {
            label: 'Total Orders',
            value: orders.length,
            icon: <ShoppingCart size={20} strokeWidth={1.75} />,
          },
          {
            label: 'In Transit',
            value: inTransitCount,
            icon: <Truck size={20} strokeWidth={1.75} />,
            valueClassName: 'text-orange-600',
          },
          {
            label: 'Completed',
            value: completedCount,
            icon: <Package size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Total Value',
            value: formatMoney(totalValue),
            icon: <DollarSign size={20} strokeWidth={1.75} />,
          },
        ]}
      >
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by PO number or supplier…"
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'ALL', label: 'All status' },
                ...STATUSES.map((s) => ({
                  value: s,
                  label: s.replace(/_/g, ' '),
                })),
              ],
            },
          ]}
          onReset={() => {
            setSearch('');
            setStatusFilter('ALL');
          }}
        />

        <DataTableCard>
          <DataTable minWidth="980px">
            <DataTableHead>
              <DataTableTh>PO Number</DataTableTh>
              <DataTableTh>Supplier</DataTableTh>
              <DataTableTh>Order Date</DataTableTh>
              <DataTableTh className="text-right">Amount</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh className="text-center">Payment</DataTableTh>
              <DataTableTh className="text-center">Actions</DataTableTh>
            </DataTableHead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b border-border/70 transition hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-semibold text-navy">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.supplier?.companyName || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(po.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(Number(po.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={orderTone(po.status)}>
                      {po.status.replace(/_/g, ' ')}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isSupervisor ? (
                      <select
                        value={po.paymentStatus}
                        onChange={(e) => handlePaymentChange(po.id, e.target.value)}
                        className={`rounded-full border-0 px-2.5 py-0.5 text-[11px] font-semibold outline-none cursor-pointer ${PAYMENT_COLORS[po.paymentStatus] ?? 'bg-slate-100 text-slate-700'}`}
                        title="Change payment status"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge tone={paymentTone(po.paymentStatus)}>
                        {po.paymentStatus.replace(/_/g, ' ')}
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => viewDetail(po)} className="rounded-lg p-1.5 hover:bg-navy/[0.04]" title="View"><Eye className="h-4 w-4" /></button>
                      <button
                        onClick={() => handleDownloadPdf(po)}
                        disabled={pdfLoading}
                        className="rounded-lg p-1.5 hover:bg-amber-50 text-amber-700 disabled:opacity-50"
                        title="Download PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                      {po.status === 'DRAFT' && (
                        <button onClick={() => handleStatusChange(po.id, 'SENT')} className="rounded-lg p-1.5 hover:bg-sky-50 text-sky-700" title="Send"><Truck className="h-4 w-4" /></button>
                      )}
                      {po.status === 'IN_TRANSIT' && (
                        <button onClick={() => handleStatusChange(po.id, 'DELIVERED')} className="rounded-lg p-1.5 hover:bg-emerald-50 text-emerald-600" title="Mark Delivered"><Package className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => handleDelete(po)} className="rounded-lg p-1.5 hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <DataTableEmpty colSpan={7} message="No purchase orders found" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PlatformPageLayout>

      {/* Create PO Dialog */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setTimeout(resetForm, 250); } }}>
        <DialogContent className="max-h-[95vh] max-w-[calc(100%-1rem)] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-4xl">
          <ModalFormShell
            title="New Purchase Order"
            subtitle="Create a purchase order with supplier details, line items, and totals in Frw."
            footer={
              <>
                <DialogClose render={<button type="button" className="btn-secondary">Cancel</button>}>Cancel</DialogClose>
                <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary px-8 disabled:opacity-70">
                  {submitting ? 'Creating…' : 'Create Order'}
                </button>
              </>
            }
          >
            <div className="space-y-8">
              <section>
                <SectionHeading title="Order Details" />
                <SelectField
                  label="Supplier"
                  required
                  value={form.supplierId}
                  onChange={(value) => setForm({ ...form, supplierId: value })}
                  options={suppliers.map((s) => ({ value: s.id, label: s.companyName }))}
                  placeholder="Select supplier"
                />
              </section>

              <section>
                <SectionHeading title="Line Items" />
                <div className="space-y-4">
                  {form.items.map((item, idx) => (
                    <ItemFormCard
                      key={idx}
                      index={idx}
                      canRemove={form.items.length > 1}
                      onRemove={() => removeItem(idx)}
                    >
                      <div className="grid gap-4 sm:grid-cols-4">
                        <FormField label="Item Name" required className="sm:col-span-2">
                          <input
                            value={item.itemName}
                            onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                            className="input"
                          />
                        </FormField>
                        <FormField label="Unit">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            className="input"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Quantity" required>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="input"
                          />
                        </FormField>
                        <FormField label="Unit Price" required hint="Amount in Frw">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                            className="input"
                            placeholder="0"
                          />
                        </FormField>
                        <FormField label="Line Total" className="sm:col-span-2">
                          <MoneyDisplay
                            amount={(Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)}
                          />
                        </FormField>
                      </div>
                    </ItemFormCard>
                  ))}
                  <AddItemButton onClick={addItem} label="Add item" />
                </div>
              </section>

              <section>
                <SectionHeading title="Totals" />
                <div className="grid gap-5 sm:grid-cols-4">
                  <FormField label="Discount" hint="Frw">
                    <input
                      type="number"
                      min="0"
                      value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Tax" hint="Frw">
                    <input
                      type="number"
                      min="0"
                      value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Shipping" hint="Frw">
                    <input
                      type="number"
                      min="0"
                      value={form.shippingCost}
                      onChange={(e) => setForm({ ...form, shippingCost: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Total Amount">
                    <MoneyDisplay amount={totalAmount} emphasis />
                  </FormField>
                </div>
              </section>
            </div>
          </ModalFormShell>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedPO?.poNumber} - Purchase Order Details</DialogTitle></DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Supplier:</span><span>{selectedPO.supplier?.companyName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Order Date:</span><span>{new Date(selectedPO.orderDate).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedPO.status]}`}>{selectedPO.status.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground">Payment:</span>
                  {isSupervisor ? (
                    <select
                      value={selectedPO.paymentStatus}
                      onChange={(e) => handlePaymentChange(selectedPO.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${PAYMENT_COLORS[selectedPO.paymentStatus]}`}
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_COLORS[selectedPO.paymentStatus]}`}>{selectedPO.paymentStatus.replace(/_/g, ' ')}</span>
                  )}
                </div>
                {selectedPO.purchaseRequest?.prNumber ? (
                  <div className="flex justify-between"><span className="text-muted-foreground">PR Reference:</span><span>{selectedPO.purchaseRequest.prNumber}</span></div>
                ) : null}
              </div>

              {selectedPO.items && selectedPO.items.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 font-medium">Item</th>
                      <th className="text-center px-3 py-2 font-medium">Qty</th>
                      <th className="text-right px-3 py-2 font-medium">Unit Price</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                    </tr></thead>
                    <tbody>
                      {selectedPO.items.map(item => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{item.itemName}</td>
                          <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-right">{formatMoney(Number(item.unitPrice))}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatMoney(Number(item.totalPrice))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatMoney(Number(selectedPO.subtotal))}</span></div>
                <div className="flex justify-between"><span>Discount:</span><span>-{formatMoney(Number(selectedPO.discount))}</span></div>
                <div className="flex justify-between"><span>Tax:</span><span>{formatMoney(Number(selectedPO.tax))}</span></div>
                <div className="flex justify-between"><span>Shipping:</span><span>{formatMoney(Number(selectedPO.shippingCost))}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total:</span><span>{formatMoney(Number(selectedPO.totalAmount))}</span></div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedPO)}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#fcb038]/40 bg-[#fcb038]/10 px-4 py-2 text-sm font-semibold text-navy hover:bg-[#fcb038]/20 disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" /> Download PDF
                </button>
                {selectedPO.status === 'DRAFT' && <button onClick={() => { handleStatusChange(selectedPO.id, 'SENT'); setDetailOpen(false); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Send to Supplier</button>}
                {selectedPO.status === 'SENT' && <button onClick={() => { handleStatusChange(selectedPO.id, 'ACCEPTED'); setDetailOpen(false); }} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Mark Accepted</button>}
                {selectedPO.status === 'ACCEPTED' && <button onClick={() => { handleStatusChange(selectedPO.id, 'PREPARING'); setDetailOpen(false); }} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">Mark Preparing</button>}
                {selectedPO.status === 'PREPARING' && <button onClick={() => { handleStatusChange(selectedPO.id, 'IN_TRANSIT'); setDetailOpen(false); }} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">Mark In Transit</button>}
                {selectedPO.status === 'IN_TRANSIT' && <button onClick={() => { handleStatusChange(selectedPO.id, 'DELIVERED'); setDetailOpen(false); }} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Mark Delivered</button>}
                {selectedPO.status === 'DELIVERED' && <button onClick={() => { handleStatusChange(selectedPO.id, 'COMPLETED'); setDetailOpen(false); }} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Mark Completed</button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
