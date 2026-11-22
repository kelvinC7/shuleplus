'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import { useAuth } from '@/contexts/auth-context';
import type { PurchaseRequest } from '@/types';
import {
  Plus, CheckCircle, Clock, FileText, Download, Filter, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { SetOrdersDrawer } from '@/components/set-orders-drawer';
import { PurchaseRequestTableActions } from '@/components/purchase-request-table-actions';
import {
  PurchaseRequestFormDrawer,
  emptyPurchaseRequestForm,
  type PurchaseRequestFormValues,
} from '@/components/purchase-request-form-drawer';
import { PurchaseRequestDetailDrawer } from '@/components/purchase-request-detail-drawer';
import { PurchaseRequestImportWizard } from '@/components/purchase-request-import-wizard';
import { OTHER_DEPARTMENT_CODE, type AcademicSettings, defaultAcademicSettings } from '@/lib/academic-settings';
import { downloadPurchaseRequestPdf } from '@/modules/documents/pr-request-pdf';
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
  ReportFilterDrawer,
  EMPTY_REPORT_FILTERS,
  countActiveReportFilters,
  reportFilterParams,
  reportPeriodMeta,
  reportPeriodLabel,
  type ReportFilterValues,
} from '@/components/report-filter-drawer';
import { downloadProcurementReport } from '@/modules/documents/report-pdf';
import { formatPersonName } from '@/utils/person-name';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', PENDING: 'Pending', DEPARTMENT_HEAD_APPROVED: 'Dept. Head Approved',
  FINANCE_APPROVED: 'Finance Approved', PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Fully Approved', REJECTED: 'Rejected', CONVERTED_TO_PO: 'Converted to PO', CANCELLED: 'Cancelled',
};

