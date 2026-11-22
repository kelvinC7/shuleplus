'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import { useAuth } from '@/contexts/auth-context';
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
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoodsReceivingDetailDrawer } from '@/components/goods-receiving-detail-drawer';
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

const EXTRA_FILTER_KEYS = ['supplierId', 'poId', 'departmentId', 'status', 'receivedBy'] as const;

type GrnExtraFilters = Record<(typeof EXTRA_FILTER_KEYS)[number], string>;

const EMPTY_EXTRA_FILTERS: GrnExtraFilters = {
  supplierId: '',
  poId: '',
  departmentId: '',
  status: '',
  receivedBy: '',
};

export default function GoodsReceivingsPage() {
  const { user } = useAuth();
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
  const [search, setSearch] = useState('');
  const [reportFilters, setReportFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [extraFilters, setExtraFilters] = useState<GrnExtraFilters>(EMPTY_EXTRA_FILTERS);
  const [extraDraft, setExtraDraft] = useState<GrnExtraFilters>(EMPTY_EXTRA_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { ...reportFilterParams(reportFilters) };
      for (const key of EXTRA_FILTER_KEYS) {
        if (extraFilters[key]) params[key] = extraFilters[key];
      }

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
  }, [reportFilters, extraFilters]);

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

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tabFiltered;
    return tabFiltered.filter((row) =>
      [
        row.grnNumber,
        row.purchaseOrder?.poNumber,
        row.purchaseOrder?.supplier?.companyName,
        row.receivedByName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [tabFiltered, search]);

  const pagination = useTablePagination(visible, {
    resetKey: `${activeTab}|${search}|${reportFilters.academicYear}|${reportFilters.term}|${reportFilters.dateFrom}|${reportFilters.dateTo}|${extraFilters.supplierId ?? ''}|${extraFilters.poId ?? ''}|${extraFilters.departmentId ?? ''}|${extraFilters.status ?? ''}|${extraFilters.receivedBy ?? ''}`,
  });

  const lookups = useMemo(
    () => ({
      supplierName: (id: string) => suppliers.find((s) => s.id === id)?.companyName ?? '',
      poNumber: (id: string) => orders.find((o) => o.id === id)?.poNumber ?? '',
      departmentName: (id: string) => departments.find((d) => d.id === id)?.name ?? '',
      receiverName: (id: string) =>
        receivings.find((r) => r.receivedBy === id)?.receivedByName ?? '',
    }),
    [suppliers, orders, departments, receivings],
  );

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
        province: profile?.province,
        district: profile?.district,
        sector: profile?.sector,
        website: profile?.website,
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

  const handleDownloadReport = async (values: ReportFilterValues) => {
    setReportLoading(true);
    try {
      const params: Record<string, string> = { ...reportFilterParams(values) };
      for (const key of EXTRA_FILTER_KEYS) {
        if (extraDraft[key]) params[key] = extraDraft[key];
      }

      const [profile, rows] = await Promise.all([
        procurementApi.settings.getOrgProfile(),
        procurementApi.goodsReceivings.list(params),
      ]);

      const meta = [...reportPeriodMeta(values)];
      if (extraDraft.supplierId) {
        meta.push({ label: 'Supplier', value: lookups.supplierName(extraDraft.supplierId) });
      }
      if (extraDraft.poId) {
        meta.push({ label: 'Purchase order', value: lookups.poNumber(extraDraft.poId) });
      }
      if (extraDraft.departmentId) {
        meta.push({ label: 'Department', value: lookups.departmentName(extraDraft.departmentId) });
      }
      if (extraDraft.status) {
        meta.push({
          label: 'Status',
          value: GRN_STATUS_LABELS[extraDraft.status] ?? extraDraft.status,
        });
      }
      if (extraDraft.receivedBy) {
        meta.push({ label: 'Received by', value: lookups.receiverName(extraDraft.receivedBy) });
      }

      const totalValue = rows.reduce((sum, row) => sum + computeGrnValue(row), 0);
      const fullyReceived = rows.filter((row) =>
        ['FULLY_RECEIVED', 'COMPLETED', 'ACCEPTED'].includes(row.status),
      ).length;

      await downloadProcurementReport({
        info: {
          schoolName: profile?.schoolName ?? 'School',
          logoUrl: profile?.logoUrl,
          province: profile?.province,
          district: profile?.district,
          sector: profile?.sector,
          website: profile?.website,
        },
        title: 'GOODS RECEIVED REPORT',
        columns: [
          { header: 'GRN', dataKey: 'grnNumber' },
          { header: 'PO', dataKey: 'poNumber' },
          { header: 'Supplier', dataKey: 'supplier' },
          { header: 'Items', dataKey: 'items', align: 'right' },
          { header: 'Ordered', dataKey: 'ordered', align: 'right' },
          { header: 'Received', dataKey: 'received', align: 'right' },
          { header: 'Value (Frw)', dataKey: 'value', align: 'right' },
          { header: 'Status', dataKey: 'status', align: 'center' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Received By', dataKey: 'receivedBy' },
        ],
        rows: rows.map((row) => {
          const totals = computeGrnTotals(row);
          return {
            grnNumber: row.grnNumber,
            poNumber: row.purchaseOrder?.poNumber ?? row.poId,
            supplier: row.purchaseOrder?.supplier?.companyName ?? '—',
            items: totals.itemCount,
            ordered: totals.ordered,
            received: totals.received,
            value: computeGrnValue(row).toLocaleString(),
            status: GRN_STATUS_LABELS[row.status] ?? row.status.replace(/_/g, ' '),
            date: new Date(row.receivedDate).toLocaleDateString(),
            receivedBy: row.receivedByName ?? '—',
          };
        }),
        meta,
        summary: [
          { label: 'Records', value: String(rows.length) },
          { label: 'Total value', value: `${totalValue.toLocaleString()} Frw` },
          { label: 'Fully received', value: String(fullyReceived) },
        ],
        fileBase: 'goods-received-report',
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
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by GRN, PO, supplier or receiver…"
          onReset={() => {
            setSearch('');
            setReportFilters(EMPTY_REPORT_FILTERS);
            setExtraFilters(EMPTY_EXTRA_FILTERS);
            setExtraDraft(EMPTY_EXTRA_FILTERS);
          }}
          actions={
            <button
              type="button"
              onClick={() => {
                setExtraDraft(extraFilters);
                setFilterOpen(true);
              }}
              className="btn-ghost !rounded-xl inline-flex items-center gap-2 ring-1 ring-slate-200"
            >
              <Filter className="h-4 w-4" /> Filter
              {countActiveReportFilters(reportFilters) +
                EXTRA_FILTER_KEYS.filter((key) => extraFilters[key]).length >
              0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fcb038] px-1.5 text-[10px] font-extrabold text-navy">
                  {countActiveReportFilters(reportFilters) +
                    EXTRA_FILTER_KEYS.filter((key) => extraFilters[key]).length}
                </span>
              ) : null}
            </button>
          }
        />

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
              {pagination.rows.map((r) => {
                const totals = computeGrnTotals(r);
                const value = computeGrnValue(r);
                return (
                  <DataTableRow key={r.id}>
                    <DataTableTd className="font-semibold text-navy">{r.grnNumber}</DataTableTd>
                    <DataTableTd className="font-mono text-xs text-muted">
                      {r.purchaseOrder?.poNumber ?? r.poId.slice(0, 8)}
                    </DataTableTd>
                    <DataTableTd>{r.purchaseOrder?.supplier?.companyName ?? '—'}</DataTableTd>
                    <DataTableTd className="text-center tabular-nums">{totals.itemCount}</DataTableTd>
                    <DataTableTd className="text-right tabular-nums">{totals.ordered}</DataTableTd>
                    <DataTableTd className="text-right tabular-nums">{totals.received}</DataTableTd>
                    <DataTableTd className="text-right tabular-nums font-semibold">
                      {formatFrwCompact(value)}
                    </DataTableTd>
                    <DataTableTd className="text-center">
                      <StatusBadge tone={grnStatusTone(r.status)}>
                        {GRN_STATUS_LABELS[r.status] ?? r.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </DataTableTd>
                    <DataTableTd className="text-muted">
                      {new Date(r.receivedDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </DataTableTd>
                    <DataTableTd>
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
                    </DataTableTd>
                  </DataTableRow>
                );
              })}
              {visible.length === 0 ? (
                <DataTableEmpty colSpan={10} message="No goods receiving records yet" />
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

      <ReceiveGoodsDrawer
        open={receiveOpen}
        initialPoId={receivePoId}
        onClose={() => { setReceiveOpen(false); setReceivePoId(null); }}
        onSuccess={() => { setLoading(true); void load(); }}
      />

      <GoodsReceivingDetailDrawer
        open={detailOpen}
        grn={selected}
        pdfLoading={pdfLoading}
        onClose={() => setDetailOpen(false)}
        onDownloadPdf={(grn) => { void handlePdf(grn, 'download'); }}
        onPrint={(grn) => { void handlePdf(grn, 'print'); }}
      />

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter goods received"
        description="Narrow receipts by academic period, date, supplier or status, then download a branded PDF report."
        academicSettings={academic}
        value={reportFilters}
        onApply={(values) => {
          setReportFilters(values);
          setExtraFilters(extraDraft);
        }}
        onReset={() => setExtraDraft(EMPTY_EXTRA_FILTERS)}
        onDownload={handleDownloadReport}
        downloading={reportLoading}
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Supplier
          </span>
          <select
            className="input !rounded-xl !py-2.5 text-sm"
            value={extraDraft.supplierId}
            onChange={(event) => setExtraDraft((f) => ({ ...f, supplierId: event.target.value }))}
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.companyName}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Purchase order
          </span>
          <select
            className="input !rounded-xl !py-2.5 text-sm"
            value={extraDraft.poId}
            onChange={(event) => setExtraDraft((f) => ({ ...f, poId: event.target.value }))}
          >
            <option value="">All purchase orders</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.poNumber}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Department
          </span>
          <select
            className="input !rounded-xl !py-2.5 text-sm"
            value={extraDraft.departmentId}
            onChange={(event) => setExtraDraft((f) => ({ ...f, departmentId: event.target.value }))}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            className="input !rounded-xl !py-2.5 text-sm"
            value={extraDraft.status}
            onChange={(event) => setExtraDraft((f) => ({ ...f, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            {GRN_STATUSES.map((s) => (
              <option key={s} value={s}>{GRN_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Received by
          </span>
          <select
            className="input !rounded-xl !py-2.5 text-sm"
            value={extraDraft.receivedBy}
            onChange={(event) => setExtraDraft((f) => ({ ...f, receivedBy: event.target.value }))}
          >
            <option value="">All receivers</option>
            {receivedByOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </ReportFilterDrawer>
    </MainLayout>
  );
}
