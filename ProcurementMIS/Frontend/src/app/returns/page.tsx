'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type {
  GoodsReturn,
  ReturnSummary,
  Department,
  Supplier,
} from '@/types';
import {
  RotateCcw,
  Plus,
  Clock,
  CheckCircle,
  Package,
  DollarSign,
  Truck,
  FileText,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { CreateReturnDrawer } from '@/components/create-return-drawer';
import { formatFrwCompact } from '@/utils/currency';
import {
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
  RETURN_STATUSES,
  RETURN_TABS,
  returnStatusTone,
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
  EntityCard,
} from '@/components/list-ui';

function tabMatchesStatus(tab: string, status: string): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'PENDING') return ['PENDING_APPROVAL', 'DRAFT'].includes(status);
  if (tab === 'REPLACEMENT') return ['REPLACEMENT_PENDING', 'REPLACED'].includes(status);
  if (tab === 'CREDIT') return status === 'CREDIT_RECEIVED';
  return status === tab;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<GoodsReturn[]>([]);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academic, setAcademic] = useState<AcademicSettings>(defaultAcademicSettings());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [returnOpen, setReturnOpen] = useState(false);
  const [initialGrnId, setInitialGrnId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<GoodsReturn | null>(null);

  const [draftFilters, setDraftFilters] = useState({
    academicYear: '',
    term: '',
    dateFrom: '',
    dateTo: '',
    supplierId: '',
    reason: '',
    status: '',
    departmentId: '',
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
      if (appliedFilters.reason) params.reason = appliedFilters.reason;
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.departmentId) params.departmentId = appliedFilters.departmentId;

      const [list, sum, sup, deps, acad] = await Promise.all([
        procurementApi.returns.list(params),
        procurementApi.returns.summary(),
        procurementApi.suppliers.list(),
        procurementApi.departments.list(),
        procurementApi.settings.getAcademic().catch(() => defaultAcademicSettings()),
      ]);
      setReturns(list);
      setSummary(sum);
      setSuppliers(sup);
      setDepartments(deps);
      setAcademic(acad);
    } catch {
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabFiltered = useMemo(
    () => returns.filter((r) => tabMatchesStatus(activeTab, r.status)),
    [returns, activeTab],
  );

  const viewDetail = async (ret: GoodsReturn) => {
    try {
      const detail = await procurementApi.returns.getById(ret.id);
      setSelected(detail);
      setDetailOpen(true);
    } catch {
      toast.error('Failed to load return details');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await procurementApi.returns.updateStatus(id, status);
      toast.success(`Status updated to ${RETURN_STATUS_LABELS[status] ?? status}`);
      setLoading(true);
      void load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading returns…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Track returns linked to goods received notes — replacement, credit, and refunds."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => { setInitialGrnId(null); setReturnOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Create Return
          </button>
        }
        kpis={[
          {
            label: 'Total Returns',
            value: summary?.totalReturns ?? returns.length,
            icon: <RotateCcw size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Pending Returns',
            value: summary?.pendingReturns ?? 0,
            icon: <Clock size={20} strokeWidth={1.75} />,
            valueClassName: 'text-amber-600',
          },
          {
            label: 'Approved Returns',
            value: summary?.approvedReturns ?? 0,
            icon: <CheckCircle size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Items Returned',
            value: summary?.itemsReturned ?? 0,
            icon: <Package size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Return Value',
            value: formatFrwCompact(summary?.returnValue ?? 0),
            icon: <DollarSign size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Awaiting Replacement',
            value: summary?.awaitingReplacement ?? 0,
            icon: <Truck size={20} strokeWidth={1.75} />,
            valueClassName: 'text-orange-600',
          },
          {
            label: 'Credit Notes',
            value: summary?.creditNotes ?? 0,
            icon: <FileText size={20} strokeWidth={1.75} />,
            valueClassName: 'text-sky-600',
          },
        ]}
      >
        <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Filters</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Return Reason</span>
              <select
                className="input !py-2 text-sm"
                value={draftFilters.reason}
                onChange={(e) => setDraftFilters((f) => ({ ...f, reason: e.target.value }))}
              >
                <option value="">All reasons</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
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
                {RETURN_STATUSES.map((s) => (
                  <option key={s} value={s}>{RETURN_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="block min-w-[180px]">
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
            <button
              type="button"
              className="btn-primary !rounded-xl self-end"
              onClick={() => { setLoading(true); setAppliedFilters({ ...draftFilters }); }}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-ghost !rounded-xl self-end"
              onClick={() => {
                const empty = {
                  academicYear: '', term: '', dateFrom: '', dateTo: '',
                  supplierId: '', reason: '', status: '', departmentId: '',
                };
                setDraftFilters(empty);
                setAppliedFilters(empty);
                setLoading(true);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {RETURN_TABS.map((tab) => (
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
          <DataTable minWidth="980px">
            <DataTableHead>
              <DataTableTh>Return</DataTableTh>
              <DataTableTh>GRN</DataTableTh>
              <DataTableTh>Supplier</DataTableTh>
              <DataTableTh>Items</DataTableTh>
              <DataTableTh className="text-right">Qty</DataTableTh>
              <DataTableTh className="text-right">Value</DataTableTh>
              <DataTableTh>Reason</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh className="text-center">Actions</DataTableTh>
            </DataTableHead>
            <tbody>
              {tabFiltered.map((ret) => {
                const totalQty = (ret.items ?? []).reduce((n, i) => n + Number(i.returnQty), 0);
                const itemNames = (ret.items ?? []).map((i) => i.itemName).join(', ');
                return (
                  <tr key={ret.id} className="border-b border-border/70 transition hover:bg-[#f8fafc]">
                    <td className="px-4 py-3 font-semibold text-navy">{ret.returnNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {ret.grn?.grnNumber ?? ret.grnId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      {ret.grn?.purchaseOrder?.supplier?.companyName ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate" title={itemNames}>
                      {itemNames || '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{totalQty}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatFrwCompact(ret.returnValue ?? 0)}
                    </td>
                    <td className="px-4 py-3">{ret.reason}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone={returnStatusTone(ret.status)}>
                        {RETURN_STATUS_LABELS[ret.status] ?? ret.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => viewDetail(ret)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tabFiltered.length === 0 ? (
                <DataTableEmpty colSpan={9} message="No returns recorded yet" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>

        {summary && (summary.supplierReturnRate.length > 0 || summary.returnReasons.length > 0) ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <EntityCard>
              <h3 className="mb-4 text-sm font-bold text-navy">Supplier Return Rate</h3>
              <ul className="space-y-2 text-sm">
                {summary.supplierReturnRate.map((s) => (
                  <li key={s.supplier} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted">{s.supplier}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-navy">{s.rate}%</span>
                  </li>
                ))}
              </ul>
            </EntityCard>
            <EntityCard>
              <h3 className="mb-4 text-sm font-bold text-navy">Most Returned Items</h3>
              <ul className="space-y-2 text-sm">
                {(summary.topReturnedItems ?? []).map((item) => (
                  <li key={item.itemName} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted">{item.itemName}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-navy">{item.qty}</span>
                  </li>
                ))}
                {(summary.topReturnedItems ?? []).length === 0 ? (
                  <li className="text-muted">No data yet</li>
                ) : null}
              </ul>
            </EntityCard>
            <EntityCard>
              <h3 className="mb-4 text-sm font-bold text-navy">Return Reasons</h3>
              <ul className="space-y-2 text-sm">
                {summary.returnReasons.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted">{r.reason}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-navy">{r.percentage}%</span>
                  </li>
                ))}
              </ul>
            </EntityCard>
          </div>
        ) : null}
      </PlatformPageLayout>

      <CreateReturnDrawer
        open={returnOpen}
        initialGrnId={initialGrnId}
        onClose={() => { setReturnOpen(false); setInitialGrnId(null); }}
        onSuccess={() => { setLoading(true); void load(); }}
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.returnNumber} — Return Details</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-muted">GRN:</span> {selected.grn?.grnNumber ?? '—'}</div>
                <div><span className="text-muted">Reason:</span> {selected.reason}</div>
                <div><span className="text-muted">Resolution:</span> {selected.resolution?.replace(/_/g, ' ') ?? '—'}</div>
                <div><span className="text-muted">Value:</span> {formatFrwCompact(selected.returnValue ?? 0)}</div>
              </div>
              {selected.reasonDescription ? (
                <p className="rounded-xl bg-[#f8fafc] p-3">{selected.reasonDescription}</p>
              ) : null}
              {selected.items?.length ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f8fafc] text-left text-[11px] font-bold uppercase text-muted">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item) => (
                        <tr key={item.id} className="border-t border-border/70">
                          <td className="px-3 py-2">{item.itemName}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(item.returnQty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-bold uppercase text-muted">Resolution Workflow</p>
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
                  {['Return Created', 'Approved', 'Sent to Supplier', 'Supplier Response', 'Replacement / Credit', 'Closed'].map((step, i, arr) => (
                    <span key={step} className="inline-flex items-center gap-1">
                      <span className={`rounded-full px-2 py-0.5 ${i <= 2 ? 'bg-navy/10 font-semibold text-navy' : ''}`}>
                        {step}
                      </span>
                      {i < arr.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
                    </span>
                  ))}
                </div>
              </div>

              {selected.status === 'PENDING_APPROVAL' ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() => { void updateStatus(selected.id, 'APPROVED'); setDetailOpen(false); }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-600"
                    onClick={() => { void updateStatus(selected.id, 'REJECTED'); setDetailOpen(false); }}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
              {selected.status === 'APPROVED' ? (
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={() => { void updateStatus(selected.id, 'SENT_TO_SUPPLIER'); setDetailOpen(false); }}
                >
                  Mark Sent to Supplier
                </button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
