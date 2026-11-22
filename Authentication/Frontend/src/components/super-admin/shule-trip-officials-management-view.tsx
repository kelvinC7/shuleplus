'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Loader2,
  MapPin,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  SHULE_TRIP_ROLE_OPTIONS,
  createShuleTripOfficialAdmin,
  deleteShuleTripOfficialAdmin,
  fetchShuleTripOfficialsAdmin,
  resetShuleTripOfficialPasswordAdmin,
  updateShuleTripOfficialAdmin,
} from '@/lib/shule-trip-officials-api';
import { fetchDistricts, fetchProvinces, fetchSectors } from '@/lib/smart-access-api';
import { PageHeader } from '@/components/shared';
import { useConfirm, useToast } from '@/shared/notifications';

type Row = Awaited<ReturnType<typeof fetchShuleTripOfficialsAdmin>>[number];
type ModalKind = 'create' | 'edit' | 'view' | 'password' | null;

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  tripRoleSlug: string;
  authority: string;
  jurisdictionScope: string;
  provinceId: string;
  districtId: string;
  districtName: string;
  sectorId: string;
  sectorName: string;
  canFinalApprove: boolean;
  credentialMode: 'email' | 'manual';
  requirePasswordChange: boolean;
  notes: string;
};

const EMPTY: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  tripRoleSlug: 'education_reviewer',
  authority: 'District Education Office',
  jurisdictionScope: 'districts',
  provinceId: '',
  districtId: '',
  districtName: '',
  sectorId: '',
  sectorName: '',
  canFinalApprove: false,
  credentialMode: 'email',
  requirePasswordChange: true,
  notes: '',
};

const PAGE_SIZE = 8;

const inputCls =
  'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25';

function roleLabel(slug: string) {
  return SHULE_TRIP_ROLE_OPTIONS.find((o) => o.slug === slug)?.label ?? slug;
}

function resolveDistrictName(district: { name: string } | undefined, fallback: string): string | undefined {
  if (district?.name) return district.name;
  const trimmed = fallback.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveSectorName(sector: { name: string } | undefined, fallback: string): string | undefined {
  if (sector?.name) return sector.name;
  const trimmed = fallback.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  onSubmit,
  submitLabel,
  saving,
  readOnly,
  children,
  footerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
  saving?: boolean;
  readOnly?: boolean;
  children: ReactNode;
  footerExtra?: ReactNode;
}) {
  if (!open) return null;
  const Wrapper = readOnly ? 'div' : 'form';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#000435]/60 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <Wrapper
        {...(!readOnly && onSubmit ? { onSubmit } : {})}
        className="relative my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl"
      >
        <div className="border-b border-navy/8 bg-gradient-to-br from-[#000435] via-[#000435] to-[#1a2a6c] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCB038]">ShuleTrip · IAM</p>
              <h2 className="mt-1 text-xl font-bold">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm text-white/75">{subtitle}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>{footerExtra}</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && submitLabel ? (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FCB038] px-5 py-2.5 text-sm font-bold text-[#000435] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving…' : submitLabel}
              </button>
            ) : null}
          </div>
        </div>
      </Wrapper>
    </div>
  );
}

