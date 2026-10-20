'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  PrintCardSchoolToolbar,
  SchoolListEmptyState,
  SchoolListItem,
  type SchoolFilterValues,
} from '@/components/school-toolbar/school-toolbar';
import { fetchSchools, type PrintCardSchool } from '@/services/print-card-api';
import {
  fetchOrgModuleAssignments,
  printCardAssignmentFromOrg,
  provisionOrgModule,
  setPrintCardModuleForOrg,
  getPrintCardModuleId,
  type OrgModuleAssignmentsResponse,
} from '@/services/iam-api';

const EMPTY_FILTERS: SchoolFilterValues = {
  provinceId: '',
  districtId: '',
  sectorId: '',
  search: '',
};

function assignmentLabel(status?: string | null) {
  if (status === 'ACTIVE') return { text: 'Enabled', tone: 'bg-emerald-100 text-emerald-800' };
  if (status === 'PENDING') return { text: 'Locked', tone: 'bg-amber-100 text-amber-900' };
  if (status === 'SUSPENDED') return { text: 'Disabled', tone: 'bg-slate-100 text-slate-700' };
  return { text: 'Not assigned', tone: 'bg-slate-100 text-slate-600' };
}

export function OrganizationsView() {
  const { session } = useAuth();
  const [draftFilters, setDraftFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SchoolFilterValues>(EMPTY_FILTERS);
  const [schools, setSchools] = useState<PrintCardSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<PrintCardSchool | null>(null);
  const [assignments, setAssignments] = useState<OrgModuleAssignmentsResponse | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const rows = await fetchSchools({
        provinceId: appliedFilters.provinceId || undefined,
        districtId: appliedFilters.districtId || undefined,
        sectorId: appliedFilters.sectorId || undefined,
        search: appliedFilters.search.trim() || undefined,
      });
      setSchools(rows);
      setSelectedSchool((prev) => {
        if (prev && rows.some((s) => s.id === prev.id)) return prev;
        return rows[0] ?? null;
      });
    } catch {
      setSchools([]);
      setSelectedSchool(null);
    } finally {
      setLoadingSchools(false);
    }
  }, [appliedFilters]);

  const loadAssignment = useCallback(async (organizationId: string) => {
    setLoadingAssignment(true);
    setError('');
    try {
      setAssignments(await fetchOrgModuleAssignments(organizationId));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load module assignment';
      setError(msg);
      setAssignments(null);
    } finally {
      setLoadingAssignment(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, search: draftFilters.search }));
    }, 350);
    return () => window.clearTimeout(t);
  }, [draftFilters.search]);

  useEffect(() => {
    if (selectedSchool) void loadAssignment(selectedSchool.id);
    else setAssignments(null);
  }, [selectedSchool, loadAssignment]);

  if (!session?.isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-navy">Super Admin only</h2>
        <p className="mt-2 text-sm text-muted">Only Super Admins can assign PrintCardMIS to schools.</p>
      </div>
    );
  }

  const printCardRow = assignments ? printCardAssignmentFromOrg(assignments) : null;
  const status = assignmentLabel(printCardRow?.assignment?.status);
  const isEnabled = printCardRow?.assignment?.status === 'ACTIVE';
  const needsProvision = Boolean(printCardRow?.assignment && !printCardRow.assignment.tenantProvisioned);

  async function toggleModule() {
    if (!selectedSchool) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await setPrintCardModuleForOrg(selectedSchool.id, !isEnabled);
      setAssignments(result.data);
      setMessage(
        result.message ??
          (isEnabled
            ? `PrintCardMIS disabled for ${selectedSchool.name}.`
            : `PrintCardMIS enabled for ${selectedSchool.name}. School users can open it from their dashboard.`)
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Failed to update module assignment');
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function runProvision() {
    if (!selectedSchool) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const moduleId = await getPrintCardModuleId();
      const result = await provisionOrgModule(selectedSchool.id, moduleId);
      setMessage(result.message ?? 'Tenant provisioning started.');
      await loadAssignment(selectedSchool.id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Provisioning failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy">School Module Access</h1>
        <p className="mt-1 text-sm text-muted">
          Assign PrintCardMIS to registered schools. Schools use their existing ShulePlus login — no separate account.
        </p>
      </div>

      <PrintCardSchoolToolbar
        values={draftFilters}
        onChange={(patch) => setDraftFilters((p) => ({ ...p, ...patch }))}
        onApply={() => setAppliedFilters({ ...draftFilters })}
        loading={loadingSchools}
        resultCount={schools.length}
      />

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-slate-50 px-3 py-2">
            <p className="text-sm font-semibold text-navy">Schools</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {loadingSchools ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : schools.length === 0 ? (
              <SchoolListEmptyState hasFilters={Boolean(appliedFilters.search)} onClearFilters={() => setDraftFilters(EMPTY_FILTERS)} />
            ) : (
              schools.map((s) => (
                <SchoolListItem
                  key={s.id}
                  school={s}
                  selected={selectedSchool?.id === s.id}
                  onSelect={() => setSelectedSchool(s)}
                />
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {!selectedSchool ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Building2 className="h-10 w-10 text-muted" />
              <p className="mt-3 text-sm text-muted">Select a school to manage PrintCardMIS access.</p>
            </div>
          ) : loadingAssignment ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
          ) : (
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-navy">{selectedSchool.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {[selectedSchool.province, selectedSchool.district, selectedSchool.sector].filter(Boolean).join(' · ') ||
                      'Location not set'}
                  </p>
                  {selectedSchool.organizationCode && (
                    <p className="mt-1 font-mono text-xs text-muted">Code: {selectedSchool.organizationCode}</p>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.tone}`}>{status.text}</span>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/5">
                    <Building2 className="h-6 w-6 text-navy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy">PrintCardMIS</p>
                    <p className="mt-1 text-sm text-muted">
                      Student and staff ID card printing. When enabled, the school sees PrintCardMIS on their organization
                      dashboard and opens it with their existing session.
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-muted">
                      <li className="flex items-center gap-2">
                        {isEnabled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                        Module {isEnabled ? 'visible on school dashboard' : 'hidden from school dashboard'}
                      </li>
                      <li className="flex items-center gap-2">
                        {printCardRow?.assignment?.tenantProvisioned ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        Tenant {printCardRow?.assignment?.tenantProvisioned ? 'provisioned' : 'not provisioned yet'}
                      </li>
                      <li className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        School users only see their own students and staff
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleModule()}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                      isEnabled
                        ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50'
                        : 'bg-navy text-primary hover:bg-navy-light'
                    }`}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isEnabled ? 'Disable PrintCardMIS' : 'Enable PrintCardMIS'}
                  </button>
                  {needsProvision && isEnabled && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runProvision()}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Provision tenant
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {message}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {printCardRow?.assignment && (
                <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase text-muted">Assignment status</dt>
                    <dd className="mt-1 font-medium text-navy">{printCardRow.assignment.status}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase text-muted">Activated</dt>
                    <dd className="mt-1 font-medium text-navy">
                      {printCardRow.assignment.activatedAt
                        ? new Date(printCardRow.assignment.activatedAt).toLocaleDateString('en-GB')
                        : '—'}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
