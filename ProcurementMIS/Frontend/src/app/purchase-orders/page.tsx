'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { PurchaseOrder, Supplier } from '@/types';
import { Plus, Eye, Truck, Package, Trash2, ShoppingCart, DollarSign, FileDown, Filter, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
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
import { PurchaseOrderImportWizard } from '@/components/purchase-order-import-wizard';
import { PurchaseOrderDetailDrawer } from '@/components/purchase-order-detail-drawer';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { defaultAcademicSettings, type AcademicSettings } from '@/lib/academic-settings';
import {
  DataTable,
  DataTableCard,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  ListFilterBar,
  PageLoading,
  StatusBadge,
  TablePagination,
  useTablePagination,
} from '@/components/list-ui';
import {
  ReportFilterDrawer,
  EMPTY_REPORT_FILTERS,
  countActiveReportFilters,
  reportFilterParams,
  reportPeriodMeta,
  reportPeriodLabel,
  type ReportFilterValues,
} from '@/components/report-filter-drawer';
import { downloadProcurementReport } from '@/modules/documents/report-pdf';

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
  const router = useRouter();
  const { user, isSupervisor } = useAuth();
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
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings>(defaultAcademicSettings());
  const [reportFilters, setReportFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = { ...reportFilterParams(reportFilters) };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const [o, s] = await Promise.all([
        procurementApi.purchaseOrders.list(params),
        procurementApi.suppliers.list(),
      ]);
      setOrders(o); setSuppliers(s);
    } catch {} finally { setLoading(false); }
  }, [statusFilter, search, reportFilters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    procurementApi.settings.getAcademic().then(setAcademicSettings).catch(() => {});
  }, []);

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
      const created = await procurementApi.purchaseOrders.create(form);
      const requisitionId = (created as any)?.purchaseRequest?.id || (created as any)?.prId;
      toast.success('Purchase order created');
      setFormOpen(false);
      resetForm();
      if (requisitionId) {
        router.push(`/requisitions?open=${encodeURIComponent(requisitionId)}`);
        return;
      }
      void load();
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
        province: profile?.province,
        district: profile?.district,
        sector: profile?.sector,
        website: profile?.website,
        receiptSettings,
        supplier,
      });
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadReport = async (values: ReportFilterValues) => {
    setReportLoading(true);
    try {
      const params: Record<string, string> = { ...reportFilterParams(values) };
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const [profile, rows] = await Promise.all([
        procurementApi.settings.getOrgProfile(),
        procurementApi.purchaseOrders.list(params),
      ]);

      const meta = [...reportPeriodMeta(values)];
      if (statusFilter !== 'ALL') {
        meta.push({ label: 'Status', value: statusFilter.replace(/_/g, ' ') });
      }

      const totalValue = rows.reduce((sum, row) => sum + Number(row.totalAmount), 0);
      const inTransit = rows.filter((row) => row.status === 'IN_TRANSIT').length;
      const completed = rows.filter((row) => row.status === 'COMPLETED').length;

      await downloadProcurementReport({
        info: {
          schoolName: profile?.schoolName ?? 'School',
          logoUrl: profile?.logoUrl,
          province: profile?.province,
          district: profile?.district,
          sector: profile?.sector,
          website: profile?.website,
        },
        title: 'PURCHASE ORDERS REPORT',
        columns: [
          { header: 'PO Number', dataKey: 'poNumber' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Supplier', dataKey: 'supplier' },
          { header: 'PR Ref', dataKey: 'prRef' },
          { header: 'Amount (Frw)', dataKey: 'amount', align: 'right' },
          { header: 'Status', dataKey: 'status', align: 'center' },
          { header: 'Payment', dataKey: 'payment', align: 'center' },
        ],
        rows: rows.map((row) => ({
          poNumber: row.poNumber,
          date: new Date(row.orderDate).toLocaleDateString(),
          supplier: row.supplier?.companyName ?? '—',
          prRef: row.purchaseRequest?.prNumber ?? '—',
          amount: Number(row.totalAmount).toLocaleString(),
          status: row.status.replace(/_/g, ' '),
          payment: row.paymentStatus.replace(/_/g, ' '),
        })),
        meta,
        summary: [
          { label: 'Records', value: String(rows.length) },
          { label: 'Total value', value: formatMoney(totalValue) },
          { label: 'In transit', value: String(inTransit) },
          { label: 'Completed', value: String(completed) },
        ],
        fileBase: 'purchase-orders-report',
        verification: {
          period: reportPeriodLabel(values),
          generatedBy: user?.email ?? 'Procurement MIS User',
        },
      });
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
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

  const pagination = useTablePagination(orders, {
    resetKey: `${search}|${statusFilter}|${reportFilters.academicYear}|${reportFilters.term}|${reportFilters.dateFrom}|${reportFilters.dateTo}`,
  });

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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Import Excel
              </button>
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
            </div>
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
            setReportFilters(EMPTY_REPORT_FILTERS);
          }}
          actions={
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="btn-ghost !rounded-xl inline-flex items-center gap-2 ring-1 ring-slate-200"
            >
              <Filter className="h-4 w-4" /> Filter
              {countActiveReportFilters(reportFilters) > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fcb038] px-1.5 text-[10px] font-extrabold text-navy">
                  {countActiveReportFilters(reportFilters)}
                </span>
              ) : null}
            </button>
          }
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
              {pagination.rows.map((po) => (
                <DataTableRow key={po.id}>
                  <DataTableTd className="font-semibold text-navy">{po.poNumber}</DataTableTd>
                  <DataTableTd>{po.supplier?.companyName || '—'}</DataTableTd>
                  <DataTableTd className="text-muted">
                    {new Date(po.orderDate).toLocaleDateString()}
                  </DataTableTd>
                  <DataTableTd className="text-right font-semibold tabular-nums">
                    {formatMoney(Number(po.totalAmount))}
                  </DataTableTd>
                  <DataTableTd className="text-center">
                    <StatusBadge tone={orderTone(po.status)}>
                      {po.status.replace(/_/g, ' ')}
                    </StatusBadge>
                  </DataTableTd>
                  <DataTableTd className="text-center">
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
                  </DataTableTd>
                  <DataTableTd>
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
                  </DataTableTd>
                </DataTableRow>
              ))}
              {orders.length === 0 ? (
                <DataTableEmpty colSpan={7} message="No purchase orders found" />
              ) : null}
            </tbody>
          </DataTable>
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
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

      <PurchaseOrderDetailDrawer
        open={detailOpen}
        po={selectedPO}
        isSupervisor={isSupervisor}
        pdfLoading={pdfLoading}
        onClose={() => setDetailOpen(false)}
        onDownloadPdf={(po) => { void handleDownloadPdf(po); }}
        onStatusChange={(id, status) => { void handleStatusChange(id, status); }}
        onPaymentChange={(id, status) => { void handlePaymentChange(id, status); }}
      />

      <PurchaseOrderImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { void load(); }}
        suppliers={suppliers}
      />

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter purchase orders"
        description="Narrow orders by academic period or date, then download a branded PDF report."
        academicSettings={academicSettings}
        value={reportFilters}
        onApply={setReportFilters}
        onDownload={handleDownloadReport}
        downloading={reportLoading}
      />
    </MainLayout>
  );
}