function OfficialFormFields({
  form,
  setForm,
  provinces,
  districts,
  sectors,
  emailReadOnly,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  provinces: Array<{ id: string; name: string }>;
  districts: Array<{ id: string; name: string }>;
  sectors: Array<{ id: string; name: string }>;
  emailReadOnly?: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-navy">
          First name
          <input
            className={`${inputCls} mt-1`}
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </label>
        <label className="text-sm font-bold text-navy">
          Last name
          <input
            className={`${inputCls} mt-1`}
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </label>
      </div>
      <label className="block text-sm font-bold text-navy">
        Email (login)
        <input
          type="email"
          className={`${inputCls} mt-1 ${emailReadOnly ? 'bg-slate-100 text-slate-600' : ''}`}
          required
          readOnly={emailReadOnly}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <label className="block text-sm font-bold text-navy">
        Phone (optional)
        <input
          className={`${inputCls} mt-1`}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>
      <label className="block text-sm font-bold text-navy">
        Government role
        <select
          className={`${inputCls} mt-1`}
          value={form.tripRoleSlug}
          onChange={(e) => setForm({ ...form, tripRoleSlug: e.target.value })}
        >
          {SHULE_TRIP_ROLE_OPTIONS.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-navy">
        Authority
        <input className={`${inputCls} mt-1`} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} />
      </label>
      <label className="block text-sm font-bold text-navy">
        Access scope
        <select
          className={`${inputCls} mt-1`}
          value={form.jurisdictionScope}
          onChange={(e) => setForm({ ...form, jurisdictionScope: e.target.value })}
        >
          <option value="assigned_only">Assigned applications only</option>
          <option value="sectors">Assigned sector(s)</option>
          <option value="districts">Assigned district(s)</option>
          <option value="national">National</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input type="checkbox" checked={form.canFinalApprove} onChange={(e) => setForm({ ...form, canFinalApprove: e.target.checked })} />
        Can issue final trip authorization
      </label>
      <label className="block text-sm font-bold text-navy">
        Province
        <select
          className={`${inputCls} mt-1`}
          value={form.provinceId}
          onChange={(e) => setForm({ ...form, provinceId: e.target.value, districtId: '', sectorId: '' })}
        >
          <option value="">Select province</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-navy">
        District
        <select
          className={`${inputCls} mt-1`}
          value={form.districtId}
          onChange={(e) => setForm({ ...form, districtId: e.target.value, sectorId: '' })}
        >
          <option value="">Select district</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      {!form.districtId && (
        <label className="block text-sm font-bold text-navy">
          District name (manual)
          <input className={`${inputCls} mt-1`} value={form.districtName} onChange={(e) => setForm({ ...form, districtName: e.target.value })} />
        </label>
      )}
      <label className="block text-sm font-bold text-navy">
        Sector (optional)
        <select className={`${inputCls} mt-1`} value={form.sectorId} onChange={(e) => setForm({ ...form, sectorId: e.target.value })}>
          <option value="">None</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {!form.sectorId && (
        <label className="block text-sm font-bold text-navy">
          Sector name (manual)
          <input className={`${inputCls} mt-1`} value={form.sectorName} onChange={(e) => setForm({ ...form, sectorName: e.target.value })} />
        </label>
      )}
      <label className="block text-sm font-bold text-navy">
        Notes
        <textarea
          className={`${inputCls} mt-1 min-h-[72px]`}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>
    </>
  );
}

