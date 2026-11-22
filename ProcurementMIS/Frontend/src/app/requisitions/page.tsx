'use client';

import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import { useAuth } from '@/contexts/auth-context';
import type { PurchaseRequest } from '@/types';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  ShoppingBag,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SetOrdersDrawer } from '@/components/set-orders-drawer';
import { PlatformPageLayout } from '@/components/platform-page-layout';
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
  EMPTY_REPORT_FILTERS,
  ReportFilterDrawer,
  countActiveReportFilters,
  reportFilterParams,
  reportPeriodMeta,
  reportPeriodLabel,
  type ReportFilterValues,
} from '@/components/report-filter-drawer';
import { downloadProcurementReport } from '@/modules/documents/report-pdf';
import { downloadRequisitionPdf } from '@/modules/documents/requisition-pdf';
import { defaultAcademicSettings, type AcademicSettings } from '@/lib/academic-settings';
import { formatFrw, formatFrwCompact } from '@/utils/currency';
import { formatPersonName } from '@/utils/person-name';
import {
  getRequisitionOrder,
  hasRequisitionPricing,
  requisitionLines,
  requisitionTotal,
} from '@/lib/requisition';
import { canShowSetOrder } from '@/utils/permissions';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  DEPARTMENT_HEAD_APPROVED: 'Dept. Head Approved',
  FINANCE_APPROVED: 'Finance Approved',
  PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Fully Approved',
  REJECTED: 'Rejected',
  CONVERTED_TO_PO: 'Converted to PO',
  CANCELLED: 'Cancelled',
};

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

function statusTone(status: string): BadgeTone {
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  if (status === 'CONVERTED_TO_PO' || status.includes('APPROVED')) return 'success';
  if (status === 'PENDING') return 'warning';
  return 'neutral';
}

function displayDepartment(pr: PurchaseRequest): string {
  return pr.departmentOther?.trim() || pr.department?.name || '—';
}