export default function PurchaseRequestsPage() {
  const { user, isSupervisor } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings>(defaultAcademicSettings());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<PurchaseRequestFormValues>(emptyPurchaseRequestForm());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState('');
  const [poDrawerOpen, setPoDrawerOpen] = useState(false);
  const [poSourcePR, setPoSourcePR] = useState<PurchaseRequest | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdPR, setCreatedPR] = useState<PurchaseRequest | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editItem, setEditItem] = useState<PurchaseRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reportFilters, setReportFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = { ...reportFilterParams(reportFilters) };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const data = await procurementApi.purchaseRequests.list(params);
      setRequests(data);
    } catch {} finally { setLoading(false); }
  }, [statusFilter, priorityFilter, search, reportFilters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    void Promise.all([
      procurementApi.departments.list().then(setDepartments).catch(() => {}),
      procurementApi.settings.getAcademic().then(setAcademicSettings).catch(() => {}),
    ]);
  }, []);

  const otherDepartmentId = departments.find((d) => d.code === OTHER_DEPARTMENT_CODE)?.id ?? '';

  const displayDepartment = (pr: PurchaseRequest) =>
    pr.departmentOther?.trim() || pr.department?.name || '—';

  const resetForm = () => { setEditItem(null); setFormInitial(emptyPurchaseRequestForm()); };

  const handleSave = async (values: PurchaseRequestFormValues, action: 'draft' | 'submit') => {
    const isOther = values.departmentId === otherDepartmentId;
    const payload = {
      requestType: values.requestType,
      departmentId: values.departmentId,
      departmentOther: isOther ? values.departmentOther.trim() : undefined,
      purpose: values.purpose,
      priority: values.priority,
      neededDate: values.neededDate,
      academicYear: values.academicYear || academicSettings.currentAcademicYear || undefined,
      term: values.term || undefined,
      status: action === 'draft' ? 'DRAFT' : 'PENDING',
      departmentHeadId: user?.sub,
      items: values.items.map((item) => ({
        itemName: item.itemName,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        estimatedPrice: 0,
        categoryId: item.categoryId || undefined,
        warehouseLocation: item.warehouseLocation || undefined,
      })),
    };

    try {
      if (editItem) {
        await procurementApi.purchaseRequests.update(editItem.id, payload);
        toast.success(action === 'draft' ? 'Draft saved' : 'Purchase request updated');
        setFormOpen(false);
        resetForm();
        load();
        if (selectedPR?.id === editItem.id) {
          const updated = await procurementApi.purchaseRequests.getById(editItem.id);
          setSelectedPR(updated);
        }
        return;
      }

      const created = await procurementApi.purchaseRequests.create(payload);
      toast.success(action === 'draft' ? 'Draft saved' : 'Purchase request submitted');
      setFormOpen(false);
      resetForm();
      load();
      if (action === 'submit') {
        setCreatedPR(created);
        setSuccessOpen(true);
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleDownloadPdf = async (pr: PurchaseRequest) => {
    setPdfLoading(true);
    try {
      const [profile, receiptSettings] = await Promise.all([
        procurementApi.settings.getOrgProfile(),
        procurementApi.settings.getReceipt(),
      ]);
      await downloadPurchaseRequestPdf(pr, {
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
      setPdfLoading(false);
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


      const pending = rows.filter((row) => row.status === 'PENDING').length;
      const approved = rows.filter((row) =>
        ['MD_APPROVED', 'CONVERTED_TO_PO'].includes(row.status),
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
        title: 'PURCHASE REQUESTS REPORT',
        columns: [
          { header: 'PR Number', dataKey: 'prNumber' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Requested By', dataKey: 'requestedBy' },
          { header: 'Status', dataKey: 'status', align: 'center' },
          { header: 'Items', dataKey: 'items', align: 'right' },
        ],
        rows: rows.map((row) => ({
          prNumber: row.prNumber,
          date: new Date(row.createdAt).toLocaleDateString(),
          department: displayDepartment(row),
          requestedBy: formatPersonName(row.requestedByName) || '—',
          status: STATUS_LABELS[row.status] ?? row.status,
          items: row.items?.length ?? row._count?.items ?? 0,
        })),
        meta,
        summary: [
          { label: 'Records', value: String(rows.length) },
          { label: 'Pending', value: String(pending) },
          { label: 'Approved', value: String(approved) },
        ],
        fileBase: 'purchase-requests-report',
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

  const refreshSelected = async (id: string) => {
    if (selectedPR?.id !== id) return;
    try {
      const updated = await procurementApi.purchaseRequests.getById(id);
      setSelectedPR(updated);
    } catch {
      /* ignore */
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await procurementApi.purchaseRequests.approve(id, approvalComment);
      toast.success('Request approved');
      setApprovalComment(''); load();
      await refreshSelected(id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectReason) { toast.error('Please provide a reason'); return; }
    try {
      await procurementApi.purchaseRequests.reject(rejectTargetId, rejectReason);
      toast.success('Request rejected');
      setShowRejectDialog(false); setRejectReason(''); load();
      await refreshSelected(rejectTargetId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    }
  };

  const handleDelete = (pr: PurchaseRequest) => {
    toast(`Delete "${pr.prNumber}"?`, {
      description: 'This action cannot be undone.',
      duration: 8000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try { await procurementApi.purchaseRequests.remove(pr.id); toast.success('Deleted'); load(); }
          catch { toast.error('Delete failed'); }
        },
      },
    });
  };

  const viewDetail = async (pr: PurchaseRequest) => {
    try {
      const detail = await procurementApi.purchaseRequests.getById(pr.id);
      setSelectedPR(detail); setDetailOpen(true);
    } catch { toast.error('Failed to load details'); }
  };

  const openCreateOrder = async (pr: PurchaseRequest) => {
    try {
      const detail = await procurementApi.purchaseRequests.getById(pr.id);
      setPoSourcePR(detail);
      setPoDrawerOpen(true);
    } catch {
      toast.error('Failed to load request details');
    }
  };

  const openEdit = async (pr: PurchaseRequest) => {
    try {
      const detail = await procurementApi.purchaseRequests.getById(pr.id);
      setEditItem(detail);
      setFormInitial({
        requestType: detail.requestType,
        departmentId: detail.departmentId ?? '',
        departmentOther: detail.departmentOther ?? '',
        purpose: detail.purpose ?? '',
        priority: detail.priority,
        neededDate: detail.neededDate ? detail.neededDate.slice(0, 10) : '',
        academicYear: detail.academicYear ?? '',
        term: detail.term ?? '',
        items: (detail.items ?? []).map((item) => ({
          itemName: item.itemName,
          description: item.description ?? '',
          unit: item.unit,
          quantity: String(item.quantity),
          categoryId: item.categoryId ?? '',
          warehouseLocation: item.warehouseLocation ?? '',
        })),
      });
      setFormOpen(true);
    } catch {
      toast.error('Failed to load request for editing');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = requests.length > 0 && selectedIds.size === requests.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < requests.length;

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => ['MD_APPROVED', 'CONVERTED_TO_PO'].includes(r.status)).length;

  const openNewRequest = () => {
    setEditItem(null);
    setFormInitial({
      ...emptyPurchaseRequestForm(),
      academicYear: academicSettings.currentAcademicYear ?? '',
      term: academicSettings.currentTerm ?? '',
    });
    setFormOpen(true);
  };

  const pagination = useTablePagination(requests, {
    resetKey: `${search}|${statusFilter}|${priorityFilter}|${reportFilters.academicYear}|${reportFilters.term}|${reportFilters.dateFrom}|${reportFilters.dateTo}`,
  });

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading purchase requests…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Manage and track all purchase requests through approval."
        actions={
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
              onClick={openNewRequest}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New Request
            </button>
          </div>
        }
        kpis={[
          {
            label: 'Total Requests',
            value: requests.length,
            icon: <FileText size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Pending',
            value: pendingCount,
            icon: <Clock size={20} strokeWidth={1.75} />,
            valueClassName: 'text-amber-600',
          },
          {
            label: 'Approved',
            value: approvedCount,
            icon: <CheckCircle size={20} strokeWidth={1.75} />,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Items Requested',
            value: requests.reduce((n, r) => n + (r.items?.length ?? r._count?.items ?? 0), 0),
            icon: <FileText size={20} strokeWidth={1.75} />,
          },
        ]}
      >
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by PR number, requester…"
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

        {selectedIds.size > 0 ? (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[#fcb038]/30 bg-[#fcb038]/10 px-4 py-2.5 text-sm">
            <span className="font-semibold text-navy">
              {selectedIds.size} request{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-navy/70 hover:text-navy"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <DataTableCard>
          <DataTable minWidth="1040px">
            <DataTableHead>
              <DataTableTh className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border accent-[#fcb038]"
                  aria-label="Select all"
                />
              </DataTableTh>
              <DataTableTh>PR Number</DataTableTh>
              <DataTableTh>Date</DataTableTh>
              <DataTableTh>Requested By</DataTableTh>
              <DataTableTh>Department</DataTableTh>
              <DataTableTh className="text-center">Priority</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh className="text-right">Actions</DataTableTh>
            </DataTableHead>
            <tbody>
              {pagination.rows.map((pr) => (
                <DataTableRow
                  key={pr.id}
                  className={selectedIds.has(pr.id) ? 'bg-[#fcb038]/[0.06]' : undefined}
                >
                  <DataTableTd>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(pr.id)}
                      onChange={() => toggleSelect(pr.id)}
                      className="h-4 w-4 rounded border-border accent-[#fcb038]"
                      aria-label={`Select ${pr.prNumber}`}
                    />
                  </DataTableTd>
                  <DataTableTd className="font-semibold text-navy">{pr.prNumber}</DataTableTd>
                  <DataTableTd className="text-muted">
                    {new Date(pr.createdAt).toLocaleDateString()}
                  </DataTableTd>
                  <DataTableTd>{formatPersonName(pr.requestedByName) || '—'}</DataTableTd>
                  <DataTableTd className="text-muted">{displayDepartment(pr)}</DataTableTd>
                  <DataTableTd className="text-center">
                    <StatusBadge tone={pr.priority === 'URGENT' ? 'danger' : pr.priority === 'HIGH' ? 'warning' : 'info'}>
                      {pr.priority}
                    </StatusBadge>
                  </DataTableTd>
                  <DataTableTd className="text-center">
                    <StatusBadge tone={pr.status === 'REJECTED' ? 'danger' : pr.status.includes('APPROVED') ? 'success' : 'neutral'}>
                      {STATUS_LABELS[pr.status] || pr.status}
                    </StatusBadge>
                  </DataTableTd>
                  <DataTableTd>
                    <PurchaseRequestTableActions
                      pr={pr}
                      isSupervisor={isSupervisor}
                      currentUserId={user?.sub}
                      pdfLoading={pdfLoading}
                      onView={viewDetail}
                      onEdit={openEdit}
                      onApprove={handleApprove}
                      onReject={(id) => { setRejectTargetId(id); setShowRejectDialog(true); }}
                      onDelete={handleDelete}
                      onDownloadPdf={handleDownloadPdf}
                      onSetOrder={openCreateOrder}
                    />
                  </DataTableTd>
                </DataTableRow>
              ))}
              {requests.length === 0 ? (
                <DataTableEmpty colSpan={8} message="No purchase requests found" />
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

      <PurchaseRequestFormDrawer
        open={formOpen}
        editing={editItem}
        initialValues={formInitial}
        departments={departments}
        academicSettings={academicSettings}
        otherDepartmentId={otherDepartmentId}
        onClose={() => { setFormOpen(false); resetForm(); }}
        onSave={handleSave}
      />

      <PurchaseRequestDetailDrawer
        open={detailOpen}
        pr={selectedPR}
        isSupervisor={isSupervisor}
        currentUserId={user?.sub}
        pdfLoading={pdfLoading}
        onClose={() => setDetailOpen(false)}
        onEdit={(pr) => { setDetailOpen(false); void openEdit(pr); }}
        onSetOrder={(pr) => { setDetailOpen(false); void openCreateOrder(pr); }}
        onDownloadPdf={handleDownloadPdf}
        onApprove={handleApprove}
        onReject={(id) => { setRejectTargetId(id); setShowRejectDialog(true); }}
      />

      <PurchaseRequestImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { void load(); }}
        departments={departments}
        academicSettings={academicSettings}
        requestedBy={user?.sub}
      />

      <SetOrdersDrawer
        open={poDrawerOpen}
        purchaseRequest={poSourcePR}
        onClose={() => { setPoDrawerOpen(false); setPoSourcePR(null); }}
      />

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Submitted</DialogTitle>
          </DialogHeader>
          {createdPR ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#fcb038]/30 bg-[#fcb038]/10 p-4 text-center">
                <p className="text-sm text-muted">Purchase Request</p>
                <p className="text-2xl font-bold text-[#000435]">{createdPR.prNumber}</p>
                <p className="mt-1 text-sm text-muted">{displayDepartment(createdPR)}</p>
              </div>
              <button
                type="button"
                disabled={pdfLoading}
                onClick={() => void handleDownloadPdf(createdPR)}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Purchase Request</DialogTitle></DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-1">Rejection Reason *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} placeholder="Provide a reason for rejection..." />
          </div>
          <DialogFooter>
            <DialogClose render={<button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>}>Cancel</DialogClose>
            <button onClick={handleReject} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Reject</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter purchase requests"
        description="Narrow requests by academic period or date, then download a branded PDF report."
        academicSettings={academicSettings}
        value={reportFilters}
        onApply={setReportFilters}
        onDownload={handleDownloadReport}
        downloading={reportLoading}
      />
    </MainLayout>
  );
}