export function ShuleTripOfficialsManagementView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<Array<{ id: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [sectors, setSectors] = useState<Array<{ id: string; name: string }>>([]);
  const [passwordForm, setPasswordForm] = useState({ password: '', mode: 'email' as 'email' | 'manual' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchShuleTripOfficialsAdmin());
    } catch {
      toast.error('Could not load ShuleTrip officials', 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    fetchProvinces().then(setProvinces).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!form.provinceId) {
      setDistricts([]);
      return;
    }
    fetchDistricts(form.provinceId).then(setDistricts).catch(() => setDistricts([]));
  }, [form.provinceId]);

  useEffect(() => {
    if (!form.districtId) {
      setSectors([]);
      return;
    }
    fetchSectors(form.districtId).then(setSectors).catch(() => setSectors([]));
  }, [form.districtId]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        (r.profile?.tripRoleSlug ?? '').includes(q) ||
        roleLabel(r.profile?.tripRoleSlug ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      licensed: rows.filter((r) => r.hasShuleTripAccess).length,
      finalApprovers: rows.filter((r) => r.profile?.canFinalApprove).length,
    }),
    [rows]
  );

  function openCreate() {
    setForm(EMPTY);
    setActiveRow(null);
    setModal('create');
  }

  function openEdit(row: Row) {
    setActiveRow(row);
    setForm({
      ...EMPTY,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone ?? '',
      tripRoleSlug: row.profile?.tripRoleSlug ?? 'education_reviewer',
      authority: row.profile?.authority ?? '',
      jurisdictionScope: row.profile?.jurisdictionScope ?? 'districts',
      districtName: row.profile?.districtName ?? '',
      sectorName: row.profile?.sectorName ?? '',
      canFinalApprove: row.profile?.canFinalApprove ?? false,
      notes: row.profile?.notes ?? '',
    });
    setModal('edit');
  }

  function openView(row: Row) {
    setActiveRow(row);
    setModal('view');
  }

  function buildLocationPayload() {
    const district = districts.find((d) => d.id === form.districtId);
    const sector = sectors.find((s) => s.id === form.sectorId);
    const province = provinces.find((p) => p.id === form.provinceId);
    return {
      provinceId: form.provinceId || undefined,
      provinceName: province?.name,
      districtId: form.districtId || undefined,
      districtName: resolveDistrictName(district, form.districtName),
      sectorId: form.sectorId || undefined,
      sectorName: resolveSectorName(sector, form.sectorName),
    };
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createShuleTripOfficialAdmin({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        tripRoleSlug: form.tripRoleSlug,
        authority: form.authority,
        jurisdictionScope: form.jurisdictionScope,
        ...buildLocationPayload(),
        canFinalApprove: form.canFinalApprove,
        notes: form.notes || undefined,
        sendCredentialsEmail: form.credentialMode === 'email',
        password: form.credentialMode === 'manual' ? form.password : undefined,
        requirePasswordChange: form.requirePasswordChange,
      });
      if (result.tempPassword) {
        toast.success(`Created. Temporary password: ${result.tempPassword}`, 'Account ready');
      } else {
        toast.success('Official created and credentials emailed', 'Account ready');
      }
      setModal(null);
      setForm(EMPTY);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Create failed',
        'Error'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!activeRow) return;
    setSaving(true);
    try {
      await updateShuleTripOfficialAdmin(activeRow.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        tripRoleSlug: form.tripRoleSlug,
        authority: form.authority,
        jurisdictionScope: form.jurisdictionScope,
        districtName: buildLocationPayload().districtName,
        sectorName: buildLocationPayload().sectorName,
        canFinalApprove: form.canFinalApprove,
        notes: form.notes || undefined,
      });
      toast.success('Official updated', 'Saved');
      setModal(null);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed',
        'Error'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!activeRow) return;
    setSaving(true);
    try {
      const result = await resetShuleTripOfficialPasswordAdmin(activeRow.id, {
        sendCredentialsEmail: passwordForm.mode === 'email',
        password: passwordForm.mode === 'manual' ? passwordForm.password : undefined,
        requirePasswordChange: true,
      });
      if (result.tempPassword) toast.success(`New password: ${result.tempPassword}`, 'Reset');
      else toast.success('Password sent by email', 'Reset');
      setModal(null);
    } catch {
      toast.error('Password reset failed', 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Row) {
    const ok = await confirm({
      title: 'Remove official?',
      message: `Delete ${row.email}? This removes IAM login access.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await deleteShuleTripOfficialAdmin(row.id);
    toast.success('Official removed', 'Deleted');
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ShuleTrip government users"
        description="Register officials, assign roles, set jurisdiction, and manage login credentials. Users access the Government console after launching ShuleTrip."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-bold text-[#000435] shadow-sm transition hover:brightness-105"
          >
            <UserPlus className="h-4 w-4" />
            Add official
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total officials', value: stats.total, icon: Users },
          { label: 'ShuleTrip licensed', value: stats.licensed, icon: ShieldCheck },
          { label: 'Final approvers', value: stats.finalApprovers, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
              <Icon className="h-5 w-5 text-[#FCB038]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-slate-50/80 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Search name, email, role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs font-semibold text-muted">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FCB038]" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-navy">No government users yet</p>
            <p className="mt-1 text-sm text-muted">Add an official to grant ShuleTrip Government console access.</p>
            <button type="button" onClick={openCreate} className="mt-4 rounded-xl bg-[#FCB038] px-4 py-2 text-sm font-bold text-[#000435]">
              Add official
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-[#000435] text-xs uppercase tracking-wide text-white/80">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">Official</th>
                    <th className="px-4 py-3.5 font-bold">Role</th>
                    <th className="px-4 py-3.5 font-bold">Jurisdiction</th>
                    <th className="px-4 py-3.5 font-bold">Status</th>
                    <th className="px-4 py-3.5 font-bold">Module</th>
                    <th className="px-4 py-3.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-navy">
                          {row.firstName} {row.lastName}
                        </p>
                        <p className="text-xs text-muted">{row.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-navy">{roleLabel(row.profile?.tripRoleSlug ?? '')}</p>
                        {row.profile?.canFinalApprove ? (
                          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            Final approve
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FCB038]" />
                          {[row.profile?.districtName, row.profile?.sectorName].filter(Boolean).join(', ') || 'National / unset'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                            row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {String(row.status).toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.hasShuleTripAccess ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Licensed</span>
                        ) : (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="View"
                            className="rounded-lg border border-border p-2 text-navy hover:bg-slate-100"
                            onClick={() => openView(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            className="rounded-lg border border-border p-2 text-navy hover:bg-slate-100"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Reset credentials"
                            className="rounded-lg border border-border p-2 text-navy hover:bg-slate-100"
                            onClick={() => {
                              setActiveRow(row);
                              setPasswordForm({ password: '', mode: 'email' });
                              setModal('password');
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row sm:px-6">
              <p className="text-xs text-muted">
                Page {page} of {totalPages} · showing {paginated.length} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ModalShell
        open={modal === 'create'}
        onClose={() => setModal(null)}
        title="Add government user"
        subtitle="Creates IAM login + ShuleTrip module access"
        onSubmit={handleCreate}
        submitLabel="Create account"
        saving={saving}
      >
        <OfficialFormFields form={form} setForm={setForm} provinces={provinces} districts={districts} sectors={sectors} />
        <div className="rounded-xl border border-border bg-slate-50 p-3 text-xs text-muted">
          <ShieldCheck className="mb-1 inline h-4 w-4 text-[#FCB038]" /> Role slug{' '}
          <code className="rounded bg-white px-1">{form.tripRoleSlug}</code> is embedded in the JWT for ShuleTrip Government console.
        </div>
        <label className="block text-sm font-bold text-navy">
          Credentials
          <select
            className={`${inputCls} mt-1`}
            value={form.credentialMode}
            onChange={(e) => setForm({ ...form, credentialMode: e.target.value as 'email' | 'manual' })}
          >
            <option value="email">Email temporary password</option>
            <option value="manual">Set password manually</option>
          </select>
        </label>
        {form.credentialMode === 'manual' ? (
          <input
            className={inputCls}
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        ) : null}
      </ModalShell>

      <ModalShell
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        title="Edit official"
        subtitle={activeRow?.email}
        onSubmit={handleEdit}
        submitLabel="Save changes"
        saving={saving}
      >
        <OfficialFormFields
          form={form}
          setForm={setForm}
          provinces={provinces}
          districts={districts}
          sectors={sectors}
          emailReadOnly
        />
      </ModalShell>

      <ModalShell open={modal === 'view'} onClose={() => setModal(null)} title="Official profile" subtitle={activeRow?.email} readOnly>
        {activeRow ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ['Name', `${activeRow.firstName} ${activeRow.lastName}`],
              ['Email', activeRow.email],
              ['Phone', activeRow.phone ?? 'Not set'],
              ['Role', roleLabel(activeRow.profile?.tripRoleSlug ?? '')],
              ['Authority', activeRow.profile?.authority ?? 'Not set'],
              ['Scope', activeRow.profile?.jurisdictionScope ?? 'Not set'],
              ['District', activeRow.profile?.districtName ?? 'Not set'],
              ['Sector', activeRow.profile?.sectorName ?? 'Not set'],
              ['Final approve', activeRow.profile?.canFinalApprove ? 'Yes' : 'No'],
              ['ShuleTrip', activeRow.hasShuleTripAccess ? 'Licensed' : 'Missing'],
              ['Last login', activeRow.lastLoginAt ? new Date(activeRow.lastLoginAt).toLocaleString() : 'Never'],
              ['Notes', activeRow.profile?.notes ?? 'None'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-slate-50 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-navy">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </ModalShell>

      <ModalShell
        open={modal === 'password'}
        onClose={() => setModal(null)}
        title="Reset login credentials"
        subtitle={activeRow?.email}
        onSubmit={handleResetPassword}
        submitLabel="Reset password"
        saving={saving}
      >
        <p className="text-sm text-muted">Send a new temporary password or set one manually. User will be prompted to change password on next login.</p>
        <select
          className={inputCls}
          value={passwordForm.mode}
          onChange={(e) => setPasswordForm({ ...passwordForm, mode: e.target.value as 'email' | 'manual' })}
        >
          <option value="email">Email new password</option>
          <option value="manual">Set manually</option>
        </select>
        {passwordForm.mode === 'manual' ? (
          <input
            className={inputCls}
            type="password"
            placeholder="Min 8 characters"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
          />
        ) : null}
      </ModalShell>
    </div>
  );
}