function RequisitionItemsPanel({ pr }: { pr: PurchaseRequest }) {
  const order = getRequisitionOrder(pr);
  const lines = requisitionLines(pr);
  const priced = hasRequisitionPricing(pr);
  const total = requisitionTotal(pr);

  return (
    <tr className="bg-slate-50/60">
      <td colSpan={9} className="px-4 pb-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="font-bold uppercase tracking-[0.08em] text-navy">
                Requisition items
              </span>
              <span className="text-slate-300">|</span>
              <span>{pr.items?.length ?? 0} item(s)</span>
              <span className="text-slate-300">|</span>
              {order ? (
                <>
                  <span>
                    Order <span className="font-semibold text-navy">{order.poNumber}</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>{order.supplier?.companyName ?? 'Supplier'}</span>
                </>
              ) : (
                <span className="font-semibold text-amber-600">Pricing not set</span>
              )}
            </div>
            <span className="text-xs font-bold tabular-nums text-navy">
              {priced ? formatFrw(total) : '—'}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5 text-left">Item</th>
                <th className="px-4 py-2.5 text-center">Unit</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Unit Price</th>
                <th className="px-4 py-2.5 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{line.item.itemName}</p>
                    {line.item.description ? (
                      <p className="mt-0.5 text-xs text-slate-500">{line.item.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{line.item.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {Number(line.item.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-navy">
                    {line.hasPrice ? formatFrw(line.unitPrice ?? 0) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">
                    {line.hasPrice ? formatFrw(line.totalPrice ?? 0) : '—'}
                  </td>
                </tr>
              ))}
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                    No items on this requisition.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="bg-[#fcb038]/10">
                <td
                  colSpan={4}
                  className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-navy"
                >
                  Requisition total
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-extrabold tabular-nums text-navy">
                  {priced ? formatFrw(total) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
  );
}

export default function RequisitionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const { user, isSupervisor } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings>(
    defaultAcademicSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [poDrawerOpen, setPoDrawerOpen] = useState(false);
  const [poSourcePR, setPoSourcePR] = useState<PurchaseRequest | null>(null);
  const [reportFilters, setReportFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { ...reportFilterParams(reportFilters) };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const data = await procurementApi.purchaseRequests.list(params);
      setRequests(data);
    } catch {
      // Keep the current list when a refresh fails.
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search, reportFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void procurementApi.settings
      .getAcademic()
      .then(setAcademicSettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!openId) return;
    let active = true;
    (async () => {
      try {
        const detail = await procurementApi.purchaseRequests.getById(openId);
        if (!active) return;
        setSelectedPR(detail);
        setDetailOpen(true);
        setExpanded((prev) => new Set(prev).add(openId));
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    let active = true;
    (async () => {
      try {
        const detail = await procurementApi.purchaseRequests.getById(openId);
        if (!active) return;
        setSelectedPR(detail);
        setDetailOpen(true);
        setExpanded((prev) => new Set(prev).add(openId));
      } catch {
        // ignore if requisition not found/accessible
      }
    })();
    return () => { active = false; };
  }, [openId]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const viewDetail = async (pr: PurchaseRequest) => {
    try {
      const detail = await procurementApi.purchaseRequests.getById(pr.id);
      setSelectedPR(detail);
      setDetailOpen(true);
    } catch {
      toast.error('Failed to load requisition details');
    }
  };

  const handleDownloadPdf = async (pr: PurchaseRequest) => {
    setPdfLoadingId(pr.id);
    try {
      const [profile, receiptSettings, detail] = await Promise.all([
        procurementApi.settings.getOrgProfile(),
        procurementApi.settings.getReceipt(),
        procurementApi.purchaseRequests.getById(pr.id),
      ]);
      await downloadRequisitionPdf(detail, {
        schoolName: profile?.schoolName ?? 'School',
        logoUrl: profile?.logoUrl,
        province: profile?.province,
        district: profile?.district,
        sector: profile?.sector,
        website: profile?.website,
        stampUrl: profile?.stampUrl,
        receiptSettings,
      });
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleDownloadReport = async (values: ReportFilterValues) => {
    setReportLoading(true);
    try {
      const params: Record<string, string> = { ...reportFilterParams(values) };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [profile, rows] = await Promise.all([
        procurementApi.settings.getOrgProfile(),
        procurementApi.purchaseRequests.list(params),
      ]);

      const meta = [...reportPeriodMeta(values)];
      if (statusFilter !== 'ALL') {
        meta.push({ label: 'Status', value: STATUS_LABELS[statusFilter] ?? statusFilter });
      }
      if (priorityFilter) {
        meta.push({ label: 'Priority', value: priorityFilter });
      }

      const priced = rows.filter(hasRequisitionPricing).length;
      const totalValue = rows.reduce((sum, row) => sum + requisitionTotal(row), 0);

      await downloadProcurementReport({
        info: {
          schoolName: profile?.schoolName ?? 'School',
          logoUrl: profile?.logoUrl,
          province: profile?.province,
          district: profile?.district,
          sector: profile?.sector,
          website: profile?.website,
        },
        title: 'REQUISITIONS REPORT',
        columns: [
          { header: 'Requisition No.', dataKey: 'prNumber' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Requested By', dataKey: 'requestedBy' },
          { header: 'Items', dataKey: 'items', align: 'right' },
          { header: 'Total', dataKey: 'total', align: 'right' },
          { header: 'Status', dataKey: 'status', align: 'center' },
        ],
        rows: rows.map((row) => ({
          prNumber: row.prNumber,
          date: new Date(row.createdAt).toLocaleDateString(),
          department: displayDepartment(row),
          requestedBy: formatPersonName(row.requestedByName) || '—',
          items: row.items?.length ?? row._count?.items ?? 0,
          total: hasRequisitionPricing(row) ? formatFrw(requisitionTotal(row)) : '—',
          status: STATUS_LABELS[row.status] ?? row.status,
        })),
        meta,
        summary: [
          { label: 'Records', value: String(rows.length) },
          { label: 'Priced', value: String(priced) },
          { label: 'Awaiting pricing', value: String(rows.length - priced) },
          { label: 'Total value', value: formatFrw(totalValue) },
        ],
        fileBase: 'requisitions-report',
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

  const openCreateOrder = (pr: PurchaseRequest) => {
    setPoSourcePR(pr);
    setPoDrawerOpen(true);
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const pricedCount = requests.filter(hasRequisitionPricing).length;
  const totalValue = requests.reduce((sum, row) => sum + requisitionTotal(row), 0);

  const pagination = useTablePagination(requests, {
    resetKey: `${search}|${statusFilter}|${priorityFilter}|${reportFilters.academicYear}|${reportFilters.term}|${reportFilters.dateFrom}|${reportFilters.dateTo}`,
  });

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading requisitions…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Itemized requisitions with the unit prices and totals captured through Set Order."
        actions={
          <button
            type="button"
            onClick={() => router.push('/purchase-requests')}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> New Request
          </button>
        }
        kpis={[
          {
            label: 'Total Requisitions',
            value: requests.length,
            icon: <ClipboardCheck size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Priced',
            value: pricedCount,
            icon: <CheckCircle size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Awaiting Pricing',
            value: requests.length - pricedCount,
            icon: <Clock size={20} strokeWidth={1.75} />,
            valueClassName: 'text-amber-600',
          },
          {
            label: 'Total Value',
            value: formatFrwCompact(totalValue),
            icon: <Wallet size={20} strokeWidth={1.75} />,
          },
        ]}
      >
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by requisition number, requester…"
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'ALL', label: 'All status' },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ],
            },
            {
              key: 'priority',
              label: 'Priority',
              value: priorityFilter,
              onChange: setPriorityFilter,
              options: [
                { value: '', label: 'All priority' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ],
            },
          ]}
          onReset={() => {
            setSearch('');
            setStatusFilter('ALL');
            setPriorityFilter('');
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
          <DataTable minWidth="1080px">
            <DataTableHead>
              <DataTableTh className="w-10">
                <span className="sr-only">Expand</span>
              </DataTableTh>
              <DataTableTh>Requisition No.</DataTableTh>
              <DataTableTh>Date</DataTableTh>
              <DataTableTh>Requested By</DataTableTh>
              <DataTableTh>Department</DataTableTh>
              <DataTableTh className="text-center">Items</DataTableTh>
              <DataTableTh className="text-right">Total</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh className="text-right">Actions</DataTableTh>
            </DataTableHead>
            <tbody>
              {pagination.rows.map((pr) => {
                const isOpen = expanded.has(pr.id);
                const priced = hasRequisitionPricing(pr);
                const total = requisitionTotal(pr);
                const canSetOrder = canShowSetOrder(pr.status, isSupervisor);

                return (
                  <Fragment key={pr.id}>
                    <DataTableRow className={isOpen ? 'bg-slate-50/70' : undefined}>
                      <DataTableTd>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(pr.id)}
                          aria-label={
                            isOpen
                              ? `Hide items for ${pr.prNumber}`
                              : `Show items for ${pr.prNumber}`
                          }
                          aria-expanded={isOpen}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#fcb038]/60 hover:text-navy"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </DataTableTd>
                      <DataTableTd className="font-semibold text-navy">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(pr.id)}
                          className="text-left transition hover:text-navy/70"
                        >
                          {pr.prNumber}
                        </button>
                      </DataTableTd>
                      <DataTableTd className="text-muted">
                        {new Date(pr.createdAt).toLocaleDateString()}
                      </DataTableTd>
                      <DataTableTd>{formatPersonName(pr.requestedByName) || '—'}</DataTableTd>
                      <DataTableTd className="text-muted">{displayDepartment(pr)}</DataTableTd>
                      <DataTableTd className="text-center tabular-nums text-muted">
                        {pr.items?.length ?? pr._count?.items ?? 0}
                      </DataTableTd>
                      <DataTableTd className="text-right font-semibold tabular-nums text-navy">
                        {priced ? formatFrw(total) : '—'}
                      </DataTableTd>
                      <DataTableTd className="text-center">
                        <StatusBadge tone={statusTone(pr.status)}>
                          {STATUS_LABELS[pr.status] || pr.status}
                        </StatusBadge>
                      </DataTableTd>
                      <DataTableTd>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void viewDetail(pr)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm transition hover:border-[#fcb038]/50 hover:bg-[#fcb038]/5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>

                          {canSetOrder ? (
                            <button
                              type="button"
                              onClick={() => openCreateOrder(pr)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-[#fcb038] shadow-sm transition hover:bg-navy/90"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              Set Order
                            </button>
                          ) : null}

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-navy shadow-sm transition hover:border-[#fcb038]/50 hover:bg-slate-50"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[176px]">
                              <DropdownMenuItem
                                onClick={() => void handleDownloadPdf(pr)}
                                disabled={pdfLoadingId === pr.id}
                              >
                                <Download className="h-4 w-4" />
                                {pdfLoadingId === pr.id ? 'Generating PDF…' : 'Download PDF'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => router.push('/purchase-requests')}
                              >
                                <ClipboardCheck className="h-4 w-4" />
                                Open Purchase Requests
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DataTableTd>
                    </DataTableRow>
                    {isOpen ? <RequisitionItemsPanel pr={pr} /> : null}
                  </Fragment>
                );
              })}
              {requests.length === 0 ? (
                <DataTableEmpty colSpan={9} message="No requisitions found" />
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

      <SetOrdersDrawer
        open={poDrawerOpen}
        purchaseRequest={poSourcePR}
        onClose={() => {
          setPoDrawerOpen(false);
          setPoSourcePR(null);
        }}
        onCreated={() => {
          void load();
        }}
      />

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="!w-[min(1040px,96vw)] !max-w-[1040px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
        >
          <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-6 py-5 text-white sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                  <ClipboardCheck className="h-3 w-3" />
                  Requisition
                </div>
                <SheetTitle className="truncate text-2xl font-bold text-white">
                  {selectedPR?.prNumber ?? 'Requisition'}
                </SheetTitle>
                <SheetDescription className="mt-1 text-white/65">
                  {selectedPR
                    ? `${selectedPR.items?.length ?? 0} item(s) · Requested ${new Date(
                        selectedPR.createdAt,
                      ).toLocaleDateString()}`
                    : 'Requisition details'}
                </SheetDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedPR ? (
                  <StatusBadge tone={statusTone(selectedPR.status)}>
                    {STATUS_LABELS[selectedPR.status] ?? selectedPR.status}
                  </StatusBadge>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-6 py-6 sm:px-8">
            {selectedPR ? <RequisitionDetail pr={selectedPR} /> : null}
          </div>

          <SheetFooter className="shrink-0 flex-row justify-end gap-3 border-t border-border bg-white px-6 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="min-w-[110px] rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => (selectedPR ? void handleDownloadPdf(selectedPR) : undefined)}
              disabled={!selectedPR || pdfLoadingId === selectedPR.id}
              className="btn-primary inline-flex min-w-[160px] items-center justify-center gap-2 px-5 py-2.5 disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              {selectedPR && pdfLoadingId === selectedPR.id ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter requisitions"
        description="Narrow requisitions by academic period or date, then download a branded PDF report."
        academicSettings={academicSettings}
        value={reportFilters}
        onApply={setReportFilters}
        onDownload={handleDownloadReport}
        downloading={reportLoading}
      />
    </MainLayout>
  );
}

function RequisitionDetail({ pr }: { pr: PurchaseRequest }) {
  const lines = requisitionLines(pr);
  const order = getRequisitionOrder(pr);
  const total = requisitionTotal(pr);
  const priced = hasRequisitionPricing(pr);
  const itemCount = pr.items?.length ?? 0;

  return (
    <div className="space-y-6">
      <section>
        <SectionHeading
          title="Overview"
          description="Requester, department and delivery details for this requisition."
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailStat label="Requested By" value={formatPersonName(pr.requestedByName) || '—'} />
          <DetailStat label="Department" value={displayDepartment(pr)} />
          <DetailStat label="Needed By" value={pr.neededDate ? new Date(pr.neededDate).toLocaleDateString() : '—'} />
          <DetailStat label="Request Type" value={pr.requestType} />
          <DetailStat label="Academic Year" value={pr.academicYear ?? '—'} />
          <DetailStat label="Term" value={pr.term ?? '—'} />
          <DetailStat label="Purchase Order" value={order?.poNumber ?? 'Not set'} />
          <DetailStat label="Supplier" value={order?.supplier?.companyName ?? '—'} />
        </div>
      </section>

      {pr.purpose ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Purpose</p>
          <p className="mt-2 text-sm leading-relaxed text-navy">{pr.purpose}</p>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            title="Items & pricing"
            description={`${itemCount} line item(s)${order ? ` · ${order.poNumber}` : ''}`}
          />
          <div className="rounded-2xl border border-[#fcb038]/30 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Requisition total
            </p>
            <p className="mt-0.5 text-xl font-extrabold tabular-nums text-navy">
              {priced ? formatFrw(total) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-center">Unit</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{line.item.itemName}</p>
                    {line.item.description ? (
                      <p className="mt-0.5 text-xs text-slate-500">{line.item.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{line.item.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {Number(line.item.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-navy">
                    {line.hasPrice ? formatFrw(line.unitPrice ?? 0) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy">
                    {line.hasPrice ? formatFrw(line.totalPrice ?? 0) : '—'}
                  </td>
                </tr>
              ))}
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                    No items on this requisition.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="bg-[#fcb038]/10">
                <td
                  colSpan={4}
                  className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-navy"
                >
                  Requisition total
                </td>
                <td className="px-4 py-3 text-right text-sm font-extrabold tabular-nums text-navy">
                  {priced ? formatFrw(total) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!priced ? (
          <p className="mt-2 text-xs text-slate-500">
            Pricing has not been set. Use Set Order to capture unit prices for each item.
          </p>
        ) : null}
      </section>

      {pr.approvals && pr.approvals.length > 0 ? (
        <section>
          <SectionHeading title="Approval history" description="Decisions recorded on this requisition." />
          <div className="mt-3 space-y-2">
            {pr.approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`rounded-full p-1.5 ${
                    approval.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {approval.status === 'APPROVED' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{approval.stage}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        approval.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {approval.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {approval.approverName || approval.approverId}
                  </p>
                  {approval.comment ? (
                    <p className="mt-1 text-sm text-navy">{approval.comment}</p>
                  ) : null}
                  {approval.approvedAt ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(approval.approvedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-navy">{title}</h3>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

function DetailStat({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-navy">
        {children ?? value}
      </div>
    </div>
  );
}
