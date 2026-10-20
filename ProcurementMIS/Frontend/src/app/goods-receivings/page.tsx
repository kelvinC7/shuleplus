'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { GoodsReceiving, GrnSummary, Department, PurchaseOrder, Supplier } from '@/types';
import {
  Package,
  ClipboardList,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Plus,
  Truck,
  FileDown,
  Printer,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { ReceiveGoodsDrawer } from '@/components/receive-goods-drawer';
import { downloadGrnPdf, printGrnPdf } from '@/modules/documents/grn-pdf';
import { formatFrwCompact } from '@/utils/currency';
import {
  GRN_STATUS_LABELS,
  GRN_TABS,
  GRN_STATUSES,
  grnStatusTone,
} from '@/lib/grn-constants';
import { defaultAcademicSettings, type AcademicSettings } from '@/lib/academic-settings';
import {
  DataTable,
  DataTableCard,
  DataTableEmpty,
  DataTableHead,
  DataTableTh,
  PageLoading,
  StatusBadge,
} from '@/components/list-ui';

function computeGrnValue(grn: GoodsReceiving): number {
  const poItems = grn.purchaseOrder?.items ?? [];
  return (grn.items ?? []).reduce((sum, item) => {
    const poItem = poItems.find((p) => p.id === item.poItemId);
    const price = poItem ? Number(poItem.unitPrice) : 0;
    return sum + Number(item.acceptedQty) * price;
  }, 0);
}

function computeGrnTotals(grn: GoodsReceiving) {
  const items = grn.items ?? [];
  const ordered = items.reduce((n, i) => n + Number(i.orderedQty), 0);
  const received = items.reduce((n, i) => n + Number(i.receivedQty), 0);
  return { itemCount: items.length, ordered, received };
}

function exportGrnCsv(rows: GoodsReceiving[]) {
  const header = ['GRN', 'PO', 'Supplier', 'Items', 'Ordered', 'Received', 'Value', 'Status', 'Date', 'Received By'];
  const lines = rows.map((r) => {
    const totals = computeGrnTotals(r);
    return [
      r.grnNumber,
      r.purchaseOrder?.poNumber ?? r.poId,
      r.purchaseOrder?.supplier?.companyName ?? '',
      totals.itemCount,
      totals.ordered,
      totals.received,
      computeGrnValue(r),
      r.status,
      new Date(r.receivedDate).toLocaleDateString(),
      r.receivedByName ?? '',
    ].join(',');
  });
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'goods-received.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function GoodsReceivingsPage() {
  const [receivings, setReceivings] = useState<GoodsReceiving[]>([]);
  const [summary, setSummary] = useState<GrnSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academic, setAcademic] = useState<AcademicSettings>(defaultAcademicSettings());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<GoodsReceiving | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivePoId, setReceivePoId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [draftFilters, setDraftFilters] = useState({
    academicYear: '',
    term: '',
    dateFrom: '',
    dateTo: '',
    supplierId: '',
    poId: '',
    departmentId: '',
    status: '',
    receivedBy: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (appliedFilters.academicYear) params.academicYear = appliedFilters.academicYear;
      if (appliedFilters.term) params.term = appliedFilters.term;
      if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom;
      if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo;
      if (appliedFilters.supplierId) params.supplierId = appliedFilters.supplierId;
      if (appliedFilters.poId) params.poId = appliedFilters.poId;
      if (appliedFilters.departmentId) params.departmentId = appliedFilters.departmentId;
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.receivedBy) params.receivedBy = appliedFilters.receivedBy;

      const [list, sum, sup, pos, deps, acad] = await Promise.all([
        procurementApi.goodsReceivings.list(params),
        procurementApi.goodsReceivings.summary(),
        procurementApi.suppliers.list(),
        procurementApi.purchaseOrders.list(),
        procurementApi.departments.list(),
        procurementApi.settings.getAcademic().catch(() => defaultAcademicSettings()),
      ]);
      setReceivings(list);
      setSummary(sum);
      setSuppliers(sup);
      setOrders(pos);
      setDepartments(deps);
      setAcademic(acad);
    } catch {
      toast.error('Failed to load goods received records');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  const receivedByOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of receivings) {
      if (r.receivedBy) map.set(r.receivedBy, r.receivedByName ?? r.receivedBy);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [receivings]);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'ALL') return receivings;
    if (activeTab === 'PENDING_INSPECTION') {
      return receivings.filter((r) => ['PENDING_INSPECTION', 'DRAFT'].includes(r.status));
    }
    if (activeTab === 'FULLY_RECEIVED') {
      return receivings.filter((r) => ['FULLY_RECEIVED', 'ACCEPTED', 'COMPLETED'].includes(r.status));
    }
    return receivings.filter((r) => r.status === activeTab);
  }, [receivings, activeTab]);

  const viewDetail = async (grn: GoodsReceiving) => {
    try {
      const detail = await procurementApi.goodsReceivings.getById(grn.id);
      setSelected(detail);
      setDetailOpen(true);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const handlePdf = async (grn: GoodsReceiving, mode: 'download' | 'print') => {
    setPdfLoading(true);
    try {
      const [detail, profile, receiptSettings] = await Promise.all([
        procurementApi.goodsReceivings.getById(grn.id),
        procurementApi.settings.getOrgProfile(),
        procurementApi.settings.getReceipt(),
      ]);
      const ctx = {
        schoolName: profile?.schoolName ?? 'School',
        logoUrl: profile?.logoUrl,
        stampUrl: profile?.stampUrl,
        receiptSettings,
      };
      if (mode === 'download') await downloadGrnPdf(detail, ctx);
      else await printGrnPdf(detail, ctx);
    } catch {
      toast.error('Failed to generate GRN PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const openReceive = (poId?: string) => {
    setReceivePoId(poId ?? null);
    setReceiveOpen(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading goods received records…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Record and verify what the school received from suppliers."
        actions={
          <button type="button" className="btn-primary" onClick={() => openReceive()}>
            <Plus className="h-4 w-4" /> Receive Goods
          </button>
        }
        kpis={[
          {
            label: 'Total Receipts',
            value: summary?.totalReceipts ?? receivings.length,
            icon: <ClipboardList size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Received Today',
            value: summary?.receivedToday ?? 0,
            icon: <Truck size={20} strokeWidth={1.75} />,
            valueClassName: 'text-sky-600',
          },
          {
            label: 'Pending Inspection',
            value: summary?.pendingInspection ?? 0,
            icon: <Clock size={20} strokeWidth={1.75} />,
            valueClassName: 'text-amber-600',
          },
          {
            label: 'Partially Received',
            value: summary?.partiallyReceived ?? 0,
            icon: <Package size={20} strokeWidth={1.75} />,
            valueClassName: 'text-orange-600',
          },
          {
            label: 'Fully Received',
            value: summary?.fullyReceived ?? 0,
            icon: <CheckCircle size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Rejected Items',
            value: summary?.rejectedItems ?? 0,
            icon: <XCircle size={20} strokeWidth={1.75} />,
            valueClassName: 'text-red-600',
          },
          {
            label: 'Total Received Value',
            value: formatFrwCompact(summary?.totalReceivedValue ?? 0),
            icon: <DollarSign size={20} strokeWidth={1.75} />,
          },
        ]}
      >
        <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Filters</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Academic Year</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.academicYear}
                onChange={(e) => setDraftFilters((f) => ({ ...f, academicYear: e.target.value }))}
              >
                <option value="">All years</option>
                {academic.academicYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Term</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.term}
                onChange={(e) => setDraftFilters((f) => ({ ...f, term: e.target.value }))}
              >
                <option value="">All terms</option>
                {academic.terms.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Date From</span>
              <input
                type="date"
                className="input !py-2 text-sm"
                value={draftFilters.dateFrom}
                onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Date To</span>
              <input
                type="date"
                className="input !py-2 text-sm"
                value={draftFilters.dateTo}
                onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Supplier</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.supplierId}
                onChange={(e) => setDraftFilters((f) => ({ ...f, supplierId: e.target.value }))}
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Purchase Order</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.poId}
                onChange={(e) => setDraftFilters((f) => ({ ...f, poId: e.target.value }))}
              >
                <option value="">All POs</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.poNumber}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Department</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.departmentId}
                onChange={(e) => setDraftFilters((f) => ({ ...f, departmentId: e.target.value }))}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Status</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.status}
                onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All status</option>
                {GRN_STATUSES.map((s) => (
                  <option key={s} value={s}>{GRN_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block min-w-[180px]">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Received By</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.receivedBy}
                onChange={(e) => setDraftFilters((f) => ({ ...f, receivedBy: e.target.value }))}
              >
                <option value="">All receivers</option>
                {receivedByOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary !rounded-xl"
              onClick={() => { setLoading(true); setAppliedFilters({ ...draftFilters }); }}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-ghost !rounded-xl"
              onClick={() => {
                const empty = {
                  academicYear: '', term: '', dateFrom: '', dateTo: '',
                  supplierId: '', poId: '', departmentId: '', status: '', receivedBy: '',
                };
                setDraftFilters(empty);
                setAppliedFilters(empty);
                setLoading(true);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn-ghost !rounded-xl inline-flex items-center gap-1"
              onClick={() => exportGrnCsv(tabFiltered)}
            >
              <FileDown className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {GRN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-navy text-white'
                  : 'bg-white text-navy/70 ring-1 ring-border hover:bg-[#f8fafc]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DataTableCard>
          <DataTable minWidth="1100px">
            <DataTableHead>
              <DataTableTh>GRN</DataTableTh>
              <DataTableTh>PO</DataTableTh>
              <DataTableTh>Supplier</DataTableTh>
              <DataTableTh className="text-center">Items</DataTableTh>
              <DataTableTh className="text-right">Ordered</DataTableTh>
              <DataTableTh className="text-right">Received</DataTableTh>
              <DataTableTh className="text-right">Value</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh>Date</DataTableTh>
              <DataTableTh className="text-center">Actions</DataTableTh>
            </DataTableHead>
            <tbody>
              {tabFiltered.map((r) => {
                const totals = computeGrnTotals(r);
                const value = computeGrnValue(r);
                return (
                  <tr key={r.id} className="border-b border-border/70 transition hover:bg-[#f8fafc]">
                    <td className="px-4 py-3 font-semibold text-navy">{r.grnNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {r.purchaseOrder?.poNumber ?? r.poId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{r.purchaseOrder?.supplier?.companyName ?? '—'}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{totals.itemCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.ordered}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.received}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatFrwCompact(value)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone={grnStatusTone(r.status)}>
                        {GRN_STATUS_LABELS[r.status] ?? r.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(r.receivedDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => viewDetail(r)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openReceive(r.poId)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-[#b87a00] hover:bg-[#fcb038]/10"
                        >
                          Receive
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuOpenId(menuOpenId === r.id ? null : r.id)}
                            className="rounded-lg p-1.5 hover:bg-navy/[0.04]"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuOpenId === r.id ? (
                            <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                disabled={pdfLoading}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#f8fafc]"
                                onClick={() => { setMenuOpenId(null); void handlePdf(r, 'print'); }}
                              >
                                <Printer className="h-3.5 w-3.5" /> Print GRN
                              </button>
                              <button
                                type="button"
                                disabled={pdfLoading}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#f8fafc]"
                                onClick={() => { setMenuOpenId(null); void handlePdf(r, 'download'); }}
                              >
                                <FileDown className="h-3.5 w-3.5" /> Download PDF
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tabFiltered.length === 0 ? (
                <DataTableEmpty colSpan={10} message="No goods receiving records yet" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PlatformPageLayout>

      <ReceiveGoodsDrawer
        open={receiveOpen}
        initialPoId={receivePoId}
        onClose={() => { setReceiveOpen(false); setReceivePoId(null); }}
        onSuccess={() => { setLoading(true); void load(); }}
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.grnNumber} — Goods Received</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-muted">PO:</span>{' '}
                  <span className="font-semibold">{selected.purchaseOrder?.poNumber ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted">Supplier:</span>{' '}
                  <span className="font-semibold">
                    {selected.purchaseOrder?.supplier?.companyName ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Received By:</span>{' '}
                  <span>{selected.receivedByName ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted">Date:</span>{' '}
                  <span>{new Date(selected.receivedDate).toLocaleString()}</span>
                </div>
              </div>
              {selected.inspectionNotes ? (
                <div className="rounded-xl bg-[#f8fafc] p-3">
                  <p className="text-xs font-bold uppercase text-muted">Inspection Notes</p>
                  <p className="mt-1">{selected.inspectionNotes}</p>
                </div>
              ) : null}
              {selected.items && selected.items.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-navy text-left text-[11px] font-bold uppercase text-[#fcb038]">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Ordered</th>
                        <th className="px-3 py-2 text-right">Received</th>
                        <th className="px-3 py-2 text-right">Accepted</th>
                        <th className="px-3 py-2">Condition</th>
                        <th className="px-3 py-2">Storage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item) => (
                        <tr key={item.id} className="border-t border-border/70">
                          <td className="px-3 py-2 font-medium">{item.itemName}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(item.orderedQty)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(item.receivedQty)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(item.acceptedQty)}</td>
                          <td className="px-3 py-2">{item.condition ?? '—'}</td>
                          <td className="px-3 py-2">{item.warehouseLocation ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1 text-xs"
                  onClick={() => void handlePdf(selected, 'download')}
                >
                  <FileDown className="h-4 w-4" /> Download PDF
                </button>
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1 text-xs"
                  onClick={() => void handlePdf(selected, 'print')}
                >
                  <Printer className="h-4 w-4" /> Print GRN
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
