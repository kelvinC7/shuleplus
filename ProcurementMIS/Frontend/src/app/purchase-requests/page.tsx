'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import { useAuth } from '@/contexts/auth-context';
import type { PurchaseRequest, PurchaseRequestItem, PRApproval } from '@/types';
import {
  Plus, CheckCircle, XCircle, Clock, FileText, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AddItemButton,
  FormField,
  ItemFormCard,
  ModalStepWizard,
  SelectField,
  SummaryPanel,
  SummaryRow,
} from '@/components/procurement-form-ui';
import { SetOrdersDrawer } from '@/components/set-orders-drawer';
import { PurchaseRequestTableActions } from '@/components/purchase-request-table-actions';
import { OTHER_DEPARTMENT_CODE, type AcademicSettings, defaultAcademicSettings } from '@/lib/academic-settings';
import { downloadPurchaseRequestPdf } from '@/modules/documents/pr-request-pdf';
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

const PR_WIZARD_STEPS = [
  { title: 'Details', description: 'Department, academic period, and request information' },
  { title: 'Items', description: 'Line items with quantities (no pricing at request stage)' },
  { title: 'Review', description: 'Confirm details before submitting' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const REQUEST_TYPE_OPTIONS = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'WORKS', label: 'Works' },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  DEPARTMENT_HEAD_APPROVED: 'bg-blue-100 text-blue-700',
  FINANCE_APPROVED: 'bg-indigo-100 text-indigo-700',
  PROCUREMENT_APPROVED: 'bg-purple-100 text-purple-700',
  MD_APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED_TO_PO: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', PENDING: 'Pending', DEPARTMENT_HEAD_APPROVED: 'Dept. Head Approved',
  FINANCE_APPROVED: 'Finance Approved', PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Fully Approved', REJECTED: 'Rejected', CONVERTED_TO_PO: 'Converted to PO', CANCELLED: 'Cancelled',
};

const UNITS = ['EA', 'PCS', 'KG', 'G', 'L', 'ML', 'M', 'Box', 'Carton', 'Pair', 'Set', 'Pack'];

const initialItemState = { itemName: '', description: '', unit: 'EA', quantity: '', categoryId: '', warehouseLocation: '' };
const initialFormState = {
  requestType: 'GOODS', departmentId: '', departmentOther: '', purpose: '',
  priority: 'MEDIUM', neededDate: '', academicYear: '', term: '', items: [{ ...initialItemState }],
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
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
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

  const load = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const data = await procurementApi.purchaseRequests.list(params);
      setRequests(data);
    } catch {} finally { setLoading(false); }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    void Promise.all([
      procurementApi.departments.list().then(setDepartments).catch(() => {}),
      procurementApi.settings.getAcademic().then(setAcademicSettings).catch(() => {}),
    ]);
  }, []);

  const otherDepartmentId = departments.find((d) => d.code === OTHER_DEPARTMENT_CODE)?.id ?? '';
  const isOtherDepartment = form.departmentId === otherDepartmentId;

  const departmentLabel = (id: string, other?: string | null) => {
    if (other?.trim()) return other.trim();
    return departments.find((d) => d.id === id)?.name ?? '—';
  };

  const displayDepartment = (pr: PurchaseRequest) =>
    pr.departmentOther?.trim() || pr.department?.name || '—';

  const resetForm = () => { setForm(initialFormState); setFormStep(1); setEditItem(null); };

  const addItem = () => setForm(prev => ({
    ...prev, items: [...prev.items, { ...initialItemState }],
  }));

  const removeItem = (idx: number) => setForm(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx: number, field: string, value: string) => setForm(prev => ({
    ...prev, items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
  }));

  const handleSubmit = async () => {
    if (!form.departmentId) { toast.error('Please select a department'); return; }
    if (isOtherDepartment && !form.departmentOther.trim()) {
      toast.error('Please specify the department name'); return;
    }
    if (!form.neededDate) { toast.error('Please set needed date'); return; }
    if (form.items.some(i => !i.itemName || !i.quantity)) {
      toast.error('Please fill item name and quantity for all items'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        departmentOther: isOtherDepartment ? form.departmentOther.trim() : undefined,
        academicYear: form.academicYear || academicSettings.currentAcademicYear || undefined,
        term: form.term || undefined,
        items: form.items.map((item) => ({
          ...item,
          estimatedPrice: 0,
        })),
      };

      if (editItem) {
        await procurementApi.purchaseRequests.update(editItem.id, payload);
        toast.success('Purchase request updated');
        setFormOpen(false);
        resetForm();
        load();
        return;
      }

      const created = await procurementApi.purchaseRequests.create({
        ...payload,
        requestedByName: user?.email,
        departmentHeadId: user?.sub,
      });
      toast.success('Purchase request submitted');
      setFormOpen(false);
      resetForm();
      load();
      setCreatedPR(created);
      setSuccessOpen(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create request');
    } finally { setSubmitting(false); }
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
        stampUrl: profile?.stampUrl,
        receiptSettings,
      });
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await procurementApi.purchaseRequests.approve(id, approvalComment);
      toast.success('Request approved');
      setApprovalComment(''); load();
      if (selectedPR?.id === id) { const updated = await procurementApi.purchaseRequests.getById(id); setSelectedPR(updated); }
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await procurementApi.purchaseRequests.cancel(id);
      toast.success('Request cancelled'); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cancel failed');
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
      setForm({
        requestType: detail.requestType,
        departmentId: detail.departmentId,
        departmentOther: detail.departmentOther ?? '',
        purpose: detail.purpose ?? '',
        priority: detail.priority,
        neededDate: detail.neededDate.slice(0, 10),
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
      setFormStep(1);
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
    resetForm();
    setForm((f) => ({
      ...f,
      academicYear: academicSettings.currentAcademicYear ?? '',
      term: academicSettings.currentTerm ?? '',
    }));
    setFormOpen(true);
  };

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
          <button
            type="button"
            onClick={openNewRequest}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> New Request
          </button>
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
          }}
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
              {requests.map((pr) => (
                <tr
                  key={pr.id}
                  className={`border-b border-border/70 transition hover:bg-[#f8fafc] ${
                    selectedIds.has(pr.id) ? 'bg-[#fcb038]/[0.06]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(pr.id)}
                      onChange={() => toggleSelect(pr.id)}
                      className="h-4 w-4 rounded border-border accent-[#fcb038]"
                      aria-label={`Select ${pr.prNumber}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">{pr.prNumber}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(pr.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{pr.requestedByName || '—'}</td>
                  <td className="px-4 py-3 text-muted">{displayDepartment(pr)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={pr.priority === 'URGENT' ? 'danger' : pr.priority === 'HIGH' ? 'warning' : 'info'}>
                      {pr.priority}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={pr.status === 'REJECTED' ? 'danger' : pr.status.includes('APPROVED') ? 'success' : 'neutral'}>
                      {STATUS_LABELS[pr.status] || pr.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <DataTableEmpty colSpan={8} message="No purchase requests found" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PlatformPageLayout>

      {/* Multi-step Request Form */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setTimeout(resetForm, 250); } }}>
        <DialogContent className="max-h-[95vh] max-w-[calc(100%-1rem)] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-4xl">
          <ModalStepWizard
            steps={PR_WIZARD_STEPS}
            currentStep={formStep - 1}
            onCancel={() => { setFormOpen(false); setTimeout(resetForm, 250); }}
            onBack={() => setFormStep((s) => Math.max(1, s - 1))}
            onNext={() => setFormStep((s) => Math.min(3, s + 1))}
            onSubmit={handleSubmit}
            isLastStep={formStep === 3}
            saving={submitting}
            submitLabel={editItem ? 'Save Changes' : 'Submit Request'}
          >
            {formStep === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Department"
                  required
                  value={form.departmentId}
                  onChange={(value) => setForm({ ...form, departmentId: value, departmentOther: '' })}
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select department"
                />
                {isOtherDepartment ? (
                  <FormField label="Specify Department" required className="sm:col-span-2">
                    <input
                      value={form.departmentOther}
                      onChange={(e) => setForm({ ...form, departmentOther: e.target.value })}
                      className="input"
                      placeholder="Enter department name"
                    />
                  </FormField>
                ) : null}
                <SelectField
                  label="Academic Year"
                  value={form.academicYear}
                  onChange={(value) => setForm({ ...form, academicYear: value })}
                  options={academicSettings.academicYears.map((y) => ({ value: y, label: y }))}
                  placeholder="Select academic year"
                />
                <SelectField
                  label="Term (optional)"
                  value={form.term}
                  onChange={(value) => setForm({ ...form, term: value })}
                  options={academicSettings.terms.map((t) => ({ value: t, label: t }))}
                  placeholder="Optional"
                />
                <SelectField
                  label="Priority"
                  value={form.priority}
                  onChange={(value) => setForm({ ...form, priority: value })}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority"
                />
                <FormField label="Needed By" required>
                  <input
                    type="date"
                    value={form.neededDate}
                    onChange={(e) => setForm({ ...form, neededDate: e.target.value })}
                    className="input"
                  />
                </FormField>
                <SelectField
                  label="Request Type"
                  value={form.requestType}
                  onChange={(value) => setForm({ ...form, requestType: value })}
                  options={REQUEST_TYPE_OPTIONS}
                  placeholder="Select type"
                />
                <FormField label="Purpose" className="sm:col-span-2">
                  <textarea
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className="input min-h-[90px] resize-y"
                    rows={3}
                    placeholder="Why is this needed?"
                  />
                </FormField>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-4">
                {form.items.map((item, idx) => (
                  <ItemFormCard
                    key={idx}
                    index={idx}
                    canRemove={form.items.length > 1}
                    onRemove={() => removeItem(idx)}
                  >
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField label="Item Name" required className="sm:col-span-2">
                        <input
                          value={item.itemName}
                          onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                          className="input"
                          placeholder="Item name"
                        />
                      </FormField>
                      <FormField label="Unit" required>
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
                      <FormField label="Description" className="sm:col-span-3">
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="input"
                          placeholder="Additional details"
                        />
                      </FormField>
                    </div>
                  </ItemFormCard>
                ))}
                <AddItemButton onClick={addItem} />
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-4">
                <SummaryPanel title="Request Summary">
                  <SummaryRow label="Department" value={departmentLabel(form.departmentId, isOtherDepartment ? form.departmentOther : null)} />
                  <SummaryRow label="Academic Year" value={form.academicYear || '—'} />
                  <SummaryRow label="Term" value={form.term || '—'} />
                  <SummaryRow label="Priority" value={form.priority} />
                  <SummaryRow label="Needed By" value={form.neededDate || '—'} />
                  <SummaryRow label="Type" value={form.requestType} />
                  {form.purpose ? <SummaryRow label="Purpose" value={form.purpose} /> : null}
                </SummaryPanel>
                <SummaryPanel title={`Items (${form.items.length})`}>
                  {form.items.map((item, i) => (
                    <SummaryRow
                      key={i}
                      label={`${item.itemName || `Item ${i + 1}`} × ${item.quantity} ${item.unit}`}
                      value="—"
                    />
                  ))}
                </SummaryPanel>
              </div>
            )}
          </ModalStepWizard>
        </DialogContent>
      </Dialog>

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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPR?.prNumber} - Purchase Request Details</DialogTitle>
          </DialogHeader>
          {selectedPR && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedPR.status]}`}>{STATUS_LABELS[selectedPR.status]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Priority:</span><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[selectedPR.priority]}`}>{selectedPR.priority}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Requested By:</span><span>{selectedPR.requestedByName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span>{displayDepartment(selectedPR)}</span></div>
                {selectedPR.academicYear ? <div className="flex justify-between"><span className="text-muted-foreground">Academic Year:</span><span>{selectedPR.academicYear}</span></div> : null}
                {selectedPR.term ? <div className="flex justify-between"><span className="text-muted-foreground">Term:</span><span>{selectedPR.term}</span></div> : null}
                <div className="flex justify-between"><span className="text-muted-foreground">Needed By:</span><span>{new Date(selectedPR.neededDate).toLocaleDateString()}</span></div>
                {selectedPR.purpose && <div><span className="text-muted-foreground">Purpose:</span><p className="mt-1">{selectedPR.purpose}</p></div>}
              </div>

              {selectedPR.items && selectedPR.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Items</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 font-medium">Item</th>
                        <th className="text-center px-3 py-2 font-medium">Qty</th>
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                      </tr></thead>
                      <tbody>
                        {selectedPR.items.map(item => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-muted">{item.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedPR.approvals && selectedPR.approvals.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Approval History</h4>
                  <div className="space-y-2">
                    {selectedPR.approvals.map(a => (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className={`rounded-full p-1.5 ${a.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {a.status === 'APPROVED' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{a.stage}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.approverName || a.approverId}</p>
                          {a.comment && <p className="text-xs mt-1">{a.comment}</p>}
                          {a.approvedAt && <p className="text-xs text-muted-foreground mt-1">{new Date(a.approvedAt).toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
    </MainLayout>
  );
}
